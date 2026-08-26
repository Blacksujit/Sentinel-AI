"""
Tests for the GET /api/orgs/{org_id}/usage/trend risk trend endpoint.

Verifies the response shape matches the API contract:
- date: ISO date string (YYYY-MM-DD)
- avg_risk_score: float 0-1
- event_count: int
- critical_count: int (events with final_risk_score >= 0.8)
"""

from datetime import datetime, timezone, timedelta

import pytest
from sqlalchemy.orm import Session

from app.storage.models import RiskLog
from app.storage.org_models import Organization, OrgMembership, PlanTier
from app.storage.user_models import User
from app.storage.rbac_models import RbacRole
from app.services.seed_service import seed_rbac_data


CLERK_USER_ID = "pytest-user"


def _create_user(db: Session, clerk_user_id: str = CLERK_USER_ID, email: str = "pytest@sentinel.local") -> User:
    user = db.query(User).filter(User.clerk_user_id == clerk_user_id).first()
    if not user:
        user = User(clerk_user_id=clerk_user_id, email=email, name="Pytest User")
        db.add(user)
        db.flush()
    return user


def _create_org(db: Session, owner: User, name: str, clerk_id: str) -> Organization:
    org = Organization(
        clerk_org_id=clerk_id,
        name=name,
        slug=f"org-{clerk_id.lower()}",
        owner_user_id=owner.id,
        plan_tier=PlanTier.FREE,
    )
    db.add(org)
    db.flush()
    return org


def _add_membership(db: Session, user: User, org: Organization, role_name: str = "OWNER") -> None:
    role = db.query(RbacRole).filter(RbacRole.name == role_name, RbacRole.org_id.is_(None)).first()
    existing = (
        db.query(OrgMembership)
        .filter(OrgMembership.user_id == user.id, OrgMembership.org_id == org.id)
        .first()
    )
    if existing:
        existing.role_id = role.id
    else:
        db.add(OrgMembership(user_id=user.id, org_id=org.id, role_id=role.id))
    db.flush()


def _risk_log(db: Session, org_id: int, score: float, when: datetime) -> RiskLog:
    log = RiskLog(
        prompt="test prompt",
        response="test response",
        final_risk_score=score,
        flags="[]",
        confidence=0.9,
        decision="allow",
        decision_reason="test",
        signals="[]",
        org_id=org_id,
        created_at=when,
    )
    db.add(log)
    db.flush()
    return log


@pytest.fixture
def org_env(client, test_db):
    """Seeded RBAC + OWNER membership so usage.view permission resolves."""
    seed_rbac_data(test_db)
    user = _create_user(test_db)
    org = _create_org(test_db, user, "Trend Corp", "org_trend")
    _add_membership(test_db, user, org)
    test_db.commit()
    return {"user": user, "org": org}


class TestUsageTrendEndpoint:
    """Tests for GET /api/orgs/{org_id}/usage/trend."""

    def test_empty_trend_returns_array(self, client, test_db, org_env):
        """No events -> empty array (not wrapped in an object)."""
        r = client.get(f"/api/orgs/{org_env['org'].id}/usage/trend")
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        assert data == []

    def test_trend_shape_matches_contract(self, client, test_db, org_env):
        """A single day bucket returns the exact contract fields and types."""
        now = datetime.now(timezone.utc)
        _risk_log(test_db, org_env["org"].id, 0.2, now)
        _risk_log(test_db, org_env["org"].id, 0.4, now)
        _risk_log(test_db, org_env["org"].id, 0.9, now)
        test_db.commit()

        r = client.get(f"/api/orgs/{org_env['org'].id}/usage/trend")
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 1

        bucket = data[0]
        assert set(bucket.keys()) == {"date", "avg_risk_score", "event_count", "critical_count"}
        # date is ISO string YYYY-MM-DD
        assert isinstance(bucket["date"], str)
        assert len(bucket["date"]) == 10
        assert bucket["date"][4] == "-" and bucket["date"][7] == "-"
        # avg_risk_score: (0.2 + 0.4 + 0.9) / 3 = 0.5
        assert isinstance(bucket["avg_risk_score"], (int, float))
        assert 0.0 <= bucket["avg_risk_score"] <= 1.0
        assert abs(bucket["avg_risk_score"] - 0.5) < 0.01
        # event_count
        assert bucket["event_count"] == 3
        # critical_count: only 0.9 >= 0.8
        assert bucket["critical_count"] == 1

    def test_trend_groups_by_day(self, client, test_db, org_env):
        """Events on different days produce separate buckets."""
        now = datetime.now(timezone.utc)
        yesterday = now - timedelta(days=1)
        _risk_log(test_db, org_env["org"].id, 0.1, now)
        _risk_log(test_db, org_env["org"].id, 0.1, now)
        _risk_log(test_db, org_env["org"].id, 0.85, yesterday)
        test_db.commit()

        r = client.get(f"/api/orgs/{org_env['org'].id}/usage/trend", params={"days": 30})
        assert r.status_code == 200, r.text
        data = r.json()
        assert len(data) == 2
        dates = [b["date"] for b in data]
        assert len(set(dates)) == 2
        # buckets ordered ascending by date
        assert dates[0] < dates[1]

    def test_trend_respects_days_window(self, client, test_db, org_env):
        """Old events outside the days window are excluded."""
        now = datetime.now(timezone.utc)
        old = now - timedelta(days=40)
        _risk_log(test_db, org_env["org"].id, 0.3, now)
        _risk_log(test_db, org_env["org"].id, 0.3, old)
        test_db.commit()

        # 30-day window excludes the 40-day-old event
        r = client.get(f"/api/orgs/{org_env['org'].id}/usage/trend", params={"days": 30})
        assert r.status_code == 200, r.text
        data = r.json()
        assert len(data) == 1
        assert data[0]["event_count"] == 1

    def test_trend_scoped_to_org(self, client, test_db, org_env):
        """Events from another org do not leak into this org's trend."""
        now = datetime.now(timezone.utc)
        _risk_log(test_db, org_env["org"].id, 0.2, now)

        other_owner = _create_user(test_db, clerk_user_id="other-user", email="other@sentinel.local")
        other_org = _create_org(test_db, other_owner, "Other Corp", "org_other_trend")
        _add_membership(test_db, other_owner, other_org)
        _risk_log(test_db, other_org.id, 0.95, now)
        test_db.commit()

        r = client.get(f"/api/orgs/{org_env['org'].id}/usage/trend")
        assert r.status_code == 200, r.text
        data = r.json()
        assert len(data) == 1
        assert data[0]["event_count"] == 1
        assert data[0]["critical_count"] == 0

    def test_trend_requires_usage_view_permission(self, client, test_db, org_env):
        """A role without usage.view gets 403."""
        # Create a custom role with no permissions and reassign the membership.
        no_perm_role = RbacRole(name="NO_USAGE", org_id=None)
        test_db.add(no_perm_role)
        test_db.flush()
        membership = (
            test_db.query(OrgMembership)
            .filter(
                OrgMembership.user_id == org_env["user"].id,
                OrgMembership.org_id == org_env["org"].id,
            )
            .first()
        )
        membership.role_id = no_perm_role.id
        test_db.commit()

        r = client.get(f"/api/orgs/{org_env['org'].id}/usage/trend")
        assert r.status_code == 403, r.text
