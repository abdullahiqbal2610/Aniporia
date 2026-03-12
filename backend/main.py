"""
Aniporia Backend — FastAPI Entry Point
---------------------------------------
Run with:
    uvicorn main:app --reload --port 8000
"""

import sys
import os

# Fix module resolution on Windows
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routers import profiles, courses, uploads, gaps, practice

load_dotenv()

# ---------------------------------------------------------------------------
# App Setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Aniporia API",
    description="Backend for the Aniporia Academic AI Tutor Platform",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
allowed_origins = [o.strip() for o in raw_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(profiles.router)
app.include_router(courses.router)
app.include_router(uploads.router)
app.include_router(gaps.router)
app.include_router(practice.router)

# ---------------------------------------------------------------------------
# Health Check
# ---------------------------------------------------------------------------

@app.get("/", tags=["Health"])
def health_check():
    return {"status": "Aniporia Backend is Online 🚀"}
