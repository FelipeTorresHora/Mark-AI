"""
Job: Resumo Semanal (Weekly Digest)

Roda toda sexta-feira, 30 min após cada hora UTC.
Para cada usuário ativo:
  1. Verifica se é sexta-feira no timezone local E hora local está entre 14h-15h.
  2. Garante idempotência via INSERT em email_notification_logs.
  3. Agrega métricas da semana (campanhas, posts criados, posts publicados).
     - Se a query falhar → usa nota de fallback, mas prossegue com o envio.
  4. Renderiza o template e envia via Resend.
  5. Se o envio falhar → deleta o log para retry na próxima janela de 14h.
"""
import logging
from datetime import datetime, date, timedelta

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

_NOTIFICATION_TYPE = "weekly_digest"
_DIGEST_HOUR = 14        # hora local do usuário para disparar o digest
_METRICS_FALLBACK = (
    "<div class='notice'>"
    "As métricas detalhadas desta semana estão temporariamente indisponíveis. "
    "Tente acessar o dashboard para ver os dados mais recentes."
    "</div>"
)


def run() -> None:
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.is_active.is_(True)).all()
        for user in users:
            _process_user(db, user)
    except Exception:
        logger.exception("weekly_digest: erro inesperado ao iterar usuários")
    finally:
        db.close()


def _process_user(db, user: User) -> None:
    tz_name = user.timezone or settings.default_user_timezone
    try:
        tz = pytz.timezone(tz_name)
    except pytz.UnknownTimeZoneError:
        logger.warning("weekly_digest: timezone inválido %r para user %s", tz_name, user.id)
        tz = pytz.timezone(settings.default_user_timezone)

    now_local = datetime.now(tz)

    # Sexta-feira = weekday() == 4; janela das 14h às 15h (exclusive)
    if now_local.weekday() != 4 or now_local.hour != _DIGEST_HOUR:
        return

    friday_date: date = now_local.date()

    # --- Idempotência ---
    log_entry = NotificationLog(
        user_id=user.id,
        type=_NOTIFICATION_TYPE,
        ref_date=friday_date,
    )
    db.add(log_entry)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        return

    # --- Extração de métricas (com fallback em caso de falha) ---
    week_start: date = friday_date - timedelta(days=6)
    metrics_note = ""
    campaigns_count = posts_count = published_count = 0

    try:
        week_start_dt = datetime(week_start.year, week_start.month, week_start.day)
        week_end_dt = datetime(friday_date.year, friday_date.month, friday_date.day) + timedelta(days=1)

        campaigns_count = (
            db.query(Campaign)
            .filter(
                Campaign.user_id == user.id,
                Campaign.created_at >= week_start_dt,
                Campaign.created_at < week_end_dt,
            )
            .count()
        )

        all_posts = (
            db.query(Post)
            .join(Campaign, Post.campaign_id == Campaign.id)
            .filter(
                Campaign.user_id == user.id,
                Post.created_at >= week_start_dt,
                Post.created_at < week_end_dt,
            )
            .all()
        )
        posts_count = len(all_posts)
        published_count = sum(1 for p in all_posts if p.status == "PUBLISHED")

    except Exception:
        logger.exception(
            "weekly_digest: falha ao extrair métricas para user %s — usando fallback",
            user.id,
        )
        metrics_note = _METRICS_FALLBACK

    # --- Renderiza e envia ---
    try:
        html = render(
            "weekly_digest.html",
            user_email=user.email,
            week_start=week_start.strftime("%d/%m/%Y"),
            week_end=friday_date.strftime("%d/%m/%Y"),
            campaigns_count=campaigns_count,
            posts_count=posts_count,
            published_count=published_count,
            metrics_note=metrics_note,
        )
        resend_service.send_email(
            to=user.email,
            subject=f"Seu resumo semanal — semana de {week_start.strftime('%d/%m')}",
            html=html,
        )
        db.commit()
        logger.info(
            "weekly_digest: enviado para %s (%d campanhas, %d posts, %d publicados)",
            user.email,
            campaigns_count,
            posts_count,
            published_count,
        )
    except Exception:
        logger.exception("weekly_digest: falha no envio para %s — removendo log", user.email)
        db.rollback()
        try:
            db.query(NotificationLog).filter(
                NotificationLog.user_id == user.id,
                NotificationLog.type == _NOTIFICATION_TYPE,
                NotificationLog.ref_date == friday_date,
            ).delete()
            db.commit()
        except Exception:
            logger.exception("weekly_digest: falha ao remover log para user %s", user.id)
            db.rollback()
