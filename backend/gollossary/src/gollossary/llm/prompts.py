"""
Промпты для анализа и генерации.

Содержит шаблоны промптов для различных задач:
- Извлечение темы
- Извлечение терминов
- Генерация определений
- Построение связей
"""

# Языковые настройки
LANGUAGE_PROMPTS = {
    "ru": {
        "system": "Ты — эксперт по образовательным материалам. Отвечай на русском языке.",
        "format_instruction": "Ответь ТОЛЬКО в формате JSON, без дополнительного текста."
    },
    "en": {
        "system": "You are an expert in educational materials. Answer in English.",
        "format_instruction": "Respond ONLY in JSON format, without additional text."
    }
}


TOPIC_EXTRACTION_PROMPT = """
{system}

Проанализируй следующий учебный материал и определи его центральную тему.

МАТЕРИАЛ:
---
{text}
---

{format_instruction}

Формат ответа:
{{
    "topic": "Название центральной темы",
    "description": "Краткое описание темы (1-2 предложения)"
}}
"""


TERM_EXTRACTION_PROMPT = """
{system}

Проанализируй учебный материал по теме "{topic}" и извлеки ключевые термины.

ТРЕБОВАНИЯ:
1. Выбери только важные, существенные термины
2. Отсеивай общеизвестные слова и второстепенные понятия
3. Для каждого термина дай:
   - Название термина
   - Краткое понятное определение (1-2 предложения)
   - Практический пример (код или описание применения)
   - Описание изображения, которое иллюстрирует термин

МАТЕРИАЛ:
---
{text}
---

{format_instruction}

Формат ответа:
{{
    "terms": [
        {{
            "term": "Название термина",
            "definition": "Краткое определение",
            "example": "Пример использования или код",
            "image_description": "Описание иллюстрации"
        }}
    ]
}}
"""


RELATION_BUILDING_PROMPT = """
{system}

Дан список терминов по теме "{topic}". Построй иерархические связи между ними.

ТЕРМИНЫ:
{terms_list}

ТРЕБОВАНИЯ:
1. Определи родительские связи (parent) — более общие понятия
2. Определи дочерние связи (children) — более конкретные понятия
3. Если термин корневой (самый общий), parent = null
4. Связи должны быть логичными и образовывать дерево

{format_instruction}

Формат ответа:
{{
    "relations": [
        {{
            "term": "Название термина",
            "parent": "Родительский термин или null",
            "children": ["Дочерний1", "Дочерний2"]
        }}
    ]
}}
"""


DEFINITION_ENHANCEMENT_PROMPT = """
{system}

Улучши определение термина для образовательных целей.

Термин: {term}
Текущее определение: {current_definition}
Контекст (тема): {topic}

ТРЕБОВАНИЯ:
1. Определение должно быть понятным студенту
2. Используй простой язык без лишнего жаргона
3. Определение должно быть точным и полным
4. Длина: 1-3 предложения

{format_instruction}

Формат ответа:
{{
    "definition": "Улучшенное определение"
}}
"""


def get_topic_prompt(text: str, language: str = "ru") -> str:
    """Формирует промпт для извлечения темы."""
    lang = LANGUAGE_PROMPTS.get(language, LANGUAGE_PROMPTS["ru"])
    return TOPIC_EXTRACTION_PROMPT.format(
        system=lang["system"],
        text=text,
        format_instruction=lang["format_instruction"]
    )


def get_term_extraction_prompt(text: str, topic: str, language: str = "ru") -> str:
    """Формирует промпт для извлечения терминов."""
    lang = LANGUAGE_PROMPTS.get(language, LANGUAGE_PROMPTS["ru"])
    return TERM_EXTRACTION_PROMPT.format(
        system=lang["system"],
        topic=topic,
        text=text,
        format_instruction=lang["format_instruction"]
    )


def get_relation_prompt(topic: str, terms: list[str], language: str = "ru") -> str:
    """Формирует промпт для построения связей."""
    lang = LANGUAGE_PROMPTS.get(language, LANGUAGE_PROMPTS["ru"])
    terms_list = "\n".join(f"- {t}" for t in terms)
    return RELATION_BUILDING_PROMPT.format(
        system=lang["system"],
        topic=topic,
        terms_list=terms_list,
        format_instruction=lang["format_instruction"]
    )


def get_definition_prompt(
    term: str, 
    current_definition: str, 
    topic: str, 
    language: str = "ru"
) -> str:
    """Формирует промпт для улучшения определения."""
    lang = LANGUAGE_PROMPTS.get(language, LANGUAGE_PROMPTS["ru"])
    return DEFINITION_ENHANCEMENT_PROMPT.format(
        system=lang["system"],
        term=term,
        current_definition=current_definition,
        topic=topic,
        format_instruction=lang["format_instruction"]
    )
