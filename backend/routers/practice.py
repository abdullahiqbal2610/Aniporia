"""
Practice Router
---------------
POST /practice/generate            → Call AI engine to get questions for a topic
POST /practice/complete            → Save session + compute real score/badge
POST /practice/sessions            → Save a completed practice session + topic breakdown
GET  /practice/sessions            → List all past sessions for the user
GET  /practice/sessions/{id}       → Get one session with full topic breakdown
GET  /practice/stats               → Aggregated stats (avg score, improvement, badges)
"""

import os
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from services.supabase_client import get_supabase
from services.auth import get_current_user

router = APIRouter(prefix="/practice", tags=["Practice"])

AI_ENGINE_URL = os.getenv("AI_ENGINE_URL", "http://127.0.0.1:8001")


# ---------- Schemas ----------

class GenerateRequest(BaseModel):
    topic: str
    previous_questions: list[dict] | None = None


class TopicResult(BaseModel):
    topic: str
    correct: int
    total: int


class CompleteSessionRequest(BaseModel):
    """
    Sent by the frontend when the user finishes a practice session.
    score_before: mastery % before this session (from the gap's gap_score or 0)
    results: per-topic breakdown
    """
    score_before: int
    results: list[TopicResult]


class PracticeSessionCreate(BaseModel):
    score_before: int
    score_after: int
    badge: str | None = None
    results: list[TopicResult]


# ---------- Helpers ----------

def _compute_badge(improvement: int, score_after: int) -> str | None:
    if improvement >= 40:
        return "Massive Leap"
    if improvement >= 20:
        return "Quick Learner"
    if score_after >= 90:
        return "Top Scorer"
    if score_after >= 70:
        return "Solid Understanding"
    return None


# ---------- Routes ----------

@router.post("/generate")
async def generate_questions(body: GenerateRequest, user=Depends(get_current_user)):
    """
    Calls the AI engine's /api/learn-node endpoint to get a lesson + 3-question quiz
    for the given topic. Requires auth so the frontend never calls the AI engine directly.
    """
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{AI_ENGINE_URL}/api/learn-node",
                json={
                    "topic": body.topic,
                    "previous_questions": body.previous_questions or [],
                },
            )
            response.raise_for_status()
            data = response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI engine timed out. Please try again.")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"AI engine error: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not reach AI engine: {str(e)}")

    if "error" in data:
        raise HTTPException(status_code=502, detail=data["error"])

    return data  # { node_topic, lesson, quiz: [{question, options, correct_answer, explanation}] }


@router.post("/complete", status_code=status.HTTP_201_CREATED)
async def complete_session(body: CompleteSessionRequest, user=Depends(get_current_user)):
    """
    Called when a practice session ends.
    Computes the real score_after from results, picks a badge, saves to DB,
    and returns everything the feedback page needs.
    """
    supabase = get_supabase()

    # Compute score_after as weighted accuracy across all results
    total_correct = sum(r.correct for r in body.results)
    total_questions = sum(r.total for r in body.results)
    score_after = round((total_correct / total_questions) * 100) if total_questions > 0 else 0

    improvement = score_after - body.score_before
    badge = _compute_badge(improvement, score_after)

    # Insert session
    session_result = (
        supabase.table("practice_sessions")
        .insert({
            "user_id": user.id,
            "score_before": body.score_before,
            "score_after": score_after,
            "badge": badge,
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
        "score_before": body.score_before,
        "score_after": score_after,
        "improvement": improvement,
        "badge": badge,
        "results": [r.model_dump() for r in body.results],
    }


@router.post("/sessions", status_code=status.HTTP_201_CREATED)
async def save_session(body: PracticeSessionCreate, user=Depends(get_current_user)):
    """
    Saves a completed practice session and its per-topic breakdown.
    Returns the created session with results.
    """
    supabase = get_supabase()

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
    Returns aggregated practice statistics.
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