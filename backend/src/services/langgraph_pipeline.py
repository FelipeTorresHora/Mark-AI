"""LangGraph orchestration for campaign generation with human-in-the-loop."""
from __future__ import annotations

import asyncio
import contextlib
import os
import uuid
from typing import Any, Callable, TypedDict

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt

from src.config import settings
from src.services.content_generation import brand_guard, generate_post
from src.services.prompt_safety import sanitize_redo_feedback

EventEmitter = Callable[[str, str | None, dict[str, Any]], None]

_checkpointer: Any | None = None
_async_pool: Any | None = None
_checkpointer_loop: Any | None = None


class GenerationState(TypedDict, total=False):
    objective: str
    audience: str | None
    brand_context: dict
    platforms: list[str]
    platform_contents: dict[str, list[str]]
    platform_post_ids: dict[str, list[str]]
    attempt: int
    redo_platform: str | None
    redo_feedback: str | None
    human_action: str | None
    user_id: str | None
    campaign_id: str | None
    errors: list[str]


def normalize_post_ids(raw: dict | None) -> dict[str, list[str]]:
    result: dict[str, list[str]] = {}
    for platform, value in (raw or {}).items():
        if isinstance(value, list):
            result[str(platform)] = [str(item) for item in value]
        elif value:
            result[str(platform)] = [str(value)]
    return result


def normalize_platform_contents(raw: dict | None) -> dict[str, list[str]]:
    result: dict[str, list[str]] = {}
    for platform, value in (raw or {}).items():
        if isinstance(value, list):
            texts = [str(item) for item in value if item]
        elif value:
            texts = [str(value)]
        else:
            texts = []
        if texts:
            result[str(platform)] = texts
    return result


def _checkpoint_conninfo() -> str:
    url = settings.database_url
    for prefix in ("postgresql+psycopg2://", "postgresql+psycopg://", "postgres://"):
        if url.startswith(prefix):
            url = "postgresql://" + url[len(prefix) :]
            break
    return url


async def _aget_checkpointer():
    """Return a checkpointer compatible with ``ainvoke`` / ``aget_state``.

    Sync ``PostgresSaver`` only implements ``get_tuple``; LangGraph's async
    loop calls ``aget_tuple`` and the base class raises a blank
    ``NotImplementedError``, which failed campaign generation in production.
    """
    global _checkpointer, _async_pool, _checkpointer_loop

    loop = asyncio.get_running_loop()
    if _checkpointer is not None:
        if isinstance(_checkpointer, MemorySaver) or _checkpointer_loop is loop:
            return _checkpointer
        _checkpointer = None
        if _async_pool is not None:
            with contextlib.suppress(Exception):
                await _async_pool.close()
            _async_pool = None
            _checkpointer_loop = None

    if os.environ.get("PYTEST_CURRENT_TEST"):
        _checkpointer = MemorySaver()
        _checkpointer_loop = loop
        return _checkpointer

    try:
        from psycopg.rows import dict_row
        from psycopg_pool import AsyncConnectionPool
        from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

        _async_pool = AsyncConnectionPool(
            conninfo=_checkpoint_conninfo(),
            min_size=1,
            max_size=5,
            timeout=15,
            kwargs={
                "autocommit": True,
                "prepare_threshold": 0,
                "row_factory": dict_row,
            },
            open=False,
        )
        await _async_pool.open()
        saver = AsyncPostgresSaver(_async_pool)
        await saver.setup()
        _checkpointer = saver
        _checkpointer_loop = loop
        return _checkpointer
    except Exception as exc:
        raise RuntimeError(
            "Checkpointer Postgres async do LangGraph indisponível. "
            "ainvoke exige AsyncPostgresSaver; o saver síncrono quebra a geração."
        ) from exc


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


async def _generate_one_variant(
    platform: str,
    post_id: str,
    variant_index: int,
    platform_total: int,
    state: GenerationState,
    emitter: EventEmitter | None,
) -> tuple[str, int, str]:
    if emitter:
        emitter(
            "writer_start",
            platform,
            {
                "post_id": post_id,
                "variant_index": variant_index,
                "platform_total": platform_total,
            },
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
                attempt=(state.get("attempt") or 1) + variant_index - 1,
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
                    "variant_index": variant_index,
                    "platform_total": platform_total,
                },
            )
        return platform, variant_index, guarded
    except asyncio.TimeoutError:
        message = (
            f"Tempo esgotado ({settings.generation_timeout_seconds}s) "
            f"ao gerar para {platform} (variante {variant_index})."
        )
        if emitter:
            emitter(
                "error",
                platform,
                {
                    "post_id": post_id,
                    "message": message,
                    "variant_index": variant_index,
                    "platform_total": platform_total,
                },
            )
        return platform, variant_index, ""
    except Exception as exc:
        if emitter:
            emitter(
                "error",
                platform,
                {
                    "post_id": post_id,
                    "message": str(exc),
                    "variant_index": variant_index,
                    "platform_total": platform_total,
                },
            )
        return platform, variant_index, ""


