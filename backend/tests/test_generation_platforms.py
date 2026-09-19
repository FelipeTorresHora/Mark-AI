from src.services.generation_platforms import instagram_generation_block_reason


def test_instagram_skip_when_app_not_configured(db_session, user_factory):
    user = user_factory()
    reason = instagram_generation_block_reason(db_session, user.id)
    assert reason is not None
    assert "não configurado" in reason.lower()


def test_instagram_skip_when_account_missing(db_session, user_factory, monkeypatch):
    user = user_factory()
    monkeypatch.setattr(
        "src.services.generation_platforms.settings.instagram_app_id",
        "app-id",
    )
    monkeypatch.setattr(
        "src.services.generation_platforms.settings.instagram_app_secret",
        "secret",
    )
    reason = instagram_generation_block_reason(db_session, user.id)
    assert reason is not None
    assert "não conectada" in reason.lower()
