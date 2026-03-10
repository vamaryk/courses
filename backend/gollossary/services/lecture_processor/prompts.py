"""
Промпты для LLM при анализе лекций.

Возвращают JSON с lecture_number, topic, description и списком понятий.
"""

LANG_SYSTEM: dict[str, str] = {
    "ru": "Ты — эксперт по образовательным материалам. Отвечай строго на русском языке.",
    "en": "You are an educational content expert. Answer strictly in English.",
}

LANG_JSON_INSTRUCTION: dict[str, str] = {
    "ru": "Ответь ТОЛЬКО валидным JSON без каких-либо пояснений и markdown.",
    "en": "Respond ONLY with valid JSON, no explanations, no markdown.",
}

# ---------------------------------------------------------------------------
# Основной промпт: анализ чанка лекции
# ---------------------------------------------------------------------------

LECTURE_ANALYSIS_PROMPT = """\
{system}

Проанализируй фрагмент учебной лекции и извлеки:
1. Номер/название лекции (если явно указан в тексте, иначе — "Лекция")
2. Центральную тему фрагмента
3. Краткое описание темы (1-2 предложения)
4. Ключевые понятия с определениями и примерами

ФРАГМЕНТ ЛЕКЦИИ:
---
{text}
---

{json_instruction}

Формат ответа (строго JSON):
{{
    "lecture_number": "Лекция 1" ,
    "topic": "Название центральной темы",
    "description": "Краткое описание темы",
    "concepts": [
        {{
            "term": "Название понятия",
            "definition": "Чёткое определение в 1-2 предложениях",
            "example": "Практический пример или код",
            "image_description": "Описание иллюстрации к понятию",
            "relations": {{
                "parent": "Родительское понятие или null",
                "children": ["Дочернее1", "Дочернее2"]
            }}
        }}
    ]
}}
"""


def build_lecture_prompt(text: str, language: str = "ru") -> str:
    """Формирует промпт для анализа чанка лекции."""
    lang = language if language in LANG_SYSTEM else "ru"
    return LECTURE_ANALYSIS_PROMPT.format(
        system=LANG_SYSTEM[lang],
        text=text,
        json_instruction=LANG_JSON_INSTRUCTION[lang],
    )
