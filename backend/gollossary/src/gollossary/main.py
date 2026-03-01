"""
Gollossary - CLI интерфейс.

Главная точка входа для командной строки.
Использует Typer для удобного CLI.
"""

from pathlib import Path
from typing import Optional

import typer
from rich.console import Console
from rich.panel import Panel

from .config import load_config
from .llm.llama_provider import LlamaProvider
from .ingest.text_loader import TextLoader
from .ingest.transcript_loader import TranscriptLoader
from .ingest.mongo_loader import MongoLoader
from .analysis.topic_extractor import TopicExtractor
from .analysis.term_extractor import TermExtractor
from .generation.relation_builder import RelationBuilder
from .export.json_exporter import JSONExporter
from .export.mermaid_exporter import MermaidExporter
from .models.mindmap import MindMap
from .db.mongo_manager import MongoManager


app = typer.Typer(
    name="gollossary",
    help="Локальный анализатор учебных материалов"
)
console = Console()


@app.command()
def analyze(
    input_path: Path = typer.Argument(
        ...,
        help="Путь к файлу или директории с материалами",
        exists=True
    ),
    model: Path = typer.Option(
        ...,
        "--model", "-m",
        help="Путь к GGUF модели",
        exists=True
    ),
    output: Path = typer.Option(
        Path("./output"),
        "--output", "-o",
        help="Директория для результатов"
    ),
    format: str = typer.Option(
        "all",
        "--format", "-f",
        help="Формат вывода: json, mermaid, all"
    ),
    gpu: bool = typer.Option(
        False,
        "--gpu",
        help="Использовать GPU для ускорения"
    ),
    context: int = typer.Option(
        4096,
        "--context", "-c",
        help="Размер контекстного окна"
    ),
    max_terms: int = typer.Option(
        50,
        "--max-terms",
        help="Максимум извлекаемых терминов"
    ),
    language: str = typer.Option(
        "ru",
        "--lang",
        help="Язык: ru или en"
    )
) -> None:
    """
    Анализирует локальные файлы (txt/md/srt).
    """
    _run_analysis(
        source_type="file",
        source=input_path, 
        model_path=model, 
        output_dir=output, 
        format=format, 
        gpu=gpu, 
        context=context, 
        max_terms=max_terms, 
        language=language
    )


@app.command()
def analyze_course(
    course_id: str = typer.Argument(
        ...,
        help="MongoDB ObjectId курса"
    ),
    model: Path = typer.Option(
        ...,
        "--model", "-m",
        help="Путь к GGUF модели",
        exists=True
    ),
    mongo_uri: str = typer.Option(
        "mongodb://localhost:27017",
        "--mongo",
        help="URI подключения к MongoDB"
    ),
    updated_db: bool = typer.Option(
        False,
        "--save-db",
        help="Сохранить результат обратно в MongoDB"
    ),
    output: Path = typer.Option(
        Path("./output"),
        "--output", "-o", 
        help="Директория для локальных файлов"
    ),
    gpu: bool = typer.Option(False, "--gpu"),
    context: int = typer.Option(4096, "--context", "-c"),
    max_terms: int = typer.Option(50, "--max-terms"),
    language: str = typer.Option("ru", "--lang")
) -> None:
    """
    Анализирует курс из MongoDB.
    
    Загружает все лекции курса, объединяет их и строит общий глоссарий.
    """
    _run_analysis(
        source_type="mongo",
        source=course_id,
        model_path=model,
        mongo_uri=mongo_uri,
        save_to_db=updated_db,
        output_dir=output,
        format="all",
        gpu=gpu,
        context=context,
        max_terms=max_terms,
        language=language
    )


def _run_analysis(
    source_type: str,
    source: Path | str,
    model_path: Path,
    output_dir: Path,
    format: str = "all",
    gpu: bool = False,
    context: int = 4096,
    max_terms: int = 50,
    language: str = "ru",
    mongo_uri: str = "mongodb://localhost:27017",
    save_to_db: bool = False
):
    """Общая логика анализа."""
    
    console.print(Panel.fit(
        f"[bold blue]Gollossary[/] - Анализ {source_type}",
        border_style="blue"
    ))

    # 1. Config & LLM
    config = load_config(
        model_path=model_path,
        output_dir=output_dir,
        use_gpu=gpu,
        n_ctx=context
    )
    
    try:
        llm = LlamaProvider(
            model_path=config.llm.model_path,
            n_ctx=config.llm.n_ctx,
            n_gpu_layers=config.llm.n_gpu_layers
        )
    except Exception as e:
        console.print(f"[red]Ошибка LLM:[/] {e}")
        raise typer.Exit(1)

    # 2. Loading
    mongo_manager = None
    if source_type == "mongo":
        console.print(f"[bold]🔌 Подключение к BD...[/]")
        mongo_manager = MongoManager(uri=mongo_uri)
        loader = MongoLoader(mongo_manager)
        documents = loader.load_course(str(source)) # source = course_id
        
        if not documents:
            console.print("[red]Лекции не найдены![/]")
            raise typer.Exit(1)
            
        # Объединяем контент всех лекций (простой вариант для начала)
        # TODO: В будущем - batch processing
        combined_content = "\n\n---\n\n".join([d.content for d in documents])
        document = documents[0] # Используем первый как базу для метаданных
        document.content = combined_content
        
        console.print(f"[green]Загружено {len(documents)} лекций из базы.[/]")

    else:
        # Local file loading
        suffix = source.suffix.lower() if source.is_file() else ""
        if suffix in [".srt", ".vtt"]:
            loader = TranscriptLoader()
        else:
            loader = TextLoader()
        document = loader.load(source)

    # 3. Analysis
    console.print(f"[bold]🔍 Анализ ({len(document.content)} символов)...[/]")
    
    topic_extractor = TopicExtractor(llm, language)
    topic, description = topic_extractor.extract(document.content)
    
    term_extractor = TermExtractor(llm, language, max_terms)
    terms = term_extractor.extract(document.content, topic)
    
    if not terms:
        console.print("[yellow]⚠ Термины не найдены[/]")
        return

    # 4. Relations
    relation_builder = RelationBuilder(llm, language)
    terms = relation_builder.build(terms, topic)
    
    mindmap = MindMap(
        topic=topic,
        description=description,
        terms=terms
    )
    
    # 5. Export Local
    config.output_dir.mkdir(parents=True, exist_ok=True)
    
    if format in ["json", "all"]:
        JSONExporter().export(mindmap, config.output_dir / "glossary.json")
    
    if format in ["mermaid", "all"]:
        MermaidExporter().export(mindmap, config.output_dir / "mindmap.mmd")
        MermaidExporter(diagram_type="flowchart").export(mindmap, config.output_dir / "flowchart.mmd")

    # 6. Export to DB
    if save_to_db and mongo_manager:
        console.print("\n[bold]💾 Сохранение в MongoDB...[/]")
        glossary_dict = mindmap.to_dict()
        glossary_dict["course_id"] = ObjectId(str(source))
        glossary_dict["model"] = model_path.name
        
        g_id = mongo_manager.save_glossary(glossary_dict)
        mongo_manager.update_course_glossary_link(str(source), g_id)


@app.command()
def info():
    """Показывает информацию."""
    from . import __version__
    console.print(Panel(f"Gollossary v{__version__}\nWith MongoDB Support"))


def main():
    app()

if __name__ == "__main__":
    main()
