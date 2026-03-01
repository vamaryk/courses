"""
Модель данных для термина.

Содержит структуры Term и TermRelations для представления
извлечённых терминов и их связей.
"""

from pydantic import BaseModel, Field
from typing import Optional


class TermRelations(BaseModel):
    """
    Связи термина с другими терминами.
    
    Attributes:
        parent: Родительский термин (более общее понятие)
        children: Дочерние термины (более конкретные понятия)
    """
    parent: Optional[str] = Field(
        default=None,
        description="Родительский термин"
    )
    children: list[str] = Field(
        default_factory=list,
        description="Дочерние термины"
    )
    
    def add_child(self, child: str) -> None:
        """Добавляет дочерний термин, если его ещё нет."""
        if child not in self.children:
            self.children.append(child)
    
    def has_parent(self) -> bool:
        """Проверяет, есть ли родительский термин."""
        return self.parent is not None


class Term(BaseModel):
    """
    Структура термина с определением и примерами.
    
    Attributes:
        term: Название термина
        definition: Краткое и понятное определение
        example: Практический пример использования
        image_description: Описание изображения для иллюстрации
        relations: Связи с другими терминами
    """
    term: str = Field(
        min_length=1,
        max_length=200,
        description="Название термина"
    )
    definition: str = Field(
        min_length=1,
        description="Краткое определение термина"
    )
    example: str = Field(
        default="",
        description="Практический пример (может содержать код)"
    )
    image_description: str = Field(
        default="",
        description="Описание иллюстрации для термина"
    )
    relations: TermRelations = Field(
        default_factory=TermRelations,
        description="Связи с другими терминами"
    )
    
    def is_root(self) -> bool:
        """Проверяет, является ли термин корневым (без родителя)."""
        return not self.relations.has_parent()
    
    def has_children(self) -> bool:
        """Проверяет, есть ли дочерние термины."""
        return len(self.relations.children) > 0
    
    def to_dict(self) -> dict:
        """Преобразует термин в словарь для JSON."""
        return {
            "term": self.term,
            "definition": self.definition,
            "example": self.example,
            "image_description": self.image_description,
            "relations": {
                "parent": self.relations.parent,
                "children": self.relations.children
            }
        }
