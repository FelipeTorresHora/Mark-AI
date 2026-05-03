from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "local"
    app_base_url: str = "http://localhost:8000"
    frontend_url: str = "http://localhost:5173"
    database_url: str = "postgresql://postgres:postgres@localhost:5432/marketing_db"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash-lite"
    max_concurrent_generations: int = 5
    generation_timeout_seconds: int = 30

    # JWT
    jwt_secret_key: str = "CHANGE_ME_IN_PRODUCTION"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # CORS (comma-separated origins)
    allowed_origins: str = "http://localhost:5173"
    allowed_origin_regex: str = ""

    # Social token encryption
    social_token_encryption_key: str = ""

    # X (Twitter) OAuth 2.0
    x_client_id: str = ""
    x_client_secret: str = ""
    x_redirect_uri: str = "http://localhost:8000/api/v1/integrations/x/callback"
    x_integration_enabled: bool = True
    x_publish_rate_limit_per_hour: int = 30
    x_schedule_rate_limit_per_hour: int = 60
    x_max_scheduled_posts_per_user: int = 100
    x_publish_max_attempts: int = 3

    # Cron
    cron_secret: str = ""

    # LinkedIn OAuth 2.0
    linkedin_client_id: str = ""
    linkedin_client_secret: str = ""
    linkedin_redirect_uri: str = "http://localhost:8000/api/v1/social/callback/linkedin"
    linkedin_api_version: str = "202504"
    linkedin_scopes: str = "openid profile w_member_social"

    # Resend email
    resend_api_key: str = ""
    resend_from_email: str = "notificacoes@seudominio.com"
    default_user_timezone: str = "America/Sao_Paulo"
    morning_alert_hour: int = 8

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8-sig")


settings = Settings()
