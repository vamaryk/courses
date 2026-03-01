"""
Абстрактный базовый класс для LLM провайдеров.

Определяет интерфейс, который должны реализовать все LLM провайдеры.
"""

from abc import ABC, abstractmethod
from typing import Iterator, Optional


class BaseLLM(ABC):
    """
    Абстрактный базовый класс для LLM провайдеров.
    
    Определяет единый интерфейс для работы с различными локальными LLM:
    - llama.cpp (GGUF модели)
    - transformers (HuggingFace модели)
    - и другие локальные решения
    """
    
    @abstractmethod
    def generate(
        self, 
        prompt: str, 
        max_tokens: int = 512,
        temperature: float = 0.7,
        stop: Optional[list[str]] = None
    ) -> str:
        """
        Генерирует ответ на промпт.
        
        Args:
            prompt: Входной текст/промпт
            max_tokens: Максимальное количество токенов в ответе
            temperature: Температура генерации (0.0 - детерминировано, 2.0 - случайно)
            stop: Список стоп-токенов для прекращения генерации
            
        Returns:
            Сгенерированный текст
        """
        pass
    
    @abstractmethod
    def stream(
        self, 
        prompt: str, 
        max_tokens: int = 512,
        temperature: float = 0.7,
        stop: Optional[list[str]] = None
    ) -> Iterator[str]:
        """
        Потоковая генерация ответа (по токенам).
        
        Args:
            prompt: Входной текст/промпт
            max_tokens: Максимальное количество токенов
            temperature: Температура генерации
            stop: Список стоп-токенов
            
        Yields:
            Токены по мере генерации
        """
        pass
    
    @abstractmethod
    def get_context_length(self) -> int:
        """
        Возвращает максимальную длину контекста модели.
        
        Returns:
            Максимальное количество токенов в контексте
        """
        pass
    
    @abstractmethod
    def count_tokens(self, text: str) -> int:
        """
        Подсчитывает количество токенов в тексте.
        
        Args:
            text: Текст для подсчёта
            
        Returns:
            Количество токенов
        """
        pass
    
    def fits_context(self, text: str, reserve: int = 512) -> bool:
        """
        Проверяет, поместится ли текст в контекст с резервом для ответа.
        
        Args:
            text: Текст для проверки
            reserve: Резерв токенов для ответа
            
        Returns:
            True если текст помещается
        """
        tokens = self.count_tokens(text)
        return tokens + reserve <= self.get_context_length()
    
    def truncate_to_context(
        self, 
        text: str, 
        reserve: int = 512,
        strategy: str = "end"
    ) -> str:
        """
        Обрезает текст, чтобы он поместился в контекст.
        
        Args:
            text: Текст для обрезки
            reserve: Резерв токенов для ответа
            strategy: Стратегия обрезки ("start", "end", "middle")
            
        Returns:
            Обрезанный текст
        """
        if self.fits_context(text, reserve):
            return text
        
        max_chars = (self.get_context_length() - reserve) * 4  # ~4 символа на токен
        
        if strategy == "start":
            return text[-max_chars:]
        elif strategy == "middle":
            half = max_chars // 2
            return text[:half] + "\n...\n" + text[-half:]
        else:  # end
            return text[:max_chars]
