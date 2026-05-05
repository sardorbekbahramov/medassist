from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Telegram
    bot_token: str
    webhook_host: str = ""
    webhook_path: str = "/webhook"
    webapp_port: int = 8080
    webapp_url: str = ""

    # Database
    database_url: str

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # AI — currently Gemini (switch to anthropic_api_key later if needed)
    # gemini_api_key: str = ""
    gemini_api_key: str = ""  # Groq API key saqlanadi shu yerda
    anthropic_api_key: str = ""  # kept for future migration

    # Admin
    admin_ids: List[int] = []

    # Security
    secret_key: str = "medical_assist_ntcc2026"

    @field_validator("admin_ids", mode="before")
    @classmethod
    def parse_admin_ids(cls, v):
        if isinstance(v, str):
            return [int(x.strip()) for x in v.split(",") if x.strip()]
        return v

    @property
    def webhook_url(self) -> str:
        return f"{self.webhook_host}{self.webhook_path}"

    @property
    def use_webhook(self) -> bool:
        return bool(self.webhook_host)


settings = Settings()
