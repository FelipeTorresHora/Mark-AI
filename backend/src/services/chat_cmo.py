import json
import google.generativeai as genai
from src.config import settings

genai.configure(api_key=settings.gemini_api_key)

CMO_SYSTEM_PROMPT = """Você é um CMO (Chief Marketing Officer) experiente e carismático.
Sua missão é ajudar empreendedores a definir o perfil completo da marca deles
através de uma conversa natural e amigável.

Regras:
- Faça APENAS UMA pergunta por vez.
- Seja curto e direto — máximo 2-3 frases por resposta.
- Use o tom {tone} se o usuário já definiu, senão seja profissional mas acolhedor.
- Colete estas 5 informações: nome da marca, nicho de mercado, tom de voz,
  público-alvo e proposta única de valor.
- Se o usuário já forneceu alguma informação, reconheça e pergunte a próxima.
- Quando TODAS as 5 informações estiverem coletadas, responda com um JSON
  no seguinte formato (e NADA mais além do JSON):

{"DONE": true, "brand_profile": {"name": "...", "niche": "...", "tone": "...", "target_audience": "...", "unique_value": "..."}}

Informações já coletadas nesta conversa: {collected}

Se ainda faltam informações, responda normalmente (sem JSON) perguntando a próxima.
Se o usuário mudar de assunto, gentilmente traga de volta ao briefing.
Se o usuário disser "estou pronto", "já acabou", ou algo similar, verifique se
todas as 5 infos foram coletadas. Se sim, gere o JSON. Se não, peça as que faltam."""


def _extract_brand_profile(text: str) -> dict | None:
    """Tenta extrair JSON de brand profile da resposta do Gemini."""
    # Procura por bloco JSON
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


def _get_collected_info(messages: list[dict]) -> dict:
    """Extrai informações já coletadas do histórico de mensagens."""
    collected = {}
    for msg in messages:
        content = msg.get("content", "")
        # Tenta detectar padrões de respostas do usuário
        # Isso é heurístico — o Gemini faz o trabalho pesado
    return collected


def chat_cmo_reply(user_message: str, conversation_messages: list[dict]) -> tuple[str, dict | None]:
    """
    Gera resposta do CMO IA.
    Retorna (texto_da_resposta, brand_profile_ou_None).
    """
    # Construir histórico formatado para o Gemini
    history_lines = []
    for msg in conversation_messages[-20:]:  # últimos 20 messages
        role = "Usuário" if msg["role"] == "user" else "CMO"
        history_lines.append(f"{role}: {msg['content']}")

    history_str = "\n".join(history_lines)
    history_str += f"\nUsuário: {user_message}"

    # Determinar tom — se já foi definido, usar; senão neutro
    tone = "Profissional e acolhedor"
    for msg in conversation_messages:
        if msg["role"] == "user" and ("tom" in msg["content"].lower() or "voz" in msg["content"].lower()):
            tone = "Profissional"
            break

    prompt = CMO_SYSTEM_PROMPT.format(collected=history_str or "Nenhuma ainda", tone=tone)

    model = genai.GenerativeModel(settings.gemini_model)
    response = model.generate_content(prompt)
    text = response.text.strip()

    # Verificar se a resposta contém brand_profile
    brand_profile = _extract_brand_profile(text)
    if brand_profile:
        # Limpar texto da resposta (remover JSON)
        text = text.replace(json.dumps({"DONE": True, "brand_profile": brand_profile}, ensure_ascii=False), "")
        text = text.strip()
        if not text:
            text = "Perfeito! Consegui montar o perfil completo da sua marca. Confira no painel à direita! 🎉"

    return text, brand_profile
