"""
FastAPI маршруты для сервиса lecture-processor.
"""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from datetime import datetime, timezone
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
    ProcessResponse,
)
from shared.config import get_settings

from .llm_client import BaseLLMClient, LocalLLMClient, GeminiLLMClient, OpenRouterLLMClient
from .processor import LectureProcessor

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/lectures", tags=["Lectures"])


# ---------------------------------------------------------------------------
# In-memory job tracker
# Хранит состояние фоновых задач (process-async). Живёт пока жив процесс.
# ---------------------------------------------------------------------------

class JobStatus:
    PENDING  = "pending"
    RUNNING  = "running"
    DONE     = "done"
    FAILED   = "failed"


_jobs: dict[str, dict] = {}   # job_id → job_info dict
_MAX_JOBS = 500                # Не держим больше N записей в памяти


def _create_job(source_id: str | None, lecture_number: str | None, chars: int) -> str:
    """Создаёт запись о новой задаче и возвращает job_id."""
    global _jobs
    job_id = str(uuid.uuid4())
    _jobs[job_id] = {
        "job_id": job_id,
        "status": JobStatus.PENDING,
        "source_id": source_id,
        "lecture_number": lecture_number,
        "chars": chars,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "started_at": None,
        "finished_at": None,
        "elapsed_sec": None,
        "mindmap_id": None,
        "topic": None,
        "concept_count": None,
        "chunk_count": None,
        "error": None,
    }
    # Удаляем старые записи, если накопилось слишком много
    if len(_jobs) > _MAX_JOBS:
        oldest = sorted(_jobs.keys(), key=lambda k: _jobs[k]["created_at"])
        for old_key in oldest[: len(_jobs) - _MAX_JOBS]:
            _jobs.pop(old_key, None)
    return job_id


def _update_job(job_id: str, **kwargs) -> None:
    if job_id in _jobs:
        _jobs[job_id].update(kwargs)


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
        logger.info("[routes] LLM backend: Gemini API (model=%s)", settings.gemini_model)
    elif backend == "openrouter":
        _llm_client = OpenRouterLLMClient(
            api_key=settings.openrouter_api_key,
            model=settings.openrouter_model,
            base_url=settings.openrouter_base_url,
            temperature=settings.llm_temperature,
            max_tokens=settings.llm_max_tokens,
            site_url=settings.openrouter_site_url,
            site_name=settings.openrouter_site_name,
        )
        logger.info(
            "[routes] LLM backend: OpenRouter (model=%s)",
            settings.openrouter_model,
        )
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
                logger.error("[routes] Не удалось загрузить локальную LLM: %s", e)
        _llm_client = client
        logger.info(
            "[routes] LLM backend: Local GGUF (%s)",
            settings.llm_model_path or "<не задан>",
        )

    return _llm_client


def _check_llm_available(llm: BaseLLMClient) -> None:
    """Бросает HTTPException 503 если LLM недоступна."""
    if llm.is_available():
        return
    settings = get_settings()
    backend = settings.llm_backend.lower()
    if backend == "gemini":
        detail = "Gemini API недоступен. Укажите GEMINI_API_KEY в .env"
    elif backend == "openrouter":
        detail = "OpenRouter API недоступен. Укажите OPENROUTER_API_KEY в .env (https://openrouter.ai/keys)"
    else:
        detail = (
            "LLM модель не настроена или файл не найден. "
            "Укажите LLM_MODEL_PATH в .env. "
            "Альтернативы: LLM_BACKEND=gemini или LLM_BACKEND=openrouter."
        )
    raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/process",
    response_model=ProcessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Обработать одну лекцию (синхронно)",
)
async def process_lecture(
    body: LectureInput,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
    llm: Annotated[BaseLLMClient, Depends(get_llm_client)],
) -> ProcessResponse:
    _check_llm_available(llm)
    processor = LectureProcessor(db=db, llm_client=llm)
    try:
        mindmap = await processor.process(
            content=body.content,
            lecture_number=body.lecture_number,
            source_id=body.source_id,
            language=body.language,
        )
    except Exception as e:
        logger.exception("[routes] Ошибка синхронной обработки лекции")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    return ProcessResponse(
        mindmap_id=str(mindmap.id),
        lecture_number=mindmap.lecture_number,
        topic=mindmap.topic,
        concept_count=len(mindmap.concepts),
        chunk_count=mindmap.chunk_count,
    )


