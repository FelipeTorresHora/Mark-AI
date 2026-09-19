from datetime import datetime

import pytz

from src.workers.jobs import weekly_digest as digest_mod
from src.workers.jobs.weekly_digest import _process_user


def test_process_user_skips_when_not_digest_window(db_session, user_factory, monkeypatch):
    user = user_factory()
    sent = []
    monkeypatch.setattr(
        "src.workers.jobs.weekly_digest.resend_service.send_email",
        lambda **kwargs: sent.append(kwargs),
    )

    tz = pytz.timezone(user.timezone or "America/Sao_Paulo")
    not_friday = tz.localize(datetime(2026, 9, 16, 14, 0, 0))  # Wednesday

    class _FakeDatetime(datetime):
        @classmethod
        def now(cls, tz=None):
            if tz is not None:
                return not_friday
            return not_friday.replace(tzinfo=None)

    monkeypatch.setattr(digest_mod, "datetime", _FakeDatetime)

    _process_user(db_session, user)
    assert sent == []
