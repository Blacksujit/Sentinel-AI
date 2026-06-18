#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────────────
# SentinelAI Ubuntu Server Bootstrap Script
# ──────────────────────────────────────────────────────────────────
# Run this on a fresh Ubuntu 22.04/24.04 EC2 instance to set up
# all dependencies for running SentinelAI.
# ──────────────────────────────────────────────────────────────────

echo "==> SentinelAI Ubuntu Bootstrap"

# ── System updates ────────────────────────────────────────────────
sudo apt-get update -qq
sudo apt-get upgrade -y -qq

# ── Install Docker ────────────────────────────────────────────────
if ! command -v docker &> /dev/null; then
    echo "==> Installing Docker..."
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker "$USER"
fi

# ── Install Docker Compose Plugin ─────────────────────────────────
if ! docker compose version &> /dev/null; then
    echo "==> Installing Docker Compose plugin..."
    sudo apt-get install -y -qq docker-compose-plugin
fi

# ── Install Nginx ─────────────────────────────────────────────────
if ! command -v nginx &> /dev/null; then
    echo "==> Installing Nginx..."
    sudo apt-get install -y -qq nginx certbot python3-certbot-nginx
    sudo systemctl enable nginx
fi

# ── Install monitoring tools ──────────────────────────────────────
echo "==> Installing monitoring tools..."
sudo apt-get install -y -qq prometheus-node-exporter htop iotop

# ── Create app directory ──────────────────────────────────────────
sudo mkdir -p /opt/sentinelai
sudo chown "$USER:$USER" /opt/sentinelai

# ── Configure firewall ────────────────────────────────────────────
if command -v ufw &> /dev/null; then
    echo "==> Configuring firewall..."
    sudo ufw allow 22/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw allow 9090/tcp  # Prometheus (internal)
    sudo ufw --force enable
fi

# ── System tuning ─────────────────────────────────────────────────
echo "==> Applying system tuning..."
cat << 'EOF' | sudo tee /etc/sysctl.d/99-sentinelai.conf
# Increase connection backlog
net.core.somaxconn = 65535
# Increase ephemeral port range
net.ipv4.ip_local_port_range = 1024 65535
# TCP fast open
net.ipv4.tcp_fastopen = 3
# Reduce TIME_WAIT
net.ipv4.tcp_fin_timeout = 15
# Increase max open files
fs.file-max = 2097152
EOF
sudo sysctl -p /etc/sysctl.d/99-sentinelai.conf

# ── Increase file descriptors ─────────────────────────────────────
cat << 'EOF' | sudo tee /etc/security/limits.d/99-sentinelai.conf
* soft nofile 1048576
* hard nofile 1048576
root soft nofile 1048576
root hard nofile 1048576
EOF

echo "==> Bootstrap complete!"
echo "    Next steps:"
echo "    1. Clone the repository: git clone <repo> /opt/sentinelai"
echo "    2. Configure .env.production"
echo "    3. Run: bash Backend/scripts/deploy-aws.sh"
echo ""
echo "    NOTE: Log out and back in for Docker group changes to take effect."
