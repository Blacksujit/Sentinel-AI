import logging
import os
from urllib.parse import urlparse

from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger(__name__)

Base = declarative_base()

_engine = None
_session_factory = None

# Redacted URL for logs/debug (no password)
SQLALCHEMY_DATABASE_URL = ""


def _normalize_database_url(raw_url: str) -> str:
    """Normalize DATABASE_URL from hosting providers (Render, Heroku, etc.)."""
    url = (raw_url or "").strip()
    if not url:
        return ""

    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)

    return url


def _redacted_url(url: str) -> str:
    """Return URL safe for logs (password hidden)."""
    if not url:
        return "(not set)"
    try:
        parsed = urlparse(url.replace("postgresql+psycopg", "postgresql"))
        user = parsed.username or ""
        host = parsed.hostname or "?"
        port = parsed.port or ""
        db = (parsed.path or "").lstrip("/") or "?"
        port_str = f":{port}" if port else ""
        user_str = f"{user}@" if user else ""
        return f"postgresql://{user_str}{host}{port_str}/{db}"
    except Exception:
        return "(invalid url)"


def _postgres_hostname(url: str) -> str:
    try:
        return urlparse(url.replace("postgresql+psycopg", "postgresql")).hostname or ""
    except Exception:
        return ""


def _is_postgres_url(url: str) -> bool:
    return url.startswith("postgresql") or url.startswith("postgres")


def _invalid_hostname(host: str) -> bool:
    """Detect placeholder / local hosts that will never work on Render."""
    if not host:
        return True
    host_lower = host.lower()
    placeholders = {
        "hostname",
        "host",
        "your_host",
        "your-host",
        "localhost",
        "127.0.0.1",
        "0.0.0.0",
        "example.com",
        "postgres",
        "db",
    }
    return host_lower in placeholders


def build_engine():
    """
    Resolve SQLAlchemy engine from DATABASE_URL.

    If PostgreSQL is unreachable and ALLOW_SQLITE_FALLBACK=true (default),
    falls back to SQLite so the API can still start (MVP / misconfigured Render).
    """
    global SQLALCHEMY_DATABASE_URL

    raw_url = os.getenv("DATABASE_URL", "")
    normalized_url = _normalize_database_url(raw_url)
    SQLALCHEMY_DATABASE_URL = normalized_url or "sqlite:///./sentinel_ai.db"
    allow_sqlite_fallback = os.getenv("ALLOW_SQLITE_FALLBACK", "true").lower() == "true"

    if not normalized_url:
        sqlite_url = "sqlite:///./sentinel_ai.db"
        logger.warning("DATABASE_URL not set — using SQLite at %s", sqlite_url)
        SQLALCHEMY_DATABASE_URL = sqlite_url
        return create_engine(sqlite_url, connect_args={"check_same_thread": False})

    if _is_postgres_url(normalized_url):
        host = _postgres_hostname(normalized_url)
        if _invalid_hostname(host):
            msg = (
                f"DATABASE_URL hostname is invalid or a placeholder: {host!r}. "
                f"On Render: Postgres → Connect → Internal Database URL → set as DATABASE_URL. "
                f"Redacted URL: {_redacted_url(normalized_url)}"
            )
            if allow_sqlite_fallback:
                logger.error("%s — falling back to SQLite.", msg)
                sqlite_url = "sqlite:///./sentinel_ai.db"
                SQLALCHEMY_DATABASE_URL = sqlite_url
                return create_engine(sqlite_url, connect_args={"check_same_thread": False})
            raise RuntimeError(msg)

        try:
            engine = create_engine(normalized_url, pool_pre_ping=True)
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("PostgreSQL connection successful (%s)", _redacted_url(normalized_url))
            return engine
        except Exception as exc:
            logger.error(
                "PostgreSQL connection failed for %s: %s",
                _redacted_url(normalized_url),
                exc,
            )
            if allow_sqlite_fallback:
                logger.warning(
                    "ALLOW_SQLITE_FALLBACK=true — using SQLite. "
                    "Fix DATABASE_URL on Render for persistent data."
                )
                sqlite_url = "sqlite:///./sentinel_ai.db"
                SQLALCHEMY_DATABASE_URL = sqlite_url
                return create_engine(sqlite_url, connect_args={"check_same_thread": False})
            raise RuntimeError(
                "Cannot connect to PostgreSQL. On Render:\n"
                "  1. Create a Render PostgreSQL database\n"
                "  2. Copy Internal Database URL (not External unless required)\n"
                "  3. Set DATABASE_URL on the Web Service\n"
                f"  Host attempted: {host!r}\n"
                f"  Redacted URL: {_redacted_url(normalized_url)}\n"
                f"  Error: {exc}"
            ) from exc

    return create_engine(normalized_url, connect_args={"check_same_thread": False})


def get_engine():
    """Lazy engine — avoids crashing imports when DATABASE_URL is misconfigured."""
    global _engine
    if _engine is None:
        _engine = build_engine()
    return _engine


def _get_session_factory():
    global _session_factory
    if _session_factory is None:
        _session_factory = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=get_engine(),
            expire_on_commit=False,
        )
    return _session_factory


def SessionLocal():
    """Create a new DB session (lazy-init engine on first use)."""
    return _get_session_factory()()


def get_db():
    """FastAPI dependency: yield a database session."""
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
    from app.storage import invite_models as _invite_models  # noqa: F401
    from app.storage import workspace_models as _workspace_models  # noqa: F401
    from app.learning import models as _learning_models  # noqa: F401
    from app.storage import wallet_models as _wallet_models  # noqa: F401

    eng = get_engine()
    Base.metadata.create_all(bind=eng)

    try:
        from app.services.seed_service import seed_all

        with SessionLocal() as seed_db:
            seed_all(seed_db)
    except Exception as e:
        logger.warning("Database seeding failed: %s", e)

    if eng.dialect.name == "sqlite":
        _run_sqlite_migrations(eng)

    from app.services.database_service import DatabaseService, SettingsRepository

    with DatabaseService.get_session() as db:
        if SettingsRepository.get_current(db) is None:
            SettingsRepository.create_default(db)


def _run_sqlite_migrations(eng):
    """Lightweight schema migrations for SQLite only."""
    logger.info("[DB MIGRATION] Running SQLite migrations...")

    with eng.connect() as conn:
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

    with eng.connect() as conn:
        try:
            user_cols = [row[1] for row in conn.execute(text("PRAGMA table_info('users')"))]
            if "onboarding_completed" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN DEFAULT 0"))
            if "profile_json" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN profile_json TEXT"))
            conn.commit()
        except Exception as e:
            logger.warning("[DB MIGRATION] users migration skipped: %s", e)
