import os
import cv2
import easyocr
from PIL import Image
from transformers import TrOCRProcessor, VisionEncoderDecoderModel

class IngestionEngine:
    def __init__(self, use_mock=False):
        self.use_mock = use_mock
        if not self.use_mock:
            print("⚙️ Loading the Ensemble Pipeline...")
            print("   -> EasyOCR (For Layout Analysis)")
            print("   -> Custom TrOCR (For Messy Handwriting Recognition)")
            
            # 1. The Line Detector
            self.detector = easyocr.Reader(['en'], gpu=False)
            
            # 2. The Custom Handwriting Translator (Pulled straight from HF Hub!)

            #our own fine-tuned model trained on 1000+ samples of messy handwriting( for ai project)

            #custom_model_path = "abdullahiqbal2610/Aniporia-TrOCR"
            # self.processor = TrOCRProcessor.from_pretrained(custom_model_path)
            # self.recognizer = VisionEncoderDecoderModel.from_pretrained(custom_model_path)


            #for better results, we will use the base trocr model which is not fine-tuned but still performs decently on handwritten text( for se project))

            self.processor = TrOCRProcessor.from_pretrained("microsoft/trocr-base-handwritten")
            self.recognizer = VisionEncoderDecoderModel.from_pretrained("microsoft/trocr-base-handwritten")
            print("✅ Engines Loaded Successfully!")

    def extract_text(self, image_path):
        if self.use_mock:
            return "Dynamic Programming is an optimization technique."

        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Missing image at: {image_path}")

        print(f"🔍 Analyzing layout of {image_path}...")
        cv_img = cv2.imread(image_path)
        
        # 1. Use EasyOCR purely to find the bounding boxes
        results = self.detector.readtext(image_path)
        
        boxes = []
        for (bbox, text, prob) in results:
            x_min = int(min([pt[0] for pt in bbox]))
            x_max = int(max([pt[0] for pt in bbox]))
            y_min = int(min([pt[1] for pt in bbox]))
            y_max = int(max([pt[1] for pt in bbox]))
            boxes.append((x_min, y_min, x_max, y_max))
            
        # 2. Sort all boxes top-to-bottom
        boxes = sorted(boxes, key=lambda x: x[1])
        
        # 3. Group words that belong on the same line (within 20 pixels of height)
        lines = []
        current_line = []
        
        for box in boxes:
            if not current_line:
                current_line.append(box)
            else:
                # If the Y coordinate is close to the first word in the line, group it!
                if abs(box[1] - current_line[0][1]) < 20: 
                    current_line.append(box)
                else:
                    lines.append(current_line)
                    current_line = [box]
        if current_line:
            lines.append(current_line)
            
        # 4. Create one MASTER bounding box for each line
        master_boxes = []
        for line in lines:
            # Get the absolute edges of the entire line
            master_x_min = min([b[0] for b in line])
            master_y_min = min([b[1] for b in line])
            master_x_max = max([b[2] for b in line])
            master_y_max = max([b[3] for b in line])
            master_boxes.append((master_x_min, master_y_min, master_x_max, master_y_max))
        
        extracted_lines = []
        print(f"✂️ Grouped into {len(master_boxes)} master lines. Passing to TrOCR...")
        
        # 5. Crop the master lines and feed to TrOCR
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
    
    image_to_test = "test_data/test_note.png"
    
    try:
        result = engine.extract_text(image_to_test)
        print("\n📝 --- EXTRACTED TEXT ---")
        print(result)
        print("--------------------------\n")
    except Exception as e:
        print(f"Error: {e}")


















# import os

# import cv2

# import easyocr

# from PIL import Image

# from transformers import TrOCRProcessor, VisionEncoderDecoderModel



# class IngestionEngine:

#     def __init__(self, use_mock=False):

#         self.use_mock = use_mock

#         if not self.use_mock:

#             print("⚙️ Loading the Ensemble Pipeline...")

