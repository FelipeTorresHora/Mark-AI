import asyncio

import pytest

from src.services import openai_llm


def test_chat_completion_sync_empty_raises(monkeypatch):
    class _Msg:
        content = "   "

    class _Choice:
        message = _Msg()

    class _Response:
        choices = [_Choice()]

    class _Client:
        class chat:
            class completions:
                @staticmethod
                def create(**_kwargs):
                    return _Response()

    monkeypatch.setattr(openai_llm, "_client", _Client())
    monkeypatch.setattr(openai_llm, "get_openai_client", lambda: _Client())

    with pytest.raises(ValueError, match="vazia"):
        openai_llm.chat_completion_sync("sys", "user")


def test_chat_completion_sync_returns_stripped(monkeypatch):
    class _Msg:
        content = "  Olá  "

    class _Choice:
        message = _Msg()

    class _Response:
        choices = [_Choice()]

    class _Client:
        class chat:
            class completions:
                @staticmethod
                def create(**_kwargs):
                    return _Response()

    monkeypatch.setattr(openai_llm, "_client", None)
    monkeypatch.setattr(openai_llm, "get_openai_client", lambda: _Client())

    assert openai_llm.chat_completion_sync("sys", "user") == "Olá"


def test_chat_completion_async_wraps_sync(monkeypatch):
    monkeypatch.setattr(
        openai_llm,
        "chat_completion_sync",
        lambda *a, **k: "async-result",
    )

    result = asyncio.run(openai_llm.chat_completion("s", "u"))
    assert result == "async-result"
