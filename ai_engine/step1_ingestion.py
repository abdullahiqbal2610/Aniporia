import os
import cv2
import numpy as np
import easyocr
import fitz  # PyMuPDF for lightning-fast digital PDF extraction
from PIL import Image
from transformers import TrOCRProcessor, VisionEncoderDecoderModel
import warnings
warnings.filterwarnings("ignore")


class IngestionEngine:
    def __init__(self, use_mock=False):
        self.use_mock = use_mock
        if not self.use_mock:
            self.detector = easyocr.Reader(['en'], gpu=False, verbose=False)

            print("⚙️ Loading Production OCR Pipeline...")
            print("   -> Loading Microsoft TrOCR (Optimized for Stability)")
            stable_model_path = "microsoft/trocr-base-handwritten"
            self.processor = TrOCRProcessor.from_pretrained(stable_model_path)
            self.recognizer = VisionEncoderDecoderModel.from_pretrained(stable_model_path)
            print("✅ OCR Engine Loaded!")

    # ---------------------------------------------------------
    # 🚦 THE SMART ROUTER (Decides PDF vs. Image)
    # ---------------------------------------------------------
    def extract_text(self, file_path):
        if self.use_mock:
            return "Dynamic Programming is an optimization technique."

        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Missing file at: {file_path}")

        file_ext = file_path.lower().split('.')[-1]

        # ROUTE 1: Digital PDF (Fast Extraction)
        if file_ext == 'pdf':
            return self._extract_from_digital_pdf(file_path)
            
        # ROUTE 2: Image (AI Pipeline)
        elif file_ext in ['png', 'jpg', 'jpeg']:
            return self._extract_from_image(file_path)
            
        else:
            raise ValueError("Unsupported format! Please upload a PDF, PNG, JPG, or JPEG.")

    # ---------------------------------------------------------
    # ⚡ ROUTE 1: DIGITAL PDF PARSER (Milliseconds)
    # ---------------------------------------------------------
    def _extract_from_digital_pdf(self, file_path):
        print(f"\n📄 [Fast Route] Digital PDF detected! Ripping text from {file_path}...")
        extracted_pages = []
        
        try:
            doc = fitz.open(file_path)
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                text = page.get_text()
                if text.strip():
                    extracted_pages.append(text.strip())
            
            print(f"✅ Extracted {len(extracted_pages)} pages instantly.")
            return "\n\n".join(extracted_pages)
            
        except Exception as e:
            print(f"❌ PDF Extraction Failed: {e}")
            return ""

    # ---------------------------------------------------------
    # 🧠 ROUTE 2: IMAGE AI PIPELINE
    # ---------------------------------------------------------
    def _extract_from_image(self, image_path):
        print(f"\n🖼️ [AI Route] Image detected! Analyzing layout of {image_path}...")
        cv_img = cv2.imread(image_path)
        
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
    
    file_to_test = "test_data/sepg2.png"
    
    try:
        result = engine.extract_text(file_to_test)
        print("\n📝 --- EXTRACTED TEXT ---")
        print(result)
        print("--------------------------\n")
    except Exception as e:
        print(f"Error: {e}")