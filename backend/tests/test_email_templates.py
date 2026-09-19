import pytest

from src.services.email_templates import render


def test_render_daily_alert_template():
    html = render(
        "daily_alert.html",
        user_email="user@example.com",
        date="19/09/2026",
        posts_rows="<tr><td>X</td></tr>",
    )
    assert "user@example.com" in html
    assert "19/09/2026" in html


def test_render_weekly_digest_template():
    html = render(
        "weekly_digest.html",
        user_email="user@example.com",
        week_start="01/09",
        week_end="07/09",
        campaigns_count=2,
        posts_count=5,
        published_count=3,
        metrics_note="<div>ok</div>",
    )
    assert "user@example.com" in html
    assert "campaigns_count" not in html


def test_render_missing_template_raises():
    with pytest.raises(FileNotFoundError):
        render("does_not_exist.html", foo="bar")


def test_render_missing_variable_raises():
    with pytest.raises(KeyError):
        render("daily_alert.html", user_email="a@b.com")
