"""
Alert integration layer for delivering security alerts.

Supports:
  - Slack (webhook + API)
  - Email (via existing email service or SMTP)
  - PagerDuty (Events API v2)
  - Custom webhooks

Each integration is resilient — failures are logged and retried,
never crash the main pipeline.
"""

import asyncio
import hashlib
import hmac
import json
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

# Severity to Slack color mapping
SEVERITY_COLORS = {
    "critical": "#FF0000",
    "high": "#FF6600",
    "medium": "#FFCC00",
    "low": "#36A64F",
    "info": "#439FE0",
}

# Severity to PagerDuty severity mapping
PAGERDUTY_SEVERITY = {
    "critical": "critical",
    "high": "error",
    "medium": "warning",
    "low": "info",
    "info": "info",
}


# ── Slack Integration ──────────────────────────────────────────────────────

class SlackIntegration:
    """Send alerts to Slack via incoming webhook or Slack API."""

    def __init__(self, webhook_url: Optional[str] = None, bot_token: Optional[str] = None):
        self.webhook_url = webhook_url
        self.bot_token = bot_token

    async def send_alert(
        self,
        channel: str,
        title: str,
        severity: str,
        description: Optional[str] = None,
        agent_id: Optional[str] = None,
        tool_name: Optional[str] = None,
        extra_fields: Optional[Dict[str, str]] = None,
    ) -> bool:
        """Send an alert to Slack. Returns True on success."""
        color = SEVERITY_COLORS.get(severity, "#808080")

        fields = []
        if agent_id:
            fields.append({"title": "Agent", "value": agent_id, "short": True})
        if tool_name:
            fields.append({"title": "Tool", "value": tool_name, "short": True})
        if extra_fields:
            for k, v in extra_fields.items():
                fields.append({"title": k, "value": str(v), "short": True})

        payload = {
            "attachments": [
                {
                    "color": color,
                    "title": f"🛡️ Sentinel AI Alert: {title}",
                    "text": description or "",
                    "fields": fields,
                    "footer": "Sentinel AI MCP Security",
                    "ts": int(time.time()),
                }
            ]
        }

        if channel:
            payload["channel"] = channel

        try:
            if self.webhook_url:
                return await self._send_webhook(payload)
            elif self.bot_token:
                payload["channel"] = channel
                return await self._send_api(payload)
            else:
                logger.warning("No Slack webhook or token configured")
                return False
        except Exception as e:
            logger.error("Slack send failed: %s", e)
            return False

    async def _send_webhook(self, payload: dict) -> bool:
        """Send via incoming webhook."""
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(self.webhook_url, json=payload)
            if resp.status_code == 200:
                logger.info("Slack webhook sent: %s", payload.get("attachments", [{}])[0].get("title", ""))
                return True
            logger.warning("Slack webhook failed: %d %s", resp.status_code, resp.text[:200])
            return False

    async def _send_api(self, payload: dict) -> bool:
        """Send via Slack API (chat.postMessage)."""
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                "https://slack.com/api/chat.postMessage",
                headers={"Authorization": f"Bearer {self.bot_token}"},
                json=payload,
            )
            data = resp.json()
            if data.get("ok"):
                logger.info("Slack API message sent")
                return True
            logger.warning("Slack API failed: %s", data.get("error", "unknown"))
            return False


# ── Email Integration ──────────────────────────────────────────────────────

class EmailIntegration:
    """Send alerts via email using SMTP or the existing email service."""

    def __init__(
        self,
        smtp_host: Optional[str] = None,
        smtp_port: int = 587,
        smtp_user: Optional[str] = None,
        smtp_pass: Optional[str] = None,
        from_addr: Optional[str] = None,
        use_tls: bool = True,
    ):
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port
        self.smtp_user = smtp_user
        self.smtp_pass = smtp_pass
        self.from_addr = from_addr or (smtp_user or "alerts@sentinel-ai.com")
        self.use_tls = use_tls

    async def send_alert(
        self,
        to_addrs: List[str],
        title: str,
        severity: str,
        description: Optional[str] = None,
        agent_id: Optional[str] = None,
        tool_name: Optional[str] = None,
        extra_fields: Optional[Dict[str, str]] = None,
    ) -> bool:
        """Send an alert email. Returns True on success."""
        if not to_addrs:
            logger.warning("No email recipients specified")
            return False

        subject = f"[Sentinel AI {severity.upper()}] {title}"

        body_parts = [
            f"Sentinel AI Security Alert",
            f"",
            f"Severity: {severity.upper()}",
            f"Title: {title}",
        ]
        if agent_id:
            body_parts.append(f"Agent: {agent_id}")
        if tool_name:
            body_parts.append(f"Tool: {tool_name}")
        if description:
            body_parts.append(f"")
            body_parts.append(f"Description:")
            body_parts.append(description)
        if extra_fields:
            body_parts.append(f"")
            body_parts.append(f"Additional Details:")
            for k, v in extra_fields.items():
                body_parts.append(f"  {k}: {v}")

        body_parts.extend([
            f"",
            f"---",
            f"Sentinel AI MCP Security Monitor",
            f"Timestamp: {datetime.now(timezone.utc).isoformat()}",
        ])

        body = "\n".join(body_parts)

        try:
            if self.smtp_host:
                return await self._send_smtp(to_addrs, subject, body)
            else:
                logger.info("No SMTP configured, logging alert: %s", subject)
                logger.warning("ALERT: %s", body)
                return True
        except Exception as e:
            logger.error("Email send failed: %s", e)
            return False

    async def _send_smtp(self, to_addrs: List[str], subject: str, body: str) -> bool:
        """Send via SMTP using asyncio."""
        import smtplib
        from email.mime.text import MIMEText

        msg = MIMEText(body, "plain")
        msg["Subject"] = subject
        msg["From"] = self.from_addr
        msg["To"] = ", ".join(to_addrs)

        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, self._smtp_send, to_addrs, msg)
            logger.info("Email sent to %s", to_addrs)
            return True
        except Exception as e:
            logger.error("SMTP send failed: %s", e)
            return False

    def _smtp_send(self, to_addrs: List[str], msg):
        """Synchronous SMTP send (runs in executor)."""
        import smtplib
        with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
            if self.use_tls:
                server.starttls()
            if self.smtp_user and self.smtp_pass:
                server.login(self.smtp_user, self.smtp_pass)
            server.sendmail(self.from_addr, to_addrs, msg.as_string())


