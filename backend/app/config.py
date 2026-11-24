"""Settings from environment variables (12-factor); defaults are for local development."""

import os


def _bool(name: str, default: bool = False) -> bool:
    return os.environ.get(name, str(default)).lower() in ("1", "true", "yes")


class Settings:
    database_url: str = os.environ.get("DATABASE_URL", "postgresql+psycopg://flowforge:flowforge@localhost:5432/flowforge")
    redis_url: str = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    secret_key: str = os.environ.get("SECRET_KEY", "dev-only-change-me")
    # Fernet key for credentials at rest; derived from SECRET_KEY when not set
    credentials_key: str = os.environ.get("CREDENTIALS_KEY", "")
    token_ttl_hours: int = int(os.environ.get("TOKEN_TTL_HOURS", "168"))
    cors_origins: list[str] = [o for o in os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",") if o]
    # public base URL of the API, used to show webhook URLs
    public_api_url: str = os.environ.get("PUBLIC_API_URL", "http://localhost:8000")
    # the HTTP node refuses private/loopback addresses unless this is on (SSRF guard)
    allow_private_urls: bool = _bool("ALLOW_PRIVATE_URLS")
    max_steps: int = int(os.environ.get("MAX_STEPS", "100"))
    # default LLM for the AI node (any OpenAI-compatible API, e.g. Groq)
    llm_api_key: str = os.environ.get("LLM_API_KEY", "")
    llm_base_url: str = os.environ.get("LLM_BASE_URL", "https://api.groq.com/openai/v1")
    llm_model: str = os.environ.get("LLM_MODEL", "openai/gpt-oss-120b")
    # run Celery tasks inline (tests, or a single-process demo)
    celery_eager: bool = _bool("CELERY_EAGER")


settings = Settings()
