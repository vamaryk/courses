"""Тесты для моделей данных."""

import pytest
from gollossary.models.term import Term, TermRelations
from gollossary.models.mindmap import MindMap


class TestTermRelations:
    """Тесты для TermRelations."""
    
    def test_default_values(self):
        """Проверка значений по умолчанию."""
        relations = TermRelations()
        assert relations.parent is None
        assert relations.children == []
    
    def test_add_child(self):
        """Проверка добавления ребёнка."""
        relations = TermRelations()
        relations.add_child("Child1")
        relations.add_child("Child2")
        
        assert "Child1" in relations.children
        assert "Child2" in relations.children
        assert len(relations.children) == 2
    
    def test_add_child_duplicate(self):
        """Дубликаты не добавляются."""
        relations = TermRelations()
        relations.add_child("Child1")
        relations.add_child("Child1")
        
        assert len(relations.children) == 1
    
    def test_has_parent(self):
        """Проверка наличия родителя."""
        relations = TermRelations()
        assert not relations.has_parent()
        
        relations.parent = "Parent"
        assert relations.has_parent()


class TestTerm:
    """Тесты для Term."""
    
    def test_create_term(self):
        """Создание термина."""
        term = Term(
            term="Нейронная сеть",
            definition="Математическая модель",
            example="model = Sequential()",
            image_description="Схема сети"
        )
        
        assert term.term == "Нейронная сеть"
        assert "Математическая" in term.definition
    
    def test_is_root(self):
        """Проверка корневого термина."""
        term = Term(term="Test", definition="Def")
        assert term.is_root()
        
        term.relations.parent = "Parent"
        assert not term.is_root()
    
    def test_to_dict(self):
        """Преобразование в словарь."""
        term = Term(
            term="Test",
            definition="Test def",
            example="print('test')",
            image_description="Test image"
        )
        term.relations.parent = "Parent"
        term.relations.children = ["Child1"]
        
        d = term.to_dict()
        
        assert d["term"] == "Test"
        assert d["relations"]["parent"] == "Parent"
        assert "Child1" in d["relations"]["children"]


class TestMindMap:
    """Тесты для MindMap."""
    
    def test_create_mindmap(self):
        """Создание карты."""
        mm = MindMap(topic="Test Topic")
        assert mm.topic == "Test Topic"
        assert mm.terms == []
    
    def test_add_term(self):
        """Добавление термина."""
        mm = MindMap(topic="Test")
        term = Term(term="T1", definition="D1")
        
        mm.add_term(term)
        assert mm.term_count() == 1
    
    def test_add_term_duplicate(self):
        """Дубликаты не добавляются."""
        mm = MindMap(topic="Test")
        term1 = Term(term="T1", definition="D1")
        term2 = Term(term="T1", definition="D2")
        
        mm.add_term(term1)
        mm.add_term(term2)
        
        assert mm.term_count() == 1
    
    def test_get_term(self):
        """Получение термина по имени."""
        mm = MindMap(topic="Test")
        mm.add_term(Term(term="Neural Network", definition="D"))
        
        found = mm.get_term("neural network")
        assert found is not None
        assert found.term == "Neural Network"
    
    def test_get_root_terms(self):
        """Получение корневых терминов."""
        mm = MindMap(topic="Test")
        
        t1 = Term(term="Root", definition="D")
        t2 = Term(term="Child", definition="D")
        t2.relations.parent = "Root"
        
        mm.add_term(t1)
        mm.add_term(t2)
        
        roots = mm.get_root_terms()
        assert len(roots) == 1
        assert roots[0].term == "Root"
    
    def test_json_serialization(self):
        """Сериализация в JSON."""
        mm = MindMap(topic="Test Topic", description="Desc")
        mm.add_term(Term(term="T1", definition="D1"))
        
        json_str = mm.to_json()
        
        assert "Test Topic" in json_str
        assert "T1" in json_str
    
    def test_json_roundtrip(self):
        """Туда-обратно через JSON."""
        mm = MindMap(topic="Test", description="Desc")
        mm.add_term(Term(term="T1", definition="D1", example="Ex"))
        
        json_str = mm.to_json()
        loaded = MindMap.from_json(json_str)
        
        assert loaded.topic == mm.topic
        assert loaded.term_count() == mm.term_count()
        assert loaded.terms[0].term == "T1"
