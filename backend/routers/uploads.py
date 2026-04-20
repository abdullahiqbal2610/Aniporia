"""
Uploads Router
--------------
POST /uploads                     → Upload a note image, run AI pipeline, save results
GET  /uploads?course_id=...       → List uploads for a course
GET  /uploads/{id}                → Get a single upload with its full AI result
PATCH /uploads/{id}/text          → Save corrected OCR text to DB
"""

import os
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel
from services.supabase_client import get_supabase
from services.auth import get_current_user
from services.storage import upload_note_image
from services.ai_pipeline import run_pipeline_via_http

router = APIRouter(prefix="/uploads", tags=["Uploads"])

AI_ENGINE_URL = os.getenv("AI_ENGINE_URL", "http://localhost:8001")
MAX_FILE_SIZE = 10 * 1024 * 1024


# ---------- Schemas ----------

class ExtractedTextUpdate(BaseModel):
    extracted_text: str


# ---------- Routes ----------

@router.post("/", status_code=status.HTTP_201_CREATED)
async def upload_notes(
    file: UploadFile = File(...),
    course_id: str = Form(...),
    syllabus_topics: str = Form(...),
    user=Depends(get_current_user),
):
    """
    Full pipeline:
    1. Validate the uploaded image
    2. Upload image to Supabase Storage
    3. Call AI engine → extract text, find gaps, generate study guide + mock exam
    4. Save upload record (including extracted_text) to DB
    5. Save each knowledge gap to DB
    6. Update course mastery score
    7. Return the full AI result to the frontend
    """
    supabase = get_supabase()

    # --- 1. Validate ---
    if file.content_type not in ("image/png", "image/jpeg", "image/jpg", "image/webp"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PNG, JPEG, and WebP images are supported.",
        )

    image_bytes = await file.read()
    if len(image_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds the 10 MB limit.",
        )

    course_check = (
        supabase.table("courses")
        .select("id")
        .eq("id", course_id)
        .eq("user_id", user.id)
        .single()
        .execute()
    )
    if not course_check.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    # --- 2. Upload to Storage ---
    try:
        public_url, storage_path = upload_note_image(image_bytes, file.filename, user.id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Storage upload failed: {str(e)}",
        )

    # --- 3. Run AI Pipeline ---
    topics_list = [t.strip() for t in syllabus_topics.split(",") if t.strip()]
    try:
        ai_result = await run_pipeline_via_http(
            image_bytes=image_bytes,
            filename=file.filename,
            syllabus_topics=topics_list,
            ai_engine_url=AI_ENGINE_URL,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI engine error: {str(e)}",
        )

    # --- 4. Save Upload record (with extracted_text) ---
    extracted_text = ai_result.get("extracted_text", "")

    upload_result = (
        supabase.table("uploads")
        .insert({
            "user_id": user.id,
            "course_id": course_id,
            "file_name": file.filename,
            "file_url": public_url,
            "content_type": file.content_type,
            "extracted_text": extracted_text,          # ← saved here
        })
        .execute()
    )
    upload_id = upload_result.data[0]["id"]

    # --- 5. Save Gaps ---
    missing_topics = ai_result.get("analysis", {}).get("missing_topics", [])

    if missing_topics:
        gaps_to_insert = []
        for item in missing_topics:
            score = item.get("match_score", 0)
            if score < 0.25:
                priority = "HIGH"
            elif score < 0.40:
                priority = "MEDIUM"
            else:
                priority = "LOW"

            gaps_to_insert.append({
                "user_id": user.id,
                "course_id": course_id,
                "topic": item["topic"],
                "priority": priority,
                "gap_score": int((1 - score) * 100),
            })

        supabase.table("gaps").insert(gaps_to_insert).execute()

    # --- 6. Update mastery score on the course ---
    covered = ai_result.get("analysis", {}).get("covered_topics", [])
    total_topics = len(covered) + len(missing_topics)
    if total_topics > 0:
        mastery = int((len(covered) / total_topics) * 100)
        supabase.table("courses").update({"mastery_percent": mastery}).eq("id", course_id).execute()

    # --- 7. Return full result ---
    return {
        "upload_id": upload_id,
        "file_url": public_url,
        "ai_result": ai_result,
    }


@router.patch("/{upload_id}/text", status_code=status.HTTP_200_OK)
async def update_extracted_text(
    upload_id: str,
    body: ExtractedTextUpdate,
    user=Depends(get_current_user),
):
    """
    Saves the user-corrected OCR text back to the uploads table.
    Called from the OCR review page after the user edits the extracted text.
    Requires an `extracted_text` TEXT column on the uploads table.
    """
    supabase = get_supabase()

    # Verify ownership
    existing = (
        supabase.table("uploads")
        .select("id")
        .eq("id", upload_id)
        .eq("user_id", user.id)
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Upload not found.")

    result = (
        supabase.table("uploads")
        .update({"extracted_text": body.extracted_text})
        .eq("id", upload_id)
        .execute()
    )

    return {"upload_id": upload_id, "extracted_text": body.extracted_text, "saved": True}


@router.get("/")
async def list_uploads(course_id: str | None = None, user=Depends(get_current_user)):
    """Lists all uploads for the user, optionally filtered by course."""
    supabase = get_supabase()

    query = (
        supabase.table("uploads")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
    )

    if course_id:
        query = query.eq("course_id", course_id)

    result = query.execute()
    return result.data or []


@router.get("/{upload_id}")
async def get_upload(upload_id: str, user=Depends(get_current_user)):
    """Returns a single upload record."""
    supabase = get_supabase()

    result = (
        supabase.table("uploads")
        .select("*")
        .eq("id", upload_id)
        .eq("user_id", user.id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Upload not found.")

    return result.data