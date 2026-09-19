import json

from src.services.openai_llm import chat_completion_sync

CMO_SYSTEM_PROMPT = """Você é um CMO (Chief Marketing Officer) experiente e carismático.
Sua missão é ajudar empreendedores a definir o perfil completo da marca deles
através de uma conversa natural e amigável.

Regras:
- Faça APENAS UMA pergunta por vez.
- Seja curto e direto — máximo 2-3 frases por resposta.
- Use o tom {tone} se o usuário já definiu, senão seja profissional mas acolhedor.
- Colete estas 5 informações: nome da marca, nicho de mercado, tom de voz,
  público-alvo e proposta única de valor.
- Quando TODAS as 5 informações estiverem coletadas, responda com um JSON
  no seguinte formato (e NADA mais além do JSON):

{{"DONE": true, "brand_profile": {{"name": "...", "niche": "...", "tone": "...", "target_audience": "...", "unique_value": "..."}}}}

Histórico desta conversa:
{collected}

Se ainda faltam informações, responda normalmente (sem JSON) perguntando a próxima.
"""


def _extract_brand_profile(text: str) -> dict | None:
    start = text.find("{")
    end = text.rfind("}") + 1
    if start == -1 or end == 0:
        return None
    try:
        data = json.loads(text[start:end])
        if data.get("DONE") and data.get("brand_profile"):
            return data["brand_profile"]
    except (json.JSONDecodeError, KeyError):
        pass
    return None


def chat_cmo_reply(user_message: str, conversation_messages: list[dict]) -> tuple[str, dict | None]:
    history_lines = []
    for msg in conversation_messages[-20:]:
        role = "Usuário" if msg["role"] == "user" else "CMO"
        history_lines.append(f"{role}: {msg['content']}")
    history_str = "\n".join(history_lines)
    history_str += f"\nUsuário: {user_message}"

    tone = "Profissional e acolhedor"
    prompt = CMO_SYSTEM_PROMPT.format(collected=history_str or "Nenhuma ainda", tone=tone)

    text = chat_completion_sync(
        "Você é um CMO brasileiro. Responda em português do Brasil.",
        prompt,
        metadata={"feature": "cmo_chat"},
    )

    brand_profile = _extract_brand_profile(text)
    if brand_profile:
        text = text.replace(
            json.dumps({"DONE": True, "brand_profile": brand_profile}, ensure_ascii=False),
            "",
        ).strip()
        if not text:
            text = "Perfeito! Consegui montar o perfil completo da sua marca. Confira no painel à direita!"

    return text, brand_profile
