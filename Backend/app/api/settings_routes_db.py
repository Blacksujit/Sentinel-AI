"""
Settings Routes for SentinelAI - Database Version

This module defines API routes for managing SentinelAI settings with database persistence.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from sqlalchemy.orm import Session

from app.services.settings_service_db import settings_service
from app.storage.db import SessionLocal
from app.auth.dependencies import require_authenticated_user

router = APIRouter()

def get_db():
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/settings")
async def get_settings(user=Depends(require_authenticated_user)) -> Dict[str, Any]:
    """Get current settings from database"""
    return settings_service.get_settings()

@router.put("/settings")
async def update_settings(settings_data: Dict[str, Any], user=Depends(require_authenticated_user)) -> Dict[str, Any]:
    """Update settings in database with validation"""
    try:
        updated_settings = settings_service.update_settings(settings_data)
        return updated_settings
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/settings/default")
async def get_default_settings(user=Depends(require_authenticated_user)) -> Dict[str, Any]:
    """Get default settings for reference"""
    return {
        "warn_threshold": 0.3,
        "escalate_threshold": 0.7,
        "confidence_floor": 0.5,
        "signal_weights": {
            "prompt_anomaly": 0.3,
            "jailbreak_attempt": 0.4,
            "unsafe_output": 0.3
        },
        "enforcement_mode": "warn",
        "version": 1
    }

@router.post("/settings/reset")
async def reset_settings(user=Depends(require_authenticated_user)) -> Dict[str, Any]:
    """Reset settings to defaults and save to database"""
    try:
        default_settings = {
            "warn_threshold": 0.3,
            "escalate_threshold": 0.7,
            "confidence_floor": 0.5,
            "signal_weights": {
                "prompt_anomaly": 0.3,
                "jailbreak_attempt": 0.4,
                "unsafe_output": 0.3
            },
            "enforcement_mode": "warn",
            "version": 1
        }
        updated_settings = settings_service.update_settings(default_settings, updated_by="user_reset")
        return updated_settings
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/settings/history")
async def get_settings_history(limit: int = 10, page: int = 1, user=Depends(require_authenticated_user)) -> list:
    """Get settings change history for audit with pagination"""
    offset = (page - 1) * limit
    history = settings_service.get_settings_history(limit, offset)
    return [log.to_dict() for log in history]
