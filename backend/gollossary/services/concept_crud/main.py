"""
Точка входа для сервиса concept-crud (порт 8002).
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
    title="Gollossary — Concept CRUD",
    description=(
        "Микросервис управления понятиями: "
        "полный CRUD для Concept-документов внутри MindMap-коллекции."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.on_event("startup")
async def on_startup() -> None:
    logger.info("Подключение к MongoDB...")
    await connect_db()
    logger.info("concept-crud готов (порт %d)", settings.concept_crud_port)


@app.on_event("shutdown")
async def on_shutdown() -> None:
    await close_db()
    logger.info("concept-crud остановлен.")


@app.get("/health", tags=["Health"])
async def health() -> dict:
    return {"status": "ok", "service": "concept-crud"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.concept_crud_port,
        reload=True,
    )
