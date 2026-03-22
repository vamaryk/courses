"""
MongoDB CRUD репозиторий для MindMap и Concept документов.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from shared.models import (
    Concept, ConceptCreate, ConceptUpdate,
    MindMap, MindMapSummary,
    CanvasNode, CanvasNodeCreate, CanvasNodeUpdate,
    CanvasEdge, CanvasEdgeCreate, CanvasData,
)
import uuid
from shared.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()


def _oid(value: str) -> ObjectId:
    """Конвертирует строку в ObjectId с понятной ошибкой."""
    if not ObjectId.is_valid(value):
        raise ValueError(f"Невалидный ObjectId: {value!r}")
    return ObjectId(value)


def _serialize_doc(doc: dict) -> dict:
    """Конвертирует ObjectId в строки рекурсивно."""
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            doc[key] = str(value)
        elif isinstance(value, list):
            doc[key] = [
                _serialize_doc(item) if isinstance(item, dict) else item
                for item in value
            ]
        elif isinstance(value, dict):
            doc[key] = _serialize_doc(value)
    return doc


class MindMapRepository:
    """CRUD-репозиторий для коллекции mindmaps."""

    def __init__(self, db: AsyncIOMotorDatabase):
        # Must match the collection name used by lecture-processor (COLLECTION_NAME in gollossary/.env).
        self.col = db[settings.collection_name]

    # ------------------------------------------------------------------
    # MindMap operations
    # ------------------------------------------------------------------

    async def list_mindmaps(self, skip: int = 0, limit: int = 50) -> list[MindMapSummary]:
        """Список всех MindMap с краткой информацией."""
        cursor = self.col.find(
            {},
            {"lecture_number": 1, "topic": 1, "concepts": 1, "created_at": 1, "source_lecture_id": 1}
        ).skip(skip).limit(limit).sort("created_at", -1)

        result = []
        async for doc in cursor:
            result.append(MindMapSummary(
                _id=str(doc["_id"]),
                lecture_number=doc.get("lecture_number", ""),
                topic=doc.get("topic", ""),
                concept_count=len(doc.get("concepts", [])),
                created_at=doc.get("created_at", datetime.now(timezone.utc)),
                source_lecture_id=doc.get("source_lecture_id"),
            ))
        return result

    async def get_mindmap(self, mindmap_id: str) -> Optional[MindMap]:
        """Возвращает полный MindMap по ID."""
        doc = await self.col.find_one({"_id": _oid(mindmap_id)})
        if not doc:
            return None
        return MindMap(**_serialize_doc(doc))

    async def delete_mindmap(self, mindmap_id: str) -> bool:
        """Удаляет MindMap и все его понятия."""
        result = await self.col.delete_one({"_id": _oid(mindmap_id)})
        return result.deleted_count > 0

    # ------------------------------------------------------------------
    # Concept operations (вложенные документы в concepts[])
    # ------------------------------------------------------------------

    async def list_concepts(self, mindmap_id: str) -> list[Concept]:
        """Список всех понятий MindMap."""
        doc = await self.col.find_one(
            {"_id": _oid(mindmap_id)},
            {"concepts": 1}
        )
        if not doc:
            return []
        concepts = []
        for i, c in enumerate(doc.get("concepts", [])):
            c = _serialize_doc(c)
            # Используем индекс как суррогатный ID для конкретного понятия
            c.setdefault("_concept_index", i)
            concepts.append(Concept(**c))
        return concepts

    async def get_concept(self, mindmap_id: str, concept_index: int) -> Optional[Concept]:
        """Возвращает понятие по индексу в массиве."""
        doc = await self.col.find_one(
            {"_id": _oid(mindmap_id)},
            {"concepts": 1}
        )
        if not doc:
            return None
        concepts = doc.get("concepts", [])
        if concept_index < 0 or concept_index >= len(concepts):
            return None
        c = _serialize_doc(concepts[concept_index])
        return Concept(**c)

    async def add_concept(self, mindmap_id: str, data: ConceptCreate) -> Optional[MindMap]:
        """Добавляет новое понятие в конец массива."""
        concept_doc = data.model_dump()

        result = await self.col.update_one(
            {"_id": _oid(mindmap_id)},
            {
                "$push": {"concepts": concept_doc},
                "$set": {"updated_at": datetime.now(timezone.utc)},
            },
        )
        if result.matched_count == 0:
            return None
        return await self.get_mindmap(mindmap_id)

    async def update_concept(
        self, mindmap_id: str, concept_index: int, data: ConceptUpdate
    ) -> Optional[MindMap]:
        """Обновляет поля конкретного понятия по индексу."""
        updates = {
            f"concepts.{concept_index}.{key}": value
            for key, value in data.model_dump(exclude_none=True).items()
        }
        if not updates:
            return await self.get_mindmap(mindmap_id)

        updates["updated_at"] = datetime.now(timezone.utc)

        result = await self.col.update_one(
            {"_id": _oid(mindmap_id)},
            {"$set": updates},
        )
        if result.matched_count == 0:
            return None
        return await self.get_mindmap(mindmap_id)

    # ------------------------------------------------------------------
    # Canvas operations
    # ------------------------------------------------------------------

    async def get_canvas(self, mindmap_id: str) -> Optional[CanvasData]:
        """Возвращает полное состояние канваса (узлы + рёбра)."""
        doc = await self.col.find_one(
            {"_id": _oid(mindmap_id)},
            {"canvas_nodes": 1, "canvas_edges": 1}
        )
        if not doc:
            return None
        raw_nodes = doc.get("canvas_nodes", [])
        raw_edges = doc.get("canvas_edges", [])
        nodes = [CanvasNode(**n) for n in raw_nodes]
        edges = [CanvasEdge(**e) for e in raw_edges]
        return CanvasData(nodes=nodes, edges=edges)

    async def add_canvas_node(self, mindmap_id: str, data: CanvasNodeCreate) -> Optional[CanvasData]:
        """Добавляет новый узел на канвас."""
        node = CanvasNode(**data.model_dump())
        node_dict = node.model_dump()
        result = await self.col.update_one(
            {"_id": _oid(mindmap_id)},
            {
                "$push": {"canvas_nodes": node_dict},
                "$set": {"updated_at": datetime.now(timezone.utc)},
            },
        )
        if result.matched_count == 0:
            return None
        return await self.get_canvas(mindmap_id)

    async def update_canvas_node(
        self, mindmap_id: str, node_id: str, data: CanvasNodeUpdate
    ) -> Optional[CanvasData]:
        """Обновляет поля узла канваса по его UUID."""
        canvas = await self.get_canvas(mindmap_id)
        if not canvas:
            return None
        idx = next((i for i, n in enumerate(canvas.nodes) if n.id == node_id), None)
        if idx is None:
            return None

        updates = {
            f"canvas_nodes.{idx}.{key}": value
            for key, value in data.model_dump(exclude_none=True).items()
        }
        if not updates:
            return canvas

        updates["updated_at"] = datetime.now(timezone.utc)
        await self.col.update_one(
            {"_id": _oid(mindmap_id)},
            {"$set": updates},
        )
        return await self.get_canvas(mindmap_id)

    async def delete_canvas_node(self, mindmap_id: str, node_id: str) -> Optional[CanvasData]:
        """Удаляет узел канваса и все связанные с ним рёбра."""
        oid = _oid(mindmap_id)
        now = datetime.now(timezone.utc)
        # Удаляем сам узел
        await self.col.update_one(
            {"_id": oid},
            {"$pull": {"canvas_nodes": {"id": node_id}}, "$set": {"updated_at": now}},
        )
        # Удаляем рёбра, выходящие из узла
        await self.col.update_one(
            {"_id": oid},
            {"$pull": {"canvas_edges": {"from": node_id}}},
        )
        # Удаляем рёбра, входящие в узел
        await self.col.update_one(
            {"_id": oid},
            {"$pull": {"canvas_edges": {"to": node_id}}},
        )
        return await self.get_canvas(mindmap_id)

    async def add_canvas_edge(self, mindmap_id: str, data: CanvasEdgeCreate) -> Optional[CanvasData]:
        """Добавляет ребро (стрелку) между двумя узлами канваса."""
        edge = CanvasEdge(**data.model_dump(by_alias=True))
        edge_dict = edge.model_dump(by_alias=True)
        result = await self.col.update_one(
            {"_id": _oid(mindmap_id)},
            {
                "$push": {"canvas_edges": edge_dict},
                "$set": {"updated_at": datetime.now(timezone.utc)},
            },
        )
        if result.matched_count == 0:
            return None
        return await self.get_canvas(mindmap_id)

    async def delete_canvas_edge(self, mindmap_id: str, edge_id: str) -> Optional[CanvasData]:
        """Удаляет ребро канваса по UUID."""
        await self.col.update_one(
            {"_id": _oid(mindmap_id)},
            {
                "$pull": {"canvas_edges": {"id": edge_id}},
                "$set": {"updated_at": datetime.now(timezone.utc)},
            },
        )
        return await self.get_canvas(mindmap_id)

    async def delete_concept(self, mindmap_id: str, concept_index: int) -> Optional[MindMap]:
        """
        Удаляет понятие из массива по индексу.
        MongoDB не поддерживает удаление по индексу напрямую:
        сначала помечаем null, потом вытягиваем.
        """
        # Шаг 1: ставим заглушку
        res = await self.col.update_one(
            {"_id": _oid(mindmap_id)},
            {
                "$unset": {f"concepts.{concept_index}": 1},
                "$set": {"updated_at": datetime.now(timezone.utc)},
            },
        )
        if res.matched_count == 0:
            return None
        # Шаг 2: убираем null-элементы
        await self.col.update_one(
            {"_id": _oid(mindmap_id)},
            {"$pull": {"concepts": None}},
        )
        return await self.get_mindmap(mindmap_id)
