"""LangGraph orchestration for campaign generation with human-in-the-loop."""
from __future__ import annotations

import asyncio
import os
import uuid
from typing import Any, Callable, TypedDict

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt

from src.config import settings
from src.services.content_generation import brand_guard, generate_post

EventEmitter = Callable[[str, str | None, dict[str, Any]], None]

_checkpointer: Any | None = None
_checkpointer_cm: Any | None = None


class GenerationState(TypedDict, total=False):
    objective: str
    audience: str | None
    brand_context: dict
    platforms: list[str]
    platform_contents: dict[str, str]
    platform_post_ids: dict[str, str]
    attempt: int
    redo_platform: str | None
    redo_feedback: str | None
    human_action: str | None
    user_id: str | None
    campaign_id: str | None
    errors: list[str]


def _get_checkpointer():
    global _checkpointer, _checkpointer_cm
    if _checkpointer is not None:
        return _checkpointer
    if os.environ.get("PYTEST_CURRENT_TEST"):
        _checkpointer = MemorySaver()
        return _checkpointer
    try:
        from langgraph.checkpoint.postgres import PostgresSaver

        conn = settings.database_url.replace("postgresql+psycopg2://", "postgresql://")
        _checkpointer_cm = PostgresSaver.from_conn_string(conn)
        _checkpointer = _checkpointer_cm.__enter__()
        _checkpointer.setup()
        return _checkpointer
    except Exception:
        _checkpointer = MemorySaver()
        return _checkpointer


def _ingest_objective(state: GenerationState) -> dict:
    return {}


def _brand_context_node(state: GenerationState) -> dict:
    ctx = dict(state.get("brand_context") or {})
    audience = (state.get("audience") or "").lower()
    if audience == "faceless":
        ctx.setdefault("tone", ctx.get("tone") or "Institucional e discreto")
    elif audience == "founder":
        ctx.setdefault("tone", ctx.get("tone") or "Autoridade e tração")
    elif audience == "mei":
        ctx.setdefault("tone", ctx.get("tone") or "Local e acolhedor")
    return {"brand_context": ctx}


async def _generate_one_platform(
    platform: str,
    state: GenerationState,
    emitter: EventEmitter | None,
) -> tuple[str, str | None]:
    post_id = (state.get("platform_post_ids") or {}).get(platform, "")
    if emitter:
        emitter(
            "writer_start",
            platform,
            {"post_id": post_id, "variant_index": 1, "platform_total": 1},
        )
    try:
        content = await asyncio.wait_for(
            generate_post(
                platform,
                state["objective"],
                state["brand_context"],
                audience=state.get("audience"),
                user_id=state.get("user_id"),
                campaign_id=state.get("campaign_id"),
                attempt=state.get("attempt") or 1,
                redo_feedback=state.get("redo_feedback")
                if state.get("redo_platform") == platform
                else None,
            ),
            timeout=settings.generation_timeout_seconds,
        )
        guarded, _ = brand_guard(platform, content, state.get("audience"))
        if emitter:
            emitter(
                "writer_done",
                platform,
                {
                    "post_id": post_id,
                    "content": guarded,
                    "variant_index": 1,
                    "platform_total": 1,
                },
            )
        return platform, guarded
    except asyncio.TimeoutError:
        message = f"Tempo esgotado ({settings.generation_timeout_seconds}s) ao gerar para {platform}."
        if emitter:
            emitter(
                "error",
                platform,
                {
                    "post_id": post_id,
                    "message": message,
                    "variant_index": 1,
                    "platform_total": 1,
                },
            )
        return platform, ""
    except Exception as exc:
        if emitter:
            emitter(
                "error",
                platform,
                {
                    "post_id": post_id,
                    "message": str(exc),
                    "variant_index": 1,
                    "platform_total": 1,
                },
            )
        return platform, ""


