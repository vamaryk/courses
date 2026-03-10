"""
FastAPI маршруты для сервиса lecture-processor.
"""

from __future__ import annotations

import logging
from typing import Annotated

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from shared.database import get_db
from shared.models import (
    BatchLectureInput,
    BatchProcessResponse,
    LectureInput,
    MindMap,
    MindMapSummary,
    ProcessResponse,
)
from shared.config import get_settings

from .llm_client import BaseLLMClient, LocalLLMClient, GeminiLLMClient
from .processor import LectureProcessor

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/lectures", tags=["Lectures"])


# ---------------------------------------------------------------------------
# Dependency: LLMClient singleton
# ---------------------------------------------------------------------------

_llm_client: BaseLLMClient | None = None


def get_llm_client() -> BaseLLMClient:
    global _llm_client
    if _llm_client is not None:
        return _llm_client

    settings = get_settings()
    backend = settings.llm_backend.lower()

    if backend == "gemini":
        _llm_client = GeminiLLMClient(
            api_key=settings.gemini_api_key,
            model=settings.gemini_model,
            temperature=settings.llm_temperature,
            max_tokens=settings.llm_max_tokens,
        )
        logger.info("LLM backend: Gemini API (model=%s)", settings.gemini_model)
    else:
        client = LocalLLMClient(
            model_path=settings.llm_model_path,
            n_ctx=settings.llm_n_ctx,
            n_gpu_layers=settings.llm_n_gpu_layers,
            temperature=settings.llm_temperature,
            max_tokens=settings.llm_max_tokens,
        )
        if settings.llm_model_path:
            try:
                client.ensure_loaded()
            except Exception as e:
                logger.error("Не удалось загрузить локальную LLM: %s", e)
        _llm_client = client
        logger.info("LLM backend: Local GGUF (%s)", settings.llm_model_path or "<не задан>")

    return _llm_client


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/process",
    response_model=ProcessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Обработать одну лекцию",
    description=(
        "Принимает текст лекции, разбивает на чанки, "
        "извлекает понятия через LLM и сохраняет MindMap в MongoDB."
    ),
)
async def process_lecture(
    body: LectureInput,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
    llm: Annotated[BaseLLMClient, Depends(get_llm_client)],
) -> ProcessResponse:
    settings = get_settings()
    if not llm.is_available():
        backend = settings.llm_backend.lower()
        if backend == "gemini":
            detail = "Gemini API недоступен. Укажите GEMINI_API_KEY в .env"
        else:
            detail = "LLM модель не настроена. Укажите LLM_MODEL_PATH в .env"
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail,
        )

    processor = LectureProcessor(db=db, llm_client=llm)
    try:
        mindmap = await processor.process(
            content=body.content,
            lecture_number=body.lecture_number,
            source_id=body.source_id,
            language=body.language,
        )
    except Exception as e:
        logger.exception("Ошибка обработки лекции")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )

    return ProcessResponse(
        mindmap_id=str(mindmap.id),
        lecture_number=mindmap.lecture_number,
        topic=mindmap.topic,
        concept_count=len(mindmap.concepts),
        chunk_count=mindmap.chunk_count,
    )


@router.post(
    "/process-batch",
    response_model=BatchProcessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Пакетная обработка лекций",
    description="Принимает список лекций и обрабатывает их последовательно.",
)
async def process_batch(
    body: BatchLectureInput,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
    llm: Annotated[BaseLLMClient, Depends(get_llm_client)],
) -> BatchProcessResponse:
    settings = get_settings()
    if not llm.is_available():
        backend = settings.llm_backend.lower()
        if backend == "gemini":
            detail = "Gemini API недоступен. Укажите GEMINI_API_KEY в .env"
        else:
            detail = "LLM модель не настроена. Укажите LLM_MODEL_PATH в .env"
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail,
        )

    processor = LectureProcessor(db=db, llm_client=llm)
    results: list[ProcessResponse] = []
    errors: list[dict] = []

    for i, lecture in enumerate(body.lectures):
        try:
            mindmap = await processor.process(
                content=lecture.content,
                lecture_number=lecture.lecture_number,
                source_id=lecture.source_id,
                language=lecture.language,
            )
            results.append(ProcessResponse(
                mindmap_id=str(mindmap.id),
                lecture_number=mindmap.lecture_number,
                topic=mindmap.topic,
                concept_count=len(mindmap.concepts),
                chunk_count=mindmap.chunk_count,
            ))
        except Exception as e:
            logger.exception("Ошибка в лекции %d", i)
            errors.append({"index": i, "error": str(e)})

    return BatchProcessResponse(
        processed=len(results),
        failed=len(errors),
        results=results,
        errors=errors,
    )


@router.get(
    "/{mindmap_id}/mindmap",
    response_model=MindMap,
    summary="Получить MindMap лекции",
)
async def get_mindmap(
    mindmap_id: str,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
) -> MindMap:
    if not ObjectId.is_valid(mindmap_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Невалидный ID")

    settings = get_settings()
    collection = settings.collection_name
    doc = await db[collection].find_one({"_id": ObjectId(mindmap_id)})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MindMap не найден")

    doc["_id"] = str(doc["_id"])
    return MindMap(**doc)
