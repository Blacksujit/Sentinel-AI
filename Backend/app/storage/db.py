import os
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Use PostgreSQL if DATABASE_URL is provided, otherwise fallback to SQLite
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sentinel_ai.db")

# Configure engine based on database type
if SQLALCHEMY_DATABASE_URL.startswith("postgresql") or SQLALCHEMY_DATABASE_URL.startswith("postgres"):
    # Render typically provides DATABASE_URL as postgresql://...
    # Use psycopg (v3) driver explicitly for compatibility with newer Python versions.
    if SQLALCHEMY_DATABASE_URL.startswith("postgresql://"):
        sqlalchemy_url = SQLALCHEMY_DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
    elif SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
        sqlalchemy_url = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
    else:
        sqlalchemy_url = SQLALCHEMY_DATABASE_URL

    engine = create_engine(sqlalchemy_url, pool_pre_ping=True)
else:
    # SQLite configuration
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)

Base = declarative_base()

def init_db():
    # Import models so they register on the shared Base metadata before create_all
    from app.storage import models as _risk_log_models  # noqa: F401
    from app.storage import prompt_baselines as _prompt_baseline_models  # noqa: F401
    from app.storage import api_key_models as _api_key_models  # noqa: F401
    from app.utils import models as _settings_models  # noqa: F401

    Base.metadata.create_all(bind=engine)

    # Lightweight schema migrations for SQLite only
    if not (
        SQLALCHEMY_DATABASE_URL.startswith("postgresql")
        or SQLALCHEMY_DATABASE_URL.startswith("postgres")
    ):
        with engine.connect() as conn:
            try:
                cols = [row[1] for row in conn.execute(text("PRAGMA table_info('risk_logs')"))]
                if "settings_version" not in cols:
                    conn.execute(text("ALTER TABLE risk_logs ADD COLUMN settings_version INTEGER"))
                if "thresholds_applied" not in cols:
                    conn.execute(text("ALTER TABLE risk_logs ADD COLUMN thresholds_applied TEXT"))
                conn.commit()
            except Exception:
                # If risk_logs doesn't exist yet, create_all above will create it and
                # PRAGMA/ALTER will be attempted again on next startup.
                pass

    # Seed default settings row if missing
    from app.services.database_service import DatabaseService, SettingsRepository

    with DatabaseService.get_session() as db:
        if SettingsRepository.get_current(db) is None:
            SettingsRepository.create_default(db)