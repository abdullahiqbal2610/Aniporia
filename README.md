<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=for-the-badge&logo=supabase" />
  <img src="https://img.shields.io/badge/Gemini_AI-2.5-4285F4?style=for-the-badge&logo=google" />
  <img src="https://img.shields.io/badge/TrOCR-Handwriting-FF6F00?style=for-the-badge&logo=huggingface" />
</p>

# 🎓 Aniporia — Academic AI Tutor Platform

> **Know What You Don't Know.**

Aniporia is an AI-powered academic platform that reads your handwritten notes, identifies exactly what you're missing from the syllabus, and generates personalized practice sessions to close those gaps — all in real time.

Upload a photo of your notes → AI extracts the text → compares it against your syllabus → pinpoints knowledge gaps → generates targeted quizzes → tracks your mastery until you're exam-ready.

---

## 👥 Team

| Name | Role |
|------|------|
| **Aaleen Fatima** | Developer |
| **Abdullah Iqbal** | Developer |
| **Laiba Amjad** | Developer |
| **Mariyam Pasha** | Developer |

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📸 **Handwriting OCR** | Upload photos of handwritten notes — AI extracts the text using EasyOCR + Microsoft TrOCR |
| 📄 **PDF Extraction** | Digital PDFs are parsed instantly via PyMuPDF (no AI overhead) |
| 🔍 **Gap Analysis** | Gemini AI compares extracted notes against your syllabus and scores each topic 0–100 |
| 🎯 **Smart Practice** | AI generates targeted MCQ quizzes for your weakest topics with instant feedback |
| 🧠 **Adaptive Retry** | Re-attempt practice sessions — the AI never repeats the same question twice |
| 🌌 **Knowledge Galaxy** | Interactive 3D force-graph visualization of your learning progress |
| 📝 **Mock Exams** | Full 50-question mock exams pulled from your actual gap topics |
| 📊 **Mastery Tracking** | Per-topic mastery scores that update in real time as you practice |
| 🏅 **Badge System** | Earn badges like *Quick Learner*, *Top Scorer*, and *Massive Leap* |
| ✏️ **OCR Review** | Review and correct AI-extracted text before gap analysis runs |
| 🗑️ **Account Management** | Full GDPR-style account deletion (data + auth purged) |

---

## 🏗️ Architecture

```
Aniporia/
├── frontend/                    # Next.js 16 (React 19) — User Interface
│   ├── app/
│   │   ├── (auth)/              # Login & Registration pages
│   │   ├── (onboarding)/        # Profile setup & course creation
│   │   ├── (dashboard)/         # Main app pages
│   │   │   ├── dashboard/       #   → Overview & course cards
│   │   │   ├── upload/          #   → Note image upload
│   │   │   ├── ocr-review/      #   → Review extracted text
│   │   │   ├── gap-analysis/    #   → View knowledge gaps
│   │   │   ├── practice/        #   → AI quiz sessions
│   │   │   ├── mock-exam/       #   → Full mock examinations
│   │   │   ├── galaxy/          #   → 3D Knowledge Galaxy
│   │   │   ├── feedback/        #   → Session feedback
│   │   │   └── settings/        #   → Profile & account settings
│   │   ├── components/          # Shared UI components
│   │   └── hooks/               # Custom React hooks
│   ├── lib/                     # Supabase client & utilities
│   └── styles/                  # Theme, fonts & Tailwind config
│
├── backend/                     # FastAPI — API Server (port 8000)
│   ├── main.py                  # App entry point & CORS config
│   ├── routers/
│   │   ├── profiles.py          # User profile CRUD + account deletion
│   │   ├── courses.py           # Course management + topic-level mastery
│   │   ├── uploads.py           # Single & batch upload pipeline
│   │   ├── gaps.py              # Knowledge gap queries
│   │   └── practice.py          # Practice sessions, mock exams, stats
│   └── services/
│       ├── supabase_client.py   # Singleton Supabase client (service role)
│       ├── auth.py              # JWT validation dependency
│       ├── storage.py           # Supabase Storage upload/delete
│       └── ai_pipeline.py       # HTTP bridge to the AI Engine
│
├── ai_engine/                   # AI/ML Microservice (port 8001)
│   ├── app.py                   # FastAPI app with 3 AI endpoints
│   ├── run.py                   # Uvicorn launcher
│   ├── step1_ingestion.py       # OCR pipeline (EasyOCR + TrOCR)
│   ├── step2_tutor_engine.py    # Gemini-powered gap analysis & quiz gen
│   ├── requirements.txt         # Python dependencies
│   └── test_data/               # Sample handwriting images for testing
│
└── docs/                        # Documentation (reserved)
```

