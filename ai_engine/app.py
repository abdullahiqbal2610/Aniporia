from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import json
from main import run_aniporia_pipeline

# Initialize the API
app = FastAPI(title="Aniporia AI Engine API")

# Add CORS Middleware so your frontend team's local server (like React/Vue) can talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"status": "Aniporia AI Engine is Online! 🚀"}

@app.post("/analyze-notes")
async def analyze_notes(
    file: UploadFile = File(...),
    syllabus_topics: str = Form(...) # Frontend will send topics as a comma-separated string
):
    print(f"\n🌐 [API] Received Request!")
    print(f"📥 Image: {file.filename}")
    print(f"📚 Topics: {syllabus_topics}")
    
    # 1. Save the uploaded image temporarily to the ai_engine folder
    temp_image_path = f"temp_{file.filename}"
    with open(temp_image_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # 2. Parse the syllabus string back into a Python list
    topics_list = [t.strip() for t in syllabus_topics.split(',')]
    
    # 3. FIRE THE ENGINE!
    try:
        # Call the exact function you wrote in main.py
        raw_json_string = run_aniporia_pipeline(temp_image_path, topics_list)
        
        # main.py returns a string, so we convert it back to a dict for FastAPI
        final_response = json.loads(raw_json_string) 
    except Exception as e:
        final_response = {"error": f"Pipeline failed: {str(e)}"}
    finally:
        # 4. Cleanup: Delete the temporary image so we don't clutter your hard drive
        if os.path.exists(temp_image_path):
            os.remove(temp_image_path)
            
    # FastAPI automatically converts this dictionary into a perfect web JSON response
    return final_response