"""
MongoDB экспортёр для сохранения глоссария.

Сохраняет результаты анализа обратно в MongoDB.
"""

from datetime import datetime
from typing import Optional
from bson import ObjectId
from pymongo import MongoClient
from pymongo.database import Database

from rich.console import Console

from ..models.mindmap import MindMap


console = Console()


class MongoExporter:
    """
    Экспортирует глоссарий в MongoDB.
    
    Сохраняет:
    - Полный глоссарий курса
    - Связи терминов с лекциями-источниками
    """
    
    def __init__(
        self,
        connection_string: str = "mongodb://localhost:27017",
        database: str = "gollossary"
    ):
        """
        Инициализирует подключение к MongoDB.
        
        Args:
            connection_string: Строка подключения
            database: Имя базы данных
        """
        self.client = MongoClient(connection_string)
        self.db: Database = self.client[database]
        self.glossaries = self.db["glossaries"]
        self.courses = self.db["courses"]
    
    def export(
        self,
        mindmap: MindMap,
        course_id: str,
        model_name: str = "mistral-7b",
        source_lectures: Optional[list] = None
    ) -> ObjectId:
        """
        Сохраняет глоссарий в MongoDB.
        
        Args:
            mindmap: Карта знаний
            course_id: ID курса
            model_name: Название использованной модели
            source_lectures: Список ID лекций-источников
            
        Returns:
            ID созданного документа глоссария
        """
        course_oid = ObjectId(course_id)
        
        # Формируем документ
        glossary_doc = {
            "course_id": course_oid,
            "topic": mindmap.topic,
            "description": mindmap.description,
            "terms": [],
            "generated_at": datetime.utcnow(),
            "model_used": model_name,
            "term_count": len(mindmap.terms)
        }
        
        # Преобразуем термины
        for term in mindmap.terms:
            term_doc = {
                "term": term.term,
                "definition": term.definition,
                "example": term.example,
                "image_description": term.image_description,
                "relations": {
                    "parent": term.relations.parent,
                    "children": term.relations.children
                }
            }
            glossary_doc["terms"].append(term_doc)
        
        # Добавляем источники, если есть
        if source_lectures:
            glossary_doc["source_lectures"] = [
                ObjectId(lid) if isinstance(lid, str) else lid 
                for lid in source_lectures
            ]
        
        # Проверяем, есть ли уже глоссарий для этого курса
        existing = self.glossaries.find_one({"course_id": course_oid})
        
        if existing:
            # Обновляем существующий
            self.glossaries.update_one(
                {"_id": existing["_id"]},
                {"$set": glossary_doc}
            )
            glossary_id = existing["_id"]
            console.print(f"[bold yellow]↻[/] Глоссарий обновлён: {glossary_id}")
        else:
            # Создаём новый
            result = self.glossaries.insert_one(glossary_doc)
            glossary_id = result.inserted_id
            console.print(f"[bold green]✓[/] Глоссарий создан: {glossary_id}")
        
        # Обновляем ссылку в курсе
        self.courses.update_one(
            {"_id": course_oid},
            {"$set": {"glossary_id": glossary_id}}
        )
        
        return glossary_id
    
    def get_glossary(self, course_id: str) -> Optional[dict]:
        """
        Получает глоссарий курса.
        
        Args:
            course_id: ID курса
            
        Returns:
            Документ глоссария или None
        """
        return self.glossaries.find_one({"course_id": ObjectId(course_id)})
    
    def close(self) -> None:
        """Закрывает подключение."""
        self.client.close()
