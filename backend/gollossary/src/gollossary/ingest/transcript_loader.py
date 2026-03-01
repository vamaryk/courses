"""
Загрузчик транскриптов видео.

Поддерживает различные форматы транскриптов:
- SRT субтитры
- VTT субтитры  
- Простой текст с таймкодами
"""

import re
from pathlib import Path
from typing import Union

from .base import BaseLoader, LoadedDocument


class TranscriptLoader(BaseLoader):
    """
    Загрузчик транскриптов видео.
    
    Умеет очищать транскрипты от таймкодов и форматирования субтитров.
    """
    
    SUPPORTED = [".srt", ".vtt", ".txt"]
    
    # Паттерны для очистки
    TIMECODE_PATTERNS = [
        # SRT: 00:00:00,000 --> 00:00:05,000
        r'\d{2}:\d{2}:\d{2}[,\.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,\.]\d{3}',
        # VTT: 00:00:00.000 --> 00:00:05.000
        r'\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}',
        # Простые таймкоды: [00:00:00] или (00:00:00)
        r'[\[\(]\d{1,2}:\d{2}(:\d{2})?[\]\)]',
        # Номера субтитров
        r'^\d+\s*$',
    ]
    
    # VTT заголовки
    VTT_HEADER = re.compile(r'^WEBVTT.*$', re.MULTILINE)
    
    def __init__(self, encoding: str = "utf-8", clean_timecodes: bool = True):
        """
        Инициализирует загрузчик.
        
        Args:
            encoding: Кодировка файлов
            clean_timecodes: Удалять таймкоды
        """
        self.encoding = encoding
        self.clean_timecodes = clean_timecodes
    
    @property
    def supported_extensions(self) -> list[str]:
        return self.SUPPORTED
    
    def load(self, path: Union[str, Path]) -> LoadedDocument:
        """
        Загружает транскрипт.
        
        Args:
            path: Путь к файлу транскрипта
            
        Returns:
            LoadedDocument с очищенным текстом
        """
        path = Path(path)
        
        if not path.exists():
            raise FileNotFoundError(f"Файл не найден: {path}")
        
        content = path.read_text(encoding=self.encoding)
        
        if self.clean_timecodes:
            content = self._clean_transcript(content, path.suffix)
        
        return LoadedDocument(
            content=content,
            source=path,
            doc_type="transcript"
        )
    
    def _clean_transcript(self, content: str, suffix: str) -> str:
        """
        Очищает транскрипт от таймкодов и форматирования.
        
        Args:
            content: Исходный контент
            suffix: Расширение файла
            
        Returns:
            Очищенный текст
        """
        # Удаляем VTT заголовок
        if suffix == ".vtt":
            content = self.VTT_HEADER.sub("", content)
        
        # Удаляем таймкоды
        for pattern in self.TIMECODE_PATTERNS:
            content = re.sub(pattern, "", content, flags=re.MULTILINE)
        
        # Удаляем HTML теги (часто встречаются в субтитрах)
        content = re.sub(r'<[^>]+>', '', content)
        
        # Удаляем пустые строки и лишние пробелы
        lines = [line.strip() for line in content.split('\n')]
        lines = [line for line in lines if line]
        
        # Объединяем в параграфы
        paragraphs = []
        current_paragraph = []
        
        for line in lines:
            if line.endswith(('.', '!', '?', '...')) or len(current_paragraph) > 5:
                current_paragraph.append(line)
                paragraphs.append(' '.join(current_paragraph))
                current_paragraph = []
            else:
                current_paragraph.append(line)
        
        if current_paragraph:
            paragraphs.append(' '.join(current_paragraph))
        
        return '\n\n'.join(paragraphs)
    
    def load_multiple(self, paths: list[Union[str, Path]]) -> list[LoadedDocument]:
        """
        Загружает несколько транскриптов.
        
        Args:
            paths: Список путей
            
        Returns:
            Список LoadedDocument
        """
        documents = []
        for path in paths:
            try:
                doc = self.load(path)
                documents.append(doc)
            except Exception as e:
                print(f"Ошибка загрузки транскрипта {path}: {e}")
        return documents
