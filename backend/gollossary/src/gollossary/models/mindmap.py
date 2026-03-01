"""
Модель данных для Mind Map (карты знаний).

Содержит структуру MindMap для представления темы и всех связанных терминов.
"""

from pydantic import BaseModel, Field
from typing import Optional
import json
from pathlib import Path

from .term import Term


class MindMap(BaseModel):
    """
    Карта знаний (Mind Map).
    
    Содержит центральную тему и список связанных терминов.
    
    Attributes:
        topic: Центральная тема/название курса
        description: Описание темы
        terms: Список терминов с определениями и связями
    """
    topic: str = Field(
        min_length=1,
        description="Центральная тема"
    )
    description: Optional[str] = Field(
        default=None,
        description="Описание темы"
    )
    terms: list[Term] = Field(
        default_factory=list,
        description="Список терминов"
    )
    
    def add_term(self, term: Term) -> None:
        """Добавляет термин в карту, если его ещё нет."""
        existing = {t.term for t in self.terms}
        if term.term not in existing:
            self.terms.append(term)
    
    def get_term(self, name: str) -> Optional[Term]:
        """Возвращает термин по названию."""
        for term in self.terms:
            if term.term.lower() == name.lower():
                return term
        return None
    
    def get_root_terms(self) -> list[Term]:
        """Возвращает корневые термины (без родителя)."""
        return [t for t in self.terms if t.is_root()]
    
    def get_children(self, parent_name: str) -> list[Term]:
        """Возвращает дочерние термины для указанного родителя."""
        return [
            t for t in self.terms 
            if t.relations.parent == parent_name
        ]
    
    def term_count(self) -> int:
        """Возвращает количество терминов."""
        return len(self.terms)
    
    def to_dict(self) -> dict:
        """Преобразует карту в словарь для JSON."""
        return {
            "topic": self.topic,
            "description": self.description,
            "terms": [t.to_dict() for t in self.terms]
        }
    
    def to_json(self, indent: int = 2) -> str:
        """Сериализует карту в JSON строку."""
        return json.dumps(
            self.to_dict(), 
            ensure_ascii=False, 
            indent=indent
        )
    
    def save_json(self, path: Path) -> None:
        """Сохраняет карту в JSON файл."""
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(self.to_json(), encoding="utf-8")
    
    @classmethod
    def from_json(cls, json_str: str) -> "MindMap":
        """Создаёт карту из JSON строки."""
        data = json.loads(json_str)
        terms = [Term(**t) for t in data.get("terms", [])]
        return cls(
            topic=data["topic"],
            description=data.get("description"),
            terms=terms
        )
    
    @classmethod
    def load_json(cls, path: Path) -> "MindMap":
        """Загружает карту из JSON файла."""
        json_str = path.read_text(encoding="utf-8")
        return cls.from_json(json_str)
