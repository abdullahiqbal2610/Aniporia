from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import shutil
import os

# Import your actual AI Engines
from step1_ingestion import IngestionEngine
from step2_tutor_engine import AcademicTutorEngine

# ==========================================
# 🚀 1. INITIALIZE AI MODELS (Global Load)
# ==========================================
print("⏳ Booting up FastAPI Server and AI Models...")
# By initializing these outside the endpoints, they only load into memory ONCE.
ingestion_engine = IngestionEngine(use_mock=False)
tutor_engine = AcademicTutorEngine()
print("✅ All AI Engines Online and Ready for Web Traffic!")

app = FastAPI(title="Aniporia API", version="3.0 - Spaced Repetition Edition")

# CORS Middleware (Allows your frontend to talk to this backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 🧱 2. PYDANTIC SCHEMAS (Data Validation)
# ==========================================
# For individual node learning (Yellow Nodes)
class NodeLearnRequest(BaseModel):
    topic: str
    previous_questions: Optional[List[dict]] = None

# For the final comprehensive boss fight (Green Nodes)
class RevisionRequest(BaseModel):
    mastered_topics: List[str]
    num_questions: int = 10 # Default to a bigger 10-question exam
    previous_questions: Optional[List[dict]] = None

# ==========================================
# 🌐 3. API ENDPOINTS
# ==========================================

@app.get("/")
def health_check():
    return {"status": "Aniporia Node-by-Node Engine is Online! 🚀"}

# --- ENDPOINT 1: THE MAP BUILDER ---
@app.post("/api/analyze")
async def analyze_notes(
    file: UploadFile = File(...),
    syllabus_topics: str = Form(...) 
):
    """
    Takes the image and syllabus, extracts text, and returns what is missing.
    The frontend uses this to draw the interactive node map.
    """
    print(f"\n🗺️ [API] Building Map for: {file.filename}")
    
    temp_image_path = f"temp_{file.filename}"
    with open(temp_image_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    topics_list = [t.strip() for t in syllabus_topics.split(',')]
    
    try:
        # 1. Extract Text
        extracted_text = ingestion_engine.extract_text(temp_image_path)
        
        # 2. Find Gaps
        analysis_report = tutor_engine.analyze_gaps(topics_list, extracted_text)
        
        return {
            "extracted_text": extracted_text,
            "analysis": analysis_report
        }
        
    except Exception as e:
        return {"error": f"Analysis failed: {str(e)}"}
    finally:
        if os.path.exists(temp_image_path):
            os.remove(temp_image_path)


# --- ENDPOINT 2: THE MICRO-TUTOR ---
@app.post("/api/learn-node")
async def learn_single_node(request: NodeLearnRequest):
    """
    Takes a single missing topic (when clicked by the user) and generates
    a targeted crash-course and 3-question quiz for just that node.
    """
    print(f"\n🧠 [API] Microlearning requested for node: '{request.topic}'")
    
    # The Tutor engine expects a list of dicts, so we format the single topic to match
    target_topic_payload = [{"topic": request.topic}]
    
    try:
        # 1. Generate the Lesson (TL;DR, Bullet points)
        lesson_data = tutor_engine.generate_remediation(target_topic_payload)
        
        # 2. Generate the Quiz (3 adaptive questions)
        quiz_data = tutor_engine.generate_mock_exam(
            topics_list=target_topic_payload, 
            num_questions=3, 
            previous_questions=request.previous_questions
        )
        
        return {
            "node_topic": request.topic,
            "lesson": lesson_data.get("remediation_nodes", [])[0] if lesson_data.get("remediation_nodes") else {},
            "quiz": quiz_data.get("quiz", [])
        }
        
    except Exception as e:
        return {"error": f"Node generation failed: {str(e)}"}


# --- ENDPOINT 3: THE BOSS FIGHT (Revision Exam) ---
@app.post("/api/revision-exam")
async def generate_revision_exam(request: RevisionRequest):
    """
    Takes a list of MASTERED topics (green nodes) and generates a 
    comprehensive final exam mixing all of them together.
    """
    print(f"\n🎓 [API] Revision Exam requested for {len(request.mastered_topics)} topics!")
    
    # The engine expects a list of dictionaries, so we format the incoming strings
    topic_payload = [{"topic": t} for t in request.mastered_topics]
    
    try:
        # Notice we pass is_revision=True to trigger the harder prompt!
        quiz_data = tutor_engine.generate_mock_exam(
            topics_list=topic_payload, 
            num_questions=request.num_questions, 
            previous_questions=request.previous_questions,
            is_revision=True
        )
        
        return {
            "status": "success",
            "exam_type": "revision",
            "total_questions": len(quiz_data.get("quiz", [])),
            "quiz": quiz_data.get("quiz", [])
        }
        
    except Exception as e:
        return {"error": f"Revision exam generation failed: {str(e)}"}