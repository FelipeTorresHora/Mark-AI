"""CMO IA briefing — delegates to LangGraph + OpenAI stack."""
from src.services.cmo_briefing_graph import CmoChatError, run_cmo_briefing_turn

__all__ = ["CmoChatError", "chat_cmo_reply"]


def chat_cmo_reply(
    user_message: str,
    conversation_messages: list[dict],
    *,
    user_id: str | None = None,
) -> tuple[str, dict | None]:
    """
    Gera resposta do CMO IA.
    Retorna (texto_da_resposta, brand_profile_ou_None).

    `conversation_messages` must already include the latest user message.
    `user_message` is kept for backwards compatibility with callers/tests.
    """
    _ = user_message
    return run_cmo_briefing_turn(conversation_messages, user_id=user_id)
