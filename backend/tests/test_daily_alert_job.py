from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock

import pytz

from src.models.notification_log import NotificationLog
from src.models.post import Post
from src.workers.jobs.daily_alert import _build_posts_rows, _process_user


def test_build_posts_rows_instagram_badge():
    post = Post(platform="INSTAGRAM", content="Foto", status="APPROVED", scheduled_at=datetime.now(UTC))
    html = _build_posts_rows([post])
    assert "badge-instagram" in html
    assert "INSTAGRAM" in html


def test_build_posts_rows_truncates_long_content():
    post = Post(platform="X", content="x" * 100, status="DRAFT")
    html = _build_posts_rows([post])
    assert "…" in html


def test_process_user_skips_outside_morning_window(db_session, user_factory, monkeypatch):
    user = user_factory()
    monkeypatch.setattr("src.workers.jobs.daily_alert.settings.morning_alert_hour", 99)

    send = MagicMock()
    monkeypatch.setattr("src.workers.jobs.daily_alert.resend_service.send_email", send)

    _process_user(db_session, user)
    send.assert_not_called()


def test_process_user_sends_when_posts_scheduled_today(
    db_session, user_factory, campaign_factory, post_factory, monkeypatch
):
    user = user_factory()
    tz = pytz.timezone(user.timezone or "America/Sao_Paulo")
    now_local = datetime.now(tz)
    monkeypatch.setattr(
        "src.workers.jobs.daily_alert.settings.morning_alert_hour",
        now_local.hour,
    )

    campaign = campaign_factory(user)
    scheduled = now_local.astimezone(pytz.UTC).replace(tzinfo=None) + timedelta(hours=2)
    post_factory(campaign, platform="X", status="APPROVED", content="Post do dia")
    post = db_session.query(Post).filter(Post.campaign_id == campaign.id).first()
    post.scheduled_at = scheduled
    db_session.commit()

    sent = {}

    def capture_send(**kwargs):
        sent.update(kwargs)

    monkeypatch.setattr("src.workers.jobs.daily_alert.resend_service.send_email", capture_send)

    _process_user(db_session, user)

    assert "subject" in sent
    assert user.email == sent["to"]
    log = (
        db_session.query(NotificationLog)
        .filter(NotificationLog.user_id == user.id, NotificationLog.type == "daily_alert")
        .first()
    )
    assert log is not None
