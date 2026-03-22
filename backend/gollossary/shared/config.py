"""
Общая конфигурация для всех микросервисов.
Значения берутся из переменных окружения или .env файла.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # MongoDB
    mongo_uri: str = "mongodb://localhost:27017"
    db_name: str = "Lms-proj"
    collection_name: str = "gollossary"

    # LLM backend: "local" (llama-cpp-python) или "gemini" (Google Gemini API)
    llm_backend: str = "local"

    # Local GGUF model settings
    llm_model_path: str = ""          # Путь к GGUF модели
    llm_n_ctx: int = 4096             # Размер контекстного окна
    llm_n_gpu_layers: int = 0         # 0=CPU, -1=все на GPU
    llm_temperature: float = 0.3
    llm_max_tokens: int = 2048
    # Ограничение вывода JSON через GBNF (llama-cpp-python); надёжнее для слабых инструкт-моделей
    llm_use_json_grammar: bool = True

    # Gemini API settings
    gemini_api_key: str = ""          # Google AI Studio API Key
    gemini_model: str = "gemini-2.5-flash"  # Модель Gemini

    # OpenRouter API settings (совместим с OpenAI SDK)
    openrouter_api_key: str = ""      # Ключ с https://openrouter.ai/keys
    openrouter_model: str = "qwen/qwen3-coder:free"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_site_url: str = ""     # Опционально: ваш сайт (для рейтингов на OR)
    openrouter_site_name: str = "Gollossary LMS"  # Имя приложения

    # Chunking
    max_chunk_chars: int = 3000       # Максимум символов в чанке
    chunk_overlap_chars: int = 200    # Перекрытие чанков

    # Processing
    max_concepts: int = 50            # Макс. понятий на лекцию
    language: str = "ru"             # Язык промптов

    # Опционально: каталог для сохранения входного текста лекции перед LLM (отладка).
    # Пустая строка = не писать на диск. Пример: data/debug/lectures (относительно cwd сервиса).
    debug_lecture_dir: str = ""

    # Services
    lecture_processor_port: int = 8001
    concept_crud_port: int = 8002


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Кешированный экземпляр настроек (singleton)."""
    return Settings()
