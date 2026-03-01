"""Тесты для экспортёров."""

import pytest
import json
from pathlib import Path

from gollossary.models.term import Term
from gollossary.models.mindmap import MindMap
from gollossary.export.json_exporter import JSONExporter
from gollossary.export.mermaid_exporter import MermaidExporter


@pytest.fixture
def sample_mindmap():
    """Создаёт тестовую карту."""
    mm = MindMap(topic="Machine Learning", description="AI course")
    
    t1 = Term(
        term="Neural Network",
        definition="A model inspired by biological neurons",
        example="model = Sequential()",
        image_description="Network diagram"
    )
    
    t2 = Term(
        term="Perceptron",
        definition="Single layer neural network",
        example="perceptron = Perceptron()",
        image_description="Simple node"
    )
    t2.relations.parent = "Neural Network"
    t1.relations.children.append("Perceptron")
    
    mm.add_term(t1)
    mm.add_term(t2)
    
    return mm


class TestJSONExporter:
    """Тесты для JSONExporter."""
    
    def test_export_to_file(self, sample_mindmap, tmp_path):
        """Экспорт в файл."""
        output = tmp_path / "test.json"
        
        exporter = JSONExporter()
        result_path = exporter.export(sample_mindmap, output)
        
        assert result_path.exists()
        
        content = json.loads(output.read_text(encoding="utf-8"))
        assert content["topic"] == "Machine Learning"
        assert len(content["terms"]) == 2
    
    def test_metadata_included(self, sample_mindmap):
        """Метаданные добавлены."""
        exporter = JSONExporter(include_metadata=True)
        data = exporter.to_dict(sample_mindmap)
        
        assert "_metadata" in data
        assert "generated_at" in data["_metadata"]
        assert data["_metadata"]["term_count"] == 2
    
    def test_metadata_excluded(self, sample_mindmap):
        """Метаданные исключены."""
        exporter = JSONExporter(include_metadata=False)
        data = exporter.to_dict(sample_mindmap)
        
        assert "_metadata" not in data
    
    def test_to_string(self, sample_mindmap):
        """Преобразование в строку."""
        exporter = JSONExporter()
        json_str = exporter.to_string(sample_mindmap)
        
        parsed = json.loads(json_str)
        assert parsed["topic"] == "Machine Learning"


class TestMermaidExporter:
    """Тесты для MermaidExporter."""
    
    def test_mindmap_diagram(self, sample_mindmap):
        """Генерация mindmap диаграммы."""
        exporter = MermaidExporter(diagram_type="mindmap")
        result = exporter.to_string(sample_mindmap)
        
        assert result.startswith("mindmap")
        assert "Machine Learning" in result
        assert "Neural Network" in result
    
    def test_flowchart_diagram(self, sample_mindmap):
        """Генерация flowchart диаграммы."""
        exporter = MermaidExporter(diagram_type="flowchart")
        result = exporter.to_string(sample_mindmap)
        
        assert result.startswith("flowchart")
        assert "-->" in result
    
    def test_export_to_file(self, sample_mindmap, tmp_path):
        """Экспорт в файл."""
        output = tmp_path / "test.mmd"
        
        exporter = MermaidExporter()
        result_path = exporter.export(sample_mindmap, output)
        
        assert result_path.exists()
        content = output.read_text(encoding="utf-8")
        assert "mindmap" in content
    
    def test_to_markdown(self, sample_mindmap):
        """Генерация Markdown блока."""
        exporter = MermaidExporter()
        md = exporter.to_markdown(sample_mindmap)
        
        assert md.startswith("```mermaid")
        assert md.endswith("```")
    
    def test_escape_special_chars(self):
        """Экранирование спец. символов."""
        mm = MindMap(topic='Test "quotes" and (parens)')
        mm.add_term(Term(term="Term <angle>", definition="D"))
        
        exporter = MermaidExporter()
        result = exporter.to_string(mm)
        
        # Не должно сломать синтаксис Mermaid
        assert '"' not in result or "'" in result
        assert "<" not in result or "&lt;" in result
