"""
Gaps Router
-----------
GET    /gaps                  → List all gaps (optionally filter by course)
DELETE /gaps/{id}             → Dismiss / resolve a gap
"""

from fastapi import APIRouter, Depends, HTTPException, status
from services.supabase_client import get_supabase
from services.auth import get_current_user

router = APIRouter(prefix="/gaps", tags=["Knowledge Gaps"])


@router.get("/")
async def list_gaps(
    course_id: str | None = None,
    priority: str | None = None,
    user=Depends(get_current_user),
):
    """
    Returns knowledge gaps for the authenticated user.
    Optionally filter by course_id and/or priority (HIGH, MEDIUM, LOW).
    """
    supabase = get_supabase()

    query = (
        supabase.table("gaps")
        .select("*, courses(name, code)")
        .eq("user_id", user.id)
        .order("gap_score", desc=True)
    )

    if course_id:
        query = query.eq("course_id", course_id)
    if priority:
        query = query.eq("priority", priority.upper())

    result = query.execute()
    return result.data or []


@router.delete("/{gap_id}", status_code=status.HTTP_204_NO_CONTENT)
async def dismiss_gap(gap_id: str, user=Depends(get_current_user)):
    """Marks a gap as resolved by deleting it."""
    supabase = get_supabase()

    existing = (
        supabase.table("gaps")
        .select("id")
        .eq("id", gap_id)
        .eq("user_id", user.id)
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gap not found.")

    supabase.table("gaps").delete().eq("id", gap_id).execute()
