"""
Модуль извлечения терминов из учебных материалов.

Анализирует текст и извлекает ключевые термины с определениями.
"""

import json
from typing import Optional

from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn

from ..llm.base import BaseLLM
from ..llm.prompts import get_term_extraction_prompt
from ..models.term import Term, TermRelations


console = Console()


class TermExtractor:
    """
    Извлекает ключевые термины из учебного материала.
    
    Использует LLM для анализа текста и выделения важных понятий.
    """
    
    def __init__(
        self, 
        llm: BaseLLM, 
        language: str = "ru",
        max_terms: int = 50
    ):
        """
        Инициализирует экстрактор.
        
        Args:
            llm: Провайдер LLM
            language: Язык промптов
            max_terms: Максимум извлекаемых терминов
        """
        self.llm = llm
        self.language = language
        self.max_terms = max_terms
    
    def extract(self, text: str, topic: str) -> list[Term]:
        """
        Извлекает термины из текста.
        
        Args:
            text: Учебный материал
            topic: Тема материала
            
        Returns:
            Список извлечённых терминов
        """
        console.print("[bold blue]📚 Извлечение терминов...[/]")
        
        # Разбиваем текст на чанки, если он большой
        chunks = self._split_text(text)
        all_terms: list[Term] = []
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console
        ) as progress:
            task = progress.add_task(
                f"Обработка {len(chunks)} фрагмент(ов)...", 
                total=len(chunks)
            )
            
            for i, chunk in enumerate(chunks):
                progress.update(task, description=f"Фрагмент {i+1}/{len(chunks)}")
                
                terms = self._extract_from_chunk(chunk, topic)
                all_terms.extend(terms)
                
                progress.advance(task)
        
        # Удаляем дубликаты
        unique_terms = self._deduplicate(all_terms)
        
        # Ограничиваем количество
        result = unique_terms[:self.max_terms]
        
        console.print(f"[bold green]✓[/] Извлечено терминов: {len(result)}")
        return result
    
    def _split_text(self, text: str, max_chunk_size: int = 2000) -> list[str]:
        """
        Разбивает текст на чанки для обработки.
        
        Args:
            text: Исходный текст
            max_chunk_size: Максимальный размер чанка в символах
            
        Returns:
            Список чанков
        """
        if len(text) <= max_chunk_size:
            return [text]
        
        chunks = []
        paragraphs = text.split('\n\n')
        current_chunk = []
        current_size = 0
        
        for para in paragraphs:
            if current_size + len(para) > max_chunk_size and current_chunk:
                chunks.append('\n\n'.join(current_chunk))
                current_chunk = []
                current_size = 0
            
            current_chunk.append(para)
            current_size += len(para)
        
        if current_chunk:
            chunks.append('\n\n'.join(current_chunk))
        
        return chunks
    
    def _extract_from_chunk(self, text: str, topic: str) -> list[Term]:
        """
        Извлекает термины из одного чанка.
        
        Args:
            text: Чанк текста
            topic: Тема
            
        Returns:
            Список терминов
        """
        prompt = get_term_extraction_prompt(text, topic, self.language)
        response = self.llm.generate(prompt, max_tokens=2048)
        
        try:
            json_str = self._extract_json(response)
            data = json.loads(json_str)
            
            terms = []
            for item in data.get("terms", []):
                term = Term(
                    term=item.get("term", ""),
                    definition=item.get("definition", ""),
                    example=item.get("example", ""),
                    image_description=item.get("image_description", ""),
                    relations=TermRelations()
                )
                if term.term:  # Пропускаем пустые
                    terms.append(term)
            
            return terms
            
        except (json.JSONDecodeError, ValueError) as e:
            console.print(f"[yellow]⚠[/] Ошибка парсинга: {e}")
            return []
    
    def _extract_json(self, text: str) -> str:
        """Извлекает JSON из текста ответа."""
        start = text.find('{')
        end = text.rfind('}') + 1
        
        if start == -1 or end == 0:
            raise ValueError("JSON не найден")
        
        return text[start:end]
    
    def _deduplicate(self, terms: list[Term]) -> list[Term]:
        """
        Удаляет дубликаты терминов.
        
        Args:
            terms: Список терминов
            
        Returns:
            Список уникальных терминов
        """
        seen = set()
        unique = []
        
        for term in terms:
            # Нормализуем название для сравнения
            key = term.term.lower().strip()
            if key not in seen:
                seen.add(key)
                unique.append(term)
        
        return unique
