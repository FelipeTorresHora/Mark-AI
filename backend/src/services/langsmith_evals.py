"""LangSmith datasets and evaluators scaffolding for Mark generation quality."""
from __future__ import annotations

from typing import Any

from src.config import settings

EVAL_DATASET_NAME = "mark-generation-v1"


def _client():
    from langsmith import Client

    return Client(api_key=settings.langsmith_api_key or None)


def ensure_eval_dataset() -> str | None:
    if not settings.langsmith_api_key:
        return None
    client = _client()
    try:
        client.read_dataset(dataset_name=EVAL_DATASET_NAME)
    except Exception:
        client.create_dataset(
            dataset_name=EVAL_DATASET_NAME,
            description="Evals de geração Mark: comprimento, tom, faceless, objetivo",
        )
    return EVAL_DATASET_NAME


def evaluators() -> list[Any]:
    """Evaluators registráveis no LangSmith (comprimento, tom, faceless, objetivo)."""

    def length_by_platform(run: dict, example: dict) -> dict:
        platform = (example.get("inputs") or {}).get("platform", "X")
        output = (run.get("outputs") or {}).get("content", "") or ""
        limits = {"X": 280, "LINKEDIN": 3000, "INSTAGRAM": 2200}
        max_len = limits.get(platform, 2000)
        score = 1.0 if len(output) <= max_len else 0.0
        return {"key": "length_ok", "score": score}

    def faceless_constraint(run: dict, example: dict) -> dict:
        audience = (example.get("inputs") or {}).get("audience", "")
        output = ((run.get("outputs") or {}).get("content", "") or "").lower()
        if audience != "faceless":
            return {"key": "faceless_ok", "score": 1.0}
        bad = any(t in output for t in ("selfie", "meu rosto", "aparecer na camera"))
        return {"key": "faceless_ok", "score": 0.0 if bad else 1.0}

    def objective_mention(run: dict, example: dict) -> dict:
        objective = ((example.get("inputs") or {}).get("objective", "") or "").lower()
        output = ((run.get("outputs") or {}).get("content", "") or "").lower()
        if not objective or len(objective) < 4:
            return {"key": "objective_ok", "score": 1.0}
        token = objective.split()[0]
        return {"key": "objective_ok", "score": 1.0 if token in output else 0.5}

    return [length_by_platform, faceless_constraint, objective_mention]


def record_human_feedback(run_id: str | None, approved: bool, feedback: str | None = None) -> None:
    if not run_id or not settings.langsmith_api_key:
        return
    client = _client()
    try:
        client.create_feedback(
            run_id,
            key="human_review",
            score=1.0 if approved else 0.0,
            comment=feedback or "",
        )
    except Exception:
        pass
