"""
Tests for Phase A enterprise foundation:
- X-Org-Id multi-tenant resolution in /api/analyze
- DB-backed org baselines (GET merge, POST validation + permission + audit)
- Audit log read API (audit.view permission, filters, actor join)
- settings routes auth
- org_sync_service role/audit fixes and FK-safe org deletion
"""

import pytest
from sqlalchemy.orm import Session

from app.storage.org_models import Organization, OrgMembership, PlanTier
from app.storage.user_models import User
from app.storage.rbac_models import RbacRole
from app.storage.usage_models import AuditLog, UsageEvent
from app.storage.baseline_config_models import BaselineConfiguration, DEFAULT_BASELINE_CONFIG
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


@pytest.fixture
def org_env(client, test_db):
    """Seeded RBAC + user with OWNER membership in org_a and org_b."""
    seed_rbac_data(test_db)
    user = _create_user(test_db)
    org_a = _create_org(test_db, user, "Alpha Corp", "org_alpha")
    org_b = _create_org(test_db, user, "Beta Corp", "org_beta")
    _add_membership(test_db, user, org_a)
    _add_membership(test_db, user, org_b)
    test_db.commit()
    return {"user": user, "org_a": org_a, "org_b": org_b}


# ---------------------------------------------------------------------------
# A1: X-Org-Id resolution in /api/analyze
# ---------------------------------------------------------------------------

class TestAnalyzeOrgResolution:
    def test_analyze_respects_x_org_id_header(self, client, test_db, org_env):
        r = client.post(
            "/api/analyze",
            json={"prompt": "Explain how photosynthesis works", "response": "Plants convert light to energy."},
            headers={"X-Org-Id": str(org_env["org_b"].id)},
        )
        assert r.status_code == 200, r.text
        event = (
            test_db.query(UsageEvent)
            .filter(UsageEvent.endpoint == "/analyze")
            .order_by(UsageEvent.id.desc())
            .first()
        )
        assert event is not None
        assert event.org_id == org_env["org_b"].id

    def test_analyze_falls_back_to_first_membership_without_header(self, client, test_db, org_env):
        r = client.post(
            "/api/analyze",
            json={"prompt": "Explain how photosynthesis works", "response": "Plants convert light to energy."},
        )
        assert r.status_code == 200, r.text
        event = (
            test_db.query(UsageEvent)
            .filter(UsageEvent.endpoint == "/analyze")
            .order_by(UsageEvent.id.desc())
            .first()
        )
        assert event is not None
        assert event.org_id == org_env["org_a"].id

    def test_analyze_ignores_header_for_org_user_does_not_belong_to(self, client, test_db, org_env):
        stranger = _create_user(test_db, clerk_user_id="stranger", email="stranger@sentinel.local")
        other = _create_org(test_db, stranger, "Other Inc", "org_other")
        test_db.commit()

        r = client.post(
            "/api/analyze",
            json={"prompt": "Explain how photosynthesis works", "response": "Plants convert light to energy."},
            headers={"X-Org-Id": str(other.id)},
        )
        assert r.status_code == 200, r.text
        event = (
            test_db.query(UsageEvent)
            .filter(UsageEvent.endpoint == "/analyze")
            .order_by(UsageEvent.id.desc())
            .first()
        )
        # Not a member -> fall back to first membership, never the stranger's org
        assert event.org_id == org_env["org_a"].id


# ---------------------------------------------------------------------------
# A2: DB-backed org baselines
# ---------------------------------------------------------------------------

class TestOrgBaselines:
    def test_get_baselines_merges_defaults_with_overrides(self, client, test_db, org_env):
        org_env["org_a"].baseline_config = {"risk_threshold_high": 90.0}
        test_db.commit()

        r = client.get(f"/api/orgs/{org_env['org_a'].id}/baselines")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["risk_threshold_high"] == 90.0
        assert data["risk_threshold_low"] == DEFAULT_BASELINE_CONFIG["risk_threshold_low"]

    def test_post_baselines_persists_and_audits(self, client, test_db, org_env):
        r = client.post(
            f"/api/orgs/{org_env['org_a'].id}/baselines",
            json={"risk_threshold_high": 92.0, "model_sensitivity": "high"},
        )
        assert r.status_code == 200, r.text
        assert r.json()["risk_threshold_high"] == 92.0

        test_db.refresh(org_env["org_a"])
        assert org_env["org_a"].baseline_config["model_sensitivity"] == "high"

        log = (
            test_db.query(AuditLog)
            .filter(AuditLog.org_id == org_env["org_a"].id, AuditLog.action == "baseline.updated")
            .first()
        )
        assert log is not None
        assert log.actor_type == "user"
        assert log.event_metadata["new_values"] == {"risk_threshold_high": 92.0, "model_sensitivity": "high"}

    def test_post_baselines_rejects_unknown_keys(self, client, test_db, org_env):
        r = client.post(
            f"/api/orgs/{org_env['org_a'].id}/baselines",
            json={"not_a_real_setting": 1},
        )
        assert r.status_code == 422, r.text

    def test_post_baselines_requires_settings_update_permission(self, client, test_db, org_env):
        _add_membership(test_db, org_env["user"], org_env["org_b"], role_name="VIEWER")
        test_db.commit()

        r = client.post(
            f"/api/orgs/{org_env['org_b'].id}/baselines",
            json={"risk_threshold_high": 50.0},
        )
        assert r.status_code == 403, r.text


