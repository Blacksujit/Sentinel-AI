"""
Production initialization for MCP Security features.

Wires together all components:
  - Persistence layer
  - WebSocket manager
  - Config watcher
  - Alert dispatcher
  - Anomaly detector
  - MCP proxy

Call init_mcp_security() during app startup.
"""

import asyncio
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

# Global references
_initialized = False
_ws_manager = None
_config_watcher = None
_alert_dispatcher = None
_anomaly_detector = None
_mcp_proxy = None


def init_mcp_security(app=None):
    """
    Initialize all MCP Security production features.

    Call this during FastAPI app startup.
    """
    global _initialized, _ws_manager, _config_watcher, _alert_dispatcher, _anomaly_detector, _mcp_proxy

    if _initialized:
        logger.info("MCP Security already initialized")
        return

    logger.info("Initializing MCP Security production features...")

    # 1. WebSocket Manager
    from app.monitors.ws_manager import ws_manager
    _ws_manager = ws_manager
    logger.info("✓ WebSocket manager ready")

    # 2. Anomaly Detector
    from app.monitors.anomaly_detection import anomaly_detector
    _anomaly_detector = anomaly_detector
    logger.info("✓ Anomaly detector ready")

    # 3. Alert Dispatcher
    from app.monitors.alert_integrations import alert_dispatcher
    _alert_dispatcher = alert_dispatcher

    # Configure from environment
    slack_webhook = os.getenv("SLACK_WEBHOOK_URL")
    slack_token = os.getenv("SLACK_BOT_TOKEN")
    pagerduty_key = os.getenv("PAGERDUTY_ROUTING_KEY")
    smtp_host = os.getenv("SMTP_HOST")

    alert_config = {}
    if slack_webhook or slack_token:
        alert_config["slack"] = {
            "webhook_url": slack_webhook,
            "bot_token": slack_token,
        }
    if smtp_host:
        alert_config["email"] = {
            "smtp_host": smtp_host,
            "smtp_port": int(os.getenv("SMTP_PORT", "587")),
            "smtp_user": os.getenv("SMTP_USER"),
            "smtp_pass": os.getenv("SMTP_PASS"),
            "from_addr": os.getenv("SMTP_FROM", "alerts@sentinel-ai.com"),
        }
    if pagerduty_key:
        alert_config["pagerduty"] = {
            "routing_key": pagerduty_key,
        }
    if alert_config:
        _alert_dispatcher.configure(alert_config)
    logger.info("✓ Alert dispatcher ready (slack=%s, email=%s, pagerduty=%s)",
                bool(slack_webhook or slack_token),
                bool(smtp_host),
                bool(pagerduty_key))

    # 4. Config Watcher
    from app.monitors.config_watcher import config_watcher
    _config_watcher = config_watcher

    # Add known config locations
    _config_watcher.add_known_configs()

    # Add custom watch paths from environment
    watch_dirs = os.getenv("MCP_WATCH_DIRS", "").split(":")
    for d in watch_dirs:
        d = d.strip()
        if d:
            _config_watcher.add_directory(d)

    watch_files = os.getenv("MCP_WATCH_FILES", "").split(":")
    for f in watch_files:
        f = f.strip()
        if f:
            _config_watcher.add_config_path(f)

    # Register change callback
    _config_watcher.on_change(_handle_config_change)
    logger.info("✓ Config watcher ready (poll_interval=%.1fs)", _config_watcher.poll_interval)

    # 5. MCP Proxy
    from app.monitors.mcp_proxy import MCPProxy
    from app.monitors.agent_guardrails import AgentGuardrails

    _mcp_proxy = MCPProxy(
        guardrails=AgentGuardrails(),
        anomaly_detector=_anomaly_detector,
        ws_manager=_ws_manager,
        alert_dispatcher=_alert_dispatcher,
    )
    logger.info("✓ MCP proxy ready")

    # 6. Register routes
    if app:
        from app.api.mcp_security_routes import router as mcp_router
        app.include_router(mcp_router)
        logger.info("✓ MCP Security API routes registered")

    _initialized = True
    logger.info("🛡️  MCP Security production features initialized")


async def start_background_tasks():
    """Start background tasks (config watcher). Call during app startup."""
    from app.monitors.config_watcher import config_watcher

    logger.info("Starting MCP background tasks...")
    await config_watcher.start()
    logger.info("✓ Config watcher started")

    # Persist an initial full scan of all discovered MCP tools so the
    # dashboard reflects the machine's real MCP setup (no empty placeholders).
    asyncio.create_task(scan_and_persist_all())


async def stop_background_tasks():
    """Stop background tasks. Call during app shutdown."""
    from app.monitors.config_watcher import config_watcher

    logger.info("Stopping MCP background tasks...")
    await config_watcher.stop()
    logger.info("✓ Config watcher stopped")


