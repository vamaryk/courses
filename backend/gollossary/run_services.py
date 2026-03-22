"""
Unified runner for Gollossary microservices.

Starts both FastAPI services:
- lecture-processor  (port 8001)
- concept-crud       (port 8002)

Usage (from backend/gollossary directory, inside venv):

    .venv\\Scripts\\python run_services.py

Press Ctrl+C to stop both services.
"""

from __future__ import annotations

import os
import signal
import subprocess
import sys
from pathlib import Path
from typing import List


ROOT_DIR = Path(__file__).resolve().parent


def _build_commands(python_executable: str) -> List[List[str]]:
    """Commands to start both microservices."""
    return [
        [
            python_executable,
            # Небуферизованный stdout/stderr: иначе на Windows логи LLM могут «молчать» минутами.
            "-u",
            "-m",
            "uvicorn",
            "services.lecture_processor.main:app",
            "--host",
            "0.0.0.0",
            "--port",
            "8001",
            "--reload",
        ],
        [
            python_executable,
            "-u",
            "-m",
            "uvicorn",
            "services.concept_crud.main:app",
            "--host",
            "0.0.0.0",
            "--port",
            "8002",
            "--reload",
        ],
    ]


def main() -> None:
    python_executable = sys.executable  # venv python
    commands = _build_commands(python_executable)

    processes: List[subprocess.Popen] = []

    child_env = os.environ.copy()
    child_env.setdefault("PYTHONUNBUFFERED", "1")
    # Корректнее кириллица в логах в консоли Windows.
    if sys.platform == "win32":
        child_env.setdefault("PYTHONIOENCODING", "utf-8")

    try:
        for cmd in commands:
            proc = subprocess.Popen(
                cmd,
                cwd=ROOT_DIR,
                env=child_env,
            )
            processes.append(proc)

        # Wait for any process to exit (Ctrl+C or error)
        for proc in processes:
            proc.wait()
    except KeyboardInterrupt:
        pass
    finally:
        # Gracefully terminate all child processes
        for proc in processes:
            if proc.poll() is None:
                try:
                    proc.send_signal(signal.SIGINT)
                except Exception:
                    proc.terminate()


if __name__ == "__main__":
    main()

