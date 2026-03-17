"""Pydantic Settings — all environment variables for the IPM backend."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Central configuration loaded from environment variables."""

    # --- Database ---
    database_url: str = "postgresql+asyncpg://ipm:ipm@postgres:5432/ipm"

    # --- ChromaDB ---
    chroma_host: str = "chromadb"
    chroma_port: int = 8001

    # --- MinIO ---
    minio_endpoint: str = "minio:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_secure: bool = False

    # --- LLM Provider ---
    llm_provider: str = "groq"  # "groq" | "azure"
    groq_api_key: str = ""
    azure_openai_api_key: str = ""
    azure_openai_endpoint: str = ""
    azure_openai_deployment: str = "gpt-4o"
    azure_openai_api_version: str = "2024-02-15-preview"

    # --- Embedding Provider ---
    embedding_provider: str = "local"  # "local" | "openai"
    openai_api_key: str = ""
    embedding_model_local: str = "all-MiniLM-L6-v2"
    embedding_model_openai: str = "text-embedding-ada-002"

    # --- Langfuse ---
    langfuse_public_key: str = ""
    langfuse_secret_key: str = ""
    langfuse_host: str = "https://cloud.langfuse.com"

    # --- CORS ---
    cors_origins: list[str] = ["http://localhost:3000"]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
