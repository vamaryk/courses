"""
Бизнес-логика обработки лекций.

Оркестрирует: LectureChunker → LLMClient → агрегацию → сохранение в MongoDB.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
import re

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from .chunker import LectureChunker
from .llm_client import LLMClient
from .prompts import build_lecture_prompt

import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from shared.models import Concept, ConceptRelations, MindMap
from shared.config import get_settings

logger = logging.getLogger(__name__)

_GOLLOSSARY_ROOT = Path(__file__).resolve().parents[2]


def _maybe_debug_save_lecture(
    settings,
    content: str,
    lecture_number: Optional[str],
    source_id: Optional[str],
) -> None:
    """
    Опционально сохраняет входной текст в DEBUG_LECTURE_DIR для отладки цепочки
    Node → Python → LLM. Не влияет на обработку.
    """
    raw = (settings.debug_lecture_dir or "").strip()
    if not raw:
        return
    try:
        base = _GOLLOSSARY_ROOT / raw
        base.mkdir(parents=True, exist_ok=True)
        safe_src = re.sub(r"[^\w.\-]+", "_", str(source_id or "unknown"))[:80]
        ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        fname = f"{safe_src}_{ts}.md"
        path = base / fname
        header = (
            f"---\n"
            f"source_id: {source_id!r}\n"
            f"lecture_number: {lecture_number!r}\n"
            f"chars: {len(content)}\n"
            f"---\n\n"
        )
        path.write_text(header + content, encoding="utf-8")
        logger.info("[processor] Отладка: текст лекции сохранён → %s", path)
    except OSError as e:
        logger.warning("[processor] Не удалось записать debug-файл лекции: %s", e)


class LectureProcessor:
    """
    Обрабатывает одну лекцию:
    1. Разбивает на чанки
    2. Для каждого чанка запрашивает LLM
    3. Агрегирует и дедуплицирует понятия
    4. Сохраняет MindMap в MongoDB
    """

    def __init__(self, db: AsyncIOMotorDatabase, llm_client: LLMClient):
        self.db = db
        self.llm = llm_client
        settings = get_settings()
        self.chunker = LectureChunker(
            max_chunk_chars=settings.max_chunk_chars,
            overlap_chars=settings.chunk_overlap_chars,
        )
        self.max_concepts = settings.max_concepts

    async def process(
        self,
        content: str,
        lecture_number: Optional[str] = None,
        source_id: Optional[str] = None,
        language: str = "ru",
    ) -> MindMap:
        """
        Полный цикл обработки одной лекции.

        Args:
            content: Текст лекции
            lecture_number: Явный номер лекции (если None — LLM определит)
            source_id: ID источника в БД
            language: Язык

        Returns:
            Сохранённый MindMap-документ с _id
        """
        total_t0 = time.perf_counter()
        settings = get_settings()
        backend = settings.llm_backend.lower()

        logger.info(
            "=" * 60 + "\n"
            "[processor] СТАРТ обработки лекции\n"
            "  source_id     : %s\n"
            "  lecture_number: %s\n"
            "  language      : %s\n"
            "  backend       : %s\n"
            "  chars         : %d",
            source_id, lecture_number, language, backend, len(content),
        )

        _maybe_debug_save_lecture(settings, content, lecture_number, source_id)

        # 1. Разбиваем на чанки
        chunks = self.chunker.split(content)
        logger.info(
            "[processor] Разбивка на чанки: %d чанков | max_chunk_chars=%d | overlap=%d",
            len(chunks), settings.max_chunk_chars, settings.chunk_overlap_chars,
        )
        for i, ch in enumerate(chunks, 1):
            logger.info("[processor]   Чанк %d/%d: %d символов", i, len(chunks), len(ch))

        # 2. Обрабатываем чанки через LLM
        all_concepts: list[Concept] = []
        detected_lecture_number: str = lecture_number or "Лекция"
        detected_topic: str = ""
        detected_description: str = ""

        for idx, chunk in enumerate(chunks, 1):
            chunk_t0 = time.perf_counter()
            logger.info(
                "[processor] ── Чанк %d/%d ── %d символов → отправка в LLM...",
                idx, len(chunks), len(chunk),
            )
            prompt = build_lecture_prompt(chunk, language)

            try:
                data = await self.llm.generate_json(prompt)
            except Exception as e:
                logger.warning(
                    "[processor] ✗ Чанк %d/%d ОШИБКА за %.1f с: %s",
                    idx, len(chunks), time.perf_counter() - chunk_t0, e,
                )
                continue

            chunk_elapsed = time.perf_counter() - chunk_t0

            # Номер лекции и тема — берём из первого чанка
            if idx == 1:
                if not lecture_number:
                    detected_lecture_number = data.get("lecture_number", "Лекция")
                detected_topic = data.get("topic", "")
                detected_description = data.get("description", "")

            raw_concepts = data.get("concepts", [])
            chunk_ok = 0
            chunk_skip = 0

            for item in raw_concepts:
                try:
                    relations_in = item.get("relations", {}) if isinstance(item, dict) else {}
                    parent_raw = (
                        relations_in.get("parent")
                        if isinstance(relations_in, dict)
                        else None
                    )
                    if isinstance(parent_raw, str) and parent_raw.strip().lower() == "null":
                        parent_raw = None

                    children_raw = (
                        relations_in.get("children", [])
                        if isinstance(relations_in, dict)
                        else []
                    )
                    normalized_children: list[str] = []
                    if isinstance(children_raw, list):
                        for ch in children_raw:
                            if ch is None:
                                continue
                            ch_str = str(ch).strip()
                            if ch_str:
                                normalized_children.append(ch_str)
                    elif isinstance(children_raw, str):
                        ch = children_raw.strip()
                        if ch:
                            normalized_children = [ch]

                    concept = Concept(
                        term=str(item.get("term", "")).strip(),
                        definition=str(item.get("definition", "")).strip(),
                        example=str(item.get("example", "")),
                        image_description=str(item.get("image_description", "")),
                        relations=ConceptRelations(
                            parent=parent_raw,
                            children=normalized_children,
                        ),
                    )
                    if concept.term and concept.definition:
                        all_concepts.append(concept)
                        chunk_ok += 1
                    else:
                        chunk_skip += 1
                        logger.debug(
                            "[processor] Пропуск пустого понятия: term=%r", item.get("term"),
                        )
                except Exception as e:
                    chunk_skip += 1
                    logger.warning("[processor] Пропуск понятия из-за ошибки: %s | %s", e, item)

            logger.info(
                "[processor] ✓ Чанк %d/%d завершён за %.2f с | "
                "тема=%r | понятий в чанке: +%d (пропущено %d)",
                idx, len(chunks), chunk_elapsed,
                data.get("topic", "?"), chunk_ok, chunk_skip,
            )

        # 3. Дедупликация по term.lower()
        seen: set[str] = set()
        unique_concepts: list[Concept] = []
        for c in all_concepts:
            key = c.term.strip().lower()
            if key not in seen:
                seen.add(key)
                unique_concepts.append(c)

        duplicates_removed = len(all_concepts) - len(unique_concepts)
        logger.info(
            "[processor] Дедупликация: %d → %d понятий (убрано дублей: %d)",
            len(all_concepts), len(unique_concepts), duplicates_removed,
        )

        # 4. Ограничиваем количество
        final_concepts = unique_concepts[:self.max_concepts]
        if len(unique_concepts) > self.max_concepts:
            logger.info(
                "[processor] Обрезано до max_concepts=%d (было %d)",
                self.max_concepts, len(unique_concepts),
            )

        # 4b. Если ни одного понятия — не сохраняем, чтобы не затереть старый рабочий mindmap
        if not final_concepts:
            logger.warning(
                "[processor] ⚠ Нет понятий для source_id=%s — mindmap НЕ сохраняется в MongoDB.\n"
                "  Возможные причины: LLM вернула пустой ответ, ошибки парсинга JSON,\n"
                "  слишком короткий текст лекции или прерванная генерация.",
                source_id,
            )
            raise RuntimeError(
                f"Генерация завершена без понятий (source_id={source_id!r}). "
                "Mindmap не сохранён — проверьте логи LLM выше."
            )

        # Определяем имя модели
        if backend == "gemini":
            model_used = f"gemini:{settings.gemini_model}"
        else:
            model_used = Path(settings.llm_model_path).name if settings.llm_model_path else "mock"

        # 5. Строим модель
        mindmap = MindMap(
            lecture_number=detected_lecture_number,
            topic=detected_topic or detected_lecture_number,
            description=detected_description,
            concepts=final_concepts,
            source_lecture_id=source_id,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            model_used=model_used,
            chunk_count=len(chunks),
        )

        # 6. Сохраняем в MongoDB
        # Если source_id задан — заменяем существующий документ (upsert),
        # чтобы не накапливать дубли. Старые дубли с тем же source_lecture_id удаляем.
        collection = settings.collection_name
        doc = mindmap.to_mongo()
        t_save = time.perf_counter()

        if source_id:
            # replace_one сохраняет оригинальный _id при замене (MongoDB не меняет _id)
            replace_result = await self.db[collection].replace_one(
                {"source_lecture_id": source_id},
                doc,
                upsert=True,
            )
            if replace_result.upserted_id is not None:
                # Нового документа раньше не было — получаем свежий _id
                inserted_id = replace_result.upserted_id
                logger.info("[processor] Новый MindMap создан (upsert) id=%s", inserted_id)
            else:
                # Заменили существующий документ — находим его _id
                existing = await self.db[collection].find_one(
                    {"source_lecture_id": source_id},
                    {"_id": 1},
                )
                inserted_id = existing["_id"]
                logger.info("[processor] Существующий MindMap заменён id=%s", inserted_id)

            # Удаляем все остальные дубли для этого source_id
            del_result = await self.db[collection].delete_many({
                "source_lecture_id": source_id,
                "_id": {"$ne": inserted_id},
            })
            if del_result.deleted_count:
                logger.info(
                    "[processor] Удалено старых дублей: %d (source_id=%s)",
                    del_result.deleted_count, source_id,
                )
        else:
            result = await self.db[collection].insert_one(doc)
            inserted_id = result.inserted_id

        save_elapsed = time.perf_counter() - t_save
        mindmap = mindmap.model_copy(update={"id": str(inserted_id)})

        total_elapsed = time.perf_counter() - total_t0
        logger.info(
            "[processor] ✅ ГОТОВО source_id=%s\n"
            "  MindMap id  : %s\n"
            "  Тема        : %r\n"
            "  Понятий     : %d\n"
            "  Чанков      : %d\n"
            "  Модель      : %s\n"
            "  MongoDB save: %.3f с\n"
            "  Итого       : %.1f с",
            source_id,
            str(inserted_id),
            mindmap.topic,
            len(final_concepts),
            len(chunks),
            model_used,
            save_elapsed,
            total_elapsed,
        )
        logger.info("=" * 60)
        return mindmap
