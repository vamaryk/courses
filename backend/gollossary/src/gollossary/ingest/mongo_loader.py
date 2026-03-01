"""
Загрузчик из MongoDB.

Поддерживает загрузку лекций из базы данных.
"""

from pathlib import Path
from typing import Union

from .base import BaseLoader, LoadedDocument
from ..db.mongo_manager import MongoManager

class MongoLoader(BaseLoader):
    """
    Загрузчик лекций из MongoDB.
    Может работать в двух режимах:
    1. Загрузка одной лекции по ID
    2. Загрузка всех лекций курса по Course ID
    """
    
    SUPPORTED = ["mongodb"]
    
    def __init__(self, mongo_manager: MongoManager):
        self.mongo = mongo_manager
    
    @property
    def supported_extensions(self) -> list[str]:
        return self.SUPPORTED
    
    def load(self, lecture_id: Union[str, Path]) -> LoadedDocument:
        """
        Загружает одну лекцию по ID.
        Args:
            lecture_id: ID лекции (строка ObjectId)
        """
        lecture = self.mongo.get_collection("lectures").find_one({"_id": lecture_id})
        if not lecture:
            raise FileNotFoundError(f"Лекция {lecture_id} не найдена")
            
        content = lecture.get("content", "")
        return LoadedDocument(
            content=content,
            source=Path(f"mongodb://lectures/{lecture_id}"),
            doc_type="lecture"
        )
    
    def load_course(self, course_id: str) -> list[LoadedDocument]:
        """
        Загружает все лекции курса.
        Returns:
            Список документов для каждой лекции
        """
        lectures = self.mongo.get_lectures_by_course(course_id)
        docs = []
        for l in lectures:
            lid = str(l.get("_id"))
            title = l.get("title", f"Лекция {lid}")
            content = l.get("content", "")
            
            # Добавим заголовок к контенту для лучшего контекста
            full_content = f"# {title}\n\n{content}"
            
            docs.append(LoadedDocument(
                content=full_content,
                source=Path(f"mongodb://topictitle/{title}"),
                doc_type="lecture"
            ))
        return docs

    def load_multiple(self, paths: list[Union[str, Path]]) -> list[LoadedDocument]:
        # Не используется напрямую, но реализуем для совместимости
        return [self.load(p) for p in paths]