### How the Services Connect

```
┌──────────────┐     HTTP      ┌──────────────┐     HTTP      ┌──────────────┐
│   Frontend   │ ───────────►  │   Backend    │ ───────────►  │  AI Engine   │
│  Next.js 16  │  :3000        │   FastAPI    │  :8001        │   FastAPI    │
│  React 19    │               │   :8000      │               │  TrOCR +     │
│  Supabase JS │               │  Supabase    │               │  Gemini AI   │
└──────────────┘               └──────────────┘               └──────────────┘
       │                              │
       │         ┌────────────────────┘
       │         │
       ▼         ▼
┌─────────────────────┐
│      Supabase       │
│  ┌───────────────┐  │
│  │  PostgreSQL   │  │  Auth, DB, Storage
│  │  Auth         │  │
│  │  Storage      │  │
│  └───────────────┘  │
└─────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.10+ |
| Node.js | 18+ |
| npm | 9+ |

### 1. Clone the Repository

```bash
git clone https://github.com/abdullahiqbal2610/Aniporia.git
cd Aniporia
```

### 2. AI Engine Setup (Port 8001)

```bash
cd ai_engine
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file in `ai_engine/`:

```env
GEMINI_API_KEY_1=your_gemini_api_key
GEMINI_API_KEY_2=               # optional fallback
GEMINI_API_KEY_3=               # optional fallback
TROCR_MODEL=microsoft/trocr-base-handwritten
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000
```

Start the AI engine:

```bash
python run.py
# → Running on http://127.0.0.1:8001
```

### 3. Backend Setup (Port 8000)

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file in `backend/` (see `env.example`):

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY_1=your_gemini_api_key
GEMINI_API_KEY_2=
GEMINI_API_KEY_3=
ALLOWED_ORIGINS=http://localhost:3000
AI_ENGINE_URL=http://localhost:8001
```

Start the backend:

```bash
python run.py
# → Running on http://127.0.0.1:8000
```

### 4. Frontend Setup (Port 3000)

```bash
cd frontend
npm install
```

Create a `.env` file in `frontend/`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Start the dev server:

```bash
npm run dev
# → Running on http://localhost:3000
```

---

## 📡 API Reference

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Backend health check |

### Profiles

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/profiles/` | Create or update profile (onboarding) |
| `GET` | `/profiles/me` | Get current user profile |
| `DELETE` | `/profiles/me` | Permanently delete account + all data |

### Courses

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/courses/` | List all courses |
| `GET` | `/courses/with-topics` | List courses with nested topic-level mastery |
| `POST` | `/courses/` | Create a new course |
| `PATCH` | `/courses/{id}` | Update course details |
| `DELETE` | `/courses/{id}` | Delete a course (cascades) |

### Uploads

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/uploads/` | Upload a single note → OCR → gap analysis |
| `POST` | `/uploads/batch` | Batch upload (up to 20 images) |
| `GET` | `/uploads/` | List uploads (optionally by course) |
| `GET` | `/uploads/{id}` | Get a single upload with AI result |
| `PATCH` | `/uploads/{id}/text` | Save corrected OCR text |

