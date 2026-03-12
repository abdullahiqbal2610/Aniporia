"""
Profiles Router
---------------
POST   /profiles/     → Create or update a user profile (onboarding)
GET    /profiles/me   → Get the current user's profile
DELETE /profiles/me   → Permanently delete the account + all data
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
    supabase = get_supabase()

    result = (
        supabase.table("profiles")
        .upsert({"id": user.id, **body.model_dump()}, on_conflict="id")
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save profile.")

    return result.data[0]


@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(user=Depends(get_current_user)):
    supabase = get_supabase()

    result = (
        supabase.table("profiles")
        .select("*")
        .eq("id", user.id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found.")

    return result.data


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(user=Depends(get_current_user)):
    """
    Permanently deletes the authenticated user's account.

    Order of operations:
      1. Delete all DB rows (gaps, uploads, courses, profile) — cascade handles
         most of this if FK ON DELETE CASCADE is set, but we do it explicitly
         to be safe and avoid FK constraint errors.
      2. Delete the auth.users row via the admin API (requires service role key).

    The service role client already has admin privileges — no extra setup needed.
    """
    supabase = get_supabase()
    uid = user.id

    try:
        # 1. Delete user data in dependency order
        #    (If your FK constraints use CASCADE this is redundant but harmless)
        supabase.table("gaps").delete().eq("user_id", uid).execute()
        supabase.table("uploads").delete().eq("user_id", uid).execute()

        # Fetch session IDs first, then delete results (no subquery support in client)
        sessions = supabase.table("practice_sessions").select("id").eq("user_id", uid).execute()
        session_ids = [s["id"] for s in (sessions.data or [])]
        if session_ids:
            supabase.table("practice_results").delete().in_("session_id", session_ids).execute()
        supabase.table("practice_sessions").delete().eq("user_id", uid).execute()
        supabase.table("courses").delete().eq("user_id", uid).execute()
        supabase.table("profiles").delete().eq("id", uid).execute()

        # 2. Delete from auth.users (admin-only operation)
        supabase.auth.admin.delete_user(uid)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete account: {str(e)}",
        )