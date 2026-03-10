"""
Разбивка текста лекций на чанки для обработки LLM.

Интеллектуальное разбиение с перекрытием:
- Разбивает по абзацам (\n\n)
- Внутри абзацев — по предложениям
- Сохраняет перекрытие для контекста
"""

from __future__ import annotations
import re


class LectureChunker:
    """
    Разбивает текст лекции на чанки, которые помещаются в контекст LLM.

    Args:
        max_chunk_chars: Максимальный размер чанка в символах
        overlap_chars: Количество символов перекрытия между чанками
    """

    def __init__(self, max_chunk_chars: int = 3000, overlap_chars: int = 200):
        self.max_chunk_chars = max_chunk_chars
        self.overlap_chars = overlap_chars

    def split(self, text: str) -> list[str]:
        """
        Разбивает текст на чанки.

        Returns:
            Список строк-чанков
        """
        text = text.strip()
        if not text:
            return []

        # Короткий текст — возвращаем как есть
        if len(text) <= self.max_chunk_chars:
            return [text]

        # Разбиваем на абзацы
        paragraphs = self._split_paragraphs(text)

        chunks: list[str] = []
        current: list[str] = []
        current_len = 0

        for para in paragraphs:
            para_len = len(para)

            # Абзац не влезает даже один — режем по предложениям
            if para_len > self.max_chunk_chars:
                # Сначала сбрасываем накопленное
                if current:
                    chunks.append("\n\n".join(current))
                    current = []
                    current_len = 0
                # Режем большой абзац
                chunks.extend(self._split_large_paragraph(para))
                continue

            # Добавляем к текущему чанку
            if current_len + para_len + 2 > self.max_chunk_chars and current:
                # Сохраняем чанк
                chunk_text = "\n\n".join(current)
                chunks.append(chunk_text)
                # Перекрытие: берём хвост предыдущего чанка
                overlap_text = chunk_text[-self.overlap_chars:] if self.overlap_chars > 0 else ""
                current = [overlap_text] if overlap_text else []
                current_len = len(overlap_text)

            current.append(para)
            current_len += para_len + 2  # +2 для \n\n

        if current:
            chunks.append("\n\n".join(current))

        return chunks

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _split_paragraphs(self, text: str) -> list[str]:
        """Разбивает текст на абзацы (двойной перенос строки)."""
        paragraphs = re.split(r"\n{2,}", text)
        return [p.strip() for p in paragraphs if p.strip()]

    def _split_large_paragraph(self, text: str) -> list[str]:
        """Разбивает большой абзац по предложениям, затем по словам."""
        sentences = re.split(r"(?<=[.!?])\s+", text)

        chunks: list[str] = []
        current: list[str] = []
        current_len = 0

        for sentence in sentences:
            s_len = len(sentence)
            if current_len + s_len + 1 > self.max_chunk_chars and current:
                chunks.append(" ".join(current))
                current = []
                current_len = 0
            current.append(sentence)
            current_len += s_len + 1

        if current:
            chunks.append(" ".join(current))

        # Если предложения слишком длинные — режем по словам
        final: list[str] = []
        for chunk in chunks:
            if len(chunk) <= self.max_chunk_chars:
                final.append(chunk)
            else:
                final.extend(self._split_by_words(chunk))

        return final if final else [text[:self.max_chunk_chars]]

    def _split_by_words(self, text: str) -> list[str]:
        """Последний резерв: разбивка по словам."""
        words = text.split()
        chunks: list[str] = []
        current: list[str] = []
        current_len = 0

        for word in words:
            w_len = len(word)
            if current_len + w_len + 1 > self.max_chunk_chars and current:
                chunks.append(" ".join(current))
                current = []
                current_len = 0
            current.append(word)
            current_len += w_len + 1

        if current:
            chunks.append(" ".join(current))

        return chunks if chunks else [text[:self.max_chunk_chars]]
