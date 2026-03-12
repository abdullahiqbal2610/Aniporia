import sys
import os

# Add backend dir to path BEFORE any imports
os.chdir(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set it for subprocesses too
os.environ["PYTHONPATH"] = os.path.dirname(os.path.abspath(__file__))

import uvicorn

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)