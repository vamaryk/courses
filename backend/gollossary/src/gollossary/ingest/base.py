"""
Базовый класс для загрузчиков данных.

Определяет интерфейс для загрузки различных типов входных данных.
"""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Union


class LoadedDocument:
    """
    Загруженный документ.
    
    Attributes:
        content: Текстовое содержимое
        source: Путь к источнику
        doc_type: Тип документа
    """
    
    def __init__(
        self, 
        content: str, 
        source: Path,
        doc_type: str = "text"
    ):
        self.content = content
        self.source = source
        self.doc_type = doc_type
    
    def __len__(self) -> int:
        return len(self.content)
    
    def __str__(self) -> str:
        return f"Document({self.source.name}, {len(self)} chars)"


class BaseLoader(ABC):
    """
    Абстрактный базовый класс для загрузчиков.
    
    Все загрузчики должны реализовать метод load().
    """
    
    @abstractmethod
    def load(self, path: Union[str, Path]) -> LoadedDocument:
        """
        Загружает документ из указанного пути.
        
        Args:
            path: Путь к файлу или директории
            
        Returns:
            LoadedDocument с содержимым
        """
        pass
    
    @abstractmethod
    def load_multiple(self, paths: list[Union[str, Path]]) -> list[LoadedDocument]:
        """
        Загружает несколько документов.
        
        Args:
            paths: Список путей
            
        Returns:
            Список LoadedDocument
        """
        pass
    
    @property
    @abstractmethod
    def supported_extensions(self) -> list[str]:
        """Возвращает список поддерживаемых расширений файлов."""
        pass
    
    def is_supported(self, path: Union[str, Path]) -> bool:
        """Проверяет, поддерживается ли файл."""
        path = Path(path)
        return path.suffix.lower() in self.supported_extensions
