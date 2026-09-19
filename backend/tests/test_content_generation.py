import asyncio

from src.services.content_generation import _fallback_post, brand_guard, generate_post


def test_generate_post_fallback_without_api_key(monkeypatch):
    async def fail_completion(*_args, **_kwargs):
        raise RuntimeError("no api")

    monkeypatch.setattr("src.services.content_generation.chat_completion", fail_completion)

    content = asyncio.run(
        generate_post(
            "X",
            "Abrir agenda da clínica",
            {
                "name": "Clinica",
                "niche": "Saude",
                "tone": "Acolhedor",
                "target_audience": "Pacientes",
                "unique_value": "Atendimento rapido",
            },
            audience="mei",
        )
    )
    assert "Clinica" in content
    assert len(content) <= 280


def test_brand_guard_truncates_x():
    text, warning = brand_guard("X", "x" * 300, None)
    assert len(text) <= 280
    assert warning


def test_brand_guard_faceless():
    text, _ = brand_guard("INSTAGRAM", "Tire uma selfie hoje", "faceless")
    assert "selfie" not in text.lower()


def test_fallback_post_linkedin():
    post = _fallback_post(
        "LINKEDIN",
        "Lancar feature",
        {"name": "Startup", "niche": "SaaS", "target_audience": "Founders"},
        "founder",
    )
    assert "Lancar feature" in post
