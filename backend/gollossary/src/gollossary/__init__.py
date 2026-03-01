"""
Gollossary - Локальный анализатор образовательных материалов.

Приложение для анализа учебных материалов и генерации 
структурированной базы знаний с использованием локальных LLM.
"""

__version__ = "0.1.0"
__author__ = "Developer"

from .models.term import Term, TermRelations
from .models.mindmap import MindMap

__all__ = [
    "Term",
    "TermRelations",
    "MindMap",
    "__version__",
]
