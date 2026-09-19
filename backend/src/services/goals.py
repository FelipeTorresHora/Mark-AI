from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Literal

from sqlalchemy import func
from sqlalchemy.orm import Session

from src.models.campaign import Campaign
from src.models.post import Post
from src.models.social_account import SocialAccount
from src.models.user import User
from src.models.user_goal import UserGoal
from src.models.x_account import XAccount

AudienceType = Literal["mei_loja_liberal", "founder", "faceless"]

ALL_GOAL_KEYS: tuple[str, ...] = (
    "connect_account",
    "define_objective",
    "approve_first_post",
    "publish_3_in_7_days",
    "two_channels",
    "consistent_week",
)

FEATURED_BY_AUDIENCE: dict[AudienceType, tuple[str, ...]] = {
    "mei_loja_liberal": ("connect_account", "approve_first_post", "publish_3_in_7_days"),
    "founder": ("connect_account", "approve_first_post", "two_channels"),
    "faceless": ("connect_account", "approve_first_post", "consistent_week"),
}

GOAL_COPY: dict[AudienceType, dict[str, dict[str, str]]] = {
    "mei_loja_liberal": {
        "connect_account": {
            "title": "Conectar sua primeira conta",
            "description": "Vincule X ou LinkedIn para publicar sem sair do Mark.",
        },
        "define_objective": {
            "title": "Definir seu objetivo",
            "description": "Comece uma campanha com a pauta que você quer alcançar na região.",
        },
        "approve_first_post": {
            "title": "Aprovar o primeiro post",
            "description": "Revise e aprove um conteúdo antes de ir ao ar.",
        },
        "publish_3_in_7_days": {
            "title": "3 posts na semana",
            "description": "Publique três vezes em sete dias e ganhe ritmo com seus clientes locais.",
        },
        "two_channels": {
            "title": "Estar em 2 canais",
            "description": "Conecte mais de uma rede para ampliar alcance.",
        },
        "consistent_week": {
            "title": "Semana consistente",
            "description": "Mantenha presença em pelo menos cinco dias da semana.",
        },
    },
    "founder": {
        "connect_account": {
            "title": "Conectar sua primeira conta",
            "description": "Conecte X ou LinkedIn para distribuir narrativa de produto.",
        },
        "define_objective": {
            "title": "Definir seu objetivo",
            "description": "Lance uma campanha alinhada à tração que você busca.",
        },
        "approve_first_post": {
            "title": "Aprovar o primeiro post",
            "description": "Valide o tom de autoridade antes de publicar.",
        },
        "publish_3_in_7_days": {
            "title": "3 posts em 7 dias",
            "description": "Cadência curta para manter momentum com investidores e usuários.",
        },
        "two_channels": {
            "title": "Presença em 2 canais",
            "description": "Esteja ativo em pelo menos duas redes conectadas.",
        },
        "consistent_week": {
            "title": "Semana consistente",
            "description": "Publique em cinco dias diferentes nesta semana.",
        },
    },
    "faceless": {
        "connect_account": {
            "title": "Conectar sua primeira conta",
            "description": "Conecte uma rede para publicar sem mostrar o rosto.",
        },
        "define_objective": {
            "title": "Definir seu objetivo",
            "description": "Descreva o que a marca deve comunicar, não quem aparece na foto.",
        },
        "approve_first_post": {
            "title": "Primeiro post faceless",
            "description": "Aprove um conteúdo focado em valor, sem identidade pessoal.",
        },
        "publish_3_in_7_days": {
            "title": "3 posts em 7 dias",
            "description": "Três publicações na semana para construir hábito anônimo.",
        },
        "two_channels": {
            "title": "Estar em 2 canais",
            "description": "Distribua a mesma mensagem em mais de uma plataforma.",
        },
        "consistent_week": {
            "title": "7 dias de consistência",
            "description": "Publique em sete dias diferentes para consolidar o hábito.",
        },
    },
}

APPROVED_STATUSES = frozenset({"APPROVED", "FINAL", "PUBLISHED"})


@dataclass
class GoalMetrics:
    connected_accounts: int
    campaign_count: int
    approved_posts: int
    published_last_7_days: int
    connected_platforms: int
    publish_days_last_7: int


def normalize_audience(raw: str | None) -> AudienceType:
    if raw == "mei":
        return "mei_loja_liberal"
    if raw in FEATURED_BY_AUDIENCE:
        return raw  # type: ignore[return-value]
    return "mei_loja_liberal"


def ensure_user_goals(db: Session, user_id) -> list[UserGoal]:
    existing = db.query(UserGoal).filter(UserGoal.user_id == user_id).all()
    existing_keys = {row.goal_key for row in existing}
    missing = [key for key in ALL_GOAL_KEYS if key not in existing_keys]
    if not missing:
        return existing

    for key in missing:
        db.add(UserGoal(user_id=user_id, goal_key=key))
    db.commit()
    return db.query(UserGoal).filter(UserGoal.user_id == user_id).all()


