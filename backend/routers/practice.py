# backend/routers/practice.py - Complete updated version with mock fallback

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
        "lesson": f"This is a crash course on {topic}. The key concepts include understanding the fundamentals, practical applications, and common use cases.",
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
                "explanation": f"The fundamental concept of {topic} starts with understanding the basic principles and theories that form its foundation."
            },
            {
                "question": f"Which of the following is most important when learning {topic}?",
                "options": [
                    "Memorizing all facts",
                    "Understanding core concepts",
                    "Speed reading",
                    "Skipping basics"
                ],
                "correct_answer": "Understanding core concepts",
                "explanation": "Understanding core concepts is crucial as it provides the foundation for advanced topics."
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
                "explanation": "Regular practice and real-world application help reinforce learning and identify knowledge gaps."
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
    print(f"[DEBUG] Updating gaps for user {user_id} with results: {results}")
    
    if not results:
        print("[DEBUG] No results to process")
        return

    affected_courses = set()

    for result in results:
        accuracy = (result.correct / result.total * 100) if result.total > 0 else 0
        print(f"[DEBUG] Topic: {result.topic}, Accuracy: {accuracy}%")

        # Find the gap(s) matching this topic for this user
        gaps = (
            supabase.table("gaps")
            .select("id, gap_score, course_id, priority")
            .eq("user_id", user_id)
            .ilike("topic", f"%{result.topic}%")
            .execute()
        ).data or []
        
        print(f"[DEBUG] Found {len(gaps)} gaps for topic {result.topic}")

        for gap in gaps:
            old_score = gap.get("gap_score", 0)
            new_score = min(100, round(old_score * 0.5 + accuracy * 0.5))

            if new_score >= 80:
                new_priority = "LOW"
            elif new_score >= 40:
                new_priority = "MEDIUM"
            else:
                new_priority = "HIGH"

            print(f"[DEBUG] Updating gap {gap['id']}: old_score={old_score}, new_score={new_score}, priority={new_priority}")
            
            supabase.table("gaps").update({
                "gap_score": new_score,
                "priority": new_priority,
            }).eq("id", gap["id"]).execute()
            
            affected_courses.add(gap["course_id"])

    # Now recalculate mastery for all affected courses
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
            print(f"[DEBUG] Updating course {course_id}: avg_mastery={avg_mastery} from {len(scores)} gaps")
            
            supabase.table("courses").update({
                "mastery_percent": avg_mastery
            }).eq("id", course_id).eq("user_id", user_id).execute()


# ---------- Routes ----------

@router.post("/generate")
async def generate_questions(body: GenerateRequest, user=Depends(get_current_user)):
    """
    Calls the AI engine's /api/learn-node endpoint to get a lesson + 3-question quiz
    for the given topic. Falls back to mock data if AI engine fails.
    """
    # Try AI engine first
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
                # Check if we got valid data
                if data and data.get("quiz") and len(data.get("quiz", [])) > 0:
                    print(f"[DEBUG] Using AI-generated quiz for {body.topic}")
                    return data
                else:
                    print(f"[DEBUG] AI returned empty/invalid data, using mock fallback")
            else:
                print(f"[DEBUG] AI returned status {response.status_code}, using mock fallback")
    except Exception as e:
        print(f"[DEBUG] AI engine error: {e}, using mock fallback")
    
    # Fallback to mock data
    print(f"[DEBUG] Using mock quiz data for topic: {body.topic}")
    return get_mock_quiz(body.topic)


@router.post("/complete", status_code=status.HTTP_201_CREATED)
async def complete_session(body: CompleteSessionRequest, user=Depends(get_current_user)):
    """
    Called when a practice session ends.
    1. Computes the real score_after from results.
    2. Picks a badge.
    3. Saves to DB.
    4. Updates gap scores and course mastery percentages.
    Returns everything the feedback page needs.
    """
    supabase = get_supabase()

    total_correct = sum(r.correct for r in body.results)
    total_questions = sum(r.total for r in body.results)
    score_after = round((total_correct / total_questions) * 100) if total_questions > 0 else 0

    improvement = score_after - body.score_before
    badge = _compute_badge(improvement, score_after)

    print(f"[DEBUG] Session complete: before={body.score_before}, after={score_after}, improvement={improvement}, badge={badge}")

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
    print(f"[DEBUG] Saved session {session_id}")

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
        print(f"[DEBUG] Saved {len(topic_rows)} topic results")

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

class MockExamQuestion(BaseModel):
    id: int
    question: str
    options: list[str]
    correct_answer: int  # index of correct option


class MockExamRequest(BaseModel):
    """Request to start a mock exam"""
    pass


class MockExamSubmitRequest(BaseModel):
    """Submit mock exam answers"""
    answers: dict[int, int]  # question_id -> selected_option_index


@router.get("/mock-exam/status", response_model=dict)
async def mock_exam_status(user=Depends(get_current_user)):
    """Check if user is eligible for mock exam and get current score/gaps"""
    supabase = get_supabase()
    
    # Get user's courses and calculate overall mastery
    courses = (
        supabase.table("courses")
        .select("mastery_percent")
        .eq("user_id", user.id)
        .execute()
    ).data or []
    
    if not courses:
        current_mastery = 0
    else:
        current_mastery = round(sum(c["mastery_percent"] for c in courses) / len(courses))
    
    # Get gaps
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
    """Generate a new mock exam with 50 questions"""
    
    # Create mock exam questions (50 questions across different topics)
    topics = [
        "Data Structures", "Algorithms", "Database Design", "System Design",
        "Operating Systems", "Networking", "Web Development", "Machine Learning",
        "Software Engineering", "Security"
    ]
    
    questions = []
    question_id = 1
    
    for i, topic in enumerate(topics):
        for j in range(5):  # 5 questions per topic
            questions.append(MockExamQuestion(
                id=question_id,
                question=f"Question {question_id}: What is an important concept in {topic}?",
                options=[
                    f"{topic} concept A",
                    f"{topic} concept B",
                    f"{topic} concept C",
                    f"{topic} concept D",
                ],
                correct_answer=j % 4
            ))
            question_id += 1
    
    return {
        "exam_id": f"mock_{user.id}_{int(time.time())}",
        "total_questions": len(questions),
        "questions": [q.model_dump() for q in questions],
        "time_limit_minutes": 120,
    }


@router.post("/mock-exam/submit")
async def submit_mock_exam(body: MockExamSubmitRequest, user=Depends(get_current_user)):
    """Submit mock exam answers and get results"""
    
    # For now, calculate score based on submitted answers
    # In production, you'd verify against actual correct answers
    total = len(body.answers)
    correct = sum(1 for v in body.answers.values() if v == 0)  # Simplified: answer 0 is always correct
    
    score = round((correct / total) * 100) if total > 0 else 0
    
    supabase = get_supabase()
    
    # Save mock exam result
    result = supabase.table("practice_sessions").insert({
        "user_id": user.id,
        "score_before": 0,
        "score_after": score,
        "badge": _compute_badge(score, score),
        "exam_type": "mock",
    }).execute()
    
    return {
        "score": score,
        "correct": correct,
        "total": total,
        "passed": score >= 70,
        "badge": _compute_badge(score, score),
    }