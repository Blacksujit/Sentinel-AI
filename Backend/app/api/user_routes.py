from typing import Dict, Any
import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.storage.db import SessionLocal
from app.storage.user_models import User
from app.auth.dependencies import require_authenticated_user

router = APIRouter()
logger = logging.getLogger(__name__)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/user/onboarding")
async def save_user_onboarding(
    data: Dict[str, Any],
    user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Save user onboarding data."""
    logger.info(f"[Onboarding] Received request for user {user.id}")
    logger.info(f"[Onboarding] Data: {data}")
    
    try:
        # Use the user from auth dependency - need to merge into current session
        profile = {
            "role": data.get("role"),
            "use_case": data.get("useCase"),
            "experience": data.get("experience"),
            "company": data.get("company"),
        }
        user.profile_json = json.dumps(profile)
        user.onboarding_completed = True
        db.merge(user)  # Merge user into this session
        db.commit()   # Commit changes
        logger.info(f"[Onboarding] Saved successfully for user {user.id}")
        
        return {
            "success": True,
            "message": "Onboarding completed",
            "user_id": user.id,
        }
    except Exception as e:
        db.rollback()
        logger.exception(f"[Onboarding] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
