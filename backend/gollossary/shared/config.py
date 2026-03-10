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

    # Gemini API settings
    gemini_api_key: str = ""          # Google AI Studio API Key
    gemini_model: str = "gemini-2.5-flash"  # Модель Gemini

    # Chunking
    max_chunk_chars: int = 3000       # Максимум символов в чанке
    chunk_overlap_chars: int = 200    # Перекрытие чанков

    # Processing
    max_concepts: int = 50            # Макс. понятий на лекцию
    language: str = "ru"             # Язык промптов

    # Services
    lecture_processor_port: int = 8001
    concept_crud_port: int = 8002


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Кешированный экземпляр настроек (singleton)."""
    return Settings()
