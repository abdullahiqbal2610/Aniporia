"""
Courses Router
--------------
GET    /courses              → List all courses for the current user
POST   /courses              → Create a new course
PATCH  /courses/{id}         → Update course name / code / semester
DELETE /courses/{id}         → Delete a course
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from services.supabase_client import get_supabase
from services.auth import get_current_user

router = APIRouter(prefix="/courses", tags=["Courses"])


# ---------- Schemas ----------

class CourseCreate(BaseModel):
    name: str
    code: str
    semester: str


class CourseUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    semester: str | None = None


class CourseResponse(BaseModel):
    id: str
    user_id: str
    name: str
    code: str
    semester: str
    mastery_percent: int
    created_at: str


# ---------- Routes ----------

@router.get("/", response_model=list[CourseResponse])
async def list_courses(user=Depends(get_current_user)):
    """Returns all courses belonging to the authenticated user."""
    supabase = get_supabase()

    result = (
        supabase.table("courses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", desc=False)
        .execute()
    )

    return result.data or []


@router.post("/", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
async def create_course(body: CourseCreate, user=Depends(get_current_user)):
    """Creates a new course for the authenticated user."""
    supabase = get_supabase()

    result = (
        supabase.table("courses")
        .insert({
            "user_id": user.id,
            "name": body.name,
            "code": body.code,
            "semester": body.semester,
        })
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create course.",
        )

    return result.data[0]


@router.patch("/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: str,
    body: CourseUpdate,
    user=Depends(get_current_user),
):
    """Updates fields on an existing course. Only the owner can update."""
    supabase = get_supabase()

    # Verify ownership
    existing = (
        supabase.table("courses")
        .select("id")
        .eq("id", course_id)
        .eq("user_id", user.id)
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update.")

    result = (
        supabase.table("courses")
        .update(updates)
        .eq("id", course_id)
        .execute()
    )

    return result.data[0]


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course(course_id: str, user=Depends(get_current_user)):
    """Deletes a course. Cascades to uploads and gaps."""
    supabase = get_supabase()

    existing = (
        supabase.table("courses")
        .select("id")
        .eq("id", course_id)
        .eq("user_id", user.id)
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    supabase.table("courses").delete().eq("id", course_id).execute()
