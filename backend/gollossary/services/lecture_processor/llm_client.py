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
import time
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional

from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
    before_sleep_log,
)

from shared.config import get_settings

from .prompts import LECTURE_CHUNK_JSON_SCHEMA

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _sanitize_json_strings(text: str) -> str:
    """
    Экранирует литеральные переносы строк и символы управления внутри JSON-строк.

    Gemini в JSON-mode иногда вставляет настоящие `\n` внутрь строковых значений
    вместо экранированных `\\n`, делая JSON невалидным.
    """
    import re as _re
    # Заменяем только переносы внутри строковых значений:
    # между парными кавычками (не экранированными) убираем голые \n, \r, \t
    def fix_string(m: "re.Match[str]") -> str:
        s = m.group(0)
        # Экранируем только управляющие символы внутри строки (не меняя \\n)
        s = _re.sub(r'(?<!\\)\n', '\\n', s)
        s = _re.sub(r'(?<!\\)\r', '\\r', s)
        s = _re.sub(r'(?<!\\)\t', '\\t', s)
        return s
    # Простой подход: экранируем переносы между открывающей " и следующей " (нежадный)
    return _re.sub(r'"(?:[^"\\]|\\.)*"', fix_string, text, flags=_re.DOTALL)


def _extract_json(text: str) -> dict:
    """
    Извлекает JSON-объект из текста ответа LLM.

    Стратегия (по убыванию надёжности):
    1. Прямой json.loads
    2. JSON внутри ```json ... ``` блока
    3. Счётчик глубины скобок (обрезает мусор после JSON)
    4. То же, но с предварительной санацией переносов строк в значениях
    5. Исключение с диагностикой
    """
    t = text.strip()

    def _try_loads(s: str) -> "dict | None":
        """Пробует json.loads, при неудаче возвращает None."""
        try:
            return json.loads(s)
        except (json.JSONDecodeError, ValueError):
            return None

    # 1. Прямой парсинг
    result = _try_loads(t)
    if result is not None:
        return result

    # 2. JSON в ```json ... ``` блоке
    if "```" in t:
        for block in t.split("```"):
            block = block.strip()
            if block.lower().startswith("json"):
                block = block[4:].lstrip()
            if block.startswith("{"):
                result = _try_loads(block)
                if result is not None:
                    return result

    # 3. Счётчик глубины скобок — находим первый валидный JSON-объект
    start = t.find("{")
    if start != -1:
        depth = 0
        last_ok = -1
        for i, ch in enumerate(t[start:], start=start):
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    last_ok = i + 1
                    break  # Берём первый полный объект
        if last_ok > start:
            candidate = t[start:last_ok]
            result = _try_loads(candidate)
            if result is not None:
                return result

            # 4. Санируем переносы строк внутри строковых значений и пробуем снова
            sanitized = _sanitize_json_strings(candidate)
            result = _try_loads(sanitized)
            if result is not None:
                logger.debug("[extract_json] JSON исправлен санацией строк")
                return result

    raise ValueError(
        f"JSON не найден в ответе LLM (первые 500 символов):\n{t[:500]}"
    )


def _strip_think_block(text: str) -> str:
    """
    Удаляет блок <think>...</think> из ответа модели (Qwen3 reasoning mode).
    Оставляет только то, что после </think>.
    """
    import re as _re
    cleaned = _re.sub(r"<think>.*?</think>", "", text, flags=_re.DOTALL).strip()
    if cleaned != text.strip():
        logger.debug("[LLM] Удалён <think>-блок (%d → %d символов)", len(text), len(cleaned))
    return cleaned


def _log_llm_response(raw: str, elapsed: float, backend: str) -> None:
    """Логирует мета-информацию об ответе LLM."""
    lines = raw.count("\n") + 1
    logger.info(
        "[LLM/%s] Ответ получен за %.2f с | %d символов | %d строк",
        backend, elapsed, len(raw), lines,
    )
    # Первые 600 символов для диагностики
    preview = raw[:600].replace("\n", "↵")
    logger.debug("[LLM/%s] Начало ответа: %s", backend, preview)


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

_local_model = None          # Singleton
_lecture_chunk_grammar = None  # LlamaGrammar singleton (JSON schema)


def _get_lecture_chunk_grammar():
    """GBNF-грамматика под структуру ответа по чанку (только для локальной LLM)."""
    global _lecture_chunk_grammar
    if _lecture_chunk_grammar is not None:
        return _lecture_chunk_grammar
    try:
        from llama_cpp import LlamaGrammar
    except ImportError:
        raise ImportError("llama-cpp-python не установлен.")

    _lecture_chunk_grammar = LlamaGrammar.from_json_schema(
        json.dumps(LECTURE_CHUNK_JSON_SCHEMA, ensure_ascii=False),
        verbose=False,
    )
    return _lecture_chunk_grammar


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
            "Задайте путь через переменную LLM_MODEL_PATH в .env\n"
            "Лёгкие модели для тестирования (~1 GB):\n"
            "  - Qwen2.5-1.5B-Instruct-Q4_K_M.gguf\n"
            "  - phi-2.Q4_K_M.gguf\n"
            "  Скачать: https://huggingface.co/bartowski"
        )

    logger.info(
        "[LLM/local] Загрузка модели: %s  (n_ctx=%d, gpu_layers=%d)",
        model_path, n_ctx, n_gpu_layers,
    )
    t0 = time.perf_counter()
    _local_model = Llama(
        model_path=model_path,
        n_ctx=n_ctx,
        n_gpu_layers=n_gpu_layers,
        verbose=False,
    )
    logger.info("[LLM/local] Модель загружена за %.1f с.", time.perf_counter() - t0)


