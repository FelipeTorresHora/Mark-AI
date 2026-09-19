"""OpenAI chat completions with LangSmith tracing."""
import asyncio
import os
from typing import Any

from openai import OpenAI

from src.config import settings

_client: OpenAI | None = None


def _ensure_tracing_env() -> None:
    if settings.langsmith_tracing:
        os.environ["LANGSMITH_TRACING"] = "true"
        if settings.langsmith_api_key:
            os.environ["LANGSMITH_API_KEY"] = settings.langsmith_api_key
        if settings.langsmith_project:
            os.environ["LANGSMITH_PROJECT"] = settings.langsmith_project


def get_openai_client() -> OpenAI:
    global _client
    _ensure_tracing_env()
    if _client is None:
        base = OpenAI(api_key=settings.openai_api_key or None)
        if settings.langsmith_tracing and settings.langsmith_api_key:
            try:
                from langsmith import wrappers

                _client = wrappers.wrap_openai(base)
            except Exception:
                _client = base
        else:
            _client = base
    return _client


def chat_completion_sync(
    system_prompt: str,
    user_prompt: str,
    *,
    metadata: dict[str, Any] | None = None,
    temperature: float = 0.7,
) -> str:
    client = get_openai_client()
    response = client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=temperature,
    )
    choice = response.choices[0].message.content
    if not choice or not choice.strip():
        raise ValueError("OpenAI retornou resposta vazia")
    return choice.strip()


async def chat_completion(
    system_prompt: str,
    user_prompt: str,
    *,
    metadata: dict[str, Any] | None = None,
    temperature: float = 0.7,
) -> str:
    return await asyncio.wait_for(
        asyncio.to_thread(
            chat_completion_sync,
            system_prompt,
            user_prompt,
            metadata=metadata,
            temperature=temperature,
        ),
        timeout=settings.generation_timeout_seconds,
    )
