"""
Тесты Pydantic-моделей (shared/models.py).
Не требуют LLM или MongoDB.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from pydantic import ValidationError
from shared.models import (
    Concept,
    ConceptCreate,
    ConceptRelations,
    ConceptUpdate,
    MindMap,
    LectureInput,
    BatchLectureInput,
)


class TestConceptModel:
    def test_valid_concept(self):
        c = Concept(term="Python", definition="Язык программирования")
        assert c.term == "Python"
        assert c.example == ""
        assert c.relations.parent is None
        assert c.relations.children == []

    def test_concept_empty_term_raises(self):
        with pytest.raises(ValidationError):
            Concept(term="", definition="Что-то")

    def test_concept_empty_definition_raises(self):
        with pytest.raises(ValidationError):
            Concept(term="Python", definition="")

    def test_concept_to_mongo(self):
        c = Concept(term="FastAPI", definition="Веб-фреймворк")
        doc = c.to_mongo()
        assert doc["term"] == "FastAPI"
        assert "relations" in doc


class TestConceptCreate:
    def test_valid_create(self):
        body = ConceptCreate(term="Лекция", definition="Учебное занятие")
        assert body.term == "Лекция"

    def test_relations_default(self):
        body = ConceptCreate(term="T", definition="D")
        assert body.relations.parent is None
        assert body.relations.children == []


class TestConceptUpdate:
    def test_all_fields_optional(self):
        upd = ConceptUpdate()
        assert upd.term is None

    def test_partial_update(self):
        upd = ConceptUpdate(definition="Новое определение")
        assert upd.definition == "Новое определение"
        assert upd.term is None


class TestMindMap:
    def test_valid_mindmap(self):
        mm = MindMap(lecture_number="Лекция 1", topic="Python")
        assert mm.lecture_number == "Лекция 1"
        assert mm.concepts == []

    def test_mindmap_empty_topic_raises(self):
        with pytest.raises(ValidationError):
            MindMap(lecture_number="Л1", topic="")

    def test_mindmap_to_mongo(self):
        mm = MindMap(lecture_number="Л2", topic="FastAPI")
        doc = mm.to_mongo()
        assert doc["lecture_number"] == "Л2"
        assert isinstance(doc["concepts"], list)


class TestLectureInput:
    def test_valid_input(self):
        li = LectureInput(content="Текст лекции. " * 5)
        assert li.language == "ru"

    def test_invalid_content_too_short(self):
        with pytest.raises(ValidationError):
            LectureInput(content="Hi")

    def test_invalid_language(self):
        with pytest.raises(ValidationError):
            LectureInput(content="Длинный текст лекции.", language="fr")

    def test_valid_en_language(self):
        li = LectureInput(content="Some long lecture text here.", language="en")
        assert li.language == "en"


class TestBatchLectureInput:
    def test_empty_list_raises(self):
        with pytest.raises(ValidationError):
            BatchLectureInput(lectures=[])

    def test_valid_batch(self):
        lectures = [
            LectureInput(content="Текст первой лекции. " * 3),
            LectureInput(content="Текст второй лекции. " * 3),
        ]
        batch = BatchLectureInput(lectures=lectures)
        assert len(batch.lectures) == 2
