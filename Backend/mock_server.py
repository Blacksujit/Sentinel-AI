#!/usr/bin/env python3
"""
Lightweight mock HTTP server for local frontend smoke testing without auth.
Run:
    python Backend/mock_server.py 8000

Endpoints:
- GET /api/me -> returns user with onboarding_completed False
- POST /api/orgs -> creates an org and returns it
- GET /api/orgs -> returns list of orgs
- GET /api/workspaces -> returns workspaces for org_id query
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import urllib.parse
import sys

STATE = {
    "orgs": [],
    "workspaces": [],
    "next_org_id": 1,
    "next_workspace_id": 1,
}

class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Suppress default HTTP server logs
        pass

    def _send_json(self, obj, status=200):
        data = json.dumps(obj).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)
        print(f"[{self.command} {self.path}] -> {status}", file=sys.stderr, flush=True)

    def do_GET(self):
        path = urllib.parse.urlparse(self.path)
        if path.path == "/api/me":
            self._send_json({
                "id": 1,
                "clerk_user_id": "mock-user-1",
                "email": "test@example.com",
                "name": "Mock User",
                "onboarding_completed": False,
                "memberships": [],
            })
            return

        if path.path == "/api/orgs":
            self._send_json(STATE["orgs"])
            return

        if path.path == "/api/workspaces":
            q = urllib.parse.parse_qs(path.query)
            org_id = int(q.get("org_id", [0])[0]) if q.get("org_id") else None
            if org_id:
                w = [ws for ws in STATE["workspaces"] if ws["org_id"] == org_id]
            else:
                w = STATE["workspaces"]
            self._send_json(w)
            return

        # default 404
        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        path = urllib.parse.urlparse(self.path)
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode("utf-8") if length else ""
        data = json.loads(body) if body else {}

        if path.path == "/api/orgs":
            org_id = STATE["next_org_id"]
            STATE["next_org_id"] += 1
            org = {
                "id": org_id,
                "name": data.get("name", f"Org {org_id}"),
                "slug": data.get("slug", f"org-{org_id}"),
                "owner_user_id": 1,
                "plan_tier": "free",
                "created_at": "2026-01-01T00:00:00Z",
            }
            STATE["orgs"].append(org)

            # auto-create default workspace
            ws_id = STATE["next_workspace_id"]
            STATE["next_workspace_id"] += 1
            ws = {
                "id": ws_id,
                "org_id": org_id,
                "name": "Default Workspace",
                "slug": f"default-{ws_id}",
                "is_default": True,
                "created_by_user_id": 1,
                "created_at": "2026-01-01T00:00:00Z",
            }
            STATE["workspaces"].append(ws)

            self._send_json(org, status=201)
            return

        if path.path == "/api/user/onboarding":
            # mark onboarding completed
            # In this mock we don't persist users besides the flag
            resp = {"ok": True}
            self._send_json(resp)
            return

        self.send_response(404)
        self.end_headers()

if __name__ == "__main__":
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except Exception:
            pass
    server = HTTPServer(("0.0.0.0", port), Handler)
    print(f"Mock server running on http://0.0.0.0:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("Stopping mock server")
        server.server_close()
