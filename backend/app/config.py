from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # PostgreSQL
    DATABASE_URL: str = "postgresql://bugs:change-me-db@db:5432/bugsdb"

    # JWT
    SECRET_KEY: str = "change-me-secret-key-at-least-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Admin seed
    ADMIN_USERNAME: str = "GaraKrral"
    ADMIN_EMAIL: str = "admin@garakrral.com"
    ADMIN_PASSWORD: str = "change-me"

    # Upload limits (bytes)
    MAX_IMAGE_SIZE: int = 10_485_760       # 10 MB
    MAX_VIDEO_SIZE: int = 104_857_600      # 100 MB

    # Upload directory
    UPLOAD_DIR: str = "/app/uploads"

    # Resend Email
    RESEND_API_KEY: str = ""

    # Frontend URL
    FRONTEND_URL: str = "https://bugs.garakrral.com"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
