"""
API routes for the learning loop feedback system.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.auth.dependencies import require_authenticated_user
from app.storage.db import get_db
from app.storage.user_models import User
from app.learning.models import (
    FeedbackSubmission, FeedbackResponse, FeedbackStats,
    DetectionMetrics, PatternSubmission
)
from app.learning.feedback_service import FeedbackService

router = APIRouter(prefix="/learning", tags=["learning"])


@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    submission: FeedbackSubmission,
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user)
) -> FeedbackResponse:
    """
    Submit feedback about a missed jailbreak detection.
    Users can report false negatives or compliance issues.
    """
    service = FeedbackService(db)
    
    response = service.submit_feedback(
        user_id=user.clerk_user_id,
        submission=submission
    )
    
    return response


@router.post("/feedback/{log_id}/compliance")
async def report_compliance(
    log_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user)
) -> FeedbackResponse:
    """
    Report that model started complying with a harmful request.
    This indicates the prompt was a jailbreak that slipped through.
    """
    service = FeedbackService(db)
    
    response = service.report_compliance_issue(
        log_id=log_id,
        user_id=user.clerk_user_id
    )
    
    if not response.success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=response.message
        )
    
    return response


@router.get("/stats", response_model=FeedbackStats)
async def get_feedback_stats(
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user)
) -> FeedbackStats:
    """
    Get statistics about feedback and detection performance.
    """
    service = FeedbackService(db)
    return service.get_feedback_stats()


@router.get("/metrics", response_model=DetectionMetrics)
async def get_detection_metrics(
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user)
) -> DetectionMetrics:
    """
    Get real-time detection performance metrics.
    """
    service = FeedbackService(db)
    return service.get_detection_metrics()


@router.get("/feedback/pending")
async def get_pending_feedback(
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user)
) -> List[dict]:
    """
    Get feedback entries pending admin review.
    """
    service = FeedbackService(db)
    return service.get_pending_feedback(limit=limit)


@router.post("/feedback/{feedback_id}/review")
async def review_feedback(
    feedback_id: str,
    approved: bool,
    admin_notes: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user)
) -> dict:
    """
    Mark feedback as reviewed and optionally approve for training.
    """
    service = FeedbackService(db)
    
    success = service.review_feedback(
        feedback_id=feedback_id,
        approved=approved,
        admin_notes=admin_notes
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback entry not found"
        )
    
    return {
        "success": True,
        "feedback_id": feedback_id,
        "approved": approved,
        "message": "Feedback reviewed successfully"
    }


@router.post("/patterns/similar")
async def find_similar_patterns(
    prompt: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user)
) -> List[dict]:
    """
    Find similar previously reported patterns.
    """
    service = FeedbackService(db)
    return service.find_similar_feedback(prompt)


@router.get("/training-dataset")
async def get_training_dataset(
    min_confidence: float = 0.7,
    limit: int = 1000,
    db: Session = Depends(get_db),
    user: User = Depends(require_authenticated_user)
) -> List[dict]:
    """
    Get training dataset for model retraining.
    """
    service = FeedbackService(db)
    return service.get_training_dataset(
        min_confidence=min_confidence,
        limit=limit
    )