#             print("   -> EasyOCR (For Layout Analysis)")

#             print("   -> TrOCR (For Handwriting Recognition)")

           

#             # 1. The Line Detector

#             self.detector = easyocr.Reader(['en'], gpu=False)

           

#             # 2. The Handwriting Translator

#             self.processor = TrOCRProcessor.from_pretrained("microsoft/trocr-base-handwritten")

#             self.recognizer = VisionEncoderDecoderModel.from_pretrained("microsoft/trocr-base-handwritten")

#             print("✅ Engines Loaded Successfully!")



#     def extract_text(self, image_path):

#         if self.use_mock:

#             return "Dynamic Programming is an optimization technique."



#         if not os.path.exists(image_path):

#             raise FileNotFoundError(f"Missing image at: {image_path}")



#         print(f"🔍 Analyzing layout of {image_path}...")

#         cv_img = cv2.imread(image_path)

       

#         # 1. Use EasyOCR purely to find the bounding boxes

#         results = self.detector.readtext(image_path)

       

#         boxes = []

#         for (bbox, text, prob) in results:

#             x_min = int(min([pt[0] for pt in bbox]))

#             x_max = int(max([pt[0] for pt in bbox]))

#             y_min = int(min([pt[1] for pt in bbox]))

#             y_max = int(max([pt[1] for pt in bbox]))

#             boxes.append((x_min, y_min, x_max, y_max))

           

#         # 2. Sort all boxes top-to-bottom

#         boxes = sorted(boxes, key=lambda x: x[1])

       

#         # 3. Group words that belong on the same line (within 20 pixels of height)

#         lines = []

#         current_line = []

       

#         for box in boxes:

#             if not current_line:

#                 current_line.append(box)

#             else:

#                 # If the Y coordinate is close to the first word in the line, group it!

#                 if abs(box[1] - current_line[0][1]) < 20:

#                     current_line.append(box)

#                 else:

#                     lines.append(current_line)

#                     current_line = [box]

#         if current_line:

#             lines.append(current_line)

           

#         # 4. Create one MASTER bounding box for each line

#         master_boxes = []

#         for line in lines:

#             # Get the absolute edges of the entire line

#             master_x_min = min([b[0] for b in line])

#             master_y_min = min([b[1] for b in line])

#             master_x_max = max([b[2] for b in line])

#             master_y_max = max([b[3] for b in line])

#             master_boxes.append((master_x_min, master_y_min, master_x_max, master_y_max))

       

#         extracted_lines = []

#         print(f"✂️ Grouped into {len(master_boxes)} master lines. Passing to TrOCR...")

       

#         # 5. Crop the master lines and feed to TrOCR

#         for (x1, y1, x2, y2) in master_boxes:

#             pad = 5

#             line_crop = cv_img[max(0, y1-pad):y2+pad, max(0, x1-pad):x2+pad]

           

#             if line_crop.shape[0] == 0 or line_crop.shape[1] == 0:

#                 continue

               

#             line_pil = Image.fromarray(cv2.cvtColor(line_crop, cv2.COLOR_BGR2RGB))

           

#             pixel_values = self.processor(line_pil, return_tensors="pt").pixel_values

#             generated_ids = self.recognizer.generate(pixel_values)

#             text = self.processor.batch_decode(generated_ids, skip_special_tokens=True)[0]

           

#             if text.strip():

#                 extracted_lines.append(text.strip())



#         return " ".join(extracted_lines)

# # ==========================================

# # TEST THE CODE LOCALLY

# # ==========================================

# if __name__ == "__main__":

#     engine = IngestionEngine(use_mock=False)

   

#     image_to_test = "test_data/test_note.png"

   

#     try:

#         result = engine.extract_text(image_to_test)

#         print("\n📝 --- EXTRACTED TEXT ---")

#         print(result)

#         print("--------------------------\n")

#     except Exception as e:

#         print(f"Error: {e}")