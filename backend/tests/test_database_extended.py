from unittest.mock import MagicMock

import pytest
from sqlalchemy.pool import NullPool

from src.database import _engine_kwargs, get_db


def test_engine_kwargs_uses_null_pool_on_vercel(monkeypatch):
    monkeypatch.delenv("VERCEL", raising=False)
    monkeypatch.delenv("VERCEL_ENV", raising=False)
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.setenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/marketing_ci",
    )
    kwargs = _engine_kwargs()
    assert kwargs["poolclass"] is NullPool


def test_engine_kwargs_pool_size_for_postgresql(monkeypatch):
    monkeypatch.delenv("VERCEL", raising=False)
    monkeypatch.delenv("VERCEL_ENV", raising=False)
    monkeypatch.setenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/marketing_ci",
    )
    kwargs = _engine_kwargs()
    assert kwargs.get("pool_size") == 5
    assert kwargs.get("max_overflow") == 10
    assert "poolclass" not in kwargs


def test_get_db_closes_session():
    gen = get_db()
    db = next(gen)
    assert db is not None
    db.close = MagicMock()
    with pytest.raises(StopIteration):
        next(gen)
    db.close.assert_called_once()
