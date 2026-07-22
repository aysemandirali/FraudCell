"""Uygulama ayarlari (dokuman 03-TECH-STACK.md paket/config konvansiyonu)."""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class DatabaseSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="AI_DB_")

    host: str = "ai-db"
    port: int = 5432
    name: str = "fraudcell_ai"
    user: str = "ai_app"
    password: str = "CHANGE_ME"

    @property
    def dsn(self) -> str:
        return f"postgresql+psycopg://{self.user}:{self.password}@{self.host}:{self.port}/{self.name}"


class RabbitMqSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="RABBITMQ_")

    host: str = "rabbitmq"
    port: int = 5672
    user_name: str = "fraudcell"
    password: str = "CHANGE_ME"
    virtual_host: str = "/"
    exchange: str = "fraudcell.events"

    @property
    def url(self) -> str:
        return f"amqp://{self.user_name}:{self.password}@{self.host}:{self.port}/{self.virtual_host.lstrip('/')}"


class ModelSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="AI_MODEL_")

    artifact_dir: str = "models"
    risk_model_file: str = "risk_model.joblib"
    fraud_type_model_file: str = "fraud_type_model.joblib"
    bundle_version: str = "fraudcell-ai-1.0.0"


class Settings(BaseSettings):
    service_name: str = "ai-service"
    database: DatabaseSettings = DatabaseSettings()
    rabbitmq: RabbitMqSettings = RabbitMqSettings()
    model: ModelSettings = ModelSettings()
    internal_api_token: str = "CHANGE_ME"


settings = Settings()
