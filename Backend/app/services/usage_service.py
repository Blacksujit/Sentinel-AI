from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func, case
import uuid

from app.storage.usage_models import UsageEvent
from app.storage.billing_models import Subscription, SubscriptionStatus
from app.storage.api_key_models import ApiKey
from app.storage.models import RiskLog


class UsageService:
    """Service for tracking and aggregating API usage."""
    
    @staticmethod
    def record_event(
        db: Session,
        org_id: int,
        endpoint: str,
        api_key_id: Optional[int] = None,
        initiator_user_id: Optional[int] = None,
        latency_ms: Optional[int] = None,
        risk_score: Optional[int] = None,
        success: bool = True,
        error_code: Optional[str] = None,
        event_metadata: Optional[Dict[str, Any]] = None,
    ) -> UsageEvent:
        """Record a usage event."""
        event = UsageEvent(
            org_id=org_id,
            api_key_id=api_key_id,
            initiator_user_id=initiator_user_id,
            endpoint=endpoint,
            timestamp=datetime.now(timezone.utc),
            latency_ms=latency_ms,
            risk_score=risk_score,
            success=success,
            error_code=error_code,
            event_metadata=event_metadata or {},
        )
        db.add(event)
        db.flush()
        
        # Update API key stats
        if api_key_id:
            UsageService._update_api_key_stats(db, api_key_id)
        
        return event
    
    @staticmethod
    def _update_api_key_stats(db: Session, api_key_id: int):
        """Update cached usage counters on API key."""
        cutoff_24h = datetime.now(timezone.utc) - timedelta(hours=24)
        count_24h = db.query(UsageEvent).filter(
            UsageEvent.api_key_id == api_key_id,
            UsageEvent.timestamp >= cutoff_24h
        ).count()
        
        cutoff_30d = datetime.now(timezone.utc) - timedelta(days=30)
        count_30d = db.query(UsageEvent).filter(
            UsageEvent.api_key_id == api_key_id,
            UsageEvent.timestamp >= cutoff_30d
        ).count()
        
        api_key = db.query(ApiKey).filter(ApiKey.id == api_key_id).first()
        if api_key:
            api_key.usage_count_24h = count_24h
            api_key.usage_count_30d = count_30d
            api_key.last_used_at = datetime.now(timezone.utc)
            db.commit()
    
    @staticmethod
    def aggregate_for_org(db: Session, org_id: int) -> Dict[str, Any]:
        """Comprehensive usage aggregation for an org dashboard."""
        # Time ranges
        now = datetime.now(timezone.utc)
        cutoff_24h = now - timedelta(hours=24)
        cutoff_30d = now - timedelta(days=30)
        
        # Total requests
        total = db.query(UsageEvent).filter(UsageEvent.org_id == org_id).count()
        
        # Last 24h
        requests_24h = db.query(UsageEvent).filter(
            UsageEvent.org_id == org_id,
            UsageEvent.timestamp >= cutoff_24h
        ).count()
        
        # Success rate
        success_count = (
            db.query(UsageEvent)
            .filter(UsageEvent.org_id == org_id)
            .filter(UsageEvent.success.is_(True))
            .count()
        )
        success_rate = (success_count / total * 100) if total > 0 else 0
        
        # Latency stats
        latencies = (
            db.query(UsageEvent.latency_ms)
            .filter(UsageEvent.org_id == org_id)
            .filter(UsageEvent.latency_ms.isnot(None))
            .all()
        )
        latency_values = [l[0] for l in latencies]
        avg_latency = sum(latency_values) / len(latency_values) if latency_values else None
        
        # Error rate
        error_count = db.query(UsageEvent).filter(
            UsageEvent.org_id == org_id,
            UsageEvent.success == False
        ).count()
        error_rate = (error_count / total * 100) if total > 0 else 0
        
        return {
            "total_requests": total,
            "requests_24h": requests_24h,
            "success_count": success_count,
            "success_rate": round(success_rate, 2),
            "error_count": error_count,
            "error_rate": round(error_rate, 2),
            "avg_latency_ms": round(avg_latency, 2) if avg_latency else None,
        }
    
    @staticmethod
    def get_org_metrics(
        db: Session,
        org_id: int,
        start_time: datetime,
        end_time: datetime
    ) -> Dict[str, Any]:
        """Get aggregated metrics for organization dashboard."""
        total_requests = db.query(UsageEvent).filter(
            UsageEvent.org_id == org_id,
            UsageEvent.timestamp >= start_time,
            UsageEvent.timestamp <= end_time
        ).count()
        
        error_count = db.query(UsageEvent).filter(
            UsageEvent.org_id == org_id,
            UsageEvent.timestamp >= start_time,
            UsageEvent.timestamp <= end_time,
            UsageEvent.success == False
        ).count()
        error_rate = (error_count / total_requests * 100) if total_requests > 0 else 0
        
        avg_latency = db.query(func.avg(UsageEvent.latency_ms)).filter(
            UsageEvent.org_id == org_id,
            UsageEvent.timestamp >= start_time,
            UsageEvent.timestamp <= end_time
        ).scalar() or 0
        
        # Top endpoints
        top_endpoints = db.query(
            UsageEvent.endpoint,
            func.count(UsageEvent.id).label('count'),
            func.avg(UsageEvent.latency_ms).label('avg_latency')
        ).filter(
            UsageEvent.org_id == org_id,
            UsageEvent.timestamp >= start_time,
            UsageEvent.timestamp <= end_time
        ).group_by(UsageEvent.endpoint).order_by(func.count(UsageEvent.id).desc()).limit(10).all()
        
        return {
            "total_requests": total_requests,
            "error_count": error_count,
            "error_rate": round(error_rate, 2),
            "avg_latency_ms": round(avg_latency, 2),
            "top_endpoints": [
                {
                    "endpoint": ep,
                    "count": cnt,
                    "avg_latency_ms": round(avg_lat, 2)
                } for ep, cnt, avg_lat in top_endpoints
            ]
        }
    
    @staticmethod
    def get_org_logs(
        db: Session,
        org_id: int,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[UsageEvent]:
        """Get organization logs with filtering."""
        query = db.query(UsageEvent).filter(UsageEvent.org_id == org_id)
        
        if start_time:
            query = query.filter(UsageEvent.timestamp >= start_time)
        if end_time:
            query = query.filter(UsageEvent.timestamp <= end_time)
        
        return query.order_by(UsageEvent.timestamp.desc()).limit(limit).offset(offset).all()

    @staticmethod
    def get_monthly_count(
        db: Session,
        org_id: int,
    ) -> int:
        """Get usage count for the current billing period (monthly)."""
        sub = db.query(Subscription).filter(
            Subscription.org_id == org_id,
            Subscription.status.in_([
                SubscriptionStatus.ACTIVE,
                SubscriptionStatus.PAST_DUE,
                SubscriptionStatus.TRIALING,
            ]),
        ).first()

        if sub and sub.current_period_start:
            period_start = sub.current_period_start
        else:
            now = datetime.now(timezone.utc)
            period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        count = db.query(UsageEvent).filter(
            UsageEvent.org_id == org_id,
            UsageEvent.timestamp >= period_start,
        ).count()

        return count

    @staticmethod
    def get_trend(db: Session, org_id: int, days: int = 30) -> List[Dict[str, Any]]:
        """Aggregate RiskLog events grouped by day for risk trend charts.

        Returns an array of day buckets for the last `days` days, each with:
        - date: ISO date string (YYYY-MM-DD)
        - avg_risk_score: average final_risk_score that day (0-1)
        - event_count: total risk events that day
        - critical_count: events with final_risk_score >= 0.8 that day
        """
        if days < 1:
            days = 1
        if days > 365:
            days = 365

        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(days=days)

        day_bucket = func.date(RiskLog.created_at)

        critical_case = case(
            (RiskLog.final_risk_score >= 0.8, 1),
            else_=0,
        )

        rows = (
            db.query(
                day_bucket.label("date"),
                func.avg(RiskLog.final_risk_score).label("avg_risk_score"),
                func.count(RiskLog.id).label("event_count"),
                func.sum(critical_case).label("critical_count"),
            )
            .filter(
                RiskLog.org_id == org_id,
                RiskLog.created_at >= cutoff,
            )
            .group_by(day_bucket)
            .order_by(day_bucket)
            .all()
        )

        return [
            {
                "date": str(r.date),
                "avg_risk_score": round(float(r.avg_risk_score), 4) if r.avg_risk_score is not None else 0.0,
                "event_count": int(r.event_count),
                "critical_count": int(r.critical_count) if r.critical_count is not None else 0,
            }
            for r in rows
        ]
