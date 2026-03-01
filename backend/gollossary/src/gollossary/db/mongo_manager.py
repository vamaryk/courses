"""
Менеджер подключения к MongoDB.

Обеспечивает подключение к базе и выполнение базовых операций.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime

from pymongo import MongoClient
from pymongo.collection import Collection
from bson import ObjectId
from rich.console import Console

console = Console()


class MongoManager:
    """Менеджер для работы с MongoDB."""

    def __init__(self, uri: str = "mongodb://localhost:27017", db_name: str = "gollossary"):
        """
        Инициализирует подключение.
        
        Args:
            uri: Строка подключения к MongoDB
            db_name: Имя базы данных
        """
        try:
            self.client = MongoClient(uri)
            self.db = self.client[db_name]
            # Проверка подключения
            self.client.admin.command('ping')
            console.print("[bold green]✓[/] Подключение к MongoDB успешно", style="green")
        except Exception as e:
            console.print(f"[bold red]✗[/] Ошибка подключения к MongoDB: {e}", style="red")
            raise

    def get_collection(self, name: str) -> Collection:
        """Возвращает коллекцию по имени."""
        return self.db[name]

    def get_lectures_by_course(self, course_id: str) -> List[Dict[str, Any]]:
        """
        Возвращает список лекций для курса, отсортированный по порядку.
        
        Args:
            course_id: ID курса (ObjectId в виде строки)
            
        Returns:
            Список документов лекций
        """
        lectures_coll = self.get_collection("lectures")
        try:
            oid = ObjectId(course_id)
            cursor = lectures_coll.find({"course_id": oid}).sort("order", 1)
            lectures = list(cursor)
            console.print(f"[dim]Найдено лекций: {len(lectures)}[/dim]")
            return lectures
        except Exception as e:
            console.print(f"[red]Ошибка при поиске лекций: {e}[/red]")
            return []

    def save_glossary(self, glossary_data: Dict[str, Any]) -> str:
        """
        Сохраняет глоссарий в базу данных.
        
        Args:
            glossary_data: Данные глоссария (словарь)
            
        Returns:
            ID сохраненного документа
        """
        glossaries_coll = self.get_collection("glossaries")
        if "_id" in glossary_data and isinstance(glossary_data["_id"], str):
             # Если вдруг _id пришел строкой, уберем его, пусть база сгенерирует новый или обновит
             del glossary_data["_id"]
        
        glossary_data["updated_at"] = datetime.utcnow()
        
        result = glossaries_coll.insert_one(glossary_data)
        doc_id = str(result.inserted_id)
        
        console.print(f"[bold green]✓[/] Глоссарий сохранен в MongoDB (ID: {doc_id})")
        return doc_id

    def update_course_glossary_link(self, course_id: str, glossary_id: str):
        """Обновляет ссылку на глоссарий в документе курса."""
        courses_coll = self.get_collection("courses")
        try:
            c_oid = ObjectId(course_id)
            g_oid = ObjectId(glossary_id)
            courses_coll.update_one(
                {"_id": c_oid},
                {"$set": {"glossary_id": g_oid}}
            )
            console.print("[dim]Ссылка на глоссарий обновлена в курсе[/dim]")
        except Exception as e:
            console.print(f"[yellow]Не удалось обновить ссылку в курсе: {e}[/yellow]")
