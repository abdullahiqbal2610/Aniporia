# backend/routers/practice.py - Fixed version

"""
Practice Router
---------------
POST /practice/generate            → Call AI engine to get questions for a topic
POST /practice/complete            → Save session + compute real score/badge + update gaps & course mastery
POST /practice/sessions            → Save a completed practice session + topic breakdown
GET  /practice/sessions            → List all past sessions for the user
GET  /practice/sessions/{id}       → Get one session with full topic breakdown
GET  /practice/stats               → Aggregated stats (avg score, improvement, badges)
"""

import os
import httpx
import time
import json
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
    score_before: int
    results: list[TopicResult]


class PracticeSessionCreate(BaseModel):
    score_before: int
    score_after: int
    badge: str | None = None
    results: list[TopicResult]


# ---------- Mock Data Fallback ----------

def get_mock_quiz(topic: str):
    """Return mock quiz data when AI engine is unavailable"""
    return {
        "node_topic": topic,
        "lesson": f"This is a crash course on {topic}.",
        "quiz": [
            {
                "question": f"What is the fundamental concept of {topic}?",
                "options": [
                    "Basic principles and theories",
                    "Advanced applications only",
                    "Historical context only",
                    "Future predictions"
                ],
                "correct_answer": "Basic principles and theories",
                "explanation": f"The fundamental concept of {topic} starts with understanding the basic principles."
            },
            {
                "question": f"Which is most important when learning {topic}?",
                "options": [
                    "Memorizing all facts",
                    "Understanding core concepts",
                    "Speed reading",
                    "Skipping basics"
                ],
                "correct_answer": "Understanding core concepts",
                "explanation": "Understanding core concepts provides the foundation for advanced topics."
            },
            {
                "question": f"What is the best approach to master {topic}?",
                "options": [
                    "Regular practice and application",
                    "One-time intensive study",
                    "Only theoretical learning",
                    "Avoiding practical exercises"
                ],
                "correct_answer": "Regular practice and application",
                "explanation": "Regular practice and real-world application help reinforce learning."
            }
        ]
    }


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


def _update_gaps_and_mastery(supabase, user_id: str, results: list[TopicResult]):
    """
    After a practice session:
    1. Update each gap's gap_score based on practice performance.
    2. Recalculate and update mastery_percent for affected courses.
    """
    if not results:
        return

    affected_courses = set()

    for result in results:
        accuracy = (result.correct / result.total * 100) if result.total > 0 else 0

        gaps = (
            supabase.table("gaps")
            .select("id, gap_score, course_id, priority")
            .eq("user_id", user_id)
            .ilike("topic", f"%{result.topic}%")
            .execute()
        ).data or []

        for gap in gaps:
            old_score = gap.get("gap_score", 0)
            new_score = min(100, round(old_score * 0.5 + accuracy * 0.5))

            if new_score >= 80:
                new_priority = "LOW"
            elif new_score >= 40:
                new_priority = "MEDIUM"
            else:
                new_priority = "HIGH"

            supabase.table("gaps").update({
                "gap_score": new_score,
                "priority": new_priority,
            }).eq("id", gap["id"]).execute()

            affected_courses.add(gap["course_id"])

    for course_id in affected_courses:
        course_gaps = (
            supabase.table("gaps")
            .select("gap_score")
            .eq("user_id", user_id)
            .eq("course_id", course_id)
            .execute()
        ).data or []

        if course_gaps:
            scores = [g.get("gap_score", 0) for g in course_gaps]
            avg_mastery = round(sum(scores) / len(scores))
            supabase.table("courses").update({
                "mastery_percent": avg_mastery
            }).eq("id", course_id).eq("user_id", user_id).execute()


# ---------- Routes ----------

