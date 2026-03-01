"""
Конфигурация приложения Gollossary.

Содержит настройки для LLM, путей и параметров генерации.
"""

from pathlib import Path
from typing import Literal
from pydantic import BaseModel, Field


class LLMConfig(BaseModel):
    """Конфигурация LLM модели."""
    
    model_path: Path = Field(
        description="Путь к GGUF модели"
    )
    n_ctx: int = Field(
        default=4096,
        ge=512,
        le=32768,
        description="Размер контекстного окна"
    )
    n_gpu_layers: int = Field(
        default=0,
        ge=-1,
        description="Количество слоёв на GPU (-1 = все, 0 = только CPU)"
    )
    max_tokens: int = Field(
        default=1024,
        ge=64,
        le=8192,
        description="Максимальное количество токенов в ответе"
    )
    temperature: float = Field(
        default=0.7,
        ge=0.0,
        le=2.0,
        description="Температура генерации"
    )
    top_p: float = Field(
        default=0.9,
        ge=0.0,
        le=1.0,
        description="Top-p (nucleus sampling)"
    )
    repeat_penalty: float = Field(
        default=1.1,
        ge=1.0,
        le=2.0,
        description="Штраф за повторения"
    )


class AppConfig(BaseModel):
    """Общая конфигурация приложения."""
    
    llm: LLMConfig = Field(
        description="Настройки LLM"
    )
    input_dir: Path = Field(
        default=Path("./data"),
        description="Директория с входными данными"
    )
    output_dir: Path = Field(
        default=Path("./output"),
        description="Директория для результатов"
    )
    language: Literal["ru", "en"] = Field(
        default="ru",
        description="Язык генерации"
    )
    max_terms: int = Field(
        default=50,
        ge=1,
        le=200,
        description="Максимальное количество извлекаемых терминов"
    )
    
    def ensure_dirs(self) -> None:
        """Создаёт директории, если они не существуют."""
        self.input_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)


def load_config(
    model_path: Path,
    input_dir: Path | None = None,
    output_dir: Path | None = None,
    use_gpu: bool = False,
    n_ctx: int = 4096,
) -> AppConfig:
    """
    Создаёт конфигурацию приложения.
    
    Args:
        model_path: Путь к GGUF модели
        input_dir: Директория с входными данными
        output_dir: Директория для результатов
        use_gpu: Использовать GPU (все слои)
        n_ctx: Размер контекстного окна
        
    Returns:
        Настроенный объект AppConfig
    """
    llm_config = LLMConfig(
        model_path=model_path,
        n_ctx=n_ctx,
        n_gpu_layers=-1 if use_gpu else 0,
    )
    
    config = AppConfig(
        llm=llm_config,
        input_dir=input_dir or Path("./data"),
        output_dir=output_dir or Path("./output"),
    )
    
    config.ensure_dirs()
    return config
