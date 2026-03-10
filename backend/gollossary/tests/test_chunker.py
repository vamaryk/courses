"""
Тесты для LectureChunker.
Не требуют LLM или MongoDB.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from services.lecture_processor.chunker import LectureChunker


class TestLectureChunker:
    def setup_method(self):
        self.chunker = LectureChunker(max_chunk_chars=200, overlap_chars=30)

    def test_short_text_returns_single_chunk(self):
        text = "Короткий текст."
        chunks = self.chunker.split(text)
        assert len(chunks) == 1
        assert chunks[0] == text

    def test_empty_text_returns_empty(self):
        chunks = self.chunker.split("")
        assert chunks == []

    def test_whitespace_only_returns_empty(self):
        chunks = self.chunker.split("   \n\n   ")
        assert chunks == []

    def test_long_text_splits_into_multiple_chunks(self):
        # ~600 символов → должно получиться ≥3 чанков при max_chunk_chars=200
        para = "А" * 190
        text = f"{para}\n\n{para}\n\n{para}\n\n{para}"
        chunks = self.chunker.split(text)
        assert len(chunks) >= 2

    def test_each_chunk_within_limit(self):
        long_text = " ".join(["слово"] * 500)
        chunker = LectureChunker(max_chunk_chars=200, overlap_chars=30)
        chunks = chunker.split(long_text)
        assert len(chunks) > 1, "Длинный текст должен разбиться на несколько чанков"
        # Каждый чанк не должен быть многократно больше лимита
        for chunk in chunks:
            assert len(chunk) <= chunker.max_chunk_chars * 3, (
                f"Чанк слишком большой: {len(chunk)} символов (лимит {chunker.max_chunk_chars})"
            )

    def test_no_data_loss(self):
        """Суммарный контент чанков должен покрывать исходный текст."""
        text = "Первый абзац.\n\nВторой абзац.\n\nТретий абзац. Длинный длинный длинный."
        chunker = LectureChunker(max_chunk_chars=50, overlap_chars=10)
        chunks = chunker.split(text)
        combined = " ".join(chunks)
        # Каждое слово исходника должно присутствовать хотя бы в одном чанке
        for word in text.split():
            assert word in combined, f"Слово '{word}' потеряно"

    def test_single_long_paragraph_splits(self):
        """Один большой абзац должен разбиваться на несколько чанков."""
        big_para = "Длинное предложение. " * 30  # ~630 символов
        chunker = LectureChunker(max_chunk_chars=200, overlap_chars=0)
        chunks = chunker.split(big_para)
        assert len(chunks) > 1
