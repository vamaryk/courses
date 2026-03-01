"""LLM абстракция и провайдеры."""

from .base import BaseLLM
from .llama_provider import LlamaProvider

__all__ = ["BaseLLM", "LlamaProvider"]