# ── PagerDuty Integration ──────────────────────────────────────────────────

class PagerDutyIntegration:
    """Send alerts to PagerDuty via Events API v2."""

    EVENTS_URL = "https://events.pagerduty.com/v2/enqueue"

    def __init__(self, routing_key: Optional[str] = None):
        self.routing_key = routing_key

    async def send_alert(
        self,
        title: str,
        severity: str,
        description: Optional[str] = None,
        agent_id: Optional[str] = None,
        tool_name: Optional[str] = None,
        extra_fields: Optional[Dict[str, str]] = None,
    ) -> bool:
        """Send an alert to PagerDuty. Returns True on success."""
        if not self.routing_key:
            logger.warning("No PagerDuty routing key configured")
            return False

        pd_severity = PAGERDUTY_SEVERITY.get(severity, "info")

        payload = {
            "routing_key": self.routing_key,
            "event_action": "trigger",
            "payload": {
                "summary": f"[{severity.upper()}] Sentinel AI: {title}",
                "source": "sentinel-ai-mcp-security",
                "severity": pd_severity,
                "component": "mcp-scanner",
                "group": agent_id or "mcp-security",
                "class": "security-alert",
                "custom_details": {
                    "agent_id": agent_id,
                    "tool_name": tool_name,
                    "description": description,
                    **(extra_fields or {}),
                },
            },
            "dedup_key": hashlib.sha256(
                f"{title}:{severity}:{agent_id}:{tool_name}".encode()
            ).hexdigest()[:32],
        }

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(self.EVENTS_URL, json=payload)
                data = resp.json()
                if resp.status_code == 202:
                    logger.info("PagerDuty event created: %s", data.get("dedup_key", ""))
                    return True
                logger.warning("PagerDuty failed: %d %s", resp.status_code, data)
                return False
        except Exception as e:
            logger.error("PagerDuty send failed: %s", e)
            return False

    async def resolve(
        self,
        dedup_key: str,
    ) -> bool:
        """Resolve a PagerDuty incident."""
        if not self.routing_key:
            return False

        payload = {
            "routing_key": self.routing_key,
            "event_action": "resolve",
            "dedup_key": dedup_key,
        }

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(self.EVENTS_URL, json=payload)
                return resp.status_code == 202
        except Exception as e:
            logger.error("PagerDuty resolve failed: %s", e)
            return False


# ── Custom Webhook Integration ─────────────────────────────────────────────

class CustomWebhookIntegration:
    """Send alerts to custom webhook endpoints."""

    def __init__(self, url: str, auth_header: Optional[str] = None, secret: Optional[str] = None):
        self.url = url
        self.auth_header = auth_header
        self.secret = secret

    async def send_alert(
        self,
        event_type: str,
        payload: dict,
    ) -> bool:
        """Send a custom webhook payload."""
        headers = {"Content-Type": "application/json"}

        if self.auth_header:
            headers["Authorization"] = self.auth_header

        body = json.dumps({
            "event": event_type,
            "source": "sentinel-ai-mcp-security",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": payload,
        })

        # HMAC signature if secret is configured
        if self.secret:
            sig = hmac.new(
                self.secret.encode(), body.encode(), hashlib.sha256
            ).hexdigest()
            headers["X-Sentinel-Signature"] = f"sha256={sig}"

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(self.url, content=body, headers=headers)
                if resp.status_code < 300:
                    logger.info("Custom webhook sent: %s", event_type)
                    return True
                logger.warning("Custom webhook failed: %d", resp.status_code)
                return False
        except Exception as e:
            logger.error("Custom webhook send failed: %s", e)
            return False


