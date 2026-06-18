#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────────────
# Generate self-signed SSL certificates for development
# ──────────────────────────────────────────────────────────────────

SSL_DIR="$(cd "$(dirname "$0")/../nginx/ssl" && pwd)"
mkdir -p "$SSL_DIR"

DAYS=3650
KEY="$SSL_DIR/key.pem"
CERT="$SSL_DIR/cert.pem"

if [ -f "$KEY" ] && [ -f "$CERT" ]; then
    echo "SSL certificates already exist at $SSL_DIR"
    echo "To regenerate, delete them first: rm $SSL_DIR/*.pem"
    exit 0
fi

echo "==> Generating self-signed SSL certificates..."
openssl req -x509 -newkey rsa:4096 -nodes \
    -keyout "$KEY" \
    -out "$CERT" \
    -days "$DAYS" \
    -subj "/C=US/ST=State/L=City/O=SentinelAI/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,DNS:sentinelai-api,IP:127.0.0.1"

chmod 600 "$KEY"
echo "    Certificate: $CERT"
echo "    Private key: $KEY (chmod 600)"
echo "    Expires:     $(date -d "+$DAYS days" '+%Y-%m-%d')"
echo ""
echo "For production, replace with Let's Encrypt certs via certbot."
