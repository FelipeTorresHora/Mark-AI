import asyncio

import google.generativeai as genai

from src.config import settings

genai.configure(api_key=settings.gemini_api_key)

PROMPTS = {
    "X": """Você é um copywriter especialista em Twitter/X para marcas.

Marca: {name} | Nicho: {niche} | Tom: {tone}
Público: {target_audience}
Diferencial: {unique_value}

Pauta: {topic}

Crie 1 post para X (Twitter) com:
- Máximo 280 caracteres
- Tom {tone}
- Gancho forte na primeira linha
- Hashtags relevantes (máx 3)
- Sem emojis excessivos

Responda APENAS com o texto do post, nada mais.""",

    "LINKEDIN": """Você é um copywriter especialista em LinkedIn para marcas B2B/B2C.

Marca: {name} | Nicho: {niche} | Tom: {tone}
Público: {target_audience}
Diferencial: {unique_value}

Pauta: {topic}

Crie 1 post para LinkedIn com:
- Entre 150-300 palavras
- Tom {tone} e profissional
- Abertura que gera curiosidade
- Estrutura com parágrafos curtos
- CTA claro no final
- 3-5 hashtags relevantes

Responda APENAS com o texto do post, nada mais.""",
}


async def _call_gemini(prompt: str) -> str:
    model = genai.GenerativeModel(settings.gemini_model)
    for attempt in range(3):
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(model.generate_content, prompt),
                timeout=settings.generation_timeout_seconds,
            )
            text = _extract_response_text(response)
            if text:
                return text
            if attempt == 2:
                raise ValueError("Gemini retornou uma resposta vazia")
        except asyncio.TimeoutError:
            if attempt == 2:
                raise
            await asyncio.sleep(2 ** attempt)
        except Exception as e:
            if attempt == 2:
                raise
            await asyncio.sleep(2 ** attempt)
    raise RuntimeError("Falha inesperada ao gerar conteúdo com Gemini")


def _extract_response_text(response: object) -> str:
    text = getattr(response, "text", None)
    if isinstance(text, str) and text.strip():
        return text.strip()

    candidates = getattr(response, "candidates", None) or []
    parts: list[str] = []
    for candidate in candidates:
        content = getattr(candidate, "content", None)
        candidate_parts = getattr(content, "parts", None) or []
        for part in candidate_parts:
            part_text = getattr(part, "text", None)
            if isinstance(part_text, str) and part_text.strip():
                parts.append(part_text.strip())

    return "\n".join(parts).strip()


def _normalize_topic(topic: str) -> str:
    return " ".join((topic or "").split())


def _hashtags_from_context(brand_context: dict, limit: int) -> str:
    raw_values = [
        brand_context.get("niche", ""),
        brand_context.get("name", ""),
    ]
    tags: list[str] = []
    for value in raw_values:
        cleaned = "".join(ch for ch in str(value) if ch.isalnum())
        if cleaned:
            tags.append(f"#{cleaned}")
        if len(tags) == limit:
            break
    return " ".join(tags)


def _fallback_post(platform: str, topic: str, brand_context: dict) -> str:
    name = brand_context.get("name", "Sua marca").strip() or "Sua marca"
    audience = brand_context.get("target_audience", "seu publico").strip() or "seu publico"
    normalized_topic = _normalize_topic(topic)
    snippet = normalized_topic[:160].rstrip(" .,;:-")

    if platform == "X":
        hashtags = _hashtags_from_context(brand_context, limit=2)
        pieces = [
            f"{name} para {audience}: {snippet}.",
            "Quer ver isso funcionando na pratica? Fale com a gente.",
            hashtags,
        ]
        content = " ".join(piece for piece in pieces if piece).strip()
        return content[:280].rstrip()

    if platform == "LINKEDIN":
        hashtags = _hashtags_from_context(brand_context, limit=3)
        paragraphs = [
            f"{name} esta colocando esta pauta em pratica: {normalized_topic}.",
            f"O foco aqui e gerar valor real para {audience}, com uma mensagem clara, aplicavel e alinhada ao posicionamento da marca.",
            "Se fizer sentido para o seu momento, vale transformar isso em campanha e testar a resposta da audiencia.",
            hashtags,
        ]
        return "\n\n".join(part for part in paragraphs if part).strip()

    raise ValueError(f"Plataforma não suportada: {platform}")


async def generate_post(platform: str, topic: str, brand_context: dict) -> str:
    template = PROMPTS.get(platform)
    if not template:
        raise ValueError(f"Plataforma não suportada: {platform}")

    prompt = template.format(
        name=brand_context.get("name", ""),
        niche=brand_context.get("niche", ""),
        tone=brand_context.get("tone", "Profissional"),
        target_audience=brand_context.get("target_audience", ""),
        unique_value=brand_context.get("unique_value", ""),
        topic=topic,
    )
    try:
        content = await _call_gemini(prompt)
    except Exception:
        return _fallback_post(platform, topic, brand_context)

    normalized = content.strip()
    if normalized:
        return normalized
    return _fallback_post(platform, topic, brand_context)


async def generate_posts_parallel(topic: str, brand_context: dict) -> dict[str, str]:
    x_task = generate_post("X", topic, brand_context)
    linkedin_task = generate_post("LINKEDIN", topic, brand_context)
    x_content, linkedin_content = await asyncio.gather(x_task, linkedin_task)
    return {"X": x_content, "LINKEDIN": linkedin_content}