def _sync_generate_local(
    prompt: str,
    max_tokens: int,
    temperature: float,
    grammar: object | None = None,
) -> str:
    """Синхронная генерация через локальную модель (вызывается в executor)."""
    if _local_model is None:
        raise RuntimeError("Локальная LLM не загружена. Вызовите ensure_loaded().")

    prompt_chars = len(prompt)
    logger.info(
        "[LLM/local] Начало генерации | промпт=%d символов | max_tokens=%d | temperature=%.2f | grammar=%s",
        prompt_chars, max_tokens, temperature, "да" if grammar else "нет",
    )
    t0 = time.perf_counter()

    kwargs: dict = {
        "max_tokens": max_tokens,
        "temperature": temperature,
        "echo": False,
        "stop": [],
    }
    if grammar is not None:
        kwargs["grammar"] = grammar

    response = _local_model(prompt, **kwargs)
    raw = response["choices"][0]["text"].strip()
    elapsed = time.perf_counter() - t0

    # Статистика токенов (если доступна)
    usage = response.get("usage", {})
    prompt_tokens = usage.get("prompt_tokens", "?")
    completion_tokens = usage.get("completion_tokens", "?")

    logger.info(
        "[LLM/local] Генерация завершена за %.1f с | prompt_tokens=%s | completion_tokens=%s | output=%d символов",
        elapsed, prompt_tokens, completion_tokens, len(raw),
    )
    _log_llm_response(raw, elapsed, "local")
    return raw


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
        retry=retry_if_exception_type(Exception),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    )
    async def generate_json(self, prompt: str) -> dict:
        """Асинхронно генерирует ответ и возвращает распарсенный JSON."""
        settings = get_settings()
        grammar = None
        if getattr(settings, "llm_use_json_grammar", True):
            try:
                grammar = _get_lecture_chunk_grammar()
            except Exception as e:
                logger.warning(
                    "[LLM/local] JSON-грамматика недоступна, генерация без ограничения схемы: %s", e,
                )
        temperature = min(self.temperature, 0.15) if grammar is not None else self.temperature

        loop = asyncio.get_event_loop()
        raw = await loop.run_in_executor(
            None,
            _sync_generate_local,
            prompt,
            self.max_tokens,
            temperature,
            grammar,
        )
        try:
            result = _extract_json(raw)
            concepts_count = len(result.get("concepts", []))
            logger.info(
                "[LLM/local] JSON распарсен успешно | тема=%r | понятий=%d",
                result.get("topic", "?"), concepts_count,
            )
            return result
        except Exception as e:
            logger.error("[LLM/local] Не удалось распарсить JSON: %s\nОтвет (первые 800):\n%s", e, raw[:800])
            raise

    def is_available(self) -> bool:
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
        model: Название модели Gemini
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
                    # Принудительный JSON-режим: Gemini гарантирует валидный JSON без Markdown-обёрток
                    response_mime_type="application/json",
                ),
            )
            logger.info("[LLM/gemini] Клиент инициализирован: model=%s (JSON mode)", self.model_name)
        return self._client

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=15),
        retry=retry_if_exception_type(Exception),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    )
    async def generate_json(self, prompt: str) -> dict:
        """
        Асинхронно запрашивает Gemini API и возвращает распарсенный JSON.
        """
        client = self._get_client()
        prompt_chars = len(prompt)
        logger.info(
            "[LLM/gemini] Запрос к %s | промпт=%d символов | max_tokens=%d | temperature=%.2f",
            self.model_name, prompt_chars, self.max_tokens, self.temperature,
        )
        t0 = time.perf_counter()

        try:
            response = await client.generate_content_async(prompt)
        except Exception as e:
            elapsed = time.perf_counter() - t0
            logger.error("[LLM/gemini] Ошибка API за %.2f с: %s", elapsed, e)
            raise

        elapsed = time.perf_counter() - t0
        raw = response.text.strip()

        # Статистика usage (если доступна)
        try:
            usage = response.usage_metadata
            prompt_tokens = getattr(usage, "prompt_token_count", "?")
            completion_tokens = getattr(usage, "candidates_token_count", "?")
            logger.info(
                "[LLM/gemini] Ответ получен за %.2f с | prompt_tokens=%s | completion_tokens=%s | output=%d символов",
                elapsed, prompt_tokens, completion_tokens, len(raw),
            )
        except Exception:
            logger.info(
                "[LLM/gemini] Ответ получен за %.2f с | output=%d символов",
                elapsed, len(raw),
            )

        _log_llm_response(raw, elapsed, "gemini")

        try:
            result = _extract_json(raw)
            concepts_count = len(result.get("concepts", []))
            logger.info(
                "[LLM/gemini] JSON распарсен успешно | тема=%r | понятий=%d",
                result.get("topic", "?"), concepts_count,
            )
            return result
        except Exception as e:
            logger.error(
                "[LLM/gemini] Не удалось распарсить JSON: %s\nОтвет (первые 800 символов):\n%s",
                e, raw[:800],
            )
            raise

    def is_available(self) -> bool:
        return bool(self.api_key)


