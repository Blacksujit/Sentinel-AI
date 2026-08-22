"""
Feedback service for the learning loop.
Handles CRUD operations, pattern extraction, and database management.
"""

import uuid
import hashlib
import json
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.learning.models import (
    FeedbackEntry, ExtractedPattern, DetectionLog,
    FeedbackSubmission, FeedbackResponse, FeedbackStats,
    PatternSubmission, DetectionMetrics
)
from app.learning.pattern_extractor import PatternExtractor, ExtractedPattern as ExtractedPatternData
from app.storage.models import RiskLog


class FeedbackService:
    """Service for managing feedback and learning data."""
    
    def __init__(self, db: Session):
        self.db = db
        self.pattern_extractor = PatternExtractor()
    
    def submit_feedback(
        self,
        user_id: str,
        submission: FeedbackSubmission
    ) -> FeedbackResponse:
        """
        Submit new feedback about a missed detection.
        """
        # Generate IDs
        feedback_id = str(uuid.uuid4())
        prompt_hash = hashlib.sha256(
            submission.prompt_text.encode()
        ).hexdigest()[:64]
        
        # Create feedback entry
        entry = FeedbackEntry(
            id=feedback_id,
            prompt_hash=prompt_hash,
            prompt_text=submission.prompt_text,
            response_text=submission.response_text,
            user_reported=True,
            auto_detected=False,
            user_id=user_id,
            conversation_id=submission.conversation_id,
            attack_category=submission.attack_category,
            metadata_json={'notes': submission.notes} if submission.notes else {}
        )
        
        self.db.add(entry)
        
        # Extract patterns
        extracted_pattern = self.pattern_extractor.extract_from_feedback(
            feedback_id=feedback_id,
            prompt=submission.prompt_text,
            response=submission.response_text
        )
        
        # Save extracted pattern to database
        pattern_db = ExtractedPattern(
            id=extracted_pattern.pattern_id,
            feedback_id=feedback_id,
            semantic_intent=extracted_pattern.semantic_intent,
            key_phrases=extracted_pattern.key_phrases,
            embedding_vector=extracted_pattern.embedding_vector,
            pattern_type=extracted_pattern.pattern_type,
            confidence=extracted_pattern.confidence,
            created_at=extracted_pattern.created_at,
            variations=extracted_pattern.variations
        )
        self.db.add(pattern_db)
        
        # Update or create pattern index
        self._update_pattern_index(extracted_pattern)
        
        self.db.commit()
        
        return FeedbackResponse(
            success=True,
            feedback_id=feedback_id,
            message=f"Feedback recorded. Extracted {len(extracted_pattern.key_phrases)} key patterns.",
            extracted_patterns=[
                {
                    'pattern_id': extracted_pattern.pattern_id,
                    'intent': extracted_pattern.semantic_intent,
                    'confidence': extracted_pattern.confidence,
                    'key_phrases': extracted_pattern.key_phrases,
                    'variations_generated': len(extracted_pattern.variations)
                }
            ]
        )
    
    def log_detection(
        self,
        user_id: str,
        prompt: str,
        response: str,
        detection_score: float,
        final_risk_score: float,
        flags: List[str],
        action_taken: str,
        processing_time_ms: float,
        conversation_id: Optional[str] = None,
        model_version: str = "1.0"
    ) -> str:
        """
        Log every detection for analysis.
        Returns the log ID.
        """
        log_id = str(uuid.uuid4())
        prompt_hash = hashlib.sha256(prompt.encode()).hexdigest()[:64]
        
        log = DetectionLog(
            id=log_id,
            prompt_hash=prompt_hash,
            prompt_text=prompt,
            response_text=response,
            user_id=user_id,
            conversation_id=conversation_id,
            detection_score=detection_score,
            final_risk_score=final_risk_score,
            flags_triggered=flags,
            action_taken=action_taken,
            processing_time_ms=processing_time_ms,
            model_version=model_version
        )
        
        self.db.add(log)
        self.db.commit()
        
        return log_id
    
    def report_compliance_issue(
        self,
        log_id: str,
        user_id: str
    ) -> FeedbackResponse:
        """
        Report that model started complying with harmful request.
        """
        # Get the log entry
        log = self.db.query(DetectionLog).filter_by(id=log_id).first()
        if not log:
            return FeedbackResponse(
                success=False,
                feedback_id="",
                message="Log entry not found"
            )
        
        # Create feedback entry
        feedback_id = str(uuid.uuid4())
        entry = FeedbackEntry(
            id=feedback_id,
            prompt_hash=log.prompt_hash,
            prompt_text=log.prompt_text,
            response_text=log.response_text,
            detection_score=log.detection_score,
            final_risk_score=log.final_risk_score,
            user_reported=True,
            auto_detected=True,
            compliance_detected=True,
            user_id=user_id,
            conversation_id=log.conversation_id,
            attack_category='compliance_issue',
            flags=log.flags_triggered
        )
        
        self.db.add(entry)
        
        # Extract patterns
        extracted_pattern = self.pattern_extractor.extract_from_feedback(
            feedback_id=feedback_id,
            prompt=log.prompt_text,
            response=log.response_text
        )
        
        # Save pattern
        pattern_db = ExtractedPattern(
            id=extracted_pattern.pattern_id,
            feedback_id=feedback_id,
            semantic_intent=extracted_pattern.semantic_intent,
            key_phrases=extracted_pattern.key_phrases,
            embedding_vector=extracted_pattern.embedding_vector,
            pattern_type='compliance_inducing',
            confidence=extracted_pattern.confidence,
            created_at=extracted_pattern.created_at,
            variations=extracted_pattern.variations
        )
        self.db.add(pattern_db)
        self.db.commit()
        
        return FeedbackResponse(
            success=True,
            feedback_id=feedback_id,
            message="Compliance issue recorded. Pattern extracted for training.",
            extracted_patterns=[
                {
                    'pattern_id': extracted_pattern.pattern_id,
                    'intent': extracted_pattern.semantic_intent,
                    'confidence': extracted_pattern.confidence
                }
            ]
        )
    
    def submit_review(
        self,
        log: RiskLog,
        disposition: str,
        notes: Optional[str],
        user_id: str,
    ) -> FeedbackResponse:
        """
        Record an admin disposition for a risk log in the review queue.

        The disposition is stored as a reviewed feedback entry: confirmed
        threats and compliance issues are flagged for training, false
        positives are explicitly excluded from the training set.
        """
        if disposition not in ("confirmed_threat", "false_positive", "compliance_issue"):
            return FeedbackResponse(
                success=False,
                feedback_id="",
                message=f"Unknown disposition: {disposition}",
            )

        feedback_id = str(uuid.uuid4())
        entry = FeedbackEntry(
            id=feedback_id,
            prompt_hash=hashlib.sha256((log.prompt or "").encode()).hexdigest()[:64],
            prompt_text=log.prompt,
            response_text=log.response,
            final_risk_score=log.final_risk_score,
            user_reported=False,
            auto_detected=True,
            user_id=user_id,
            attack_category=disposition,
            flags=json.loads(log.flags) if log.flags else [],
            metadata_json={
                "source_log_id": str(log.id),
                "disposition": disposition,
                "notes": notes or "",
                "reviewed_at": datetime.utcnow().isoformat(),
            },
            reviewed=True,
            used_for_training=disposition in ("confirmed_threat", "compliance_issue"),
        )
        self.db.add(entry)
        self.db.commit()

        messages = {
            "confirmed_threat": "Disposition recorded as confirmed threat (queued for training).",
            "false_positive": "Disposition recorded as false positive (excluded from training).",
            "compliance_issue": "Compliance issue recorded (queued for training).",
        }
        return FeedbackResponse(
            success=True,
            feedback_id=feedback_id,
            message=messages[disposition],
        )

    def get_reviewed_log_ids(self) -> set:
        """Return the set of risk log IDs that already have a review disposition."""
        entries = self.db.query(FeedbackEntry).filter(
            FeedbackEntry.reviewed.is_(True),
            FeedbackEntry.attack_category.in_(
                ("confirmed_threat", "false_positive", "compliance_issue")
            ),
        ).all()
        reviewed = set()
        for e in entries:
            if e.metadata_json and "source_log_id" in e.metadata_json:
                try:
                    reviewed.add(int(e.metadata_json["source_log_id"]))
                except (TypeError, ValueError):
                    continue
        return reviewed

    def get_feedback_stats(self) -> FeedbackStats:
        """Get statistics about feedback."""
        total = self.db.query(FeedbackEntry).count()
        user_reported = self.db.query(FeedbackEntry).filter_by(
            user_reported=True
        ).count()
        auto_detected = self.db.query(FeedbackEntry).filter_by(
            auto_detected=True
        ).count()
        reviewed = self.db.query(FeedbackEntry).filter_by(
            reviewed=True
        ).count()
        used_for_training = self.db.query(FeedbackEntry).filter_by(
            used_for_training=True
        ).count()
        
        # By category
        category_counts = {}
        categories = self.db.query(
            FeedbackEntry.attack_category,
            func.count(FeedbackEntry.id)
        ).group_by(FeedbackEntry.attack_category).all()
        
        for cat, count in categories:
            category_counts[cat] = count
        
        # Recent trend (last 7 days)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        recent = self.db.query(FeedbackEntry).filter(
            FeedbackEntry.timestamp >= seven_days_ago
        ).order_by(FeedbackEntry.timestamp).all()
        
        trend = []
        for entry in recent:
            trend.append({
                'date': entry.timestamp.isoformat(),
                'category': entry.attack_category,
                'score': entry.detection_score
            })
        
        return FeedbackStats(
            total_feedback=total,
            user_reported=user_reported,
            auto_detected=auto_detected,
            reviewed=reviewed,
            used_for_training=used_for_training,
            by_category=category_counts,
            recent_trend=trend
        )
    
    def get_detection_metrics(self) -> DetectionMetrics:
        """Get real-time detection performance metrics."""
        # Calculate from recent logs
        last_24h = datetime.utcnow() - timedelta(hours=24)
        
        recent_logs = self.db.query(DetectionLog).filter(
            DetectionLog.timestamp >= last_24h
        ).all()
        
        if not recent_logs:
            return DetectionMetrics(
                detection_rate=0.0,
                false_negative_rate=0.0,
                false_positive_rate=0.0,
                avg_detection_time_ms=0.0,
                new_patterns_last_24h=0,
                pending_review=0
            )
        
        # Detection rate (% of high-risk detected)
        high_risk = [l for l in recent_logs if l.final_risk_score > 0.7]
        detected = [l for l in high_risk if l.action_taken in ['blocked', 'warned']]
        detection_rate = len(detected) / len(high_risk) if high_risk else 1.0
        
        # Average detection time
        avg_time = sum(l.processing_time_ms for l in recent_logs) / len(recent_logs)
        
        # New patterns
        new_patterns = self.db.query(ExtractedPattern).filter(
            ExtractedPattern.created_at >= last_24h
        ).count()
        
        # Pending review
        pending = self.db.query(FeedbackEntry).filter_by(
            reviewed=False
        ).count()

        # False-positive / false-negative rates from reviewed human feedback.
        # attack_category stores the reviewer disposition
        # (confirmed_threat | false_positive | compliance_issue).
        reviewed_entries = self.db.query(FeedbackEntry).filter_by(reviewed=True).all()
        if reviewed_entries:
            fp_count = sum(1 for e in reviewed_entries if e.attack_category == "false_positive")
            fn_count = sum(1 for e in reviewed_entries if e.attack_category == "confirmed_threat")
            false_positive_rate = round(fp_count / len(reviewed_entries), 3)
            false_negative_rate = round(fn_count / len(reviewed_entries), 3)
        else:
            false_positive_rate = 0.0
            false_negative_rate = 0.0

        return DetectionMetrics(
            detection_rate=round(detection_rate, 3),
            false_negative_rate=false_negative_rate,
            false_positive_rate=false_positive_rate,
            avg_detection_time_ms=round(avg_time, 2),
            new_patterns_last_24h=new_patterns,
            pending_review=pending
        )
    
    def get_pending_feedback(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get feedback entries pending review."""
        entries = self.db.query(FeedbackEntry).filter_by(
            reviewed=False
        ).order_by(desc(FeedbackEntry.timestamp)).limit(limit).all()
        
        return [
            {
                'id': e.id,
                'prompt': e.prompt_text[:200] + '...' if len(e.prompt_text) > 200 else e.prompt_text,
                'attack_category': e.attack_category,
                'detection_score': e.detection_score,
                'user_reported': e.user_reported,
                'timestamp': e.timestamp.isoformat()
            }
            for e in entries
        ]
    
    def review_feedback(
        self,
        feedback_id: str,
        approved: bool,
        admin_notes: Optional[str] = None
    ) -> bool:
        """
        Mark feedback as reviewed and optionally use for training.
        """
        entry = self.db.query(FeedbackEntry).filter_by(id=feedback_id).first()
        if not entry:
            return False
        
        entry.reviewed = True
        entry.used_for_training = approved
        
        if admin_notes:
            metadata_json = entry.metadata_json or {}
            metadata_json['admin_notes'] = admin_notes
            metadata_json['reviewed_at'] = datetime.utcnow().isoformat()
            entry.metadata_json = metadata_json
        
        self.db.commit()
        return True
    
    def find_similar_feedback(
        self,
        prompt: str,
        threshold: float = 0.85
    ) -> List[Dict[str, Any]]:
        """
        Find similar previous feedback using embeddings.
        """
        # Generate embedding for query
        query_embedding = self.pattern_extractor.embedding_generator.generate(prompt)
        
        # Get all patterns
        patterns = self.db.query(ExtractedPattern).all()
        
        similar = []
        for p in patterns:
            similarity = self.pattern_extractor.embedding_generator.similarity(
                query_embedding,
                p.embedding_vector
            )
            
            if similarity >= threshold:
                similar.append({
                    'pattern_id': p.id,
                    'feedback_id': p.feedback_id,
                    'intent': p.semantic_intent,
                    'similarity': round(similarity, 3),
                    'key_phrases': p.key_phrases
                })
        
        # Sort by similarity
        similar.sort(key=lambda x: x['similarity'], reverse=True)
        return similar[:10]  # Top 10
    
    def _update_pattern_index(self, pattern: ExtractedPatternData):
        """
        Update the pattern index for faster similarity search.
        In production, this would update a vector database like Pinecone.
        """
        # For now, patterns are stored in PostgreSQL
        # In production: vector_db.upsert(pattern.id, pattern.embedding_vector)
        pass
    
    def get_training_dataset(
        self,
        min_confidence: float = 0.7,
        limit: int = 1000
    ) -> List[Dict[str, Any]]:
        """
        Get dataset for model retraining.
        """
        # Get approved feedback with patterns
        entries = self.db.query(FeedbackEntry).filter_by(
            used_for_training=True,
            reviewed=True
        ).join(
            ExtractedPattern,
            FeedbackEntry.id == ExtractedPattern.feedback_id
        ).filter(
            ExtractedPattern.confidence >= min_confidence
        ).limit(limit).all()
        
        dataset = []
        for entry in entries:
            patterns = self.db.query(ExtractedPattern).filter_by(
                feedback_id=entry.id
            ).all()
            
            for p in patterns:
                dataset.append({
                    'prompt': entry.prompt_text,
                    'response': entry.response_text,
                    'label': 'jailbreak_attempt',
                    'intent': p.semantic_intent,
                    'key_phrases': p.key_phrases,
                    'embedding': p.embedding_vector,
                    'variations': p.variations,
                    'confidence': p.confidence
                })
        
        return dataset
