"""
Общие Pydantic-модели данных для всех микросервисов.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated, Any, Optional
from pydantic import BaseModel, Field, field_validator, model_serializer
from bson import ObjectId
import uuid


# ---------------------------------------------------------------------------
# ObjectId helper
# ---------------------------------------------------------------------------

class PyObjectId(str):
    """Строковое представление MongoDB ObjectId для Pydantic v2."""

    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v: Any) -> str:
        if isinstance(v, ObjectId):
            return str(v)
        if isinstance(v, str) and ObjectId.is_valid(v):
            return v
        raise ValueError(f"Invalid ObjectId: {v!r}")

    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler):
        from pydantic_core import core_schema
        return core_schema.no_info_plain_validator_function(
            cls.validate,
            serialization=core_schema.to_string_ser_schema(),
        )


# ---------------------------------------------------------------------------
# Concept (понятие из лекции)
# ---------------------------------------------------------------------------

class ConceptRelations(BaseModel):
    """Иерархические связи понятия."""
    parent: Optional[str] = Field(default=None, description="Родительское понятие")
    children: list[str] = Field(default_factory=list, description="Дочерние понятия")


class Concept(BaseModel):
    """Ключевое понятие из лекции."""
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    term: str = Field(min_length=1, max_length=300, description="Название понятия")
    definition: str = Field(min_length=1, description="Определение")
    example: str = Field(default="", description="Пример использования")
    image_description: str = Field(default="", description="Описание иллюстрации")
    relations: ConceptRelations = Field(default_factory=ConceptRelations)

    model_config = {"populate_by_name": True}

    def to_mongo(self) -> dict:
        d = self.model_dump(exclude={"id"})
        if self.id:
            d["_id"] = ObjectId(self.id)
        return d


class ConceptCreate(BaseModel):
    """Схема для создания понятия."""
    term: str = Field(min_length=1, max_length=300)
    definition: str = Field(min_length=1)
    example: str = ""
    image_description: str = ""
    relations: ConceptRelations = Field(default_factory=ConceptRelations)


class ConceptUpdate(BaseModel):
    """Схема для обновления понятия (все поля необязательны)."""
    term: Optional[str] = Field(default=None, max_length=300)
    definition: Optional[str] = None
    example: Optional[str] = None
    image_description: Optional[str] = None
    relations: Optional[ConceptRelations] = None


# ---------------------------------------------------------------------------
# MindMap (карта понятий лекции)
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Canvas models (визуальный слой — ноды и рёбра на канвасе)
# ---------------------------------------------------------------------------

class CanvasNode(BaseModel):
    """Визуальный узел на канвасе (облако понятия)."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="UUID узла")
    title: str = Field(min_length=1, max_length=300)
    description: str = Field(default="")
    stage: int = Field(default=1, ge=1, description="Номер лекции/этапа")
    course: str = Field(default="", description="ID курса")
    themes: list[str] = Field(default_factory=list)
    x: float = Field(default=100.0)
    y: float = Field(default=100.0)

    model_config = {"populate_by_name": True}


class CanvasNodeCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    description: str = Field(default="")
    stage: int = Field(default=1, ge=1)
    course: str = Field(default="")
    themes: list[str] = Field(default_factory=list)
    x: float = Field(default=100.0)
    y: float = Field(default=100.0)


class CanvasNodeUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=300)
    description: Optional[str] = None
    stage: Optional[int] = None
    course: Optional[str] = None
    themes: Optional[list[str]] = None
    x: Optional[float] = None
    y: Optional[float] = None


class CanvasEdge(BaseModel):
    """Связь (стрелка) между двумя узлами канваса."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="UUID ребра")
    from_node: str = Field(alias="from", description="ID исходного узла")
    to_node: str = Field(alias="to", description="ID целевого узла")

    model_config = {"populate_by_name": True}

    @model_serializer
    def _serialize(self) -> dict:
        """Всегда сериализуем с алиасами `from`/`to` для API-ответов."""
        return {"id": self.id, "from": self.from_node, "to": self.to_node}


class CanvasEdgeCreate(BaseModel):
    from_node: str = Field(alias="from")
    to_node: str = Field(alias="to")

    model_config = {"populate_by_name": True}


class CanvasData(BaseModel):
    """Полное состояние канваса — узлы + рёбра."""
    nodes: list[CanvasNode] = Field(default_factory=list)
    edges: list[CanvasEdge] = Field(default_factory=list)


class MindMap(BaseModel):
    """Результат анализа лекции — карта понятий."""
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    lecture_number: str = Field(description="Номер/название лекции")
    topic: str = Field(min_length=1, description="Центральная тема лекции")
    description: str = Field(default="", description="Краткое описание темы")
    concepts: list[Concept] = Field(default_factory=list)
    canvas_nodes: list[CanvasNode] = Field(default_factory=list, description="Узлы канваса")
    canvas_edges: list[CanvasEdge] = Field(default_factory=list, description="Рёбра канваса")
    source_lecture_id: Optional[str] = Field(default=None, description="ID исходной лекции (если из БД)")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    model_used: str = Field(default="", description="Имя использованной модели")
    chunk_count: int = Field(default=1, description="Количество чанков при обработке")

    model_config = {"populate_by_name": True}

    def to_mongo(self) -> dict:
        d = self.model_dump(exclude={"id"}, by_alias=True)
        if self.id:
            d["_id"] = ObjectId(self.id)
        d["concepts"] = [c.to_mongo() for c in self.concepts]
        d["canvas_nodes"] = [n.model_dump() for n in self.canvas_nodes]
        d["canvas_edges"] = [e.model_dump(by_alias=True) for e in self.canvas_edges]
        return d


class MindMapSummary(BaseModel):
    """Сокращённое представление MindMap для списков."""
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    lecture_number: str
    topic: str
    concept_count: int
    created_at: datetime
    source_lecture_id: Optional[str] = Field(default=None, description="ID исходной лекции (подглавы) в БД курса")

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# Lecture input
# ---------------------------------------------------------------------------

class LectureInput(BaseModel):
    """Входные данные для одной лекции."""
    content: str = Field(min_length=10, description="Текст лекции")
    lecture_number: Optional[str] = Field(default=None, description="Номер лекции (если не задан — определит LLM)")
    source_id: Optional[str] = Field(default=None, description="ID источника в БД")
    language: str = Field(default="ru", description="Язык лекции")

    @field_validator("language")
    @classmethod
    def validate_language(cls, v: str) -> str:
        allowed = {"ru", "en"}
        if v not in allowed:
            raise ValueError(f"Язык должен быть одним из: {allowed}")
        return v


class BatchLectureInput(BaseModel):
    """Пакетная обработка нескольких лекций."""
    lectures: list[LectureInput] = Field(min_length=1, max_length=100)


# ---------------------------------------------------------------------------
# API Responses
# ---------------------------------------------------------------------------

class ProcessResponse(BaseModel):
    """Ответ на запрос обработки лекции."""
    mindmap_id: str
    lecture_number: str
    topic: str
    concept_count: int
    chunk_count: int
    message: str = "Лекция успешно обработана"


class BatchProcessResponse(BaseModel):
    """Ответ на пакетную обработку."""
    processed: int
    failed: int
    results: list[ProcessResponse]
    errors: list[dict] = Field(default_factory=list)


class ErrorResponse(BaseModel):
    """Стандартный ответ с ошибкой."""
    error: str
    detail: Optional[str] = None
