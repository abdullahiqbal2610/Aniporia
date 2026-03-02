from sentence_transformers.cross_encoder import CrossEncoder
import numpy as np

class SemanticAnalyzer:
    def __init__(self):
        print("🧠 Loading Cross-Encoder Brain (Maximum Precision)...")
        # This model reads both sentences simultaneously for deep semantic matching
        self.model = CrossEncoder('cross-encoder/stsb-distilroberta-base')
        print("✅ Brain Loaded Successfully!")

    def analyze_gaps(self, syllabus_topics, student_notes_text, threshold=0.45):
        print("\n🧮 Calculating Deep Semantic Entailment...")
        
        # Break the student's notes into individual sentences
        note_sentences = [s.strip() for s in student_notes_text.split('.') if len(s.strip()) > 5]
        if not note_sentences:
            note_sentences = [student_notes_text] 
            
        analysis_report = {
            "covered_topics": [],
            "missing_topics": []
        }
        
        # Check every topic in the syllabus against the notes
        for topic in syllabus_topics:
            # A Cross-Encoder requires pairs of text: [[Topic, Sentence1], [Topic, Sentence2]]
            sentence_pairs = [[topic, note] for note in note_sentences]
            
            # Predict the exact relationship score for all pairs
            scores = self.model.predict(sentence_pairs)
            
            # Get the highest matching sentence
            max_score = np.max(scores)
            
            if max_score >= threshold:
                analysis_report["covered_topics"].append({"topic": topic, "match_score": round(float(max_score), 2)})
            else:
                analysis_report["missing_topics"].append({"topic": topic, "match_score": round(float(max_score), 2)})
                
        return analysis_report

# ==========================================
# TEST THE CODE LOCALLY
# ==========================================
if __name__ == "__main__":
    analyzer = SemanticAnalyzer()
    
    # A brutally similar syllabus to test False Positives
    mock_syllabus = [
        "Neural Networks",
        "Backpropagation", # Closely related, but missing!
        "Activation Functions", # Closely related, but missing!
        "biology"
    ]
    
    mock_student_notes = "Today I learned about Neural Networks. They are computing systems inspired by the biological brain."
    
    report = analyzer.analyze_gaps(mock_syllabus, mock_student_notes)
    
    print("\n✅ --- GAP ANALYSIS REPORT ---")
    print("📚 COVERED:")
    for item in report["covered_topics"]:
        print(f"  -> {item['topic']} (Confidence: {item['match_score']})")
        
    print("\n🚨 MISSING:")
    for item in report["missing_topics"]:
        print(f"  -> {item['topic']} (Confidence: {item['match_score']})")
    print("------------------------------\n")