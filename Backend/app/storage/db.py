import logging
import os
from urllib.parse import urlparse

from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger(__name__)

Base = declarative_base()


def _normalize_database_url(raw_url: str) -> str:
    """Normalize DATABASE_URL from hosting providers (Render, Heroku, etc.)."""
    url = (raw_url or "").strip()
    if not url:
        return ""

    # Render/Heroku sometimes use postgres:// — SQLAlchemy 2 prefers postgresql://
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    # Use psycopg v3 driver explicitly (Python 3.13 compatible)
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)

    return url


def _is_postgres_url(url: str) -> bool:
    return url.startswith("postgresql") or url.startswith("postgres")


def build_engine():
    """
    Resolve SQLAlchemy engine from DATABASE_URL.

    Production: requires a valid PostgreSQL URL (no silent SQLite fallback).
    Development: falls back to SQLite if PostgreSQL is unreachable or unset.
    """
    raw_url = os.getenv("DATABASE_URL", "")
    normalized_url = _normalize_database_url(raw_url)
    environment = os.getenv("ENVIRONMENT", "development").lower()
    allow_sqlite_fallback = os.getenv("ALLOW_SQLITE_FALLBACK", "true").lower() == "true"

    if not normalized_url:
        if environment == "production":
            raise RuntimeError(
                "DATABASE_URL is not set. On Render: link your Postgres instance "
                "or set DATABASE_URL to the Internal Database URL from the dashboard."
            )
        sqlite_url = "sqlite:///./sentinel_ai.db"
        logger.info("DATABASE_URL not set — using SQLite at %s", sqlite_url)
        return create_engine(sqlite_url, connect_args={"check_same_thread": False})

    if _is_postgres_url(normalized_url):
        try:
            engine = create_engine(normalized_url, pool_pre_ping=True)
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            host = urlparse(normalized_url.replace("postgresql+psycopg", "postgresql")).hostname
            logger.info("PostgreSQL connection successful (host=%s)", host)
            return engine
        except Exception as exc:
            logger.error("PostgreSQL connection failed: %s", exc)
            if environment == "production" or not allow_sqlite_fallback:
                raise RuntimeError(
                    "Cannot connect to PostgreSQL. Verify DATABASE_URL on Render:\n"
                    "  1. Open your Render Postgres → Connect → Internal Database URL\n"
                    "  2. Paste into the Web Service environment as DATABASE_URL\n"
                    "  3. Ensure the hostname is not a placeholder (Errno -2 = DNS failure)\n"
                    f"Original error: {exc}"
                ) from exc
            logger.warning("Falling back to SQLite for local development.")
            return create_engine(
                "sqlite:///./sentinel_ai.db",
                connect_args={"check_same_thread": False},
            )

    # Non-postgres URL (e.g. sqlite://)
    return create_engine(normalized_url, connect_args={"check_same_thread": False})


# Module-level engine — built once at import
SQLALCHEMY_DATABASE_URL = _normalize_database_url(os.getenv("DATABASE_URL", "")) or "sqlite:///./sentinel_ai.db"
engine = build_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)


def get_db():
    """Get database session for dependency injection."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create tables, seed data, and run lightweight migrations."""
    from app.storage import models as _risk_log_models  # noqa: F401
    from app.storage import prompt_baselines as _prompt_baseline_models  # noqa: F401
    from app.storage import api_key_models as _api_key_models  # noqa: F401
    from app.utils import models as _settings_models  # noqa: F401
    from app.storage import user_models as _user_models  # noqa: F401
    from app.storage import org_models as _org_models  # noqa: F401
    from app.storage import rbac_models as _rbac_models  # noqa: F401
    from app.storage import usage_models as _usage_models  # noqa: F401
    from app.learning import models as _learning_models  # noqa: F401

    Base.metadata.create_all(bind=engine)

    try:
        from app.services.seed_service import seed_all

        with SessionLocal() as seed_db:
            seed_all(seed_db)
    except Exception as e:
        logger.warning("Database seeding failed: %s", e)

    dialect = engine.dialect.name
    if dialect == "sqlite":
        _run_sqlite_migrations()

    from app.services.database_service import DatabaseService, SettingsRepository

    with DatabaseService.get_session() as db:
        if SettingsRepository.get_current(db) is None:
            SettingsRepository.create_default(db)


def _run_sqlite_migrations():
    """Lightweight schema migrations for SQLite only."""
    logger.info("[DB MIGRATION] Running SQLite migrations...")

    with engine.connect() as conn:
        try:
            cols = [row[1] for row in conn.execute(text("PRAGMA table_info('risk_logs')"))]
            if "settings_version" not in cols:
                conn.execute(text("ALTER TABLE risk_logs ADD COLUMN settings_version INTEGER"))
            if "thresholds_applied" not in cols:
                conn.execute(text("ALTER TABLE risk_logs ADD COLUMN thresholds_applied TEXT"))
            if "org_id" not in cols:
                conn.execute(text("ALTER TABLE risk_logs ADD COLUMN org_id INTEGER"))
            if "workspace_id" not in cols:
                conn.execute(text("ALTER TABLE risk_logs ADD COLUMN workspace_id INTEGER"))
            conn.commit()
        except Exception as e:
            logger.warning("[DB MIGRATION] risk_logs migration skipped: %s", e)

    with engine.connect() as conn:
        try:
            user_cols = [row[1] for row in conn.execute(text("PRAGMA table_info('users')"))]
            if "onboarding_completed" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN DEFAULT 0"))
            if "profile_json" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN profile_json TEXT"))
            conn.commit()
        except Exception as e:
            logger.warning("[DB MIGRATION] users migration skipped: %s", e)
