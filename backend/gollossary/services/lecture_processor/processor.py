"""
Бизнес-логика обработки лекций.

Оркестрирует: LectureChunker → LLMClient → агрегацию → сохранение в MongoDB.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from .chunker import LectureChunker
from .llm_client import LLMClient
from .prompts import build_lecture_prompt

# sys.path magic не нужен — используем относительный импорт через PYTHONPATH
import sys, os
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from shared.models import Concept, ConceptRelations, MindMap
from shared.config import get_settings

logger = logging.getLogger(__name__)


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
        settings = get_settings()

        # 1. Разбиваем на чанки
        chunks = self.chunker.split(content)
        logger.info("Лекция разбита на %d чанк(ов) (%d символов)", len(chunks), len(content))

        # 2. Обрабатываем чанки
        all_concepts: list[Concept] = []
        detected_lecture_number: str = lecture_number or "Лекция"
        detected_topic: str = ""
        detected_description: str = ""

        for idx, chunk in enumerate(chunks, 1):
            logger.info("Обработка чанка %d/%d...", idx, len(chunks))
            prompt = build_lecture_prompt(chunk, language)

            try:
                data = await self.llm.generate_json(prompt)
            except Exception as e:
                logger.warning("Ошибка LLM для чанка %d: %s", idx, e)
                continue

            # Номер лекции и тема — берём из первого чанка
            if idx == 1:
                if not lecture_number:
                    detected_lecture_number = data.get("lecture_number", "Лекция")
                detected_topic = data.get("topic", "")
                detected_description = data.get("description", "")

            # Понятия из чанка
            raw_concepts = data.get("concepts", [])
            for item in raw_concepts:
                try:
                    concept = Concept(
                        term=str(item.get("term", "")).strip(),
                        definition=str(item.get("definition", "")).strip(),
                        example=str(item.get("example", "")),
                        image_description=str(item.get("image_description", "")),
                        relations=ConceptRelations(
                            parent=item.get("relations", {}).get("parent"),
                            children=item.get("relations", {}).get("children", []),
                        ),
                    )
                    if concept.term and concept.definition:
                        all_concepts.append(concept)
                except Exception as e:
                    logger.warning("Пропуск понятия из-за ошибки: %s | %s", e, item)

        # 3. Дедупликация по term.lower()
        seen: set[str] = set()
        unique_concepts: list[Concept] = []
        for c in all_concepts:
            key = c.term.strip().lower()
            if key not in seen:
                seen.add(key)
                unique_concepts.append(c)

        # 4. Ограничиваем количество
        final_concepts = unique_concepts[:self.max_concepts]

        # Определяем имя использованной модели
        backend = settings.llm_backend.lower()
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
        collection = settings.collection_name
        doc = mindmap.to_mongo()
        result = await self.db[collection].insert_one(doc)
        mindmap = mindmap.model_copy(update={"id": str(result.inserted_id)})

        logger.info(
            "MindMap сохранён: id=%s, понятий=%d, чанков=%d",
            str(result.inserted_id), len(final_concepts), len(chunks)
        )
        return mindmap