def _build_graph(emitter: EventEmitter | None = None):
    graph = StateGraph(GenerationState)

    def generate_per_platform(state: GenerationState) -> dict:
        platforms = list(state.get("platforms") or [])
        if state.get("redo_platform"):
            platforms = [state["redo_platform"]]

        async def _run_platforms() -> dict:
            contents = dict(state.get("platform_contents") or {})
            errors = list(state.get("errors") or [])

            for platform in platforms:
                plat, text = await _generate_one_platform(platform, state, emitter)
                if text:
                    contents[plat] = text
                else:
                    errors.append(f"Falha ao gerar para {plat}")

            return {
                "platform_contents": contents,
                "errors": errors,
                "redo_platform": None,
                "redo_feedback": None,
                "attempt": (state.get("attempt") or 1) + (1 if state.get("redo_platform") else 0),
            }

        return asyncio.run(_run_platforms())

    def brand_guard_node(state: GenerationState) -> dict:
        contents = {}
        for platform, text in (state.get("platform_contents") or {}).items():
            guarded, _ = brand_guard(platform, text, state.get("audience"))
            contents[platform] = guarded
        return {"platform_contents": contents}

    def wait_human(state: GenerationState) -> dict:
        payload = interrupt(
            {
                "platform_contents": state.get("platform_contents") or {},
                "campaign_id": state.get("campaign_id"),
            }
        )
        action = payload.get("action") if isinstance(payload, dict) else "approve"
        return {
            "human_action": action,
            "redo_platform": payload.get("platform") if isinstance(payload, dict) else None,
            "redo_feedback": payload.get("feedback") if isinstance(payload, dict) else None,
        }

    def route_after_human(state: GenerationState) -> str:
        if state.get("human_action") == "redo" and state.get("redo_feedback"):
            return "redo"
        return "end"

    graph.add_node("ingest_objective", _ingest_objective)
    graph.add_node("brand_context", _brand_context_node)
    graph.add_node("generate_per_platform", generate_per_platform)
    graph.add_node("brand_guard", brand_guard_node)
    graph.add_node("wait_human", wait_human)

    graph.add_edge(START, "ingest_objective")
    graph.add_edge("ingest_objective", "brand_context")
    graph.add_edge("brand_context", "generate_per_platform")
    graph.add_edge("generate_per_platform", "brand_guard")
    graph.add_edge("brand_guard", "wait_human")
    graph.add_conditional_edges(
        "wait_human",
        route_after_human,
        {"redo": "generate_per_platform", "end": END},
    )

    return graph.compile(checkpointer=_get_checkpointer(), interrupt_before=[])


async def run_until_review(
    *,
    thread_id: str,
    objective: str,
    brand_context: dict,
    platforms: list[str],
    platform_post_ids: dict[str, str],
    audience: str | None,
    user_id: str | None,
    campaign_id: str | None,
    emitter: EventEmitter | None = None,
) -> GenerationState:
    app = _build_graph(emitter)
    config = {"configurable": {"thread_id": thread_id}}
    initial: GenerationState = {
        "objective": objective,
        "brand_context": brand_context,
        "platforms": platforms,
        "platform_post_ids": platform_post_ids,
        "audience": audience,
        "user_id": user_id,
        "campaign_id": campaign_id,
        "platform_contents": {},
        "attempt": 1,
        "errors": [],
    }
    result = await asyncio.to_thread(app.invoke, initial, config)
    return result


async def resume_after_human(
    thread_id: str,
    action: str,
    *,
    platform: str | None = None,
    feedback: str | None = None,
    emitter: EventEmitter | None = None,
) -> GenerationState:
    app = _build_graph(emitter)
    config = {"configurable": {"thread_id": thread_id}}
    payload = {"action": action, "platform": platform, "feedback": feedback}
    result = await asyncio.to_thread(app.invoke, Command(resume=payload), config)
    return result


def new_thread_id() -> str:
    return uuid.uuid4().hex


def _graph_config(thread_id: str) -> dict:
    return {"configurable": {"thread_id": thread_id}}


def get_review_interrupt_contents(thread_id: str) -> dict[str, str] | None:
    """Return platform contents when the graph is paused at human review, else None."""
    app = _build_graph(None)
    snap = app.get_state(_graph_config(thread_id))
    if not snap.interrupts:
        return None
    contents = (snap.values or {}).get("platform_contents") or {}
    return dict(contents) if contents else None


def graph_checkpoint_exists(thread_id: str) -> bool:
    app = _build_graph(None)
    snap = app.get_state(_graph_config(thread_id))
    return bool(snap.values or snap.next or snap.interrupts)
