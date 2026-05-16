import hashlib
import os
import secrets
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.storage.api_key_models import ApiKey, ApiKeyStatus


def _pepper() -> str:
    return os.getenv("SENTINELAI_KEY_PEPPER", "")


def hash_api_key(raw_key: str) -> str:
    value = f"{_pepper()}{raw_key}".encode("utf-8")
    return hashlib.sha256(value).hexdigest()


def generate_api_key() -> str:
    token = secrets.token_urlsafe(32).replace("-", "").replace("_", "")
    return f"sk_sentinel_{token}"


def create_api_key(db: Session, org_id: int, created_by_user_id: int, name: str) -> Dict[str, Any]:
    raw = generate_api_key()
    key_hash = hash_api_key(raw)
    prefix = raw[:12]

    entry = ApiKey(
        org_id=org_id,
        created_by_user_id=created_by_user_id,
        name=name,
        prefix=prefix,
        key_hash=key_hash,
        status=ApiKeyStatus.ACTIVE.value,
    )
    db.add(entry)
    db.flush()

    return {
        "id": entry.id,
        "name": entry.name,
        "prefix": entry.prefix,
        "status": entry.status,
        "usage_count_24h": entry.usage_count_24h,
        "usage_count_30d": entry.usage_count_30d,
        "created_at": entry.created_at,
        "last_used_at": entry.last_used_at,
        "revoked_at": entry.revoked_at,
        "api_key": raw,
    }


def list_api_keys(db: Session, org_id: int) -> List[Dict[str, Any]]:
    keys = (
        db.query(ApiKey)
        .filter(ApiKey.org_id == org_id)
        .order_by(ApiKey.created_at.desc())
        .all()
    )
    return [
        {
            "id": k.id,
            "name": k.name,
            "prefix": k.prefix,
            "status": k.status,
            "usage_count_24h": k.usage_count_24h,
            "usage_count_30d": k.usage_count_30d,
            "created_at": k.created_at,
            "last_used_at": k.last_used_at,
            "revoked_at": k.revoked_at,
        }
        for k in keys
    ]


def revoke_api_key(db: Session, org_id: int, key_id: int) -> Dict[str, Any]:
    key = db.query(ApiKey).filter(ApiKey.id == key_id).first()
    if not key:
        raise ValueError("API key not found")

    if key.org_id != org_id:
        raise ValueError("API key not found")

    key.status = ApiKeyStatus.REVOKED.value
    key.revoked_at = datetime.utcnow()
    db.add(key)

    return {
        "id": key.id,
        "name": key.name,
        "prefix": key.prefix,
        "status": key.status,
        "usage_count_24h": key.usage_count_24h,
        "usage_count_30d": key.usage_count_30d,
        "created_at": key.created_at,
        "last_used_at": key.last_used_at,
        "revoked_at": key.revoked_at,
    }


def rotate_api_key(db: Session, org_id: int, key_id: int) -> Dict[str, Any]:
    key = db.query(ApiKey).filter(ApiKey.id == key_id).first()
    if not key:
        raise ValueError("API key not found")
    if key.org_id != org_id:
        raise ValueError("API key not found")
    if key.status != ApiKeyStatus.ACTIVE.value or key.revoked_at is not None:
        raise ValueError("API key is revoked")

    raw = generate_api_key()
    key.key_hash = hash_api_key(raw)
    key.prefix = raw[:12]
    db.add(key)
    db.flush()

    return {
        "id": key.id,
        "name": key.name,
        "prefix": key.prefix,
        "status": key.status,
        "usage_count_24h": key.usage_count_24h,
        "usage_count_30d": key.usage_count_30d,
        "created_at": key.created_at,
        "last_used_at": key.last_used_at,
        "revoked_at": key.revoked_at,
        "api_key": raw,
    }


def verify_api_key_hash(db: Session, raw_key: str) -> Optional[ApiKey]:
    key_hash = hash_api_key(raw_key)
    key = (
        db.query(ApiKey)
        .filter(ApiKey.key_hash == key_hash)
        .filter(ApiKey.status == ApiKeyStatus.ACTIVE.value)
        .filter(ApiKey.revoked_at.is_(None))
        .first()
    )

    if not key:
        return None

    key.last_used_at = datetime.utcnow()
    db.add(key)
    return key
