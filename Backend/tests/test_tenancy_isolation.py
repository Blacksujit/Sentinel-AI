"""
Tenancy isolation tests — verify no cross-org data leaks.

These tests prove that an authenticated user from Org A cannot access
data or create billing artifacts for Org B. They are the regression
guard for the cross-org leak fixes in billing_routes.py and the
membership-enforcement audit from Docs/MVP_IMPLEMENTATION_PRIORITIES.md
(Phase 2: Tenancy Audit).

Background:
- billing_routes.py /create-checkout and /create-portal previously
  resolved the org from the caller-supplied org_id without verifying
  that the caller is a member of that org. An authenticated user from
  Org A could create a Stripe checkout / portal session for Org B.
- The fix adds require_org_membership(db, user_id, org_id) to both
  endpoints.
- usage_routes.py uses require_permission_from_path(...) which returns
  Depends(...) and internally calls require_org_membership, so those
  routes were already safe.
"""

import pytest
from sqlalchemy.orm import Session

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


@pytest.fixture
def tenancy_env(client, test_db):
    """
    User is a member of org_a ONLY.
    org_b is a separate org the user does NOT belong to.
    org_c is a third org owned by a stranger the user does NOT belong to.
    """
    seed_rbac_data(test_db)
    user = _create_user(test_db)
    stranger = _create_user(test_db, clerk_user_id="stranger", email="stranger@sentinel.local")
    org_a = _create_org(test_db, user, "Alpha Corp", "org_alpha")
    org_b = _create_org(test_db, stranger, "Beta Corp", "org_beta")
    org_c = _create_org(test_db, stranger, "Gamma Corp", "org_gamma")
    _add_membership(test_db, user, org_a)
    _add_membership(test_db, stranger, org_b)
    _add_membership(test_db, stranger, org_c)
    test_db.commit()
    return {
        "user": user,
        "stranger": stranger,
        "org_a": org_a,
        "org_b": org_b,
        "org_c": org_c,
    }


# ---------------------------------------------------------------------------
# Billing: /create-checkout and /create-portal must enforce org membership
# ---------------------------------------------------------------------------

class TestBillingTenancy:
    def test_create_checkout_for_own_org_is_allowed(self, client, test_db, tenancy_env):
        """Positive control: member can create checkout for their own org."""
        r = client.post(
            "/api/billing/create-checkout",
            json={
                "org_id": str(tenancy_env["org_a"].id),
                "price_id": "price_test",
            },
        )
        # We expect either success (200 with url) or a non-403 error
        # (Stripe misconfiguration), but NOT 403 (forbidden).
        assert r.status_code != 403, r.text

    def test_create_checkout_for_other_org_is_forbidden(self, client, test_db, tenancy_env):
        """Regression: user from org_a must NOT create checkout for org_b."""
        r = client.post(
            "/api/billing/create-checkout",
            json={
                "org_id": str(tenancy_env["org_b"].id),
                "price_id": "price_test",
            },
        )
        assert r.status_code == 403, r.text
        assert "not a member" in r.text.lower()

    def test_create_checkout_for_stranger_org_is_forbidden(self, client, test_db, tenancy_env):
        """Regression: user from org_a must NOT create checkout for org_c."""
        r = client.post(
            "/api/billing/create-checkout",
            json={
                "org_id": str(tenancy_env["org_c"].id),
                "price_id": "price_test",
            },
        )
        assert r.status_code == 403, r.text
        assert "not a member" in r.text.lower()

    def test_create_portal_for_other_org_is_forbidden(self, client, test_db, tenancy_env):
        """Regression: user from org_a must NOT create portal for org_b."""
        r = client.post(
            "/api/billing/create-portal",
            json={
                "org_id": str(tenancy_env["org_b"].id),
                "return_url": "https://app.sentinelai.com/billing",
            },
        )
        assert r.status_code == 403, r.text
        assert "not a member" in r.text.lower()

    def test_create_portal_for_own_org_returns_not_403(self, client, test_db, tenancy_env):
        """Positive control: member gets past membership check for own org.

        May return 404 (no subscription) but must NOT return 403.
        """
        r = client.post(
            "/api/billing/create-portal",
            json={
                "org_id": str(tenancy_env["org_a"].id),
                "return_url": "https://app.sentinelai.com/billing",
            },
        )
        assert r.status_code != 403, r.text


# ---------------------------------------------------------------------------
# Usage routes: /orgs/{org_id}/usage* must enforce membership via
# require_permission_from_path -> require_org_membership
# ---------------------------------------------------------------------------

class TestUsageTenancy:
    def test_usage_for_own_org_is_allowed(self, client, test_db, tenancy_env):
        """Positive control: member can read their own org's usage."""
        r = client.get(f"/api/orgs/{tenancy_env['org_a'].id}/usage")
        assert r.status_code == 200, r.text

    def test_usage_for_other_org_is_forbidden(self, client, test_db, tenancy_env):
        """Regression: user from org_a must NOT read org_b's usage."""
        r = client.get(f"/api/orgs/{tenancy_env['org_b'].id}/usage")
        assert r.status_code == 403, r.text

    def test_usage_stats_for_other_org_is_forbidden(self, client, test_db, tenancy_env):
        """Regression: user from org_a must NOT read org_b's usage stats."""
        r = client.get(f"/api/orgs/{tenancy_env['org_b'].id}/usage/stats")
        assert r.status_code == 403, r.text

    def test_usage_trend_for_other_org_is_forbidden(self, client, test_db, tenancy_env):
        """Regression: user from org_a must NOT read org_b's usage trend."""
        r = client.get(f"/api/orgs/{tenancy_env['org_b'].id}/usage/trend")
        assert r.status_code == 403, r.text
