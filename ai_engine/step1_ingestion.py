import os
import cv2
import math
import numpy as np
import easyocr
from PIL import Image
from transformers import TrOCRProcessor, VisionEncoderDecoderModel
# Import your custom AI Engine module
from stylescript_generator import run_architectural_proof
import warnings
warnings.filterwarnings("ignore")

# =================================================================
# 🎚️ THE MASTER TOGGLE SWITCH
# Change this variable to switch the entire brain of the application.
# Options: "AI" (Custom Model + Math) or "SE" (Stable Microsoft Model)
# =================================================================
PROJECT_MODE = "AI"  # Change to "AI" for research mode, "SE" for production mode


class IngestionEngine:
    def __init__(self, use_mock=False):
        self.use_mock = use_mock
        if not self.use_mock:
            self.detector = easyocr.Reader(['en'], gpu=False, verbose=False)
            
            # --------------------------------------------------
            # 🧠 AI MODE: Research Architecture
            # --------------------------------------------------
            if PROJECT_MODE == "AI":
                print("⚙️ [MODE: AI] Loading StyleScript Research Pipeline...")
                print("   -> Loading Custom TrOCR (Phase 4: Robust Handwriting Recognition)")
                custom_model_path = "abdullahiqbal2610/Aniporia-StyleScript-TrOCR"
                self.processor = TrOCRProcessor.from_pretrained(custom_model_path)
                self.recognizer = VisionEncoderDecoderModel.from_pretrained(custom_model_path)
                print("✅ AI Research Engine Loaded!")

            # --------------------------------------------------
            # 🚀 SE MODE: Production Architecture
            # --------------------------------------------------
            elif PROJECT_MODE == "SE":
                print("⚙️ [MODE: SE] Loading Production Software Pipeline...")
                print("   -> Loading Microsoft Baseline (Optimized for Stability)")
                stable_model_path = "microsoft/trocr-base-handwritten"
                self.processor = TrOCRProcessor.from_pretrained(stable_model_path)
                self.recognizer = VisionEncoderDecoderModel.from_pretrained(stable_model_path)
                print("✅ SE Production Engine Loaded!")


    def extract_style_features(self, cv_img):
        """
        IMPLEMENTATION OF STYLESCRIPT PHASE 1
        Calculates Stroke Thickness (Tau) and Slant Angle (Theta).
        """
        gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
        
        # --- EQUATION 1: STROKE THICKNESS (Tau) ---
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        tau_sum = 0
        valid_contours = 0
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area > 10: 
                perimeter = cv2.arcLength(cnt, True)
                if perimeter > 0:
                    tau_sum += (area / perimeter)
                    valid_contours += 1
        tau = (tau_sum / valid_contours) if valid_contours > 0 else 0

        # --- EQUATION 2: SLANT ANGLE (Theta) ---
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)
        lines = cv2.HoughLinesP(edges, 1, np.pi/180, 100, minLineLength=10, maxLineGap=10)
        
        theta_sum = 0
        valid_lines = 0
        if lines is not None:
            for line in lines:
                x1, y1, x2, y2 = line[0]
                angle = math.degrees(math.atan2(y2 - y1, x2 - x1))
                theta_sum += angle
                valid_lines += 1
        theta = (theta_sum / valid_lines) if valid_lines > 0 else 0

        print(f"📊 [StyleScript Math] Phase 1 Extracted -> Thickness (τ): {tau:.2f}, Slant (θ): {theta:.2f}°")
        return tau, theta


    def extract_text(self, image_path):
        if self.use_mock:
            return "Dynamic Programming is an optimization technique."

        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Missing image at: {image_path}")

        print(f"\n🔍 Analyzing layout of {image_path}...")
        cv_img = cv2.imread(image_path)
        
        #--------------------------------------------------
        # 🧮 RUN MATH ONLY IF IN AI MODE
        # --------------------------------------------------
        if PROJECT_MODE == "AI":
            # 1. Extract the physical math from the image (Phase 1)
            tau, theta = self.extract_style_features(cv_img)
            
            # 2. AUTONOMOUS HANDOFF: Send it directly to the PyTorch AI Engine
            run_architectural_proof(tau, theta)
        
        # 1. EasyOCR for bounding boxes
        results = self.detector.readtext(image_path)
        boxes = []
        for (bbox, text, prob) in results:
            x_min = int(min([pt[0] for pt in bbox]))
            x_max = int(max([pt[0] for pt in bbox]))
            y_min = int(min([pt[1] for pt in bbox]))
            y_max = int(max([pt[1] for pt in bbox]))
            boxes.append((x_min, y_min, x_max, y_max))
            
        # 2. Sort and group lines
        boxes = sorted(boxes, key=lambda x: x[1])
        lines = []
        current_line = []
        for box in boxes:
            if not current_line:
                current_line.append(box)
            else:
                if abs(box[1] - current_line[0][1]) < 20: 
                    current_line.append(box)
                else:
                    lines.append(current_line)
                    current_line = [box]
        if current_line:
            lines.append(current_line)
            
        # 3. Master bounding boxes
        master_boxes = []
        for line in lines:
            master_x_min = min([b[0] for b in line])
            master_y_min = min([b[1] for b in line])
            master_x_max = max([b[2] for b in line])
            master_y_max = max([b[3] for b in line])
            master_boxes.append((master_x_min, master_y_min, master_x_max, master_y_max))
        
        extracted_lines = []
        print(f"✂️ Grouped into {len(master_boxes)} master lines. Passing to OCR Engine...")
        
        # 4. TrOCR Inference
        for (x1, y1, x2, y2) in master_boxes:
            pad = 5
            line_crop = cv_img[max(0, y1-pad):y2+pad, max(0, x1-pad):x2+pad]
            
            if line_crop.shape[0] == 0 or line_crop.shape[1] == 0:
                continue
                
            line_pil = Image.fromarray(cv2.cvtColor(line_crop, cv2.COLOR_BGR2RGB))
            
            pixel_values = self.processor(line_pil, return_tensors="pt").pixel_values
            generated_ids = self.recognizer.generate(pixel_values)
            text = self.processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
            
            if text.strip():
                extracted_lines.append(text.strip())

        return " ".join(extracted_lines)

# ==========================================
# TEST THE CODE LOCALLY
# ==========================================
if __name__ == "__main__":
    engine = IngestionEngine(use_mock=False)
    
    image_to_test = "test_data/test_note4.png" 
    
    try:
        result = engine.extract_text(image_to_test)
        print("\n📝 --- EXTRACTED TEXT ---")
        print(result)
        print("--------------------------\n")
    except Exception as e:
        print(f"Error: {e}")