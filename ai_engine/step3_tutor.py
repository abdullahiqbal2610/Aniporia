import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

# 1. Load the environment variables
load_dotenv()

class TutorEngine:
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
        
        # We configure the request to use System Instructions and enforce JSON schemas
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json" if is_json else "text/plain"
        )
        
        for key_idx, current_key in enumerate(self.api_keys):
            # The new SDK uses a Client architecture
            client = genai.Client(api_key=current_key)
            
            for model_name in self.models:
                try:
                    print(f"🔄 Attempting Key #{key_idx + 1} with '{model_name}'...")
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=config
                    )
                    print("✅ Success!")
                    return response.text
                except Exception as e:
                    # If we hit a 429 Rate Limit or server error, we gracefully fail over
                    print(f"⚠️ Error with Key #{key_idx + 1} on {model_name}: {e}. Failing over...")
                    continue 
                    
        return '{"error": "All API keys and models exhausted"}' if is_json else "🚨 CRITICAL FAILURE: All APIs exhausted!"

    def generate_remediation(self, missing_topics):
        if not missing_topics:
            return "Great job! Your notes covered everything in the syllabus."

        topics_str = ", ".join([item['topic'] for item in missing_topics])
        print(f"✍️ Asking AI to explain: {topics_str}...")

        system_instruction = "You are Aniporia, an elite Academic Auditor AI. Tone: Encouraging, precise, and highly structured."
        prompt = f"""
        A student submitted their notes, but our vector analysis shows they completely missed the following topics:
        [{topics_str}]
        
        Write a targeted remediation crash-course for the student.
        Strict Constraints:
        1. Do NOT use generic AI openings like "Sure, I can help!"
        2. Format the response strictly as follows:
           - 🎯 Topic Name
           - 📖 The TL;DR (One simple sentence definition)
           - 🔑 Key Concepts (3 bullet points)
           - 💡 Why it matters for the exam (One sentence)
        """
        return self._generate_with_fallback(prompt, system_instruction=system_instruction)

    def generate_mock_exam(self, missing_topics, num_questions=3):
        if not missing_topics:
            return '{"quiz": []}'

        topics_str = ", ".join([item['topic'] for item in missing_topics])
        print(f"🎯 Generating a {num_questions}-question Mock Exam on: {topics_str}...")

        system_instruction = "You are Aniporia, an elite Academic Auditor AI."
        prompt = f"""
        The student's vector analysis shows they are weak in the following topics: [{topics_str}]
        Generate a {num_questions}-question multiple-choice mock exam focusing STRICTLY on these weak areas.
        Use the exact structure below:
        {{
            "quiz": [
                {{
                    "question": "The actual question text here?",
                    "options": [
                        "First incorrect option",
                        "The correct option",
                        "Second incorrect option",
                        "Third incorrect option"
                    ],
                    "correct_answer": "The correct option",
                    "explanation": "Why this is the right answer."
                }}
            ]
        }}
        """
        # is_json=True triggers "application/json" so your frontend gets perfect data!
        return self._generate_with_fallback(prompt, system_instruction=system_instruction, is_json=True)

# ==========================================
# TEST THE CODE LOCALLY
# ==========================================
if __name__ == "__main__":
    tutor = TutorEngine()
    
    mock_missing_data = [
        {"topic": "Using TensorFlow", "match_score": 0.31},
        {"topic": "Deep Learning", "match_score": 0.42}
    ]
    
    study_guide = tutor.generate_remediation(mock_missing_data)
    print("\n🎓 --- ANIPORIA STUDY GUIDE ---")
    print(study_guide)
    
    mock_exam = tutor.generate_mock_exam(mock_missing_data)
    print("\n📝 --- JSON MOCK EXAM ---")
    print(mock_exam)
    print("-------------------------------\n")