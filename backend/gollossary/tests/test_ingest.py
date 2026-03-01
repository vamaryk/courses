"""Тесты для загрузчиков данных."""

import pytest
from pathlib import Path
import tempfile

from gollossary.ingest.text_loader import TextLoader
from gollossary.ingest.transcript_loader import TranscriptLoader


class TestTextLoader:
    """Тесты для TextLoader."""
    
    def test_load_txt_file(self, tmp_path):
        """Загрузка .txt файла."""
        file = tmp_path / "test.txt"
        file.write_text("Hello World", encoding="utf-8")
        
        loader = TextLoader()
        doc = loader.load(file)
        
        assert doc.content == "Hello World"
        assert doc.doc_type == "text"
    
    def test_load_md_file(self, tmp_path):
        """Загрузка .md файла."""
        file = tmp_path / "test.md"
        file.write_text("# Header\n\nContent", encoding="utf-8")
        
        loader = TextLoader()
        doc = loader.load(file)
        
        assert "Header" in doc.content
        assert doc.doc_type == "markdown"
    
    def test_load_directory(self, tmp_path):
        """Загрузка директории."""
        (tmp_path / "file1.txt").write_text("Content 1", encoding="utf-8")
        (tmp_path / "file2.md").write_text("Content 2", encoding="utf-8")
        
        loader = TextLoader()
        doc = loader.load(tmp_path)
        
        assert "Content 1" in doc.content
        assert "Content 2" in doc.content
        assert doc.doc_type == "combined"
    
    def test_unsupported_extension(self, tmp_path):
        """Ошибка для неподдерживаемого расширения."""
        file = tmp_path / "test.pdf"
        file.write_text("Data", encoding="utf-8")
        
        loader = TextLoader()
        with pytest.raises(ValueError, match="Неподдерживаемый формат"):
            loader.load(file)
    
    def test_file_not_found(self):
        """Ошибка для несуществующего файла."""
        loader = TextLoader()
        with pytest.raises(FileNotFoundError):
            loader.load("/nonexistent/file.txt")


class TestTranscriptLoader:
    """Тесты для TranscriptLoader."""
    
    def test_clean_srt(self, tmp_path):
        """Очистка SRT субтитров."""
        srt_content = """1
00:00:00,000 --> 00:00:05,000
Hello world.

2
00:00:05,000 --> 00:00:10,000
This is a test.
"""
        file = tmp_path / "test.srt"
        file.write_text(srt_content, encoding="utf-8")
        
        loader = TranscriptLoader()
        doc = loader.load(file)
        
        # Таймкоды и номера должны быть удалены
        assert "00:00:00" not in doc.content
        assert "Hello world" in doc.content
        assert "test" in doc.content
    
    def test_clean_vtt(self, tmp_path):
        """Очистка VTT субтитров."""
        vtt_content = """WEBVTT

00:00:00.000 --> 00:00:05.000
Hello VTT.

00:00:05.000 --> 00:00:10.000
Another line.
"""
        file = tmp_path / "test.vtt"
        file.write_text(vtt_content, encoding="utf-8")
        
        loader = TranscriptLoader()
        doc = loader.load(file)
        
        assert "WEBVTT" not in doc.content
        assert "00:00:00" not in doc.content
        assert "Hello VTT" in doc.content
    
    def test_no_cleaning(self, tmp_path):
        """Без очистки таймкодов."""
        content = "[00:00:00] Hello"
        file = tmp_path / "test.txt"
        file.write_text(content, encoding="utf-8")
        
        loader = TranscriptLoader(clean_timecodes=False)
        doc = loader.load(file)
        
        assert "[00:00:00]" in doc.content
