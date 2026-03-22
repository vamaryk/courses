#!/usr/bin/env python3
"""
Обработка лекции из файла через LectureProcessor (как /api/v1/lectures/process).

Запуск из каталога backend/gollossary (с активированным venv):

    python scripts/process_lecture_file.py
    python scripts/process_lecture_file.py data/examples/test_lecture_mindmap.md

Требования: MongoDB (MONGO_URI в .env), LLM — local (LLM_MODEL_PATH) или gemini (GEMINI_API_KEY).
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from shared.config import get_settings
from shared.database import close_db, connect_db, get_database
from services.lecture_processor.llm_client import GeminiLLMClient, LocalLLMClient, OpenRouterLLMClient
from services.lecture_processor.processor import LectureProcessor


def _build_llm():
    settings = get_settings()
    backend = settings.llm_backend.lower()

    if backend == "gemini":
        client = GeminiLLMClient(
            api_key=settings.gemini_api_key,
            model=settings.gemini_model,
            temperature=settings.llm_temperature,
            max_tokens=settings.llm_max_tokens,
        )
        if not client.is_available():
            raise SystemExit(
                "Gemini недоступен: задайте GEMINI_API_KEY в backend/gollossary/.env"
            )
        return client

    if backend == "openrouter":
        client = OpenRouterLLMClient(
            api_key=settings.openrouter_api_key,
            model=settings.openrouter_model,
            base_url=settings.openrouter_base_url,
            temperature=settings.llm_temperature,
            max_tokens=settings.llm_max_tokens,
            site_url=settings.openrouter_site_url,
            site_name=settings.openrouter_site_name,
        )
        if not client.is_available():
            raise SystemExit(
                "OpenRouter недоступен: задайте OPENROUTER_API_KEY в .env\n"
                "Получить ключ: https://openrouter.ai/keys"
            )
        return client

    # local (default)
    client = LocalLLMClient(
        model_path=settings.llm_model_path,
        n_ctx=settings.llm_n_ctx,
        n_gpu_layers=settings.llm_n_gpu_layers,
        temperature=settings.llm_temperature,
        max_tokens=settings.llm_max_tokens,
    )
    if not client.is_available():
        raise SystemExit(
            "Локальная LLM недоступна: проверьте LLM_MODEL_PATH в .env\n"
            "Альтернативы: LLM_BACKEND=gemini или LLM_BACKEND=openrouter"
        )
    try:
        client.ensure_loaded()
    except Exception as e:
        raise SystemExit(f"Не удалось загрузить GGUF: {e}") from e
    return client


async def _run(path: Path, lecture_number: str | None, source_id: str | None) -> None:
    content = path.read_text(encoding="utf-8")
    if len(content.strip()) < 10:
        raise SystemExit("Файл слишком короткий (минимум 10 символов).")

    await connect_db()
    try:
        db = get_database()
        llm = _build_llm()
        processor = LectureProcessor(db=db, llm_client=llm)
        mindmap = await processor.process(
            content=content,
            lecture_number=lecture_number,
            source_id=source_id,
            language="ru",
        )
        mid = str(mindmap.id) if mindmap.id else "?"
        print("--- MindMap создан ---")
        print(f"mindmap_id:     {mid}")
        print(f"lecture_number: {mindmap.lecture_number}")
        print(f"topic:          {mindmap.topic}")
        print(f"concepts:       {len(mindmap.concepts)}")
        print(f"chunks:         {mindmap.chunk_count}")
        print("\nПервые понятия:")
        for c in mindmap.concepts[:8]:
            parent = c.relations.parent or "—"
            print(f"  • {c.term} (parent: {parent})")
        if len(mindmap.concepts) > 8:
            print(f"  … и ещё {len(mindmap.concepts) - 8}")
        print(f"\nПолный документ в MongoDB: коллекция из настроек, id={mid}")
    finally:
        await close_db()


def main() -> None:
    default_file = ROOT / "data" / "examples" / "test_lecture_mindmap.md"
    p = argparse.ArgumentParser(description="Обработать лекцию из файла → MindMap в MongoDB")
    p.add_argument(
        "lecture_file",
        nargs="?",
        default=str(default_file),
        type=Path,
        help=f"Путь к .md/.txt (по умолчанию: {default_file})",
    )
    p.add_argument("--lecture-number", default=None, help="Номер лекции (опционально)")
    p.add_argument("--source-id", default=None, help="ObjectId источника в БД (опционально)")
    args = p.parse_args()
    path = args.lecture_file.resolve()
    if not path.is_file():
        raise SystemExit(f"Файл не найден: {path}")

    asyncio.run(_run(path, args.lecture_number, args.source_id))


if __name__ == "__main__":
    main()
