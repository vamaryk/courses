"""
Точка входа для сервиса lecture-processor (порт 8001).
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Добавляем корень проекта в sys.path для импорта shared
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from shared.database import connect_db, close_db
from shared.config import get_settings
from .routes import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()

app = FastAPI(
    title="Gollossary — Lecture Processor",
    description=(
        "Микросервис обработки лекций: разбивает текст на чанки, "
        "извлекает понятия через локальную LLM и сохраняет MindMap в MongoDB."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Роутер
app.include_router(router)


@app.on_event("startup")
async def on_startup() -> None:
    logger.info("Подключение к MongoDB...")
    await connect_db()
    logger.info("lecture-processor готов (порт %d)", settings.lecture_processor_port)


@app.on_event("shutdown")
async def on_shutdown() -> None:
    await close_db()
    logger.info("lecture-processor остановлен.")


@app.get("/health", tags=["Health"])
async def health() -> dict:
    return {"status": "ok", "service": "lecture-processor"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.lecture_processor_port,
        reload=True,
    )
