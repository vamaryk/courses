"""
Провайдер для llama-cpp-python (GGUF модели).

Реализует интерфейс BaseLLM для работы с локальными GGUF моделями
через библиотеку llama-cpp-python.
"""

from typing import Iterator, Optional
from pathlib import Path

from tenacity import retry, stop_after_attempt, wait_exponential
from rich.console import Console

from .base import BaseLLM


console = Console()


class LlamaProvider(BaseLLM):
    """
    Провайдер для локальных GGUF моделей через llama-cpp-python.
    
    Attributes:
        model_path: Путь к GGUF модели
        n_ctx: Размер контекстного окна
        n_gpu_layers: Количество слоёв на GPU (0 = CPU, -1 = все на GPU)
    """
    
    def __init__(
        self,
        model_path: str | Path,
        n_ctx: int = 4096,
        n_gpu_layers: int = 0,
        verbose: bool = False
    ):
        """
        Инициализирует провайдер.
        
        Args:
            model_path: Путь к GGUF модели
            n_ctx: Размер контекстного окна
            n_gpu_layers: Слои на GPU (0=CPU, -1=все на GPU)
            verbose: Выводить логи llama.cpp
        """
        self.model_path = Path(model_path)
        self._context_length = n_ctx
        self._n_gpu_layers = n_gpu_layers
        self._verbose = verbose
        self._model = None
        
        if not self.model_path.exists():
            raise FileNotFoundError(
                f"Модель не найдена: {self.model_path}\n"
                "Скачайте GGUF модель, например:\n"
                "  https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF"
            )
    
    def _ensure_model_loaded(self) -> None:
        """Ленивая загрузка модели при первом использовании."""
        if self._model is None:
            try:
                from llama_cpp import Llama
            except ImportError:
                raise ImportError(
                    "llama-cpp-python не установлен.\n"
                    "Установите: pip install llama-cpp-python\n"
                    "Для GPU: CMAKE_ARGS='-DLLAMA_CUBLAS=on' pip install llama-cpp-python"
                )
            
            console.print(
                f"[bold blue]Загрузка модели:[/] {self.model_path.name}",
                highlight=False
            )
            console.print(
                f"[dim]GPU слои: {self._n_gpu_layers}, Контекст: {self._context_length}[/dim]"
            )
            
            self._model = Llama(
                model_path=str(self.model_path),
                n_ctx=self._context_length,
                n_gpu_layers=self._n_gpu_layers,
                verbose=self._verbose
            )
            
            console.print("[bold green]✓[/] Модель загружена")
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        reraise=True
    )
    def generate(
        self,
        prompt: str,
        max_tokens: int = 512,
        temperature: float = 0.7,
        stop: Optional[list[str]] = None
    ) -> str:
        """
        Генерирует ответ на промпт с retry логикой.
        
        Args:
            prompt: Входной текст
            max_tokens: Максимум токенов
            temperature: Температура
            stop: Стоп-токены
            
        Returns:
            Сгенерированный текст
        """
        self._ensure_model_loaded()
        
        response = self._model(
            prompt,
            max_tokens=max_tokens,
            temperature=temperature,
            stop=stop or [],
            echo=False
        )
        
        return response["choices"][0]["text"].strip()
    
    def stream(
        self,
        prompt: str,
        max_tokens: int = 512,
        temperature: float = 0.7,
        stop: Optional[list[str]] = None
    ) -> Iterator[str]:
        """
        Потоковая генерация ответа.
        
        Args:
            prompt: Входной текст
            max_tokens: Максимум токенов
            temperature: Температура
            stop: Стоп-токены
            
        Yields:
            Токены по мере генерации
        """
        self._ensure_model_loaded()
        
        for output in self._model(
            prompt,
            max_tokens=max_tokens,
            temperature=temperature,
            stop=stop or [],
            stream=True
        ):
            token = output["choices"][0]["text"]
            if token:
                yield token
    
    def get_context_length(self) -> int:
        """Возвращает размер контекстного окна."""
        return self._context_length
    
    def count_tokens(self, text: str) -> int:
        """
        Подсчитывает токены в тексте.
        
        Args:
            text: Текст для подсчёта
            
        Returns:
            Количество токенов
        """
        self._ensure_model_loaded()
        tokens = self._model.tokenize(text.encode("utf-8"))
        return len(tokens)
