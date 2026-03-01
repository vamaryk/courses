"""
JSON экспортёр для Mind Map.

Сохраняет результаты анализа в формате JSON.
"""

import json
from pathlib import Path
from datetime import datetime

from rich.console import Console

from ..models.mindmap import MindMap


console = Console()


class JSONExporter:
    """
    Экспортирует MindMap в JSON формат.
    
    Поддерживает:
    - Сохранение в файл
    - Красивое форматирование
    - Метаданные (дата, версия)
    """
    
    def __init__(self, indent: int = 2, include_metadata: bool = True):
        """
        Инициализирует экспортёр.
        
        Args:
            indent: Отступ для форматирования
            include_metadata: Добавлять метаданные
        """
        self.indent = indent
        self.include_metadata = include_metadata
    
    def export(self, mindmap: MindMap, output_path: Path) -> Path:
        """
        Экспортирует Mind Map в JSON файл.
        
        Args:
            mindmap: Карта знаний
            output_path: Путь для сохранения
            
        Returns:
            Путь к созданному файлу
        """
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        data = self.to_dict(mindmap)
        
        json_content = json.dumps(
            data,
            ensure_ascii=False,
            indent=self.indent
        )
        
        output_path.write_text(json_content, encoding="utf-8")
        
        console.print(f"[bold green]✓[/] JSON сохранён: {output_path}")
        return output_path
    
    def to_dict(self, mindmap: MindMap) -> dict:
        """
        Преобразует Mind Map в словарь.
        
        Args:
            mindmap: Карта знаний
            
        Returns:
            Словарь для сериализации
        """
        data = mindmap.to_dict()
        
        if self.include_metadata:
            data["_metadata"] = {
                "generated_at": datetime.now().isoformat(),
                "version": "1.0",
                "generator": "gollossary",
                "term_count": len(mindmap.terms)
            }
        
        return data
    
    def to_string(self, mindmap: MindMap) -> str:
        """
        Преобразует Mind Map в JSON строку.
        
        Args:
            mindmap: Карта знаний
            
        Returns:
            JSON строка
        """
        return json.dumps(
            self.to_dict(mindmap),
            ensure_ascii=False,
            indent=self.indent
        )
