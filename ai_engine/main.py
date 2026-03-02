import json
from step1_ingestion import IngestionEngine
from step2_vectormath import SemanticAnalyzer
from step3_tutor import TutorEngine

def run_aniporia_pipeline(image_path, syllabus_topics):
    print("🚀 Booting up Aniporia AI Core...\n")
    
    # 1. Initialize all three engines
    ingestion = IngestionEngine(use_mock=False)
    analyzer = SemanticAnalyzer()
    tutor = TutorEngine()
    
    # 2. PHASE 1: Extract Text from the Image (Eyes)
    print("\n==================================")
    print("▶️ PHASE 1: INGESTION (Eyes)")
    print("==================================")
    extracted_text = ingestion.extract_text(image_path)
    print(f"📄 Student Wrote: '{extracted_text}'")
    
    # 3. PHASE 2: Run the Math (Brain)
    print("\n==================================")
    print("▶️ PHASE 2: GAP ANALYSIS (Brain)")
    print("==================================")
    analysis_report = analyzer.analyze_gaps(syllabus_topics, extracted_text, threshold=0.55)
    
    # 4. PHASE 3: Generate Remediation (Mouth)
    print("\n==================================")
    print("▶️ PHASE 3: AI TUTOR (Remediation)")
    print("==================================")
    
    # Get the Study Guide
    study_guide = tutor.generate_remediation(analysis_report["missing_topics"])
    
    # Get the Mock Exam (This returns a JSON string)
    mock_exam_string = tutor.generate_mock_exam(analysis_report["missing_topics"])
    
    # Convert the string into a real Python dictionary so it embeds cleanly
    try:
        mock_exam_data = json.loads(mock_exam_string)
    except json.JSONDecodeError:
        mock_exam_data = {"error": "Failed to parse mock exam JSON"}

    # 5. Combine everything into a final response
    final_payload = {
        "extracted_text": extracted_text,
        "analysis": analysis_report,
        "study_guide": study_guide,
        "mock_exam": mock_exam_data # <--- ADDED THE EXAM HERE!
    }
    
    print("\n==================================")
    print("✅ FINAL BUNDLE READY")
    print("==================================")
    json_output = json.dumps(final_payload, indent=4)
    print(json_output)
    
    return json_output

# ==========================================
# TEST THE CODE LOCALLY
# ==========================================

if __name__ == "__main__":
    # The syllabus we expect the student to know
    test_syllabus = [
        "Handwritten Text Recognition",
        "Using TensorFlow",
        "Deep Learning",
        "Photosynthesis"
    ]
    
    # Your real handwritten note
    test_image = "test_data/test_note.png" 
    
    run_aniporia_pipeline(test_image, test_syllabus)