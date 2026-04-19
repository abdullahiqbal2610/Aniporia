import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

# 1. Load the environment variables
load_dotenv()

class AcademicTutorEngine:
    def __init__(self):
        """Initializes the Gemini Tutor with Multi-Key and Fallback support."""
        print("🤖 Booting up Gemini Multi-Key Tutor System...")
        
        raw_keys = [
            os.getenv("GEMINI_API_KEY_1"),
            os.getenv("GEMINI_API_KEY_2"),
            os.getenv("GEMINI_API_KEY_3")
        ]
        self.api_keys = [key for key in raw_keys if key]
        
        if not self.api_keys:
            raise ValueError("🚨 No API keys found! Please add at least GEMINI_API_KEY_1 to your .env file.")
            
        self.models = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash']
        print(f"✅ Tutor Ready! Loaded {len(self.api_keys)} keys and {len(self.models)} fallback models.")

    def _generate_with_fallback(self, prompt, system_instruction=None, is_json=False):
        """Helper to run the Fallback Matrix and enforce JSON if needed."""
        
        for key_idx, current_key in enumerate(self.api_keys):
            genai.configure(api_key=current_key)
            
            for model_name in self.models:
                try:
                    model = genai.GenerativeModel(
                        model_name=model_name,
                        system_instruction=system_instruction
                    )
                    response = model.generate_content(
                        prompt,
                        generation_config=genai.types.GenerationConfig(
                            temperature=0.1,
                            response_mime_type="application/json" if is_json else "text/plain"
                        )
                    )
                    return response.text
                except Exception as e:
                    print(f"⚠️ Error with Key #{key_idx + 1} on {model_name}: {e}. Failing over...")
                    continue 
                    
        return '{"error": "All API keys and models exhausted"}' if is_json else "🚨 CRITICAL FAILURE: All APIs exhausted!"

    # ==========================================
    # 🧠 MODULE 1: THE GAP ANALYZER
    # ==========================================
    def analyze_gaps(self, syllabus_list, student_notes):
        print("\n🧮 Running Generative Gap Analysis...")
        system_instruction = "You are an expert Academic Auditor. Compare a student's notes against a strict syllabus."
        
        prompt = f"""
        SYLLABUS ITEMS:
        {json.dumps(syllabus_list)}
        
        STUDENT NOTES:
        "{student_notes}"
        
        TASK:
        Evaluate how well the student covered each syllabus item in their notes.
        
        RULES:
        1. "Definition of X" is covered if X is explained.
        2. Assign a 'confidence_score' from 0 to 100 indicating how well they understand the topic based ONLY on their notes.
            - 0-39: Missing or completely wrong (Status: "missing")
            - 40-79: Partially covered, missing key details (Status: "partial")
            - 80-100: Fully covered and correct (Status: "covered")
        3. Respond ONLY with a valid JSON array.
        
        EXPECTED JSON FORMAT:
        {{
            "analysis_nodes": [
                {{
                    "topic": "Name of topic", 
                    "status": "missing, partial, or covered",
                    "confidence_score": 85,
                    "reason": "Brief reason for this score"
                }}
            ]
        }}
        """
        
        raw_response = self._generate_with_fallback(prompt, system_instruction, is_json=True)
        
        try:
            return json.loads(raw_response)
        except json.JSONDecodeError:
            print("❌ JSON Decode Error!")
            return {"analysis_nodes": []}

    # ==========================================
    # 📖 MODULE 2: THE STUDY GUIDE GENERATOR (Node-by-Node)
    # ==========================================
    def generate_remediation(self, missing_topics):
        if not missing_topics:
            return {"remediation_nodes": []}

        topics_str = ", ".join([item['topic'] for item in missing_topics])
        print(f"✍️ Generating Node-by-Node Crash-Course for: {topics_str}...")

        system_instruction = "You are Aniporia, an elite Academic Auditor AI. Tone: Encouraging, precise, and highly structured."
        prompt = f"""
        A student submitted their notes, but missed the following topics:
        [{topics_str}]
        
        Write a targeted remediation crash-course for the student.
        Strict Constraints:
        1. Break down the explanation into individual nodes for each missing topic.
        2. You MUST respond ONLY with a valid JSON object matching the exact structure below.
        
        EXPECTED JSON FORMAT:
        {{
            "remediation_nodes": [
                {{
                    "topic": "Name of the topic",
                    "tldr": "One simple sentence definition",
                    "key_concepts": [
                        "Bullet point 1",
                        "Bullet point 2",
                        "Bullet point 3"
                    ],
                    "why_it_matters": "One sentence on why this matters for the exam"
                }}
            ]
        }}
        """
        raw_response = self._generate_with_fallback(prompt, system_instruction=system_instruction, is_json=True)
        
        try:
            return json.loads(raw_response)
        except json.JSONDecodeError:
            return {"remediation_nodes": []}
    # ==========================================
    # 📝 MODULE 3: THE MOCK EXAM GENERATOR (Adaptive & Revision)
    # ==========================================
    def generate_mock_exam(self, topics_list, num_questions=5, previous_questions=None, is_revision=False):
        if not topics_list:
            return {"quiz": []}

        topics_str = ", ".join([item['topic'] for item in topics_list])
        print(f"🎯 Generating a {num_questions}-question Exam on: {topics_str}...")

        # Adaptive Retry Logic: Tell the AI what NOT to ask again
        avoid_clause = ""
        if previous_questions:
            print(f"🔄 Adaptive Retry: Ensuring we don't repeat {len(previous_questions)} previous questions...")
            avoid_clause = f"\nCRITICAL: Do NOT generate questions identical or highly similar to these: {json.dumps(previous_questions)}"

        system_instruction = "You are Aniporia, an elite Academic Auditor AI."
        
        # 🧠 DYNAMIC PROMPT: Weakness vs. Revision
        if is_revision:
            context_prompt = f"The student wants to review the following MASTERED topics: [{topics_str}]. Generate a comprehensive {num_questions}-question multiple-choice revision exam testing their retention across all these areas."
        else:
            context_prompt = f"The student is WEAK in the following topics: [{topics_str}]. Generate a {num_questions}-question multiple-choice mock exam focusing STRICTLY on helping them learn these weak areas."

        prompt = f"""
        {context_prompt}
        {avoid_clause}
        
        RULES:
        1. CRITICAL: Randomize the placement of the correct answer within the 'options' array for every question!
        2. The 'correct_answer' string must exactly match one of the strings in the 'options' array.
        3. Make sure the questions are distributed evenly across the provided topics.
        
        Use the exact structure below:
        {{
            "quiz": [
                {{
                    "question": "The actual question text here?",
                    "options": [
                        "Option A",
                        "Option B",
                        "Option C",
                        "Option D"
                    ],
                    "correct_answer": "The exact string of the correct option",
                    "explanation": "Why this is the right answer."
                }}
            ]
        }}
        """
        raw_response = self._generate_with_fallback(prompt, system_instruction=system_instruction, is_json=True)
        
        try:
            return json.loads(raw_response)
        except json.JSONDecodeError:
            return {"quiz": []}

# ==========================================
# 🚀 TEST THE TUTOR ENGINE LOCALLY
# ==========================================
if __name__ == "__main__":
    tutor = AcademicTutorEngine()
    
    # Simulating data that the Gap Analyzer would output
    mock_missing_data = [
        {"topic": "Using TensorFlow", "reason": "Not mentioned in the text."},
        {"topic": "Deep Learning", "reason": "Not mentioned in the text."}
    ]
    
    study_guide = tutor.generate_remediation(mock_missing_data)
    print("\n🎓 --- ANIPORIA STUDY GUIDE (JSON) ---")
    print(json.dumps(study_guide, indent=2))
    
    mock_exam = tutor.generate_mock_exam(mock_missing_data, num_questions=3)
    print("\n📝 --- JSON MOCK EXAM (JSON) ---")
    print(json.dumps(mock_exam, indent=2))
    print("-------------------------------\n")