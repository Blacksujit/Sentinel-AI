#!/usr/bin/env python3
"""
Stdlib-based smoke test for SentinelAI backend endpoints.
Usage:
  BASE_URL=http://localhost:8000 python Backend/tests/smoke_test.py

This script uses only the Python stdlib (urllib) so it runs without installing extra packages.
"""
import os
import sys
import json
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8000")


def request(path, method="GET", body=None, headers=None):
    url = BASE_URL.rstrip("/") + path
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
    req = Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if headers:
        for k, v in headers.items():
            req.add_header(k, v)
    try:
        with urlopen(req, timeout=10) as resp:
            raw = resp.read().decode("utf-8")
            return resp.getcode(), json.loads(raw) if raw else None
    except HTTPError as e:
        body_text = e.read().decode("utf-8") if e.fp else ""
        print(f"[DEBUG] HTTP Error: {e.code} {e.reason} - {body_text}", file=sys.stderr)
        return e.code, None
    except URLError as e:
        print(f"[DEBUG] Connection failed: {e}", file=sys.stderr)
        sys.exit(2)


def assert_ok(code, name):
    if code >= 200 and code < 300:
        print(f"[OK] {name} -> {code}")
    else:
        print(f"[FAIL] {name} -> {code}")
        sys.exit(1)


def run():
    print("Running smoke tests against:", BASE_URL)

    # /api/me
    code, body = request("/api/me")
    assert_ok(code, "/api/me")
    print("  onboarding_completed:", body.get("onboarding_completed"))

    # POST /api/orgs
    org_payload = {"name": "Test Org", "slug": "test-org"}
    code, body = request("/api/orgs", method="POST", body=org_payload)
    assert_ok(code, "POST /api/orgs")
    org_id = body.get("id")
    print("  created org id:", org_id)

    # GET /api/orgs
    code, body = request("/api/orgs")
    assert_ok(code, "GET /api/orgs")
    print("  orgs count:", len(body) if body else 0)

    # GET /api/workspaces?org_id={org_id}
    code, body = request(f"/api/workspaces?org_id={org_id}")
    assert_ok(code, "/api/workspaces")
    print("  workspaces for org:", body)

    print("All smoke tests passed.")


if __name__ == '__main__':
    run()
