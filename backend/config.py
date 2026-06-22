from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:postgres@localhost:5432/arca"
    secret_key: str = "super-secret-key-for-arca-mock"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440 # 24 hours

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()
