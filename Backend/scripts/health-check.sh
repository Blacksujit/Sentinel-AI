#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────────────
# SentinelAI Service Health Check
# ──────────────────────────────────────────────────────────────────

API_URL="${API_URL:-http://localhost:8000}"
TIMEOUT="${TIMEOUT:-5}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_endpoint() {
    local name="$1"
    local url="$2"
    local response

    if response=$(curl -sf --max-time "$TIMEOUT" "$url" 2>&1); then
        echo -e "${GREEN}✓${NC} $name ($url)"
        echo "    $response"
        return 0
    else
        echo -e "${RED}✗${NC} $name ($url)"
        echo "    $response"
        return 1
    fi
}

echo "=========================================="
echo "  SentinelAI Health Check"
echo "  Target: $API_URL"
echo "  Time:   $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "=========================================="
echo ""

failed=0

check_endpoint "Liveness"  "$API_URL/liveness"  || failed=$((failed + 1))
check_endpoint "Readiness" "$API_URL/readiness" || failed=$((failed + 1))
check_endpoint "Health"    "$API_URL/health"    || failed=$((failed + 1))

echo ""
if [ "$failed" -eq 0 ]; then
    echo -e "${GREEN}All health checks passed.${NC}"
    exit 0
else
    echo -e "${RED}$failed health check(s) failed.${NC}"
    exit 1
fi