# ---------------------------------------------------------------------------
# A3: Audit log read API
# ---------------------------------------------------------------------------

class TestAuditLogs:
    def test_audit_logs_require_audit_view_permission(self, client, test_db, org_env):
        _add_membership(test_db, org_env["user"], org_env["org_b"], role_name="VIEWER")
        test_db.commit()

        r = client.get(f"/api/orgs/{org_env['org_b'].id}/audit-logs")
        assert r.status_code == 403, r.text

    def test_audit_logs_return_entries_with_actor_and_filters(self, client, test_db, org_env):
        for i in range(3):
            AuditService_log(
                test_db,
                org_id=org_env["org_a"].id,
                actor_user_id=org_env["user"].id,
                actor_type="user",
                action=f"member.invited" if i == 0 else f"apikey.create",
                target_type="member" if i == 0 else "api_key",
                target_id=i,
                event_metadata={"index": i},
            )
        test_db.commit()

        r = client.get(f"/api/orgs/{org_env['org_a'].id}/audit-logs")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["total"] == 3
        assert len(data["items"]) == 3
        assert data["items"][0]["actor"]["email"] == "pytest@sentinel.local"

        r = client.get(f"/api/orgs/{org_env['org_a'].id}/audit-logs", params={"action": "member.invited"})
        assert r.status_code == 200, r.text
        assert r.json()["total"] == 1

        r = client.get(f"/api/orgs/{org_env['org_a'].id}/audit-logs", params={"limit": 1, "offset": 0})
        assert r.status_code == 200, r.text
        assert r.json()["total"] == 3
        assert len(r.json()["items"]) == 1

    def test_audit_logs_scope_to_org(self, client, test_db, org_env):
        AuditService_log(
            test_db,
            org_id=org_env["org_b"].id,
            actor_user_id=org_env["user"].id,
            actor_type="user",
            action="member.invited",
        )
        test_db.commit()

        r = client.get(f"/api/orgs/{org_env['org_a'].id}/audit-logs")
        assert r.status_code == 200, r.text
        assert r.json()["total"] == 0


def AuditService_log(db, **kwargs):
    from app.services.audit_service import AuditService
    return AuditService.log(db, **kwargs)


# ---------------------------------------------------------------------------
# A4: settings auth + org_sync_service fixes
# ---------------------------------------------------------------------------

class TestSettingsAuth:
    def test_settings_require_auth(self, test_db):
        from fastapi.testclient import TestClient
        from main import app

        raw = TestClient(app)
        r = raw.get("/api/settings")
        assert r.status_code == 401

    def test_settings_ok_with_auth(self, client, test_db):
        r = client.get("/api/settings")
        assert r.status_code == 200


class TestOrgSyncService:
    def test_sync_from_clerk_assigns_system_owner_role_and_audits(self, client, test_db):
        seed_rbac_data(test_db)
        owner = _create_user(test_db)
        test_db.commit()

        from app.services.org_sync_service import OrganizationSyncService
        org = OrganizationSyncService.sync_from_clerk(
            clerk_org_id="org_sync_1",
            name="Synced Corp",
            slug="synced-corp",
            owner_clerk_user_id=owner.clerk_user_id,
            company_email="ops@synced.com",
            db=test_db,
        )

        assert org is not None
        membership = (
            test_db.query(OrgMembership)
            .filter(OrgMembership.user_id == owner.id, OrgMembership.org_id == org.id)
            .first()
        )
        assert membership is not None
        role = test_db.query(RbacRole).filter(RbacRole.id == membership.role_id).first()
        assert role is not None
        assert role.name == "OWNER"
        assert role.org_id is None

        log = (
            test_db.query(AuditLog)
            .filter(AuditLog.org_id == org.id, AuditLog.action == "org.created")
            .first()
        )
        assert log is not None
        assert log.actor_type == "user"
        assert log.event_metadata["target_name"] == "Synced Corp"

        baseline = (
            test_db.query(BaselineConfiguration)
            .filter(BaselineConfiguration.org_id == org.id)
            .first()
        )
        assert baseline is not None

    def test_delete_organization_purges_dependents_and_preserves_audit(self, client, test_db):
        seed_rbac_data(test_db)
        owner = _create_user(test_db)
        org = _create_org(test_db, owner, "Doomed Corp", "org_doomed")
        _add_membership(test_db, owner, org)
        test_db.commit()

        from app.services.org_sync_service import OrganizationSyncService
        OrganizationSyncService.delete_organization(org.id, db=test_db, deleted_by_user_id=owner.id)

        assert test_db.query(Organization).filter(Organization.id == org.id).first() is None
        assert test_db.query(OrgMembership).filter(OrgMembership.org_id == org.id).first() is None
        # Audit record survives, detached from the org
        log = (
            test_db.query(AuditLog)
            .filter(AuditLog.action == "org.deleted")
            .order_by(AuditLog.id.desc())
            .first()
        )
        assert log is not None
        assert log.event_metadata["target_name"] == "Doomed Corp"
        assert log.org_id is None