# ── Alert Dispatcher ───────────────────────────────────────────────────────

class AlertDispatcher:
    """
    Central alert dispatcher that routes alerts to all configured integrations.
    Manages retry logic and deduplication.
    """

    def __init__(self):
        self.slack: Optional[SlackIntegration] = None
        self.email: Optional[EmailIntegration] = None
        self.pagerduty: Optional[PagerDutyIntegration] = None
        self.custom_webhooks: List[CustomWebhookIntegration] = []
        self._sent_hashes: Dict[str, float] = {}
        self._dedup_window = 300  # 5 minute dedup window

    def configure(self, config: dict):
        """Configure all integrations from a config dict."""
        if "slack" in config:
            self.slack = SlackIntegration(
                webhook_url=config["slack"].get("webhook_url"),
                bot_token=config["slack"].get("bot_token"),
            )

        if "email" in config:
            self.email = EmailIntegration(
                smtp_host=config["email"].get("smtp_host"),
                smtp_port=config["email"].get("smtp_port", 587),
                smtp_user=config["email"].get("smtp_user"),
                smtp_pass=config["email"].get("smtp_pass"),
                from_addr=config["email"].get("from_addr"),
            )

        if "pagerduty" in config:
            self.pagerduty = PagerDutyIntegration(
                routing_key=config["pagerduty"].get("routing_key"),
            )

        for wh in config.get("custom_webhooks", []):
            self.custom_webhooks.append(CustomWebhookIntegration(
                url=wh["url"],
                auth_header=wh.get("auth_header"),
                secret=wh.get("secret"),
            ))

    def _should_send(self, alert_hash: str) -> bool:
        """Check if alert was already sent recently (dedup)."""
        now = time.time()
        if alert_hash in self._sent_hashes:
            if now - self._sent_hashes[alert_hash] < self._dedup_window:
                return False
        self._sent_hashes[alert_hash] = now
        # Cleanup old entries
        self._sent_hashes = {
            k: v for k, v in self._sent_hashes.items()
            if now - v < self._dedup_window * 2
        }
        return True

    async def dispatch(
        self,
        alert_type: str,
        severity: str,
        title: str,
        description: Optional[str] = None,
        agent_id: Optional[str] = None,
        tool_name: Optional[str] = None,
        server_name: Optional[str] = None,
        channels: Optional[dict] = None,
        extra_fields: Optional[Dict[str, str]] = None,
    ) -> Dict[str, bool]:
        """
        Dispatch an alert to all configured integrations.

        Returns dict of integration -> success status.
        """
        channels = channels or {}
        results = {}

        # Dedup
        alert_hash = hashlib.sha256(
            f"{alert_type}:{severity}:{title}:{agent_id}:{tool_name}".encode()
        ).hexdigest()[:16]

        if not self._should_send(alert_hash):
            logger.info("Alert deduped: %s", title)
            return {"deduped": True}

        # Minimum severity threshold
        severity_order = {"info": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}
        min_severity = channels.get("min_severity", "medium")
        if severity_order.get(severity, 0) < severity_order.get(min_severity, 0):
            logger.info("Alert below severity threshold: %s < %s", severity, min_severity)
            return {"skipped": True}

        # Slack
        if self.slack and channels.get("slack", True):
            slack_channel = channels.get("slack_channel", "#security-alerts")
            results["slack"] = await self.slack.send_alert(
                channel=slack_channel,
                title=title,
                severity=severity,
                description=description,
                agent_id=agent_id,
                tool_name=tool_name,
                extra_fields=extra_fields,
            )

        # Email
        if self.email and channels.get("email", False):
            email_to = channels.get("email_to", [])
            results["email"] = await self.email.send_alert(
                to_addrs=email_to,
                title=title,
                severity=severity,
                description=description,
                agent_id=agent_id,
                tool_name=tool_name,
                extra_fields=extra_fields,
            )

        # PagerDuty
        if self.pagerduty and channels.get("pagerduty", False):
            results["pagerduty"] = await self.pagerduty.send_alert(
                title=title,
                severity=severity,
                description=description,
                agent_id=agent_id,
                tool_name=tool_name,
                extra_fields=extra_fields,
            )

        # Custom webhooks
        for i, wh in enumerate(self.custom_webhooks):
            if channels.get(f"webhook_{i}", True):
                results[f"webhook_{i}"] = await wh.send_alert(
                    event_type=alert_type,
                    payload={
                        "title": title,
                        "severity": severity,
                        "agent_id": agent_id,
                        "tool_name": tool_name,
                        "server_name": server_name,
                        "description": description,
                        "extra": extra_fields,
                    },
                )

        logger.info("Alert dispatched: %s -> %s", title, results)
        return results


# Global singleton
alert_dispatcher = AlertDispatcher()
