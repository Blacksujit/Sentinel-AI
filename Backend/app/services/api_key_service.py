import hashlib
import os
import secrets
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.storage.api_key_models import ApiKey


def _pepper() -> str:
    return os.getenv("SENTINELAI_KEY_PEPPER", "")


def hash_api_key(raw_key: str) -> str:
    value = f"{_pepper()}{raw_key}".encode("utf-8")
    return hashlib.sha256(value).hexdigest()


def generate_api_key() -> str:
    token = secrets.token_urlsafe(32).replace("-", "").replace("_", "")
    return f"sk_sentinel_{token}"


def create_api_key(db: Session, name: str) -> Dict[str, Any]:
    raw = generate_api_key()
    key_hash = hash_api_key(raw)
    prefix = raw[:12]

    entry = ApiKey(name=name, prefix=prefix, key_hash=key_hash, active=True)
    db.add(entry)
    db.flush()

    return {
        "id": entry.id,
        "name": entry.name,
        "prefix": entry.prefix,
        "active": entry.active,
        "created_at": entry.created_at,
        "last_used_at": entry.last_used_at,
        "revoked_at": entry.revoked_at,
        "api_key": raw,
    }


def list_api_keys(db: Session) -> List[Dict[str, Any]]:
    keys = db.query(ApiKey).order_by(ApiKey.created_at.desc()).all()
    return [
        {
            "id": k.id,
            "name": k.name,
            "prefix": k.prefix,
            "active": bool(k.active) and k.revoked_at is None,
            "created_at": k.created_at,
            "last_used_at": k.last_used_at,
            "revoked_at": k.revoked_at,
        }
        for k in keys
    ]


def revoke_api_key(db: Session, key_id: int) -> Dict[str, Any]:
    key = db.query(ApiKey).filter(ApiKey.id == key_id).first()
    if not key:
        raise ValueError("API key not found")

    key.active = False
    key.revoked_at = datetime.utcnow()
    db.add(key)

    return {
        "id": key.id,
        "name": key.name,
        "prefix": key.prefix,
        "active": False,
        "created_at": key.created_at,
        "last_used_at": key.last_used_at,
        "revoked_at": key.revoked_at,
    }


def verify_api_key_hash(db: Session, raw_key: str) -> Optional[ApiKey]:
    key_hash = hash_api_key(raw_key)
    key = (
        db.query(ApiKey)
        .filter(ApiKey.key_hash == key_hash)
        .filter(ApiKey.active.is_(True))
        .filter(ApiKey.revoked_at.is_(None))
        .first()
    )

    if not key:
        return None

    key.last_used_at = datetime.utcnow()
    db.add(key)
    return key
