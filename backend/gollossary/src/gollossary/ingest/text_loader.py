"""
Загрузчик текстовых файлов (TXT, MD).

Поддерживает загрузку .txt и .md файлов из файла или директории.
"""

from pathlib import Path
from typing import Union

from .base import BaseLoader, LoadedDocument


class TextLoader(BaseLoader):
    """
    Загрузчик текстовых файлов.
    
    Поддерживаемые форматы:
    - .txt - обычные текстовые файлы
    - .md - Markdown файлы
    """
    
    SUPPORTED = [".txt", ".md"]
    
    def __init__(self, encoding: str = "utf-8"):
        """
        Инициализирует загрузчик.
        
        Args:
            encoding: Кодировка файлов
        """
        self.encoding = encoding
    
    @property
    def supported_extensions(self) -> list[str]:
        return self.SUPPORTED
    
    def load(self, path: Union[str, Path]) -> LoadedDocument:
        """
        Загружает текстовый файл.
        
        Args:
            path: Путь к файлу
            
        Returns:
            LoadedDocument с содержимым
            
        Raises:
            FileNotFoundError: Если файл не найден
            ValueError: Если формат не поддерживается
        """
        path = Path(path)
        
        if not path.exists():
            raise FileNotFoundError(f"Файл не найден: {path}")
        
        if path.is_dir():
            return self._load_directory(path)
        
        if not self.is_supported(path):
            raise ValueError(
                f"Неподдерживаемый формат: {path.suffix}. "
                f"Поддерживаются: {', '.join(self.SUPPORTED)}"
            )
        
        content = path.read_text(encoding=self.encoding)
        return LoadedDocument(
            content=content,
            source=path,
            doc_type="markdown" if path.suffix == ".md" else "text"
        )
    
    def _load_directory(self, directory: Path) -> LoadedDocument:
        """
        Загружает все текстовые файлы из директории.
        
        Args:
            directory: Путь к директории
            
        Returns:
            LoadedDocument с объединённым содержимым
        """
        contents = []
        
        for ext in self.SUPPORTED:
            for file_path in sorted(directory.glob(f"*{ext}")):
                file_content = file_path.read_text(encoding=self.encoding)
                contents.append(f"# Файл: {file_path.name}\n\n{file_content}")
        
        if not contents:
            raise ValueError(
                f"В директории {directory} не найдено файлов "
                f"с расширениями: {', '.join(self.SUPPORTED)}"
            )
        
        combined = "\n\n---\n\n".join(contents)
        return LoadedDocument(
            content=combined,
            source=directory,
            doc_type="combined"
        )
    
    def load_multiple(self, paths: list[Union[str, Path]]) -> list[LoadedDocument]:
        """
        Загружает несколько файлов.
        
        Args:
            paths: Список путей к файлам
            
        Returns:
            Список LoadedDocument
        """
        documents = []
        for path in paths:
            try:
                doc = self.load(path)
                documents.append(doc)
            except Exception as e:
                print(f"Ошибка загрузки {path}: {e}")
        return documents
