"""
Uploads Router
--------------
POST /uploads      → Upload an image, save record to DB
GET  /uploads      → List uploads for a course
GET  /uploads/{id} → Get a single upload

AI Pipeline: commented out — uncomment steps 3, 5, 6 when ready to enable analysis.
"""

import os
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from services.supabase_client import get_supabase
from services.auth import get_current_user
from services.storage import upload_note_image
# from services.ai_pipeline import run_pipeline_via_http  # uncomment when enabling AI

router = APIRouter(prefix="/uploads", tags=["Uploads"])

# AI_ENGINE_URL = os.getenv("AI_ENGINE_URL", "http://localhost:8001")  # uncomment when enabling AI
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

ALLOWED_TYPES = (
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
)


@router.post("/", status_code=status.HTTP_201_CREATED)
async def upload_notes(
    file: UploadFile = File(...),
    course_id: str = Form(...),
    syllabus_topics: str = Form(...),
    user=Depends(get_current_user),
):
    supabase = get_supabase()

    # --- 1. Validate file type ---
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only PNG, JPEG, and WebP images are supported.",
        )

    file_bytes = await file.read()

    # --- 2. Validate file size ---
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds the 10MB limit.")

    # --- Verify course belongs to this user ---
    course_check = (
        supabase.table("courses")
        .select("id")
        .eq("id", course_id)
        .eq("user_id", user.id)
        .single()
        .execute()
    )
    if not course_check.data:
        raise HTTPException(status_code=404, detail="Course not found.")

    # --- 3. Upload file to Supabase Storage ---
    try:
        public_url, storage_path = upload_note_image(file_bytes, file.filename, user.id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {str(e)}")

    # -------------------------------------------------------------------------
    # --- AI PIPELINE (commented out — uncomment when ready) ---
    #
    # topics_list = [t.strip() for t in syllabus_topics.split(",") if t.strip()]
    # try:
    #     ai_result = await run_pipeline_via_http(
    #         image_bytes=file_bytes,
    #         filename=file.filename,
    #         syllabus_topics=topics_list,
    #         ai_engine_url=AI_ENGINE_URL,
    #     )
    # except Exception as e:
    #     raise HTTPException(status_code=502, detail=f"AI engine error: {str(e)}")
    #
    # -------------------------------------------------------------------------

    # --- 4. Save upload record to database ---
    try:
        result = (
            supabase.table("uploads")
            .insert({
                "user_id": user.id,
                "course_id": course_id,
                "file_name": file.filename,
                "file_url": public_url,
                "content_type": file.content_type,
            })
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database insert failed: {str(e)}")

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save upload record.")

    upload = result.data[0]

    # -------------------------------------------------------------------------
    # --- SAVE GAPS (commented out — uncomment when AI pipeline is enabled) ---
    #
    # missing_topics = ai_result.get("analysis", {}).get("missing_topics", [])
    # if missing_topics:
    #     gaps_to_insert = []
    #     for item in missing_topics:
    #         score = item.get("match_score", 0)
    #         if score < 0.25:
    #             priority = "HIGH"
    #         elif score < 0.40:
    #             priority = "MEDIUM"
    #         else:
    #             priority = "LOW"
    #         gaps_to_insert.append({
    #             "user_id": user.id,
    #             "course_id": course_id,
    #             "topic": item["topic"],
    #             "priority": priority,
    #             "gap_score": int((1 - score) * 100),
    #         })
    #     supabase.table("gaps").insert(gaps_to_insert).execute()
    #
    # -------------------------------------------------------------------------

    # -------------------------------------------------------------------------
    # --- UPDATE MASTERY (commented out — uncomment when AI pipeline is enabled) ---
    #
    # covered = ai_result.get("analysis", {}).get("covered_topics", [])
    # total_topics = len(covered) + len(missing_topics)
    # if total_topics > 0:
    #     mastery = int((len(covered) / total_topics) * 100)
    #     supabase.table("courses").update({"mastery_percent": mastery}).eq("id", course_id).execute()
    #
    # -------------------------------------------------------------------------

    return {
        "upload_id": upload["id"],
        "file_name": upload["file_name"],
        "file_url": public_url,
        "content_type": file.content_type,
        "course_id": course_id,
        "created_at": upload["created_at"],
        # "ai_result": ai_result,  # uncomment when AI pipeline is enabled
    }


@router.get("/")
async def list_uploads(course_id: str | None = None, user=Depends(get_current_user)):
    supabase = get_supabase()
    query = (
        supabase.table("uploads")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
    )
    if course_id:
        query = query.eq("course_id", course_id)
    return query.execute().data or []


@router.get("/{upload_id}")
async def get_upload(upload_id: str, user=Depends(get_current_user)):
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
        raise HTTPException(status_code=404, detail="Upload not found.")
    return result.data