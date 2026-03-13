import json
from step1_ingestion import IngestionEngine
# We now import the single merged Brain/Mouth instead of the two old files
from step2_tutor_engine import AcademicTutorEngine

def run_aniporia_pipeline(image_path, syllabus_topics):
    print("🚀 Booting up Aniporia AI Core...\n")
    
    # 1. Initialize the two core engines
    ingestion = IngestionEngine(use_mock=False)
    tutor = AcademicTutorEngine()
    
    # 2. PHASE 1: Extract Text from the Image (Eyes)
    print("\n==================================")
    print("▶️ PHASE 1: INGESTION (Eyes)")
    print("==================================")
    extracted_text = ingestion.extract_text(image_path)
    print(f"📄 Student Wrote: '{extracted_text}'")
    
    # 3. PHASE 2: Gap Analysis (Brain)
    print("\n==================================")
    print("▶️ PHASE 2: GAP ANALYSIS (Brain)")
    print("==================================")
    # Note: No more vector math threshold! The LLM reasons it out natively.
    analysis_report = tutor.analyze_gaps(syllabus_topics, extracted_text)
    
    # 4. PHASE 3: Generate Remediation & Quiz (Mouth)
    print("\n==================================")
    print("▶️ PHASE 3: AI TUTOR (Remediation)")
    print("==================================")
    
    missing_topics = analysis_report.get("missing_topics", [])
    
    # Because we upgraded the tutor to return Python dicts naturally, 
    # we don't need json.loads() or try/except blocks here anymore!
    study_guide_nodes = tutor.generate_remediation(missing_topics)
    mock_exam_data = tutor.generate_mock_exam(missing_topics)
    
    # 5. Combine everything into a final response
    final_payload = {
        "extracted_text": extracted_text,
        "analysis": analysis_report,
        "study_guide": study_guide_nodes,
        "mock_exam": mock_exam_data
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
    # A brutally similar syllabus to test the LLM's reasoning
    test_syllabus = [
        "Definition of BFS",
        "Applications of BFS",
        "Definition of DFS",
        "Applications of DFS"
    ]
    
    # Make sure this image actually exists in your test_data folder!
    test_image = "test_data/test_note8.png" 
    
    try:
        run_aniporia_pipeline(test_image, test_syllabus)
    except Exception as e:
        print(f"❌ Pipeline crashed: {e}")