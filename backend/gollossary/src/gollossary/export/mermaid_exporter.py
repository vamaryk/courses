"""
Mermaid экспортёр для Mind Map.

Генерирует Mermaid диаграммы для визуализации.
"""

from pathlib import Path
from typing import Literal

from rich.console import Console

from ..models.mindmap import MindMap
from ..models.term import Term


console = Console()


class MermaidExporter:
    """
    Экспортирует MindMap в Mermaid диаграмму.
    
    Поддерживаемые типы диаграмм:
    - mindmap: Карта знаний
    - flowchart: Блок-схема
    """
    
    def __init__(
        self, 
        diagram_type: Literal["mindmap", "flowchart"] = "mindmap",
        direction: Literal["TB", "LR"] = "TB"
    ):
        """
        Инициализирует экспортёр.
        
        Args:
            diagram_type: Тип диаграммы
            direction: Направление (TB=сверху вниз, LR=слева направо)
        """
        self.diagram_type = diagram_type
        self.direction = direction
    
    def export(self, mindmap: MindMap, output_path: Path) -> Path:
        """
        Экспортирует в Mermaid файл.
        
        Args:
            mindmap: Карта знаний
            output_path: Путь для сохранения (.mmd)
            
        Returns:
            Путь к файлу
        """
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        content = self.to_string(mindmap)
        output_path.write_text(content, encoding="utf-8")
        
        console.print(f"[bold green]✓[/] Mermaid диаграмма: {output_path}")
        return output_path
    
    def to_string(self, mindmap: MindMap) -> str:
        """
        Генерирует Mermaid разметку.
        
        Args:
            mindmap: Карта знаний
            
        Returns:
            Mermaid разметка
        """
        if self.diagram_type == "mindmap":
            return self._generate_mindmap(mindmap)
        else:
            return self._generate_flowchart(mindmap)
    
    def _generate_mindmap(self, mindmap: MindMap) -> str:
        """Генерирует mindmap диаграмму."""
        lines = [
            "mindmap",
            f"  root(({self._escape(mindmap.topic)}))"
        ]
        
        # Получаем корневые термины
        root_terms = mindmap.get_root_terms()
        
        if not root_terms:
            # Если нет корневых, показываем все как плоский список
            for term in mindmap.terms:
                lines.append(f"    {self._escape(term.term)}")
        else:
            # Рекурсивно добавляем термины
            for term in root_terms:
                self._add_term_to_mindmap(lines, term, mindmap, indent=2)
        
        return "\n".join(lines)
    
    def _add_term_to_mindmap(
        self, 
        lines: list[str], 
        term: Term, 
        mindmap: MindMap, 
        indent: int
    ) -> None:
        """Рекурсивно добавляет термин и его детей."""
        prefix = "  " * indent
        lines.append(f"{prefix}{self._escape(term.term)}")
        
        # Добавляем детей
        for child_name in term.relations.children:
            child = mindmap.get_term(child_name)
            if child:
                self._add_term_to_mindmap(lines, child, mindmap, indent + 1)
    
    def _generate_flowchart(self, mindmap: MindMap) -> str:
        """Генерирует flowchart диаграмму."""
        lines = [f"flowchart {self.direction}"]
        
        # Добавляем корневой узел
        root_id = "root"
        lines.append(f"    {root_id}(({self._escape(mindmap.topic)}))")
        
        # Добавляем все термины
        node_ids = {}
        for i, term in enumerate(mindmap.terms):
            node_id = f"t{i}"
            node_ids[term.term.lower()] = node_id
            lines.append(f"    {node_id}[{self._escape(term.term)}]")
        
        # Добавляем связи
        lines.append("")
        lines.append("    %% Связи")
        
        for term in mindmap.terms:
            term_id = node_ids.get(term.term.lower())
            
            if term.is_root():
                # Корневые термины связываем с главной темой
                lines.append(f"    {root_id} --> {term_id}")
            
            # Связи с детьми
            for child_name in term.relations.children:
                child_id = node_ids.get(child_name.lower())
                if child_id:
                    lines.append(f"    {term_id} --> {child_id}")
        
        # Добавляем стили
        lines.extend([
            "",
            "    %% Стили",
            f"    style {root_id} fill:#f9f,stroke:#333,stroke-width:2px"
        ])
        
        return "\n".join(lines)
    
    def _escape(self, text: str) -> str:
        """Экранирует специальные символы для Mermaid."""
        # Убираем кавычки и скобки, которые могут сломать синтаксис
        result = text.replace('"', "'")
        result = result.replace("(", "[")
        result = result.replace(")", "]")
        result = result.replace("<", "&lt;")
        result = result.replace(">", "&gt;")
        return result
    
    def to_markdown(self, mindmap: MindMap) -> str:
        """
        Генерирует Mermaid блок для вставки в Markdown.
        
        Args:
            mindmap: Карта знаний
            
        Returns:
            Markdown с Mermaid блоком
        """
        diagram = self.to_string(mindmap)
        return f"```mermaid\n{diagram}\n```"
