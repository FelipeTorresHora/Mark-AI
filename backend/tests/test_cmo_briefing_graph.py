from unittest.mock import patch

import pytest

from src.services.cmo_briefing_graph import (
    CmoChatError,
    _extract_brand_profile,
    _format_history,
    run_cmo_briefing_turn,
)


def test_format_history_skips_empty_content():
    messages = [
        {"role": "user", "content": "Olá"},
        {"role": "assistant", "content": ""},
        {"role": "user", "content": "Minha marca é Acme"},
    ]
    text = _format_history(messages)
    assert "Olá" in text
    assert "Acme" in text
    assert text.count("Usuário:") == 2


def test_extract_brand_profile_normalizes_tone():
    raw = (
        '{"DONE": true, "brand_profile": {"name": "Acme", "niche": "SaaS", '
        '"tone": "profissional", "target_audience": "Devs", "unique_value": "Automação"}}'
    )
    profile = _extract_brand_profile(raw)
    assert profile is not None
    assert profile["tone"] == "Profissional"


def test_run_cmo_briefing_turn_returns_reply(monkeypatch):
    monkeypatch.setattr("src.services.cmo_briefing_graph.settings.openai_api_key", "test-key")
    monkeypatch.setattr(
        "src.services.cmo_briefing_graph.chat_completion_sync",
        lambda *_a, **_k: "Qual é o nome da sua marca?",
    )
    reply, profile = run_cmo_briefing_turn([{"role": "user", "content": "Oi"}])
    assert reply == "Qual é o nome da sua marca?"
    assert profile is None


def test_run_cmo_briefing_turn_parses_done_json(monkeypatch):
    monkeypatch.setattr("src.services.cmo_briefing_graph.settings.openai_api_key", "test-key")
    payload = (
        '{"DONE": true, "brand_profile": {"name": "Acme", "niche": "SaaS", '
        '"tone": "Profissional", "target_audience": "Devs", "unique_value": "IA"}}'
    )
    monkeypatch.setattr(
        "src.services.cmo_briefing_graph.chat_completion_sync",
        lambda *_a, **_k: payload,
    )
    reply, profile = run_cmo_briefing_turn([{"role": "user", "content": "Pronto"}])
    assert profile is not None
    assert profile["name"] == "Acme"
    assert "Perfeito" in reply


def test_run_cmo_briefing_turn_requires_openai_key(monkeypatch):
    monkeypatch.setattr("src.services.cmo_briefing_graph.settings.openai_api_key", "")
    with pytest.raises(CmoChatError, match="OPENAI_API_KEY"):
        run_cmo_briefing_turn([{"role": "user", "content": "Oi"}])
