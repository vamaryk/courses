"""Модуль загрузки данных."""

from .base import BaseLoader
from .text_loader import TextLoader
from .transcript_loader import TranscriptLoader
from .mongo_loader import MongoLoader

__all__ = ["BaseLoader", "TextLoader", "TranscriptLoader", "MongoLoader"]
