import pytest

from src.services import resend_service


def test_send_email_success_first_try(monkeypatch):
    calls = []

    def fake_send(_payload):
        calls.append(1)

    monkeypatch.setattr("resend.Emails.send", fake_send)
    resend_service.send_email(to="a@b.com", subject="Hi", html="<p>x</p>")
    assert len(calls) == 1


def test_send_email_retries_then_succeeds(monkeypatch):
    attempts = {"n": 0}

    def fake_send(_payload):
        attempts["n"] += 1
        if attempts["n"] < 2:
            raise RuntimeError("temporary")

    monkeypatch.setattr("resend.Emails.send", fake_send)
    monkeypatch.setattr("src.services.resend_service.time.sleep", lambda _s: None)

    resend_service.send_email(to="a@b.com", subject="Hi", html="<p>x</p>", max_retries=3)
    assert attempts["n"] == 2


def test_send_email_rate_limit_waits_longer(monkeypatch):
    sleeps = []

    def fake_send(_payload):
        raise RuntimeError("429 Too Many Requests")

    monkeypatch.setattr("resend.Emails.send", fake_send)
    monkeypatch.setattr("src.services.resend_service.time.sleep", lambda s: sleeps.append(s))

    with pytest.raises(RuntimeError, match="falha após"):
        resend_service.send_email(to="a@b.com", subject="Hi", html="<p>x</p>", max_retries=1)

    assert sleeps == []


def test_send_email_raises_after_max_retries(monkeypatch):
    def fake_send(_payload):
        raise RuntimeError("down")

    monkeypatch.setattr("resend.Emails.send", fake_send)
    monkeypatch.setattr("src.services.resend_service.time.sleep", lambda _s: None)

    with pytest.raises(RuntimeError, match="falha após 2 tentativas"):
        resend_service.send_email(to="a@b.com", subject="Hi", html="<p>x</p>", max_retries=2)
