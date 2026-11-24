"""Live execution events over Redis pub/sub (worker → API → browser WebSocket)."""

import json
import logging
from collections.abc import Callable
from functools import lru_cache

import redis

from ..config import settings

log = logging.getLogger(__name__)

Publisher = Callable[[str, dict], None]


def channel(execution_id: str) -> str:
    return f"ff:exec:{execution_id}"


@lru_cache
def _client() -> redis.Redis:
    return redis.Redis.from_url(settings.redis_url)


def publish(execution_id: str, event: dict) -> None:
    """Best effort: a missing Redis must not fail the workflow (history is in the DB)."""
    try:
        _client().publish(channel(execution_id), json.dumps(event, default=str, ensure_ascii=False))
    except redis.RedisError as e:
        log.warning("event publish failed: %s", e)