async def _handle_config_change(change):
    """Handle MCP config file changes."""
    from app.storage.db import SessionLocal
    from app.monitors.persistence import log_config_change, persist_tool_scan
    from app.scanner.tool_scanner import scan_tool
    from app.monitors.ws_manager import ws_manager

    logger.warning(
        "MCP config change detected: %s type=%s",
        change.config_path, change.change_type,
    )

    # Log the config change
    db = SessionLocal()
    try:
        log_config_change(
            db=db,
            config_path=change.config_path,
            change_type=change.change_type,
            file_hash=change.new_hash,
        )
    except Exception as e:
        logger.error("Failed to log config change: %s", e)
    finally:
        db.close()

    # Scan newly added tools
    for item in change.tools_added:
        server_name = item.get("server", "unknown")
        tool = item.get("tool", {})
        tool_name = tool.get("name", "unknown")
        description = tool.get("description", "")

        try:
            result = scan_tool(tool_name, description, server_name=server_name)
            risk_score = result.risk_score
            risk_level = result.risk_level

            # Persist scan
            db = SessionLocal()
            try:
                persist_tool_scan(
                    db=db,
                    tool_name=tool_name,
                    description=description,
                    risk_score=risk_score,
                    risk_level=risk_level,
                    findings=[f.as_dict() for f in result.findings],
                    scanned_by="config_watcher",
                )
            finally:
                db.close()

            # Broadcast
            await ws_manager.broadcast_scan_finding(
                scan_type="tool",
                server_name=server_name,
                tool_name=tool_name,
                findings=[f.as_dict() for f in result.findings],
                risk_level=risk_level,
                risk_score=risk_score,
            )

            # Alert on high-risk
            if risk_level in ("high", "critical"):
                from app.monitors.alert_integrations import alert_dispatcher
                await alert_dispatcher.dispatch(
                    alert_type="scan_finding",
                    severity=risk_level,
                    title=f"New high-risk tool detected: {tool_name}",
                    description=f"Tool '{tool_name}' was added to MCP config with {len(result.findings)} findings.",
                    tool_name=tool_name,
                    server_name=server_name,
                )

            logger.info(
                "Auto-scanned new tool: %s (risk=%s findings=%d)",
                tool_name, risk_level, len(result.findings),
            )

        except Exception as e:
            logger.error("Failed to scan new tool %s: %s", tool_name, e)


async def scan_and_persist_all() -> dict:
    """Scan every currently-configured MCP tool and persist real results.

    Refreshes the watcher snapshot cache, then for each discovered tool runs
    the real scanner, persists the scan to the DB, and raises high-risk alerts.
    Used at startup (so the dashboard reflects the machine's real MCP setup)
    and by POST /mcp-security/watcher/scan.
    """
    from app.storage.db import SessionLocal
    from app.monitors.config_watcher import config_watcher
    from app.monitors.persistence import persist_tool_scan, create_security_alert
    from app.scanner.tool_scanner import scan_tool
    from app.monitors.alert_integrations import alert_dispatcher

    config_watcher.scan_now()
    all_tools = config_watcher.get_current_tools()

    summary = {"servers": 0, "tools": 0, "findings": 0, "high_risk": 0, "scanned_by": "full_scan"}

    for server_name, tools in all_tools.items():
        summary["servers"] += 1
        for tool in tools:
            tool_name = tool.get("name", "unknown")
            description = tool.get("description", "")
            try:
                result = scan_tool(tool_name, description, server_name=server_name)
                findings = [f.as_dict() for f in result.findings]

                db = SessionLocal()
                try:
                    record = persist_tool_scan(
                        db=db,
                        tool_name=tool_name,
                        description=description,
                        risk_score=result.risk_score,
                        risk_level=result.risk_level,
                        findings=findings,
                        scanned_by="full_scan",
                    )
                    scan_result_id = record.id if getattr(record, "id", None) else None

                    if result.risk_level in ("high", "critical"):
                        create_security_alert(
                            db=db,
                            alert_type="scan_finding",
                            severity=result.risk_level,
                            title=f"High-risk tool detected: {tool_name}",
                            description=(
                                f"Tool '{tool_name}' in server '{server_name}' "
                                f"scored {result.risk_score} with {len(findings)} findings."
                            ),
                            tool_name=tool_name,
                            server_name=server_name,
                            scan_result_id=scan_result_id,
                        )
                    db.commit()
                finally:
                    db.close()

                summary["tools"] += 1
                summary["findings"] += len(findings)

                if result.risk_level in ("high", "critical"):
                    summary["high_risk"] += 1
                    await alert_dispatcher.dispatch(
                        alert_type="scan_finding",
                        severity=result.risk_level,
                        title=f"High-risk tool detected: {tool_name}",
                        description=(
                            f"Tool '{tool_name}' in server '{server_name}' "
                            f"scored {result.risk_score} with {len(findings)} findings."
                        ),
                        tool_name=tool_name,
                        server_name=server_name,
                    )
            except Exception as e:
                logger.error("Full-scan failed for tool %s on %s: %s", tool_name, server_name, e)

    logger.info("Full MCP scan complete: %s", summary)
    return summary


def get_ws_manager():
    return _ws_manager


def get_config_watcher():
    return _config_watcher


def get_alert_dispatcher():
    return _alert_dispatcher


def get_anomaly_detector():
    return _anomaly_detector


def get_mcp_proxy():
    return _mcp_proxy