async def _build_graph(emitter: EventEmitter | None = None):
    graph = StateGraph(GenerationState)

    async def generate_per_platform(state: GenerationState) -> dict:
        platforms = list(state.get("platforms") or [])
        if state.get("redo_platform"):
            platforms = [state["redo_platform"]]

        post_ids = normalize_post_ids(state.get("platform_post_ids"))
        contents = normalize_platform_contents(state.get("platform_contents"))
        errors = list(state.get("errors") or [])

        jobs: list[tuple[str, str, int, int]] = []
        for platform in platforms:
            ids = post_ids.get(platform) or [""]
            total = max(len(ids), 1)
            for index, post_id in enumerate(ids, start=1):
                jobs.append((platform, post_id, index, total))

        results = await asyncio.gather(
            *[
                _generate_one_variant(platform, post_id, index, total, state, emitter)
                for platform, post_id, index, total in jobs
            ]
        )

        by_platform: dict[str, list[tuple[int, str]]] = {}
        for platform, index, text in results:
            by_platform.setdefault(platform, []).append((index, text))

        for platform, variants in by_platform.items():
            variants.sort(key=lambda item: item[0])
            texts = [text for _, text in variants if text]
            if texts:
                contents[platform] = texts
            else:
                errors.append(f"Falha ao gerar para {platform}")
                contents.pop(platform, None)

        return {
            "platform_contents": contents,
            "errors": errors,
            "redo_platform": None,
            "redo_feedback": None,
            "attempt": (state.get("attempt") or 1) + (1 if state.get("redo_platform") else 0),
        }

    def brand_guard_node(state: GenerationState) -> dict:
        contents: dict[str, list[str]] = {}
        for platform, texts in normalize_platform_contents(state.get("platform_contents")).items():
            guarded_list = []
            for text in texts:
                guarded, _ = brand_guard(platform, text, state.get("audience"))
                guarded_list.append(guarded)
            contents[platform] = guarded_list
        return {"platform_contents": contents}

    def wait_human(state: GenerationState) -> dict:
        payload = interrupt(
            {
                "platform_contents": state.get("platform_contents") or {},
                "campaign_id": state.get("campaign_id"),
            }
        )
        action = payload.get("action") if isinstance(payload, dict) else "approve"
        raw_feedback = payload.get("feedback") if isinstance(payload, dict) else None
        return {
            "human_action": action,
            "redo_platform": payload.get("platform") if isinstance(payload, dict) else None,
            "redo_feedback": sanitize_redo_feedback(raw_feedback) if raw_feedback else None,
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

    return graph.compile(checkpointer=await _aget_checkpointer(), interrupt_before=[])


async def run_until_review(
    *,
    thread_id: str,
    objective: str,
    brand_context: dict,
    platforms: list[str],
    platform_post_ids: dict[str, list[str]] | dict[str, str],
    audience: str | None,
    user_id: str | None,
    campaign_id: str | None,
    emitter: EventEmitter | None = None,
) -> GenerationState:
    app = await _build_graph(emitter)
    config = {"configurable": {"thread_id": thread_id}}
    initial: GenerationState = {
        "objective": objective,
        "brand_context": brand_context,
        "platforms": platforms,
        "platform_post_ids": normalize_post_ids(platform_post_ids),
        "audience": audience,
        "user_id": user_id,
        "campaign_id": campaign_id,
        "platform_contents": {},
        "attempt": 1,
        "errors": [],
    }
    result = await app.ainvoke(initial, config)
    return result


async def resume_after_human(
    thread_id: str,
    action: str,
    *,
    platform: str | None = None,
    feedback: str | None = None,
    emitter: EventEmitter | None = None,
) -> GenerationState:
    app = await _build_graph(emitter)
    config = {"configurable": {"thread_id": thread_id}}
    payload = {
        "action": action,
        "platform": platform,
        "feedback": sanitize_redo_feedback(feedback) if feedback else None,
    }
    result = await app.ainvoke(Command(resume=payload), config)
    return result


def new_thread_id() -> str:
    return uuid.uuid4().hex


def _graph_config(thread_id: str) -> dict:
    return {"configurable": {"thread_id": thread_id}}


async def get_review_interrupt_contents(thread_id: str) -> dict[str, list[str]] | None:
    """Return platform contents when the graph is paused at human review, else None."""
    app = await _build_graph(None)
    snap = await app.aget_state(_graph_config(thread_id))
    if not snap.interrupts:
        return None
    contents = normalize_platform_contents((snap.values or {}).get("platform_contents"))
    return contents or None


async def graph_checkpoint_exists(thread_id: str) -> bool:
    app = await _build_graph(None)
    snap = await app.aget_state(_graph_config(thread_id))
    return bool(snap.values or snap.next or snap.interrupts)
