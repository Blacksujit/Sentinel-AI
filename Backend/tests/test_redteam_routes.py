"""
C5 Redteam API Routes — integration tests.

Tests all /api/redteam/* endpoints end-to-end using the shared
AuthedTestClient from conftest (which injects a dev JWT and in-memory DB).
"""

import pytest
from app.storage.org_models import Organization, OrgMembership
from app.storage.user_models import User
from app.storage.rbac_models import RbacRole, RbacPermission, rbac_role_permissions
from app.redteam.attacks import ATTACK_CASES


# ── helpers ──────────────────────────────────────────────────────────────────


def _seed_redteam_org(db):
    """Create org + RBAC admin role with redteam permissions + membership."""
    user = db.query(User).filter(User.clerk_user_id == "pytest-user").first()
    if not user:
        user = User(clerk_user_id="pytest-user", email="pytest@sentinel.local", name="Pytest User")
        db.add(user)
        db.commit()
        db.refresh(user)

    org = Organization(
        clerk_org_id="org_acme_corp_test",
        name="Acme Corp",
        slug="acme-corp",
        plan_tier="pro",
        owner_user_id=user.id,
    )
    db.add(org)
    db.flush()

    admin_role = RbacRole(org_id=org.id, name="admin")
    db.add(admin_role)
    db.flush()

    for key in ["redteam.run", "redteam.view", "redteam.manage"]:
        perm = RbacPermission(key=key, description=key)
        db.add(perm)
        db.flush()
        db.execute(rbac_role_permissions.insert().values(role_id=admin_role.id, permission_id=perm.id))

    db.add(OrgMembership(user_id=user.id, org_id=org.id, role_id=admin_role.id))
    db.commit()
    db.refresh(org)
    return org


# ── Tests ────────────────────────────────────────────────────────────────────


class TestAttackClassesEndpoint:

    def test_returns_all_attack_classes(self, client, test_db):
        org = _seed_redteam_org(test_db)
        resp = client.get(f"/api/redteam/attack-classes?org_id={org.id}")
        assert resp.status_code == 200
        body = resp.json()
        assert "classes" in body
        for cls in ATTACK_CASES:
            assert cls in body["classes"], f"Missing class: {cls}"
        total = sum(len(v) for v in body["classes"].values())
        assert total > 0

    def test_each_class_has_technique_list(self, client, test_db):
        org = _seed_redteam_org(test_db)
        resp = client.get(f"/api/redteam/attack-classes?org_id={org.id}")
        assert resp.status_code == 200
        for cls_name, techniques in resp.json()["classes"].items():
            assert isinstance(techniques, list)


class TestCreateRun:

    def test_create_run_success(self, client, test_db):
        org = _seed_redteam_org(test_db)
        resp = client.post(
            f"/api/redteam/runs?org_id={org.id}",
            json={"name": "C5 API test", "max_cases": 3, "classes": ["instruction_override"]},
        )
        assert resp.status_code in (200, 201)
        body = resp.json()
        assert body["name"] == "C5 API test"
        assert body["status"] in ("RUNNING", "COMPLETED", "FAILED")

    def test_create_run_default_classes(self, client, test_db):
        org = _seed_redteam_org(test_db)
        resp = client.post(
            f"/api/redteam/runs?org_id={org.id}",
            json={"name": "defaults test", "max_cases": 2},
        )
        assert resp.status_code in (200, 201)
        body = resp.json()
        assert body["attack_classes"] is not None
        assert len(body["attack_classes"]) > 0


class TestListRuns:

    def test_list_runs_empty(self, client, test_db):
        org = _seed_redteam_org(test_db)
        resp = client.get(f"/api/redteam/runs?org_id={org.id}")
        assert resp.status_code == 200

    def test_list_runs_after_create(self, client, test_db):
        org = _seed_redteam_org(test_db)
        create_resp = client.post(
            f"/api/redteam/runs?org_id={org.id}",
            json={"name": "list test", "max_cases": 2},
        )
        assert create_resp.status_code in (200, 201)
        resp = client.get(f"/api/redteam/runs?org_id={org.id}")
        assert resp.status_code == 200


class TestGetRunDetail:

    def test_get_run_detail(self, client, test_db):
        org = _seed_redteam_org(test_db)
        create_resp = client.post(
            f"/api/redteam/runs?org_id={org.id}",
            json={"name": "detail test", "max_cases": 2, "classes": ["instruction_override"]},
        )
        run_id = create_resp.json()["id"]

        resp = client.get(f"/api/redteam/runs/{run_id}?org_id={org.id}")
        assert resp.status_code == 200
        body = resp.json()
        assert body["id"] == run_id
        assert "cases" in body
        assert "findings" in body

    def test_get_run_not_found(self, client, test_db):
        org = _seed_redteam_org(test_db)
        resp = client.get(f"/api/redteam/runs/99999?org_id={org.id}")
        assert resp.status_code == 404


class TestGetRunCases:

    def test_get_cases_after_run(self, client, test_db):
        org = _seed_redteam_org(test_db)
        create_resp = client.post(
            f"/api/redteam/runs?org_id={org.id}",
            json={"name": "cases test", "max_cases": 3, "classes": ["instruction_override"]},
        )
        run_id = create_resp.json()["id"]
        resp = client.get(f"/api/redteam/runs/{run_id}/cases?org_id={org.id}")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)


class TestGetRunFindings:

    def test_get_findings_after_run(self, client, test_db):
        org = _seed_redteam_org(test_db)
        create_resp = client.post(
            f"/api/redteam/runs?org_id={org.id}",
            json={"name": "findings test", "max_cases": 3, "classes": ["instruction_override"]},
        )
        run_id = create_resp.json()["id"]
        resp = client.get(f"/api/redteam/runs/{run_id}/findings?org_id={org.id}")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)


class TestGetRunReport:

    def test_get_report_after_run(self, client, test_db):
        org = _seed_redteam_org(test_db)
        create_resp = client.post(
            f"/api/redteam/runs?org_id={org.id}",
            json={"name": "report test", "max_cases": 3, "classes": ["instruction_override"]},
        )
        run_id = create_resp.json()["id"]
        resp = client.get(f"/api/redteam/runs/{run_id}/report?org_id={org.id}")
        assert resp.status_code == 200
        body = resp.json()
        assert "report" in body
        assert isinstance(body["report"], str)
        assert len(body["report"]) > 0
