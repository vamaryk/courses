"""
FastAPI маршруты для CRUD операций над понятиями (concepts) в MindMap.
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from motor.motor_asyncio import AsyncIOMotorDatabase

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from shared.database import get_db
from shared.models import (
    Concept,
    ConceptCreate,
    ConceptUpdate,
    MindMap,
    MindMapSummary,
    CanvasNode,
    CanvasNodeCreate,
    CanvasNodeUpdate,
    CanvasEdge,
    CanvasEdgeCreate,
    CanvasData,
)
from .repository import MindMapRepository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["Concepts"])


# ---------------------------------------------------------------------------
# MindMap endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/mindmaps",
    response_model=list[MindMapSummary],
    summary="Список всех MindMap",
)
async def list_mindmaps(
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=500),
) -> list[MindMapSummary]:
    repo = MindMapRepository(db)
    return await repo.list_mindmaps(skip=skip, limit=limit)


@router.get(
    "/mindmaps/{mindmap_id}",
    response_model=MindMap,
    summary="Получить MindMap целиком",
)
async def get_mindmap(
    mindmap_id: str,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
) -> MindMap:
    repo = MindMapRepository(db)
    try:
        mindmap = await repo.get_mindmap(mindmap_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if not mindmap:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MindMap не найден")
    return mindmap


@router.delete(
    "/mindmaps/{mindmap_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Удалить MindMap",
)
async def delete_mindmap(
    mindmap_id: str,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
) -> Response:
    repo = MindMapRepository(db)
    try:
        deleted = await repo.delete_mindmap(mindmap_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MindMap не найден")

    # For 204 No Content FastAPI must not attempt to return a body.
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Concept endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/mindmaps/{mindmap_id}/concepts",
    response_model=list[Concept],
    summary="Список понятий MindMap",
)
async def list_concepts(
    mindmap_id: str,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
) -> list[Concept]:
    repo = MindMapRepository(db)
    try:
        return await repo.list_concepts(mindmap_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/mindmaps/{mindmap_id}/concepts",
    response_model=MindMap,
    status_code=status.HTTP_201_CREATED,
    summary="Добавить понятие в MindMap",
    description="Создаёт новое понятие и добавляет его в список понятий указанного MindMap.",
)
async def add_concept(
    mindmap_id: str,
    body: ConceptCreate,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
) -> MindMap:
    repo = MindMapRepository(db)
    try:
        updated = await repo.add_concept(mindmap_id, body)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MindMap не найден")
    return updated


@router.get(
    "/mindmaps/{mindmap_id}/concepts/{concept_index}",
    response_model=Concept,
    summary="Получить понятие по индексу",
)
async def get_concept(
    mindmap_id: str,
    concept_index: int,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
) -> Concept:
    repo = MindMapRepository(db)
    try:
        concept = await repo.get_concept(mindmap_id, concept_index)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if not concept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Понятие с индексом {concept_index} не найдено",
        )
    return concept


@router.put(
    "/mindmaps/{mindmap_id}/concepts/{concept_index}",
    response_model=MindMap,
    summary="Обновить понятие",
    description="Обновляет поля понятия по индексу. Незаданные поля не изменяются.",
)
async def update_concept(
    mindmap_id: str,
    concept_index: int,
    body: ConceptUpdate,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
) -> MindMap:
    repo = MindMapRepository(db)
    try:
        updated = await repo.update_concept(mindmap_id, concept_index, body)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MindMap или понятие не найдено")
    return updated


@router.delete(
    "/mindmaps/{mindmap_id}/concepts/{concept_index}",
    response_model=MindMap,
    summary="Удалить понятие",
)
async def delete_concept(
    mindmap_id: str,
    concept_index: int,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
) -> MindMap:
    repo = MindMapRepository(db)
    try:
        updated = await repo.delete_concept(mindmap_id, concept_index)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MindMap или понятие не найдено")
    return updated


# ---------------------------------------------------------------------------
# Canvas endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/mindmaps/{mindmap_id}/canvas",
    response_model=CanvasData,
    summary="Получить канвас (узлы + рёбра)",
)
async def get_canvas(
    mindmap_id: str,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
) -> CanvasData:
    repo = MindMapRepository(db)
    try:
        canvas = await repo.get_canvas(mindmap_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if canvas is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MindMap не найден")
    return canvas


@router.post(
    "/mindmaps/{mindmap_id}/canvas/nodes",
    response_model=CanvasData,
    status_code=status.HTTP_201_CREATED,
    summary="Добавить узел на канвас",
)
async def add_canvas_node(
    mindmap_id: str,
    body: CanvasNodeCreate,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
) -> CanvasData:
    repo = MindMapRepository(db)
    try:
        canvas = await repo.add_canvas_node(mindmap_id, body)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if canvas is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MindMap не найден")
    return canvas


@router.put(
    "/mindmaps/{mindmap_id}/canvas/nodes/{node_id}",
    response_model=CanvasData,
    summary="Обновить узел канваса",
)
async def update_canvas_node(
    mindmap_id: str,
    node_id: str,
    body: CanvasNodeUpdate,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
) -> CanvasData:
    repo = MindMapRepository(db)
    try:
        canvas = await repo.update_canvas_node(mindmap_id, node_id, body)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if canvas is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MindMap или узел не найден")
    return canvas


@router.delete(
    "/mindmaps/{mindmap_id}/canvas/nodes/{node_id}",
    response_model=CanvasData,
    summary="Удалить узел канваса (и связанные рёбра)",
)
async def delete_canvas_node(
    mindmap_id: str,
    node_id: str,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
) -> CanvasData:
    repo = MindMapRepository(db)
    try:
        canvas = await repo.delete_canvas_node(mindmap_id, node_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if canvas is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MindMap не найден")
    return canvas


@router.post(
    "/mindmaps/{mindmap_id}/canvas/edges",
    response_model=CanvasData,
    status_code=status.HTTP_201_CREATED,
    summary="Добавить ребро (стрелку) на канвас",
)
async def add_canvas_edge(
    mindmap_id: str,
    body: CanvasEdgeCreate,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
) -> CanvasData:
    repo = MindMapRepository(db)
    try:
        canvas = await repo.add_canvas_edge(mindmap_id, body)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if canvas is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MindMap не найден")
    return canvas


@router.delete(
    "/mindmaps/{mindmap_id}/canvas/edges/{edge_id}",
    response_model=CanvasData,
    summary="Удалить ребро канваса",
)
async def delete_canvas_edge(
    mindmap_id: str,
    edge_id: str,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
) -> CanvasData:
    repo = MindMapRepository(db)
    try:
        canvas = await repo.delete_canvas_edge(mindmap_id, edge_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if canvas is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MindMap не найден")
    return canvas