# ---------------------------------------------------------------------------
# OpenRouter API (OpenAI-compatible)
# ---------------------------------------------------------------------------

class OpenRouterLLMClient(BaseLLMClient):
    """
    Async LLM-клиент через OpenRouter API (совместим с OpenAI SDK).

    OpenRouter предоставляет доступ к сотням моделей через единый API,
    в том числе бесплатные (суффикс :free).

    Полезные бесплатные модели:
      - qwen/qwen3-coder:free
      - mistralai/devstral-small:free
      - google/gemma-3-27b-it:free
      - deepseek/deepseek-r1-0528:free

    Ключ: https://openrouter.ai/keys
    """

    def __init__(
        self,
        api_key: str,
        model: str = "qwen/qwen3-coder:free",
        base_url: str = "https://openrouter.ai/api/v1",
        temperature: float = 0.3,
        max_tokens: int = 2048,
        site_url: str = "",
        site_name: str = "Gollossary LMS",
    ):
        self.api_key = api_key
        self.model_name = model
        self.base_url = base_url
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.site_url = site_url
        self.site_name = site_name
        self._client: Optional[object] = None

    def _get_client(self):
        """Ленивая инициализация AsyncOpenAI клиента."""
        if self._client is None:
            try:
                from openai import AsyncOpenAI
            except ImportError:
                raise ImportError(
                    "openai не установлен. Установите: pip install openai"
                )
            extra_headers: dict = {}
            if self.site_url:
                extra_headers["HTTP-Referer"] = self.site_url
            if self.site_name:
                extra_headers["X-Title"] = self.site_name

            self._client = AsyncOpenAI(
                api_key=self.api_key,
                base_url=self.base_url,
                default_headers=extra_headers,
            )
            logger.info(
                "[LLM/openrouter] Клиент инициализирован: model=%s base_url=%s",
                self.model_name, self.base_url,
            )
        return self._client

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=20),
        retry=retry_if_exception_type(Exception),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    )
    async def generate_json(self, prompt: str) -> dict:
        """
        Запрашивает OpenRouter API в формате chat-completions и возвращает JSON.

        Системный промпт явно требует JSON-ответ, чтобы модель не добавляла
        посторонний текст (markdown, пояснения).
        """
        client = self._get_client()
        prompt_chars = len(prompt)
        logger.info(
            "[LLM/openrouter] Запрос к %s | промпт=%d символов | max_tokens=%d | temperature=%.2f",
            self.model_name, prompt_chars, self.max_tokens, self.temperature,
        )
        t0 = time.perf_counter()

        try:
            response = await client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an educational content expert. "
                            "Respond ONLY with a valid JSON object. "
                            "No markdown fences, no <think> blocks, no explanations. "
                            "All string values must have escaped newlines (\\n). "
                            "First character must be '{', last must be '}'."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                # Принудительный JSON-режим (поддерживается большинством моделей на OR)
                extra_body={"response_format": {"type": "json_object"}},
            )
        except Exception as e:
            elapsed = time.perf_counter() - t0
            logger.error("[LLM/openrouter] Ошибка API за %.2f с: %s", elapsed, e)
            raise

        elapsed = time.perf_counter() - t0
        raw = (response.choices[0].message.content or "").strip()

        # Статистика токенов
        usage = response.usage
        if usage:
            logger.info(
                "[LLM/openrouter] Ответ получен за %.2f с | "
                "prompt_tokens=%s | completion_tokens=%s | total_tokens=%s | output=%d символов",
                elapsed,
                usage.prompt_tokens,
                usage.completion_tokens,
                usage.total_tokens,
                len(raw),
            )
        else:
            logger.info(
                "[LLM/openrouter] Ответ получен за %.2f с | output=%d символов",
                elapsed, len(raw),
            )

        _log_llm_response(raw, elapsed, "openrouter")

        # Qwen3-coder может возвращать <think>...</think> блок перед JSON (reasoning mode)
        raw = _strip_think_block(raw)

        try:
            result = _extract_json(raw)
            concepts_count = len(result.get("concepts", []))
            logger.info(
                "[LLM/openrouter] JSON распарсен успешно | тема=%r | понятий=%d",
                result.get("topic", "?"), concepts_count,
            )
            return result
        except Exception as e:
            logger.error(
                "[LLM/openrouter] Не удалось распарсить JSON: %s\nОтвет (первые 800 символов):\n%s",
                e, raw[:800],
            )
            raise

    def is_available(self) -> bool:
        return bool(self.api_key)
