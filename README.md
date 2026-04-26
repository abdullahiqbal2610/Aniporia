# Aniporia - Academic AI Tutor Platform

> **Know What You Don't Know**

Aniporia is an intelligent academic tutoring platform that uses AI to detect knowledge gaps, provide targeted practice, and help students master their courses efficiently.

## 👥 Developers

- **Aaleen Fatima** - Full Stack Development
- **Abdullah Iqbal** - Backend & AI Integration
- **Laiba Amjad** - Frontend Development
- **Mariyam Pasha** - UI/UX Design & Frontend

## 🌟 Features

- **AI-Powered Gap Detection** - Automatically identifies knowledge gaps in your coursework
- **Smart Practice Sessions** - Generates customized practice questions based on your gaps
- **Knowledge Galaxy** - Visualize your learning progress across all topics
- **Mock Exams** - Test yourself with comprehensive mock examinations
- **Real-time Feedback** - Get instant feedback on your answers
- **Progress Tracking** - Monitor your mastery level across courses
- **Personalized Learning Paths** - Adaptive learning recommendations

## 🏗️ Project Structure

```
Aniporia/
├── frontend/                 # Next.js React application
│   ├── app/                 # App router pages
│   ├── components/          # Reusable React components
│   ├── lib/                 # Utility functions
│   └── public/              # Static assets
├── backend/                 # FastAPI Python server
│   ├── routers/             # API route handlers
│   ├── services/            # Business logic
│   └── main.py              # Entry point
├── ai_engine/               # AI/ML processing engine
│   ├── step1_ingestion.py   # Document ingestion
│   ├── step2_tutor_engine.py # Question generation
│   └── stylescript_generator.py
├── docs/                    # Documentation
└── README.md               # This file
```

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- npm or yarn

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/Scripts/activate  # Windows
python -m venv venv && . venv/bin/activate  # Linux/Mac

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### AI Engine Setup

```bash
cd ai_engine
pip install -r requirements.txt
python run.py
```

## 📚 Tech Stack

### Frontend
- **Framework**: Next.js 14 (React)
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **Visualization**: React Force Graph
- **UI Components**: Custom Glass morphism design
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth

### Backend
- **Framework**: FastAPI
- **Database**: Supabase
- **Language**: Python 3.9+
- **Task Queue**: (Optional) Celery

### AI Engine
- **Model**: LLM-based question generation
- **Processing**: YOLO11 for document parsing
- **Embeddings**: Vector-based similarity

## 🔑 Key Endpoints

### Practice Routes
- `POST /practice/generate` - Generate questions for a topic
- `POST /practice/complete` - Complete a practice session
- `GET /practice/sessions` - Get all practice sessions
- `GET /practice/mock-exam/status` - Check mock exam eligibility
- `POST /practice/mock-exam/start` - Start a mock exam
- `POST /practice/mock-exam/submit` - Submit mock exam answers

### Course Routes
- `GET /courses/` - Get all user courses
- `POST /courses/` - Create a new course

### Gap Routes
- `GET /gaps/` - Get all knowledge gaps
- `POST /gaps/` - Identify gaps

## 🎯 Core Workflows

### 1. Document Upload
Users upload course materials (PDFs, notes, etc.) which are processed by the AI engine.

### 2. Gap Identification
The system analyzes the materials and creates knowledge gaps based on topic complexity.

### 3. Practice Generation
Users practice on gaps with AI-generated questions and immediate feedback.

### 4. Progress Tracking
Mastery levels are calculated and displayed in the Knowledge Galaxy.

### 5. Mock Exams
Users can take comprehensive mock exams to test overall mastery.

## 📊 Database Schema

### Key Tables
- **users** - User profiles and authentication
- **courses** - Course information
- **gaps** - Knowledge gap records
- **practice_sessions** - Practice session history
- **practice_results** - Individual practice question results

## 🔐 Authentication

Uses Supabase Authentication with:
- Email/Password registration
- Session persistence
- Automatic token refresh

## 📈 Features in Development

- [ ] Video content support
- [ ] Collaborative learning groups
- [ ] Advanced analytics dashboard
- [ ] Offline mode
- [ ] Mobile app


## 📝 License

This project is proprietary and confidential.

## 🤝 Contributing

Internal team only. For contributions, please contact the development team.

## 📞 Support

For issues and feature requests, please contact the development team.

## 🙏 Acknowledgments

- Supabase for database and authentication
- OpenAI for language models
- Framer Motion for animations
- Tailwind CSS for styling

---

**Made with ❤️ by the Aniporia Team**