@router.post("/generate")
async def generate_questions(body: GenerateRequest, user=Depends(get_current_user)):
    """
    Calls the AI engine's /api/learn-node endpoint to get a lesson + 3-question quiz.
    Falls back to mock data if AI engine fails.
    """
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{AI_ENGINE_URL}/api/learn-node",
                json={
                    "topic": body.topic,
                    "previous_questions": body.previous_questions or [],
                },
            )
            if response.status_code == 200:
                data = response.json()
                if data and data.get("quiz") and len(data.get("quiz", [])) > 0:
                    return data
    except Exception as e:
        print(f"[DEBUG] AI engine error: {e}, using mock fallback")

    return get_mock_quiz(body.topic)


@router.post("/complete", status_code=status.HTTP_201_CREATED)
async def complete_session(body: CompleteSessionRequest, user=Depends(get_current_user)):
    """
    Called when a practice session ends.
    Computes score, saves session + topic results, updates gaps & mastery.
    """
    supabase = get_supabase()

    total_correct = sum(r.correct for r in body.results)
    total_questions = sum(r.total for r in body.results)
    score_after = round((total_correct / total_questions) * 100) if total_questions > 0 else 0

    improvement = score_after - body.score_before
    badge = _compute_badge(improvement, score_after)

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

    _update_gaps_and_mastery(supabase, user.id, body.results)

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
    """Saves a completed practice session and its per-topic breakdown."""
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

    _update_gaps_and_mastery(supabase, user.id, body.results)

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
    """Returns aggregated practice statistics."""
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


# ---------- Mock Exam Routes ----------

class MockExamRequest(BaseModel):
    pass


class MockExamSubmitRequest(BaseModel):
    answers: dict[int, str]  # question_id -> selected_answer string
    questions: list[dict]    # full question list with correct_answer for server-side scoring


@router.get("/mock-exam/status", response_model=dict)
async def mock_exam_status(user=Depends(get_current_user)):
    """Check eligibility and get current mastery/gaps for mock exam."""
    supabase = get_supabase()

    courses = (
        supabase.table("courses")
        .select("mastery_percent")
        .eq("user_id", user.id)
        .execute()
    ).data or []

    current_mastery = (
        round(sum(c["mastery_percent"] for c in courses) / len(courses))
        if courses else 0
    )

    gaps = (
        supabase.table("gaps")
        .select("topic, priority")
        .eq("user_id", user.id)
        .eq("priority", "HIGH")
        .execute()
    ).data or []

    return {
        "current_mastery": current_mastery,
        "required_mastery": 0,
        "is_unlocked": True,
        "gaps_remaining": len(gaps),
        "gap_topics": [g["topic"] for g in gaps[:12]],
    }


