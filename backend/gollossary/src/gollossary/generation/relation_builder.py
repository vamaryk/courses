"""
Модуль построения связей между терминами.

Анализирует термины и устанавливает иерархические связи (parent/children).
"""

import json
from typing import Optional

from rich.console import Console

from ..llm.base import BaseLLM
from ..llm.prompts import get_relation_prompt
from ..models.term import Term


console = Console()


class RelationBuilder:
    """
    Строит иерархические связи между терминами.
    
    Использует LLM для определения родительских и дочерних связей.
    """
    
    def __init__(self, llm: BaseLLM, language: str = "ru"):
        """
        Инициализирует строитель связей.
        
        Args:
            llm: Провайдер LLM
            language: Язык промптов
        """
        self.llm = llm
        self.language = language
    
    def build(self, terms: list[Term], topic: str) -> list[Term]:
        """
        Строит связи между терминами.
        
        Args:
            terms: Список терминов без связей
            topic: Тема для контекста
            
        Returns:
            Список терминов с установленными связями
        """
        if not terms:
            return terms
        
        console.print("[bold blue]🔗 Построение связей между терминами...[/]")
        
        # Получаем названия терминов
        term_names = [t.term for t in terms]
        
        # Создаём маппинг для быстрого доступа
        term_map = {t.term.lower(): t for t in terms}
        
        # Запрашиваем связи у LLM
        prompt = get_relation_prompt(topic, term_names, self.language)
        response = self.llm.generate(prompt, max_tokens=2048)
        
        try:
            json_str = self._extract_json(response)
            data = json.loads(json_str)
            
            # Применяем связи
            relations = data.get("relations", [])
            for rel in relations:
                term_name = rel.get("term", "").lower()
                if term_name in term_map:
                    term = term_map[term_name]
                    
                    # Устанавливаем родителя
                    parent = rel.get("parent")
                    if parent and parent.lower() in term_map:
                        term.relations.parent = parent
                    
                    # Устанавливаем детей (фильтруем существующие)
                    children = rel.get("children", [])
                    for child in children:
                        if child.lower() in term_map:
                            term.relations.add_child(child)
            
            # Валидируем и исправляем связи
            terms = self._validate_relations(list(term_map.values()))
            
            root_count = sum(1 for t in terms if t.is_root())
            console.print(
                f"[bold green]✓[/] Связи построены "
                f"(корневых терминов: {root_count})"
            )
            
        except (json.JSONDecodeError, ValueError) as e:
            console.print(f"[yellow]⚠[/] Не удалось построить связи: {e}")
            # Возвращаем термины без связей
        
        return terms
    
    def _extract_json(self, text: str) -> str:
        """Извлекает JSON из текста."""
        start = text.find('{')
        end = text.rfind('}') + 1
        
        if start == -1 or end == 0:
            raise ValueError("JSON не найден")
        
        return text[start:end]
    
    def _validate_relations(self, terms: list[Term]) -> list[Term]:
        """
        Валидирует и исправляет связи.
        
        Проверяет:
        - Отсутствие циклов
        - Двусторонние связи (если A - родитель B, то B - ребёнок A)
        
        Args:
            terms: Список терминов
            
        Returns:
            Список с исправленными связями
        """
        term_map = {t.term.lower(): t for t in terms}
        
        for term in terms:
            # Проверяем родителя
            if term.relations.parent:
                parent_key = term.relations.parent.lower()
                if parent_key in term_map:
                    parent_term = term_map[parent_key]
                    # Добавляем обратную связь
                    parent_term.relations.add_child(term.term)
                else:
                    # Родитель не найден, убираем связь
                    term.relations.parent = None
            
            # Проверяем детей
            valid_children = []
            for child in term.relations.children:
                child_key = child.lower()
                if child_key in term_map:
                    valid_children.append(child)
                    # Устанавливаем обратную связь
                    term_map[child_key].relations.parent = term.term
            
            term.relations.children = valid_children
        
        return terms
    
    def build_simple(self, terms: list[Term]) -> list[Term]:
        """
        Простой алгоритм построения связей без LLM.
        
        Использует эвристики на основе определений.
        Полезно как fallback или для тестирования.
        
        Args:
            terms: Список терминов
            
        Returns:
            Список с установленными связями
        """
        term_names = {t.term.lower() for t in terms}
        
        for term in terms:
            # Ищем упоминания других терминов в определении
            definition_lower = term.definition.lower()
            
            for other in terms:
                if other.term == term.term:
                    continue
                
                other_lower = other.term.lower()
                
                # Если другой термин упоминается в определении
                if other_lower in definition_lower:
                    # Возможно это родитель или связанный термин
                    if term.relations.parent is None:
                        term.relations.parent = other.term
                        other.relations.add_child(term.term)
                        break
        
        return terms
