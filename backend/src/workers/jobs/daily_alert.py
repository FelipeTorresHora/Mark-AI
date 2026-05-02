"""
Job: Alerta Diário (Morning Routine)

Roda a cada hora (UTC). Para cada usuário ativo:
  1. Verifica se a hora local do usuário está na janela de alerta matinal
     (settings.morning_alert_hour até +1h).
  2. Garante idempotência via INSERT em email_notification_logs.
  3. Busca posts agendados para hoje (no timezone do usuário).
  4. Se não há posts → omite o e-mail silenciosamente.
  5. Se há posts → renderiza o template e envia via Resend.
  6. Se o envio falhar → deleta o log para permitir retry na próxima janela.

Invariante de idempotência:
  - O log é inserido ANTES do envio.
  - Se o worker reiniciar após o INSERT mas antes do envio, o log
    impede re-envio (at-most-once semantics).
  - Se o envio falhar, o log é deletado e o retry ocorre na próxima janela.
"""
import logging
from datetime import datetime, timedelta

import pytz
from sqlalchemy.exc import IntegrityError

from src.config import settings
from src.database import SessionLocal
from src.models.campaign import Campaign
from src.models.notification_log import NotificationLog
from src.models.post import Post
from src.models.user import User
from src.services import resend_service
from src.services.email_templates import render

logger = logging.getLogger(__name__)

_NOTIFICATION_TYPE = "daily_alert"


def _build_posts_rows(posts: list[Post]) -> str:
    """Gera as linhas <tr> da tabela de posts para o template."""
    rows = []
    for post in posts:
        platform = post.platform or ""
        badge_class = "badge-x" if platform == "X" else "badge-linkedin"
        scheduled_str = (
            post.scheduled_at.strftime("%H:%M") if post.scheduled_at else "—"
        )
        content_preview = (post.content or "")[:80]
        if len(post.content or "") > 80:
            content_preview += "…"
        rows.append(
            f"<tr>"
            f"<td><span class='badge {badge_class}'>{platform}</span></td>"
            f"<td>{scheduled_str}</td>"
            f"<td>{post.status}</td>"
            f"<td>{content_preview}</td>"
            f"</tr>"
        )
    return "\n".join(rows) if rows else "<tr><td colspan='4'>Nenhum post.</td></tr>"


def run() -> None:
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.is_active.is_(True)).all()
        for user in users:
            _process_user(db, user)
    except Exception:
        logger.exception("daily_alert: erro inesperado ao iterar usuários")
    finally:
        db.close()


def _process_user(db, user: User) -> None:
    tz_name = user.timezone or settings.default_user_timezone
    try:
        tz = pytz.timezone(tz_name)
    except pytz.UnknownTimeZoneError:
        logger.warning("daily_alert: timezone inválido %r para user %s", tz_name, user.id)
        tz = pytz.timezone(settings.default_user_timezone)

    now_local = datetime.now(tz)
    local_hour = now_local.hour

    # Só processa se estiver na janela matinal configurada
    if local_hour != settings.morning_alert_hour:
        return

    today_local = now_local.date()

    # --- Idempotência: tenta reservar o slot via INSERT ---
    log_entry = NotificationLog(
        user_id=user.id,
        type=_NOTIFICATION_TYPE,
        ref_date=today_local,
    )
    db.add(log_entry)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        # Já enviado hoje para este usuário — pular
        return

    # --- Busca posts agendados para hoje (no timezone do usuário) ---
    start_utc = tz.localize(
        datetime(today_local.year, today_local.month, today_local.day)
    ).astimezone(pytz.UTC).replace(tzinfo=None)
    end_utc = start_utc + timedelta(days=1)

    try:
        posts = (
            db.query(Post)
            .join(Campaign, Post.campaign_id == Campaign.id)
            .filter(
                Campaign.user_id == user.id,
                Post.scheduled_at >= start_utc,
                Post.scheduled_at < end_utc,
                Post.status != "PUBLISHED",
            )
            .order_by(Post.scheduled_at)
            .all()
        )
    except Exception:
        logger.exception("daily_alert: falha ao buscar posts para user %s", user.id)
        db.rollback()
        return

    # Comportamento de omissão: sem posts → não envia
    if not posts:
        db.rollback()
        return

    # --- Renderiza e envia ---
    try:
        html = render(
            "daily_alert.html",
            user_email=user.email,
            date=today_local.strftime("%d/%m/%Y"),
            posts_rows=_build_posts_rows(posts),
        )
        resend_service.send_email(
            to=user.email,
            subject=f"Seus posts de hoje — {today_local.strftime('%d/%m/%Y')}",
            html=html,
        )
        db.commit()
        logger.info("daily_alert: enviado para %s (%d posts)", user.email, len(posts))
    except Exception:
        logger.exception("daily_alert: falha no envio para %s — removendo log", user.email)
        db.rollback()
        # Remove o log para permitir retry na próxima janela
        try:
            db.query(NotificationLog).filter(
                NotificationLog.user_id == user.id,
                NotificationLog.type == _NOTIFICATION_TYPE,
                NotificationLog.ref_date == today_local,
            ).delete()
            db.commit()
        except Exception:
            logger.exception("daily_alert: falha ao remover log para user %s", user.id)
            db.rollback()
