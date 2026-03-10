"""
LLM клиенты для генерации JSON из промптов.

Поддерживаемые режимы (LLM_BACKEND):
  - "local"  — локальная GGUF-модель через llama-cpp-python
  - "gemini" — Google Gemini API через google-generativeai

Singleton-паттерн применяется к локальной модели (загрузка один раз).
"""

from __future__ import annotations

import asyncio
import json
import logging
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional

from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_json(text: str) -> dict:
    """Извлекает JSON-объект из текста ответа."""
    start = text.find("{")
    end = text.rfind("}") + 1
    if start == -1 or end == 0:
        raise ValueError(f"JSON не найден в ответе LLM:\n{text[:300]}")
    json_str = text[start:end]
    return json.loads(json_str)


# ---------------------------------------------------------------------------
# Base class
# ---------------------------------------------------------------------------

class BaseLLMClient(ABC):
    """Абстрактный LLM-клиент с единым интерфейсом."""

    @abstractmethod
    async def generate_json(self, prompt: str) -> dict:
        """Генерирует ответ и возвращает распарсенный JSON."""

    @abstractmethod
    def is_available(self) -> bool:
        """Проверяет, доступен ли клиент (API-ключ / файл модели)."""


# ---------------------------------------------------------------------------
# Local GGUF (llama-cpp-python)
# ---------------------------------------------------------------------------

_local_model = None  # Singleton


def _load_local_model(model_path: str, n_ctx: int, n_gpu_layers: int) -> None:
    """Загружает GGUF-модель (вызывается один раз)."""
    global _local_model
    if _local_model is not None:
        return

    try:
        from llama_cpp import Llama
    except ImportError:
        raise ImportError(
            "llama-cpp-python не установлен. "
            "Установите: pip install llama-cpp-python"
        )

    if not Path(model_path).exists():
        raise FileNotFoundError(
            f"GGUF-модель не найдена: {model_path}\n"
            "Задайте путь через переменную LLM_MODEL_PATH в .env"
        )

    logger.info(
        "Загрузка локальной модели: %s (n_ctx=%d, gpu_layers=%d)",
        model_path, n_ctx, n_gpu_layers,
    )
    _local_model = Llama(
        model_path=model_path,
        n_ctx=n_ctx,
        n_gpu_layers=n_gpu_layers,
        verbose=False,
    )
    logger.info("Локальная модель загружена.")


def _sync_generate_local(prompt: str, max_tokens: int, temperature: float) -> str:
    """Синхронная генерация через локальную модель (вызывается в executor)."""
    if _local_model is None:
        raise RuntimeError("Локальная LLM не загружена. Вызовите ensure_loaded().")
    response = _local_model(
        prompt,
        max_tokens=max_tokens,
        temperature=temperature,
        stop=["```", "---"],
        echo=False,
    )
    return response["choices"][0]["text"].strip()


class LocalLLMClient(BaseLLMClient):
    """
    Async-обёртка над llama-cpp-python.

    Args:
        model_path: Путь к GGUF-файлу
        n_ctx: Размер контекстного окна
        n_gpu_layers: Слои на GPU (0=CPU, -1=все)
        temperature: Температура генерации
        max_tokens: Максимум токенов на запрос
    """

    def __init__(
        self,
        model_path: str,
        n_ctx: int = 4096,
        n_gpu_layers: int = 0,
        temperature: float = 0.3,
        max_tokens: int = 2048,
    ):
        self.model_path = model_path
        self.n_ctx = n_ctx
        self.n_gpu_layers = n_gpu_layers
        self.temperature = temperature
        self.max_tokens = max_tokens

    def ensure_loaded(self) -> None:
        """Ленивая загрузка модели."""
        _load_local_model(self.model_path, self.n_ctx, self.n_gpu_layers)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        reraise=True,
    )
    async def generate_json(self, prompt: str) -> dict:
        """Асинхронно генерирует ответ и возвращает распарсенный JSON."""
        loop = asyncio.get_event_loop()
        raw = await loop.run_in_executor(
            None,
            _sync_generate_local,
            prompt,
            self.max_tokens,
            self.temperature,
        )
        logger.debug("Local LLM raw output (first 500 chars): %s", raw[:500])
        return _extract_json(raw)

    def is_available(self) -> bool:
        """Проверяет, доступна ли модель."""
        return bool(self.model_path) and Path(self.model_path).exists()


# Алиас для обратной совместимости
LLMClient = LocalLLMClient


# ---------------------------------------------------------------------------
# Google Gemini API
# ---------------------------------------------------------------------------

class GeminiLLMClient(BaseLLMClient):
    """
    Async LLM-клиент через Google Gemini API.

    Args:
        api_key: Google AI Studio API Key
        model: Название модели Gemini (например, "gemini-2.5-flash")
        temperature: Температура генерации (0.0 – 1.0)
        max_tokens: Максимум токенов в ответе
    """

    def __init__(
        self,
        api_key: str,
        model: str = "gemini-2.5-flash",
        temperature: float = 0.3,
        max_tokens: int = 2048,
    ):
        self.api_key = api_key
        self.model_name = model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self._client: Optional[object] = None

    def _get_client(self):
        """Ленивая инициализация Gemini клиента."""
        if self._client is None:
            try:
                import google.generativeai as genai
            except ImportError:
                raise ImportError(
                    "google-generativeai не установлен. "
                    "Установите: pip install google-generativeai"
                )
            genai.configure(api_key=self.api_key)
            self._client = genai.GenerativeModel(
                model_name=self.model_name,
                generation_config=genai.GenerationConfig(
                    temperature=self.temperature,
                    max_output_tokens=self.max_tokens,
                ),
            )
            logger.info("Gemini клиент инициализирован: model=%s", self.model_name)
        return self._client

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=15),
        reraise=True,
    )
    async def generate_json(self, prompt: str) -> dict:
        """
        Асинхронно запрашивает Gemini API и возвращает распарсенный JSON.

        Args:
            prompt: Готовый промпт

        Returns:
            Словарь из JSON-ответа

        Raises:
            ValueError: если JSON не найден в ответе
        """
        client = self._get_client()
        response = await client.generate_content_async(prompt)
        raw = response.text.strip()
        logger.debug("Gemini raw output (first 500 chars): %s", raw[:500])
        return _extract_json(raw)

    def is_available(self) -> bool:
        """Проверяет, задан ли API-ключ."""
        return bool(self.api_key)
