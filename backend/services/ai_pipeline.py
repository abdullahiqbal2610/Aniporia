"""
AI Pipeline Service
-------------------
Calls the ai_engine as a separate HTTP microservice on port 8001.
The AI engine runs independently and can be scaled separately.
"""

import sys
import os
import json
import tempfile


def run_pipeline(image_bytes: bytes, syllabus_topics: list[str]) -> dict:
    """
    DEPRECATED: This directly imports the AI engine.
    Use run_pipeline_via_http instead to call the AI engine microservice.
    """
    raise NotImplementedError(
        "Direct import disabled. AI engine runs on port 8001. Use run_pipeline_via_http()."
    )


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
