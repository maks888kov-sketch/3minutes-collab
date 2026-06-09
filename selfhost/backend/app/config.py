from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://threemin:threemin_secret@localhost:5544/threemin"
    sync_database_url: str = "postgresql+psycopg://threemin:threemin_secret@localhost:5544/threemin"
    redis_url: str = "redis://localhost:6390/0"

    jwt_secret: str = "dev-super-secret-change-me-3minutes"
    jwt_algorithm: str = "HS256"
    jwt_expire_days: int = 30

    # Where uploaded files (photos, voice) are stored:
    #   "local" -> on disk, in LOCAL_STORAGE_DIR (default; persisted to a project folder)
    #   "minio" -> S3-compatible object storage (MinIO)
    storage_backend: str = "local"
    local_storage_dir: str = "/data/uploads"

    minio_endpoint: str = "localhost:9100"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin123"
    minio_bucket: str = "threemin-uploads"
    minio_secure: bool = False

    smtp_host: str = "localhost"
    smtp_port: int = 1026
    mail_from: str = "no-reply@3minutes.local"

    # Public URL prefix used when handing file URLs back to the browser.
    public_file_base: str = "/api/files"

    otp_ttl_minutes: int = 15


settings = Settings()
