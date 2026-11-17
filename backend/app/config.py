from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    access_token_minutes: int = 720
    frontend_origin: str = "http://localhost:5173"
    upload_dir: str = "uploads"
    google_client_id: str = ""
    super_admin_email: str = "guptasonu312006@gmail.com"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    @field_validator("database_url")
    @classmethod
    def require_postgresql(cls, value: str) -> str:
        if not value.startswith("postgresql+psycopg://"):
            raise ValueError("DATABASE_URL must use PostgreSQL with psycopg 3")
        return value

    @field_validator("jwt_secret")
    @classmethod
    def require_secure_jwt_secret(cls, value: str) -> str:
        if len(value) < 32 or value == "development-only-change-this-secret":
            raise ValueError("JWT_SECRET must be a unique random value of at least 32 characters")
        return value

settings = Settings()
