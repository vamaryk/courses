"""
Модуль извлечения темы из учебных материалов.

Определяет центральную тему лекции/курса с помощью LLM.
"""

import json
from typing import Optional

from rich.console import Console

from ..llm.base import BaseLLM
from ..llm.prompts import get_topic_prompt


console = Console()


class TopicExtractor:
    """
    Извлекает центральную тему из учебного материала.
    
    Использует LLM для анализа текста и определения главной темы.
    """
    
    def __init__(self, llm: BaseLLM, language: str = "ru"):
        """
        Инициализирует экстрактор.
        
        Args:
            llm: Провайдер LLM
            language: Язык промптов
        """
        self.llm = llm
        self.language = language
    
    def extract(self, text: str) -> tuple[str, Optional[str]]:
        """
        Извлекает тему из текста.
        
        Args:
            text: Учебный материал
            
        Returns:
            Кортеж (название темы, описание)
        """
        console.print("[bold blue]🔍 Анализ темы...[/]")
        
        # Обрезаем текст, если он слишком длинный
        truncated_text = self.llm.truncate_to_context(text, reserve=1024)
        
        prompt = get_topic_prompt(truncated_text, self.language)
        response = self.llm.generate(prompt, max_tokens=256)
        
        try:
            # Ищем JSON в ответе
            json_match = self._extract_json(response)
            data = json.loads(json_match)
            
            topic = data.get("topic", "Неизвестная тема")
            description = data.get("description")
            
            console.print(f"[bold green]✓[/] Тема: {topic}")
            return topic, description
            
        except (json.JSONDecodeError, ValueError) as e:
            console.print(f"[yellow]⚠[/] Ошибка парсинга JSON: {e}")
            # Fallback: пытаемся извлечь тему из текста
            return self._fallback_extraction(response), None
    
    def _extract_json(self, text: str) -> str:
        """Извлекает JSON из текста ответа."""
        # Ищем JSON объект в тексте
        start = text.find('{')
        end = text.rfind('}') + 1
        
        if start == -1 or end == 0:
            raise ValueError("JSON не найден в ответе")
        
        return text[start:end]
    
    def _fallback_extraction(self, response: str) -> str:
        """Извлекает тему простым способом, если JSON не удалось распарсить."""
        # Берём первую значимую строку
        lines = [l.strip() for l in response.split('\n') if l.strip()]
        if lines:
            # Убираем кавычки и префиксы
            topic = lines[0].strip('"\'').replace("Тема:", "").strip()
            return topic[:100]  # Ограничиваем длину
        return "Неизвестная тема"