@router.post("/mock-exam/start")
async def start_mock_exam(body: MockExamRequest, user=Depends(get_current_user)):
    """
    Generate a 50-question AI mock exam using the user's actual gap topics.
    Falls back to generic questions if AI engine is unavailable.
    """
    supabase = get_supabase()

    # Fetch user's actual gap topics
    gaps_result = (
        supabase.table("gaps")
        .select("topic, priority")
        .eq("user_id", user.id)
        .order("priority", desc=False)  # HIGH first
        .execute()
    ).data or []

    gap_topics = [g["topic"] for g in gaps_result]

    # Also fetch courses for additional context
    courses_result = (
        supabase.table("courses")
        .select("name")
        .eq("user_id", user.id)
        .execute()
    ).data or []

    # If no gaps found, use course names as topics
    if not gap_topics:
        gap_topics = [c["name"] for c in courses_result]

    # Fallback if still empty
    if not gap_topics:
        gap_topics = ["General Knowledge", "Core Concepts", "Applied Theory"]

    all_questions = []
    question_id = 1

    # Try to generate AI questions for each topic
    questions_per_topic = max(3, 50 // len(gap_topics)) if gap_topics else 5
    
    for topic in gap_topics:
        if question_id > 50:
            break
        
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    f"{AI_ENGINE_URL}/api/learn-node",
                    json={
                        "topic": topic,
                        "previous_questions": [],
                    },
                )
                if response.status_code == 200:
                    data = response.json()
                    quiz_items = data.get("quiz", [])
                    for q in quiz_items:
                        if question_id > 50:
                            break
                        all_questions.append({
                            "id": question_id,
                            "topic": topic,
                            "question": q.get("question", f"Question about {topic}"),
                            "options": q.get("options", []),
                            "correct_answer": q.get("correct_answer", ""),
                            "explanation": q.get("explanation", ""),
                        })
                        question_id += 1
                    continue
        except Exception as e:
            print(f"[MOCK EXAM] AI failed for topic '{topic}': {e}")

        # Fallback: generate generic questions for this topic
        mock = get_mock_quiz(topic)
        for q in mock["quiz"]:
            if question_id > 50:
                break
            all_questions.append({
                "id": question_id,
                "topic": topic,
                "question": q["question"],
                "options": q["options"],
                "correct_answer": q["correct_answer"],
                "explanation": q["explanation"],
            })
            question_id += 1

    # Pad to 50 if needed with generic questions
    while len(all_questions) < 50:
        topic = gap_topics[len(all_questions) % len(gap_topics)]
        mock = get_mock_quiz(topic)
        for q in mock["quiz"]:
            if len(all_questions) >= 50:
                break
            all_questions.append({
                "id": len(all_questions) + 1,
                "topic": topic,
                "question": q["question"],
                "options": q["options"],
                "correct_answer": q["correct_answer"],
                "explanation": q["explanation"],
            })

    return {
        "exam_id": f"mock_{user.id}_{int(time.time())}",
        "total_questions": len(all_questions),
        "questions": all_questions,
        "time_limit_minutes": 120,
    }


@router.post("/mock-exam/submit")
async def submit_mock_exam(body: MockExamSubmitRequest, user=Depends(get_current_user)):
    """
    Submit mock exam answers and get results.
    Scores against the actual correct_answer strings from the question list.
    """
    supabase = get_supabase()

    # Build a lookup of question_id -> correct_answer from submitted question list
    correct_map: dict[int, str] = {}
    for q in body.questions:
        qid = q.get("id")
        if qid is not None:
            correct_map[int(qid)] = q.get("correct_answer", "")

    total = len(body.answers)
    correct = 0
    topic_results: dict[str, dict] = {}

    for q in body.questions:
        qid = int(q.get("id", 0))
        topic = q.get("topic", "General")
        selected = body.answers.get(qid)
        is_correct = selected is not None and selected == correct_map.get(qid, "")

        if topic not in topic_results:
            topic_results[topic] = {"correct": 0, "total": 0}
        topic_results[topic]["total"] += 1
        if is_correct:
            topic_results[topic]["correct"] += 1
            correct += 1

    score = round((correct / total) * 100) if total > 0 else 0
    badge = _compute_badge(score, score)

    # Save to DB (no exam_type column — use standard practice_sessions)
    session_result = supabase.table("practice_sessions").insert({
        "user_id": user.id,
        "score_before": 0,
        "score_after": score,
        "badge": badge,
    }).execute()

    session_id = session_result.data[0]["id"] if session_result.data else None

    # Save per-topic results
    if session_id and topic_results:
        topic_rows = [
            {
                "session_id": session_id,
                "topic": topic,
                "correct": vals["correct"],
                "total": vals["total"],
            }
            for topic, vals in topic_results.items()
        ]
        supabase.table("practice_results").insert(topic_rows).execute()

        # Update gaps/mastery based on performance
        results_list = [
            TopicResult(topic=t, correct=v["correct"], total=v["total"])
            for t, v in topic_results.items()
        ]
        _update_gaps_and_mastery(supabase, user.id, results_list)

    return {
        "score": score,
        "correct": correct,
        "total": total,
        "passed": score >= 70,
        "badge": badge,
        "topic_breakdown": topic_results,
    }