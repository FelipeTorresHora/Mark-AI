"""LangGraph orchestration for CMO brand briefing chat (OpenAI + LangSmith)."""
from __future__ import annotations

import json
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph

from src.config import settings
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

_TONE_ALIASES = {
    "autêntico": "Autêntico",
    "autentico": "Autêntico",
    "profissional": "Profissional",
    "descolado": "Descolado",
    "inspirador": "Inspirador",
}

_DONE_FALLBACK = (
    "Perfeito! Consegui montar o perfil completo da sua marca. "
    "Confira em Empresa ou continue ajustando por aqui."
)


class CmoBriefingState(TypedDict, total=False):
    conversation_messages: list[dict]
    user_id: str | None
    history_str: str
    tone: str
    user_prompt: str
    raw_reply: str
    reply_text: str
    brand_profile: dict | None


class CmoChatError(Exception):
    """Erro recuperável no chat do CMO (config ou LLM)."""


def _format_history(conversation_messages: list[dict]) -> str:
    history_lines: list[str] = []
    for msg in conversation_messages[-20:]:
        role = "Usuário" if msg.get("role") == "user" else "CMO"
        content = (msg.get("content") or "").strip()
        if content:
            history_lines.append(f"{role}: {content}")
    return "\n".join(history_lines) or "Nenhuma ainda"


def _infer_tone(conversation_messages: list[dict]) -> str:
    for msg in reversed(conversation_messages):
        if msg.get("role") != "user":
            continue
        lower = (msg.get("content") or "").lower()
        if "tom" in lower or "voz" in lower:
            return "Profissional"
    return "Profissional e acolhedor"


def _extract_brand_profile(text: str) -> dict | None:
    start = text.find("{")
    end = text.rfind("}") + 1
    if start == -1 or end == 0:
        return None
    try:
        data = json.loads(text[start:end])
        if data.get("DONE") and data.get("brand_profile"):
            profile = dict(data["brand_profile"])
            tone_raw = (profile.get("tone") or "").strip()
            if tone_raw:
                normalized = _TONE_ALIASES.get(tone_raw.lower())
                if normalized:
                    profile["tone"] = normalized
                elif tone_raw not in _TONE_ALIASES.values():
                    profile["tone"] = "Profissional"
            return profile
    except (json.JSONDecodeError, KeyError, TypeError):
        pass
    return None


def _prepare_prompt(state: CmoBriefingState) -> dict:
    messages = list(state.get("conversation_messages") or [])
    tone = _infer_tone(messages)
    history_str = _format_history(messages)
    user_prompt = CMO_SYSTEM_PROMPT.format(collected=history_str, tone=tone)
    return {
        "history_str": history_str,
        "tone": tone,
        "user_prompt": user_prompt,
    }


def _call_llm(state: CmoBriefingState) -> dict:
    if not settings.openai_api_key:
        raise CmoChatError("Serviço de IA indisponível: configure OPENAI_API_KEY.")

    raw_reply = chat_completion_sync(
        "Você é um CMO brasileiro. Responda em português do Brasil.",
        state["user_prompt"],
        metadata={
            "feature": "cmo_chat",
            "user_id": state.get("user_id"),
        },
    )
    return {"raw_reply": raw_reply}


def _finalize_reply(state: CmoBriefingState) -> dict:
    text = (state.get("raw_reply") or "").strip()
    brand_profile = _extract_brand_profile(text)
    if brand_profile:
        payload = json.dumps({"DONE": True, "brand_profile": brand_profile}, ensure_ascii=False)
        text = text.replace(payload, "").strip()
        if not text:
            text = _DONE_FALLBACK
    if not text:
        raise CmoChatError("A IA retornou uma resposta vazia. Tente novamente.")
    return {"reply_text": text, "brand_profile": brand_profile}


def _build_cmo_graph():
    graph = StateGraph(CmoBriefingState)
    graph.add_node("prepare_prompt", _prepare_prompt)
    graph.add_node("call_llm", _call_llm)
    graph.add_node("finalize_reply", _finalize_reply)
    graph.add_edge(START, "prepare_prompt")
    graph.add_edge("prepare_prompt", "call_llm")
    graph.add_edge("call_llm", "finalize_reply")
    graph.add_edge("finalize_reply", END)
    return graph.compile()


_cmo_app: Any | None = None


def _get_cmo_app():
    global _cmo_app
    if _cmo_app is None:
        _cmo_app = _build_cmo_graph()
    return _cmo_app


def run_cmo_briefing_turn(
    conversation_messages: list[dict],
    *,
    user_id: str | None = None,
) -> tuple[str, dict | None]:
    """Run one CMO briefing turn through LangGraph."""
    try:
        from langsmith import traceable

        @traceable(name="cmo_briefing_turn", run_type="chain", metadata={"feature": "cmo_chat"})
        def _invoke(messages: list[dict], uid: str | None) -> dict:
            app = _get_cmo_app()
            return app.invoke(
                {
                    "conversation_messages": messages,
                    "user_id": uid,
                }
            )

        result = _invoke(conversation_messages, user_id)
    except ImportError:
        app = _get_cmo_app()
        result = app.invoke(
            {
                "conversation_messages": conversation_messages,
                "user_id": user_id,
            }
        )
    except CmoChatError:
        raise
    except ValueError as exc:
        raise CmoChatError(str(exc)) from exc
    except Exception as exc:
        raise CmoChatError("Não foi possível obter resposta do CMO IA.") from exc

    reply = (result.get("reply_text") or "").strip()
    if not reply:
        raise CmoChatError("A IA retornou uma resposta vazia. Tente novamente.")
    return reply, result.get("brand_profile")