# ---------------------------------------------------------------------------
# Async endpoint
# ---------------------------------------------------------------------------

@router.post(
    "/process-async",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Обработать лекцию асинхронно",
    description=(
        "Запускает генерацию в фоне, сразу возвращает 202 с job_id. "
        "Статус задачи: GET /api/v1/lectures/jobs/{job_id}"
    ),
)
async def process_lecture_async(
    body: LectureInput,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
    llm: Annotated[BaseLLMClient, Depends(get_llm_client)],
) -> dict:
    _check_llm_available(llm)

    job_id = _create_job(
        source_id=body.source_id,
        lecture_number=body.lecture_number,
        chars=len(body.content or ""),
    )

    logger.info(
        "[routes] Async job принят | job_id=%s | source_id=%s | lecture_number=%r | chars=%d",
        job_id, body.source_id, body.lecture_number, len(body.content or ""),
    )

    processor = LectureProcessor(db=db, llm_client=llm)

    async def _run() -> None:
        t0 = time.perf_counter()
        _update_job(
            job_id,
            status=JobStatus.RUNNING,
            started_at=datetime.now(timezone.utc).isoformat(),
        )
        try:
            mindmap = await processor.process(
                content=body.content,
                lecture_number=body.lecture_number,
                source_id=body.source_id,
                language=body.language,
            )
            elapsed = time.perf_counter() - t0
            _update_job(
                job_id,
                status=JobStatus.DONE,
                finished_at=datetime.now(timezone.utc).isoformat(),
                elapsed_sec=round(elapsed, 2),
                mindmap_id=str(mindmap.id),
                topic=mindmap.topic,
                concept_count=len(mindmap.concepts),
                chunk_count=mindmap.chunk_count,
            )
            logger.info(
                "[routes] ✅ Async job DONE | job_id=%s | mindmap_id=%s | elapsed=%.1f с",
                job_id, str(mindmap.id), elapsed,
            )
        except Exception:
            elapsed = time.perf_counter() - t0
            logger.exception(
                "[routes] ✗ Async job FAILED | job_id=%s | elapsed=%.1f с",
                job_id, elapsed,
            )
            _update_job(
                job_id,
                status=JobStatus.FAILED,
                finished_at=datetime.now(timezone.utc).isoformat(),
                elapsed_sec=round(elapsed, 2),
                error="Смотрите логи lecture-processor (uvicorn :8001)",
            )

    asyncio.create_task(_run())
    return {"accepted": True, "job_id": job_id}


# ---------------------------------------------------------------------------
# Job status endpoint
# ---------------------------------------------------------------------------

@router.get(
    "/jobs",
    summary="Список всех фоновых задач",
    description="Возвращает последние задачи process-async с их статусом.",
)
async def list_jobs() -> list[dict]:
    return sorted(_jobs.values(), key=lambda j: j["created_at"], reverse=True)


@router.get(
    "/jobs/{job_id}",
    summary="Статус конкретной фоновой задачи",
)
async def get_job(job_id: str) -> dict:
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job {job_id!r} не найден")
    return job


# ---------------------------------------------------------------------------
# Batch endpoint
# ---------------------------------------------------------------------------

@router.post(
    "/process-batch",
    response_model=BatchProcessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Пакетная обработка лекций",
)
async def process_batch(
    body: BatchLectureInput,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
    llm: Annotated[BaseLLMClient, Depends(get_llm_client)],
) -> BatchProcessResponse:
    _check_llm_available(llm)
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
            logger.exception("[routes] Ошибка в лекции %d батча", i)
            errors.append({"index": i, "error": str(e)})

    return BatchProcessResponse(
        processed=len(results),
        failed=len(errors),
        results=results,
        errors=errors,
    )


# ---------------------------------------------------------------------------
# Get single mindmap
# ---------------------------------------------------------------------------

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
    doc = await db[settings.collection_name].find_one({"_id": ObjectId(mindmap_id)})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MindMap не найден")

    doc["_id"] = str(doc["_id"])
    return MindMap(**doc)
