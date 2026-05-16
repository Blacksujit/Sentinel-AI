import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger(__name__)

# Use PostgreSQL if DATABASE_URL is provided, otherwise fallback to SQLite
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "")

# If DATABASE_URL is empty, use SQLite
if not SQLALCHEMY_DATABASE_URL:
    SQLALCHEMY_DATABASE_URL = "sqlite:///./sentinel_ai.db"
    logger.info(f"DATABASE_URL not set, using SQLite")

# Try PostgreSQL first if configured, fallback to SQLite on failure
engine = None
if SQLALCHEMY_DATABASE_URL.startswith("postgresql") or SQLALCHEMY_DATABASE_URL.startswith("postgres"):
    try:
        # Render typically provides DATABASE_URL as postgresql://...
        # Use psycopg (v3) driver explicitly for compatibility with newer Python versions.
        if SQLALCHEMY_DATABASE_URL.startswith("postgresql://"):
            sqlalchemy_url = SQLALCHEMY_DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
        elif SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
            sqlalchemy_url = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
        else:
            sqlalchemy_url = SQLALCHEMY_DATABASE_URL

        engine = create_engine(sqlalchemy_url, pool_pre_ping=True)
        # Test connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("PostgreSQL connection successful")
    except Exception as e:
        logger.warning(f"PostgreSQL connection failed: {e}. Falling back to SQLite.")
        engine = None

if engine is None:
    # SQLite configuration (fallback or default)
    sqlite_url = "sqlite:///./sentinel_ai.db"
    logger.info(f"Using SQLite database: {sqlite_url}")
    engine = create_engine(
        sqlite_url, connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)

Base = declarative_base()

def get_db():
    """Get database session for dependency injection."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    # Import models so they register on shared Base metadata before create_all
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

    # Seed RBAC data and default org
    try:
        from app.services.seed_service import seed_all
        with SessionLocal() as seed_db:
            seed_all(seed_db)
    except Exception as e:
        print(f"Warning: Database seeding failed: {e}")

    # Lightweight schema migrations for SQLite only
    if not (
        SQLALCHEMY_DATABASE_URL.startswith("postgresql")
        or SQLALCHEMY_DATABASE_URL.startswith("postgres")
    ):
        print("[DB MIGRATION] Running SQLite migrations...")
        
        with engine.connect() as conn:
            try:
                cols = [row[1] for row in conn.execute(text("PRAGMA table_info('risk_logs')"))]
                print(f"[DB MIGRATION] risk_logs columns: {cols}")
                if "settings_version" not in cols:
                    conn.execute(text("ALTER TABLE risk_logs ADD COLUMN settings_version INTEGER"))
                    print("[DB MIGRATION] Added settings_version column")
                if "thresholds_applied" not in cols:
                    conn.execute(text("ALTER TABLE risk_logs ADD COLUMN thresholds_applied TEXT"))
                    print("[DB MIGRATION] Added thresholds_applied column")
                if "org_id" not in cols:
                    conn.execute(text("ALTER TABLE risk_logs ADD COLUMN org_id INTEGER"))
                    print("[DB MIGRATION] Added org_id column")
                if "workspace_id" not in cols:
                    conn.execute(text("ALTER TABLE risk_logs ADD COLUMN workspace_id INTEGER"))
                    print("[DB MIGRATION] Added workspace_id column")
                conn.commit()
            except Exception as e:
                print(f"[DB MIGRATION] risk_logs migration skipped: {e}")

        with engine.connect() as conn:
            try:
                user_cols = [row[1] for row in conn.execute(text("PRAGMA table_info('users')"))]
                print(f"[DB MIGRATION] users columns before: {user_cols}")
                
                if "onboarding_completed" not in user_cols:
                    print("[DB MIGRATION] Adding onboarding_completed column...")
                    conn.execute(text("ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN DEFAULT 0"))
                    print("[DB MIGRATION] Added onboarding_completed column")
                
                if "profile_json" not in user_cols:
                    print("[DB MIGRATION] Adding profile_json column...")
                    conn.execute(text("ALTER TABLE users ADD COLUMN profile_json TEXT"))
                    print("[DB MIGRATION] Added profile_json column")
                    
                conn.commit()
                
                # Verify
                user_cols_after = [row[1] for row in conn.execute(text("PRAGMA table_info('users')"))]
                print(f"[DB MIGRATION] users columns after: {user_cols_after}")
                
            except Exception as e:
                print(f"[DB MIGRATION ERROR] users migration failed: {e}")
                import traceback
                traceback.print_exc()
                raise

    # Seed default settings row if missing
    from app.services.database_service import DatabaseService, SettingsRepository

    with DatabaseService.get_session() as db:
        if SettingsRepository.get_current(db) is None:
            SettingsRepository.create_default(db)