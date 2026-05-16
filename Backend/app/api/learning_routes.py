"""
API routes for jailbreak detection feedback and learning loop.
Provides endpoints for reporting missed detections and reviewing feedback.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.auth.dependencies import require_authenticated_user, get_db
from app.learning.models import (
    FeedbackSubmission,
    FeedbackResponse,
    FeedbackStats,
    DetectionMetrics,
    PatternSubmission
)
from app.learning.feedback_service import FeedbackService
from app.learning.pattern_extraction import PatternExtractionService

router = APIRouter(prefix="/learning", tags=["learning"])


@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    submission: FeedbackSubmission,
    user = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    """
    Submit feedback about a missed jailbreak detection.
    
    This endpoint allows users to report false negatives (jailbreaks that
    slipped through detection) which helps improve the system.
    """
    service = FeedbackService(db)
    
    try:
        result = service.submit_feedback(
            user_id=str(user.clerk_user_id),
            submission=submission
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process feedback: {str(e)}"
        )


@router.post("/feedback/compliance/{log_id}", response_model=FeedbackResponse)
async def report_compliance(
    log_id: str,
    user = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    """
    Report that model complied with a harmful request.
    
    Use this when the model started providing harmful information
    despite the prompt being flagged.
    """
    service = FeedbackService(db)
    
    try:
        result = service.report_compliance_issue(
            log_id=log_id,
            user_id=str(user.clerk_user_id)
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to report compliance issue: {str(e)}"
        )


@router.get("/feedback/stats", response_model=FeedbackStats)
async def get_feedback_stats(
    user = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    """Get statistics about feedback submissions."""
    service = FeedbackService(db)
    return service.get_feedback_stats()


@router.get("/feedback/pending")
async def get_pending_feedback(
    limit: int = 50,
    user = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    """
    Get feedback entries pending review (admin only).
    """
    # TODO: Add admin check
    service = FeedbackService(db)
    return service.get_pending_feedback(limit=limit)


@router.post("/feedback/{feedback_id}/review")
async def review_feedback(
    feedback_id: str,
    approved: bool = True,
    admin_notes: Optional[str] = None,
    user = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    """
    Mark feedback as reviewed (admin only).
    
    Args:
        feedback_id: ID of feedback entry
        approved: Whether to use for training
        admin_notes: Optional notes from reviewer
    """
    # TODO: Add admin check
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
    
    return {"success": True, "message": "Feedback reviewed successfully"}


@router.get("/metrics", response_model=DetectionMetrics)
async def get_detection_metrics(
    user = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    """Get real-time detection performance metrics."""
    service = FeedbackService(db)
    return service.get_detection_metrics()


@router.post("/patterns/check")
async def check_similar_patterns(
    prompt: str,
    threshold: float = 0.85,
    user = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    """
    Check if a prompt matches known attack patterns.
    
    This is useful for testing and debugging the pattern matching system.
    """
    similar = PatternExtractionService.find_similar_patterns(
        db=db,
        prompt_text=prompt,
        threshold=threshold
    )
    
    return {
        "prompt": prompt,
        "threshold": threshold,
        "matches_found": len(similar),
        "matches": [
            {
                "pattern_id": p.id,
                "intent": p.semantic_intent,
                "similarity": round(similarity, 3),
                "key_phrases": p.key_phrases,
                "type": p.pattern_type
            }
            for p, similarity in similar
        ]
    }


@router.get("/training/dataset")
async def get_training_dataset(
    min_confidence: float = 0.7,
    limit: int = 1000,
    user = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    """
    Get training dataset for model retraining (admin only).
    
    Returns approved feedback entries with extracted patterns
    formatted for training a new detection model.
    """
    # TODO: Add admin check
    service = FeedbackService(db)
    dataset = service.get_training_dataset(
        min_confidence=min_confidence,
        limit=limit
    )
    
    return {
        "count": len(dataset),
        "min_confidence": min_confidence,
        "dataset": dataset
    }
