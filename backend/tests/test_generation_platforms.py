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


def test_instagram_generation_allows_account_with_stale_page_token_expiry(
    db_session, user_factory, social_account_factory, monkeypatch, expired_datetime
):
    user = user_factory()
    monkeypatch.setattr("src.services.generation_platforms.settings.instagram_app_id", "app-id")
    monkeypatch.setattr("src.services.generation_platforms.settings.instagram_app_secret", "secret")
    social_account_factory(
        user,
        platform="INSTAGRAM",
        platform_user_id="ig-1",
        expires_at=expired_datetime,
    )

    assert instagram_generation_block_reason(db_session, user.id) is None


def test_instagram_generation_skips_when_reconnect_required(
    db_session, user_factory, social_account_factory, monkeypatch
):
    user = user_factory()
    monkeypatch.setattr("src.services.generation_platforms.settings.instagram_app_id", "app-id")
    monkeypatch.setattr("src.services.generation_platforms.settings.instagram_app_secret", "secret")
    account = social_account_factory(user, platform="INSTAGRAM", platform_user_id="ig-1")
    account.last_error = "instagram_reconnect_required"
    db_session.commit()

    reason = instagram_generation_block_reason(db_session, user.id)
    assert reason is not None
    assert "reconecte" in reason.lower()
