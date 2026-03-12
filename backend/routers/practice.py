"""
Practice Router
---------------
POST /practice/sessions            → Save a completed practice session + topic breakdown
GET  /practice/sessions            → List all past sessions for the user
GET  /practice/sessions/{id}       → Get one session with full topic breakdown
GET  /practice/stats               → Aggregated stats (avg score, improvement, badges)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from services.supabase_client import get_supabase
from services.auth import get_current_user

router = APIRouter(prefix="/practice", tags=["Practice"])


# ---------- Schemas ----------

class TopicResult(BaseModel):
    topic: str
    correct: int
    total: int


class PracticeSessionCreate(BaseModel):
    score_before: int
    score_after: int
    badge: str | None = None
    results: list[TopicResult]


# ---------- Routes ----------

@router.post("/sessions", status_code=status.HTTP_201_CREATED)
async def save_session(body: PracticeSessionCreate, user=Depends(get_current_user)):
    """
    Saves a completed practice session and its per-topic breakdown.
    Returns the created session with results.
    """
    supabase = get_supabase()

    # Insert session
    session_result = (
        supabase.table("practice_sessions")
        .insert({
            "user_id": user.id,
            "score_before": body.score_before,
            "score_after": body.score_after,
            "badge": body.badge,
        })
        .execute()
    )

    if not session_result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save practice session.",
        )

    session_id = session_result.data[0]["id"]

    # Insert per-topic results
    if body.results:
        topic_rows = [
            {
                "session_id": session_id,
                "topic": r.topic,
                "correct": r.correct,
                "total": r.total,
            }
            for r in body.results
        ]
        supabase.table("practice_results").insert(topic_rows).execute()

    return {
        "session_id": session_id,
        **session_result.data[0],
        "results": [r.model_dump() for r in body.results],
    }


@router.get("/sessions")
async def list_sessions(user=Depends(get_current_user)):
    """Returns all practice sessions for the user, newest first."""
    supabase = get_supabase()

    result = (
        supabase.table("practice_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("completed_at", desc=True)
        .execute()
    )

    return result.data or []


@router.get("/sessions/{session_id}")
async def get_session(session_id: str, user=Depends(get_current_user)):
    """Returns one session with its full per-topic breakdown."""
    supabase = get_supabase()

    session = (
        supabase.table("practice_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", user.id)
        .single()
        .execute()
    )

    if not session.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    results = (
        supabase.table("practice_results")
        .select("*")
        .eq("session_id", session_id)
        .execute()
    )

    return {**session.data, "results": results.data or []}


@router.get("/stats")
async def get_stats(user=Depends(get_current_user)):
    """
    Returns aggregated practice statistics:
    - Total sessions completed
    - Average score improvement (score_after - score_before)
    - Best score achieved
    - All badges earned
    """
    supabase = get_supabase()

    sessions = (
        supabase.table("practice_sessions")
        .select("score_before, score_after, badge")
        .eq("user_id", user.id)
        .execute()
    ).data or []

    if not sessions:
        return {
            "total_sessions": 0,
            "avg_improvement": 0,
            "best_score": 0,
            "badges": [],
        }

    improvements = [s["score_after"] - s["score_before"] for s in sessions]
    scores = [s["score_after"] for s in sessions]
    badges = list({s["badge"] for s in sessions if s["badge"]})

    return {
        "total_sessions": len(sessions),
        "avg_improvement": round(sum(improvements) / len(improvements), 1),
        "best_score": max(scores),
        "badges": badges,
    }
