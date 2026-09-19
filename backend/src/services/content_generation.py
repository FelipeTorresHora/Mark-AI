"""Post copy generation (OpenAI), migrated from Gemini."""
from src.services.openai_llm import chat_completion

PROMPTS = {
    "X": """Você é um copywriter especialista em Twitter/X para marcas.

Marca: {name} | Nicho: {niche} | Tom: {tone}
Público: {target_audience}
Diferencial: {unique_value}
Público-alvo do produto: {audience_label}
Objetivo da campanha: {objective}

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
Público-alvo do produto: {audience_label}
Objetivo da campanha: {objective}

Crie 1 post para LinkedIn com:
- Entre 150-300 palavras
- Tom {tone} e profissional
- Abertura que gera curiosidade
- Estrutura com parágrafos curtos
- CTA claro no final
- 3-5 hashtags relevantes

Responda APENAS com o texto do post, nada mais.""",

    "INSTAGRAM": """Você é um copywriter para Instagram (feed).

Marca: {name} | Nicho: {niche} | Tom: {tone}
Público: {target_audience}
Diferencial: {unique_value}
Público-alvo do produto: {audience_label}
Objetivo da campanha: {objective}

Crie legenda para Instagram com:
- Tom {tone}, visual e envolvente
- Emojis com moderação
- CTA claro
- 5-10 hashtags no final
- Se o público for faceless, NÃO mencione rosto, selfie ou aparição pessoal

Responda APENAS com o texto da legenda.""",
}

AUDIENCE_LABELS = {
    "mei": "MEI / loja / profissional liberal — local, oferta, prova social",
    "founder": "Founder de startup — tração, autoridade, produto",
    "faceless": "Faceless — sem rosto, marca e valor, não pessoal",
}


def _normalize_topic(topic: str) -> str:
    return " ".join((topic or "").split())


def _hashtags_from_context(brand_context: dict, limit: int) -> str:
    raw_values = [brand_context.get("niche", ""), brand_context.get("name", "")]
    tags: list[str] = []
    for value in raw_values:
        cleaned = "".join(ch for ch in str(value) if ch.isalnum())
        if cleaned:
            tags.append(f"#{cleaned}")
        if len(tags) == limit:
            break
    return " ".join(tags)


def _fallback_post(platform: str, objective: str, brand_context: dict, audience: str | None) -> str:
    name = brand_context.get("name", "Sua marca").strip() or "Sua marca"
    audience_text = brand_context.get("target_audience", "seu publico").strip() or "seu publico"
    normalized = _normalize_topic(objective)
    snippet = normalized[:160].rstrip(" .,;:-")
    faceless = (audience or "").lower() == "faceless"

    if platform == "X":
        hashtags = _hashtags_from_context(brand_context, limit=2)
        pieces = [
            f"{name} para {audience_text}: {snippet}.",
            "Quer ver isso na pratica? Fale com a gente.",
            hashtags,
        ]
        return " ".join(piece for piece in pieces if piece).strip()[:280].rstrip()

    if platform == "LINKEDIN":
        hashtags = _hashtags_from_context(brand_context, limit=3)
        paragraphs = [
            f"{name} esta trabalhando este objetivo: {normalized}.",
            f"Foco em valor para {audience_text}, com mensagem clara e aplicavel.",
            "Se fizer sentido, transforme isso em campanha e teste com sua audiencia.",
            hashtags,
        ]
        return "\n\n".join(part for part in paragraphs if part).strip()

    if platform == "INSTAGRAM":
        hashtags = _hashtags_from_context(brand_context, limit=8)
        intro = f"{snippet} — {name}"
        if faceless:
            intro = f"Valor da marca, sem aparecer: {snippet}"
        return f"{intro}\n\n{hashtags}".strip()

    raise ValueError(f"Plataforma não suportada: {platform}")


async def generate_post(
    platform: str,
    objective: str,
    brand_context: dict,
    *,
    audience: str | None = None,
    user_id: str | None = None,
    campaign_id: str | None = None,
    attempt: int = 1,
    redo_feedback: str | None = None,
) -> str:
    template = PROMPTS.get(platform)
    if not template:
        raise ValueError(f"Plataforma não suportada: {platform}")

    audience_label = AUDIENCE_LABELS.get((audience or "").lower(), "Empreendedor digital")
    prompt = template.format(
        name=brand_context.get("name", ""),
        niche=brand_context.get("niche", ""),
        tone=brand_context.get("tone", "Profissional"),
        target_audience=brand_context.get("target_audience", ""),
        unique_value=brand_context.get("unique_value", ""),
        audience_label=audience_label,
        objective=objective,
    )
    if redo_feedback:
        prompt += f"\n\nRefaça o post incorporando este feedback do usuário: {redo_feedback}"

    metadata = {
        "user_id": user_id,
        "audience": audience,
        "objective": objective,
        "campaign_id": campaign_id,
        "platform": platform,
        "attempt": attempt,
    }

    try:
        content = await chat_completion(
            "Você escreve copy em português do Brasil para redes sociais.",
            prompt,
            metadata=metadata,
        )
        if content.strip():
            return content.strip()
    except Exception:
        pass
    return _fallback_post(platform, objective, brand_context, audience)


def brand_guard(platform: str, content: str, audience: str | None) -> tuple[str, str | None]:
    """Valida tom/rosto/limites. Retorna (content, warning)."""
    text = content.strip()
    warning: str | None = None

    if platform == "X" and len(text) > 280:
        text = text[:280].rstrip()
        warning = "Texto truncado para 280 caracteres (X)."

    if (audience or "").lower() == "faceless":
        lowered = text.lower()
        for term in ("selfie", "meu rosto", "aparecer na camera", "sou eu na foto"):
            if term in lowered:
                text = text.replace(term, "a marca")
                warning = "Termos pessoais suavizados para público faceless."

    return text, warning
