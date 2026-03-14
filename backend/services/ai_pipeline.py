"""
AI Pipeline Service
-------------------
Wraps the existing ai_engine/main.py pipeline.

In development: this backend and the ai_engine run together.
In production:  you can split them — call the ai_engine as a separate
                microservice via HTTP (see run_pipeline_via_http below).
"""

import sys
import os
import json
import tempfile

# --- Local import path (monorepo layout) ---
# Assumes backend/ and ai_engine/ are siblings:
#   /project-root/backend/
#   /project-root/ai_engine/
AI_ENGINE_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "ai_engine")
if AI_ENGINE_PATH not in sys.path:
    sys.path.insert(0, os.path.abspath(AI_ENGINE_PATH))


def run_pipeline(image_bytes: bytes, syllabus_topics: list[str]) -> dict:
    """
    Runs the full Aniporia AI pipeline on an in-memory image.

    Steps:
        1. Write image bytes to a temp file (the engine expects a path).
        2. Call run_aniporia_pipeline from ai_engine/main.py.
        3. Parse and return the JSON result.
    """
    from main import run_aniporia_pipeline  # ai_engine/main.py

    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp.write(image_bytes)
        tmp_path = tmp.name

    try:
        raw_json = run_aniporia_pipeline(tmp_path, syllabus_topics)
        result = json.loads(raw_json)
    finally:
        os.remove(tmp_path)

    return result


# ---------------------------------------------------------------------------
# Alternative: call ai_engine as a separate HTTP service
# Use this if you deploy the AI engine on its own server / GPU instance.
# ---------------------------------------------------------------------------
async def run_pipeline_via_http(
    image_bytes: bytes,
    filename: str,
    syllabus_topics: list[str],
    ai_engine_url: str = "http://localhost:8001",
) -> dict:
    import httpx

    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(
            f"{ai_engine_url}/api/analyze",
            files={"file": (filename, image_bytes, "image/png")},
            data={"syllabus_topics": ",".join(syllabus_topics)},
        )
        response.raise_for_status()
        return response.json()
