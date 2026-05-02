"""
Scheduler central — APScheduler BackgroundScheduler.

Inicia e para junto com o ciclo de vida do FastAPI (lifespan).
Os jobs rodam a cada hora (UTC); cada job filtra os usuários
pelo seu timezone internamente.
"""
from apscheduler.schedulers.background import BackgroundScheduler

scheduler = BackgroundScheduler(timezone="UTC")


def start() -> None:
    from src.workers.jobs import daily_alert, weekly_digest

    # Roda no início de cada hora (00 min, UTC) — diariamente
    scheduler.add_job(
        daily_alert.run,
        "cron",
        minute=0,
        id="daily_alert",
        replace_existing=True,
        max_instances=1,
    )

    # Roda nas sextas às 30 min (UTC) — cada job valida se é 14h local do usuário
    scheduler.add_job(
        weekly_digest.run,
        "cron",
        day_of_week="fri",
        minute=30,
        id="weekly_digest",
        replace_existing=True,
        max_instances=1,
    )

    scheduler.start()


def stop() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
