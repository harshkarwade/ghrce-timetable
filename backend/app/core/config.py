from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/ghrce_timetable"

    # JWT
    SECRET_KEY: str = "ghrce-super-secret-key-change-in-production-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # App
    APP_NAME: str = "GHRCE AI Timetable System"
    DEBUG: bool = True

    class Config:
        env_file = ".env"

settings = Settings()
