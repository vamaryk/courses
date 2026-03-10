"""
Async MongoDB клиент на базе Motor для использования в FastAPI.
"""

from typing import AsyncGenerator
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from .config import get_settings

_client: AsyncIOMotorClient | None = None


async def connect_db() -> None:
    """Устанавливает подключение к MongoDB при старте приложения."""
    global _client
    settings = get_settings()
    _client = AsyncIOMotorClient(settings.mongo_uri)
    # Проверка соединения
    await _client.admin.command("ping")


async def close_db() -> None:
    """Закрывает подключение при остановке приложения."""
    global _client
    if _client is not None:
        _client.close()
        _client = None


def get_database() -> AsyncIOMotorDatabase:
    """Возвращает объект базы данных."""
    if _client is None:
        raise RuntimeError("MongoDB не подключена. Вызовите connect_db() при старте.")
    settings = get_settings()
    return _client[settings.db_name]


# FastAPI Dependency
async def get_db() -> AsyncGenerator[AsyncIOMotorDatabase, None]:
    """FastAPI dependency для получения БД в route-функциях."""
    yield get_database()