def _count_connected_accounts(db: Session, user_id) -> int:
    social_count = db.query(func.count(SocialAccount.id)).filter(SocialAccount.user_id == user_id).scalar() or 0
    x_connected = (
        db.query(func.count(XAccount.id))
        .filter(XAccount.user_id == user_id, XAccount.revoked_at.is_(None))
        .scalar()
        or 0
    )
    return int(social_count) + int(x_connected)


def _count_connected_platforms(db: Session, user_id) -> int:
    platforms = {
        row[0]
        for row in db.query(SocialAccount.platform).filter(SocialAccount.user_id == user_id).distinct().all()
    }
    has_x = (
        db.query(XAccount.id)
        .filter(XAccount.user_id == user_id, XAccount.revoked_at.is_(None))
        .first()
        is not None
    )
    if has_x:
        platforms.add("X")
    return len(platforms)


def collect_goal_metrics(db: Session, user_id) -> GoalMetrics:
    now = datetime.now(UTC).replace(tzinfo=None)
    week_ago = now - timedelta(days=7)

    campaign_count = (
        db.query(func.count(Campaign.id)).filter(Campaign.user_id == user_id).scalar() or 0
    )

    approved_posts = (
        db.query(func.count(Post.id))
        .filter(Post.user_id == user_id, Post.status.in_(APPROVED_STATUSES))
        .scalar()
        or 0
    )

    published_last_7_days = (
        db.query(func.count(Post.id))
        .filter(
            Post.user_id == user_id,
            Post.status == "PUBLISHED",
            Post.published_at.isnot(None),
            Post.published_at >= week_ago,
        )
        .scalar()
        or 0
    )

    publish_days_last_7 = (
        db.query(func.count(func.distinct(func.date(Post.published_at))))
        .filter(
            Post.user_id == user_id,
            Post.status == "PUBLISHED",
            Post.published_at.isnot(None),
            Post.published_at >= week_ago,
        )
        .scalar()
        or 0
    )

    return GoalMetrics(
        connected_accounts=_count_connected_accounts(db, user_id),
        campaign_count=int(campaign_count),
        approved_posts=int(approved_posts),
        published_last_7_days=int(published_last_7_days),
        connected_platforms=_count_connected_platforms(db, user_id),
        publish_days_last_7=int(publish_days_last_7),
    )


def _goal_progress(goal_key: str, metrics: GoalMetrics, audience: AudienceType) -> tuple[int, int, bool]:
    if goal_key == "connect_account":
        current, target = metrics.connected_accounts, 1
    elif goal_key == "define_objective":
        current, target = metrics.campaign_count, 1
    elif goal_key == "approve_first_post":
        current, target = min(metrics.approved_posts, 1), 1
    elif goal_key == "publish_3_in_7_days":
        current, target = metrics.published_last_7_days, 3
    elif goal_key == "two_channels":
        current, target = metrics.connected_platforms, 2
    elif goal_key == "consistent_week":
        target = 7 if audience == "faceless" else 5
        current = min(metrics.publish_days_last_7, target)
    else:
        current, target = 0, 1

    completed = current >= target
    return current, target, completed


def sync_goal_completions(db: Session, user: User) -> list[UserGoal]:
    audience = normalize_audience(user.audience)
    metrics = collect_goal_metrics(db, user.id)
    rows = ensure_user_goals(db, user.id)
    now = datetime.now(UTC).replace(tzinfo=None)

    for row in rows:
        _, _, completed = _goal_progress(row.goal_key, metrics, audience)
        if completed and row.completed_at is None:
            row.completed_at = now
        elif not completed and row.completed_at is not None:
            row.completed_at = None

    db.commit()
    for row in rows:
        db.refresh(row)
    return rows


def build_goals_payload(db: Session, user: User) -> dict:
    audience = normalize_audience(user.audience)
    metrics = collect_goal_metrics(db, user.id)
    rows = sync_goal_completions(db, user)
    copy = GOAL_COPY[audience]
    featured = set(FEATURED_BY_AUDIENCE[audience])

    goals = []
    completed_count = 0
    for row in sorted(rows, key=lambda r: ALL_GOAL_KEYS.index(r.goal_key)):
        current, target, completed = _goal_progress(row.goal_key, metrics, audience)
        if completed:
            completed_count += 1
        progress_pct = 100 if completed else int(min(100, round((current / target) * 100))) if target else 0
        meta = copy[row.goal_key]
        goals.append(
            {
                "key": row.goal_key,
                "title": meta["title"],
                "description": meta["description"],
                "featured": row.goal_key in featured,
                "completed": completed,
                "completed_at": row.completed_at,
                "current": current,
                "target": target,
                "progress_percent": progress_pct,
            }
        )

    return {
        "audience": audience,
        "goals": goals,
        "completed_count": completed_count,
        "total_count": len(goals),
    }