### Knowledge Gaps

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/gaps/` | List gaps (filter by course / priority) |
| `DELETE` | `/gaps/{id}` | Dismiss a resolved gap |

### Practice & Mock Exams

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/practice/generate` | Generate AI quiz for a topic |
| `POST` | `/practice/complete` | Complete a session → score + badge + update mastery |
| `POST` | `/practice/sessions` | Save a practice session |
| `GET` | `/practice/sessions` | List all past sessions |
| `GET` | `/practice/sessions/{id}` | Get session with topic breakdown |
| `GET` | `/practice/stats` | Aggregated stats (avg improvement, badges) |
| `GET` | `/practice/mock-exam/status` | Check mock exam eligibility |
| `POST` | `/practice/mock-exam/start` | Generate a 50-question mock exam |
| `POST` | `/practice/mock-exam/submit` | Submit answers → score + update mastery |

### AI Engine (Port 8001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | AI engine health check |
| `POST` | `/api/analyze` | Extract text from image + run gap analysis |
| `POST` | `/api/learn-node` | Generate lesson + 3-question quiz for a topic |
| `POST` | `/api/revision-exam` | Generate a comprehensive revision exam |

---

## 🧬 Core Workflow

```
   ┌─────────────────┐
   │  Student uploads │
   │  note photo(s)  │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │  EasyOCR finds  │  ← Bounding box detection
   │  text regions   │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │  TrOCR reads    │  ← Microsoft Transformer OCR
   │  each line      │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │  OCR Review     │  ← Student corrects any errors
   │  (optional)     │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │  Gemini AI      │  ← Compares notes vs. syllabus
   │  Gap Analysis   │     Scores each topic 0–100
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │  Gap Dashboard  │  ← HIGH / MEDIUM / LOW priority
   │  + Galaxy View  │     3D force-graph visualization
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │  AI Practice    │  ← Adaptive quizzes per topic
   │  Sessions       │     Scores update gap_score
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │  Mock Exam      │  ← 50 questions from all gaps
   │  (when ready)   │     Final mastery assessment
   └─────────────────┘
```

---

## 🗄️ Database Schema

### Key Tables (Supabase PostgreSQL)

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (name, institution, academic level) |
| `courses` | Courses with `mastery_percent` aggregate |
| `uploads` | Note images with extracted text and AI results |
| `gaps` | Per-topic knowledge gaps with `gap_score` and `priority` |
| `practice_sessions` | Session history with before/after scores and badges |
| `practice_results` | Per-topic breakdown within each session |

### Mastery Scoring

| Score Range | Priority | Meaning |
|-------------|----------|---------|
| 80–100 | `LOW` | Topic mastered ✅ |
| 40–79 | `MEDIUM` | Partially covered ⚠️ |
| 0–39 | `HIGH` | Missing or incorrect ❌ |

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| Next.js 16 | React framework (App Router) |
| React 19 | UI library |
| Tailwind CSS 4 | Utility-first styling |
| Framer Motion | Page transitions & animations |
| React Force Graph 2D | Knowledge Galaxy visualization |
| React Three Fiber | 3D rendering |
| Recharts | Data charts & analytics |
| Radix UI + shadcn/ui | Accessible component primitives |
| Supabase JS | Auth & real-time client |

### Backend
| Technology | Purpose |
|------------|---------|
| FastAPI | Async Python web framework |
| Supabase (Python) | Database & storage operations |
| Pydantic | Request/response validation |
| HTTPX | Async HTTP client (AI engine bridge) |

### AI Engine
| Technology | Purpose |
|------------|---------|
| EasyOCR | Text region detection (bounding boxes) |
| Microsoft TrOCR | Transformer-based handwriting recognition |
| Gemini 2.5 | Gap analysis, quiz generation, lesson content |
| PyMuPDF | Fast digital PDF text extraction |
| PyTorch + HuggingFace | Model inference runtime |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Supabase | PostgreSQL DB, Auth, Object Storage |
| Uvicorn | ASGI server for both Python services |

---

## 🔐 Authentication

- **Provider**: Supabase Auth (email/password)
- **Frontend**: JWT stored in localStorage with auto-refresh
- **Backend**: Every endpoint validates the JWT via `get_current_user` dependency
- **Service Role**: Backend uses the Supabase service role key (bypasses RLS)

---

## 📜 License

This project is proprietary and confidential.

---

## 🤝 Contributing

Internal team only. For contributions, please contact the development team.

---

<p align="center">
  <strong>Made with ❤️ by the Aniporia Team</strong>
</p>
