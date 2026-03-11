"""
Profiles Router
---------------
POST /profiles       → Create or update a user profile (called after signup)
GET  /profiles/me    → Get the current user's profile
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from services.supabase_client import get_supabase
from services.auth import get_current_user

router = APIRouter(prefix="/profiles", tags=["Profiles"])


# ---------- Schemas ----------

class ProfileCreate(BaseModel):
    full_name: str
    contact_number: str
    institution: str
    graduation_year: str
    academic_level: str


class ProfileResponse(BaseModel):
    id: str
    full_name: str | None
    contact_number: str | None
    institution: str | None
    graduation_year: str | None
    academic_level: str | None


# ---------- Routes ----------

@router.post("/", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_or_update_profile(
    body: ProfileCreate,
    user=Depends(get_current_user),
):
    """
    Called after Supabase Auth signup to save the onboarding form data.
    Uses upsert so it also works as an update if the profile already exists.
    """
    supabase = get_supabase()

    data = {
        "id": user.id,
        **body.model_dump(),
    }

    result = (
        supabase.table("profiles")
        .upsert(data, on_conflict="id")
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save profile.",
        )

    return result.data[0]


@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(user=Depends(get_current_user)):
    """Returns the authenticated user's profile."""
    supabase = get_supabase()

    result = (
        supabase.table("profiles")
        .select("*")
        .eq("id", user.id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Complete onboarding first.",
        )

    return result.data
