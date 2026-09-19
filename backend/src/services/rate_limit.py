"""Simple in-process sliding-window rate limit (good enough per serverless instance)."""

from __future__ import annotations

import time
from collections import defaultdict

_hits: dict[str, list[float]] = defaultdict(list)


class RateLimitExceeded(Exception):
    def __init__(self, message: str = "Limite de tentativas excedido. Tente novamente em instantes."):
        super().__init__(message)


def check_rate_limit(key: str, *, max_hits: int, window_seconds: float) -> None:
    now = time.monotonic()
    recent = [t for t in _hits[key] if now - t < window_seconds]
    if len(recent) >= max_hits:
        _hits[key] = recent
        raise RateLimitExceeded()
    recent.append(now)
    _hits[key] = recent
