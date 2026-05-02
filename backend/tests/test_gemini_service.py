import asyncio

from src.services import gemini


def test_generate_post_uses_fallback_when_model_returns_empty(monkeypatch):
    async def fake_call(_prompt: str) -> str:
        return "   "

    monkeypatch.setattr(gemini, "_call_gemini", fake_call)

    content = asyncio.run(
        gemini.generate_post(
            "X",
            "Lançamento da nova campanha com foco em apostadores frustrados em perdas e com prova social no Telegram.",
            {
                "name": "TennisAI",
                "niche": "Apostas esportivas",
                "tone": "Direto",
                "target_audience": "apostadores frustrados em perdas",
                "unique_value": "assertividade nas entradas",
            },
        )
    )

    assert content.strip()
    assert len(content) <= 280
    assert "TennisAI" in content


def test_extract_response_text_reads_candidates_when_text_property_is_empty():
    class Part:
        def __init__(self, text: str):
            self.text = text

    class Content:
        def __init__(self, parts):
            self.parts = parts

    class Candidate:
        def __init__(self, content):
            self.content = content

    class Response:
        text = ""
        candidates = [Candidate(Content([Part("Post gerado a partir dos candidates.")]))]

    assert gemini._extract_response_text(Response()) == "Post gerado a partir dos candidates."
