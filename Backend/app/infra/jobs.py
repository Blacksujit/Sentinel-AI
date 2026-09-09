"""Job registry and high-level enqueue helpers.

Concrete jobs shipped with the stack:
    echo             - verify end-to-end queue flow (used by /api/infra/queue/test)
    send_email       - outbound email delivery
    dispatch_alert   - fan-out an alert to Slack / email / PagerDuty
    reindex_incident - async incident index refresh
    aggregate_usage  - per-org usage rollup (runs in a threadpool)

Add new jobs with the ``@register_job`` decorator.
"""

import asyncio
import json
import logging
from typing import Any, Awaitable, Callable, Dict, Optional

from app.infra.queue import Job, JobHandler, get_queue

logger = logging.getLogger(__name__)

JOB_HANDLERS: Dict[str, Callable[[Any], Awaitable[None]]] = {}


def register_job(job_type: str):
    def decorator(fn: Callable[[Any], Awaitable[None]]):
        JOB_HANDLERS[job_type] = fn
        return fn

    return decorator


async def enqueue_job(
    job_type: str,
    payload: Dict[str, Any],
    *,
    max_retries: Optional[int] = None,
    delay: float = 0.0,
) -> Optional[str]:
    """Enqueue a job by name. Returns the job id, or None when the queue fails."""
    try:
        return await get_queue().enqueue(
            job_type, payload, max_retries=max_retries, delay=delay
        )
    except Exception as exc:  # pragma: no cover
        logger.warning("enqueue failed for %s: %s", job_type, exc)
        return None


async def handle_job(job: Job) -> None:
    handler = JOB_HANDLERS.get(job.job_type)
    if handler is None:
        raise ValueError(f"No handler registered for job type '{job.job_type}'")
    await handler(job)


async def start_worker() -> "asyncio.Task":
    """Start the worker task (idempotent). Returns the running task."""
    queue = get_queue()
    if not queue.active:
        await queue.start()
    existing = _find_worker_task()
    if existing and not existing.done():
        return existing
    task = asyncio.create_task(queue.worker(handle_job), name="sentinelai-job-worker")
    logger.info("Job worker task spawned")
    return task


def _find_worker_task() -> Optional["asyncio.Task"]:
    for task in asyncio.all_tasks():
        if task.get_name() == "sentinelai-job-worker":
            return task
    return None


@register_job("echo")
async def job_echo(job: Job) -> None:
    logger.info("echo job %s: %s", job.job_id, json.dumps(job.payload, default=str))


@register_job("send_email")
async def job_send_email(job: Job) -> None:
    from app.services.email_service import EmailService

    p = job.payload
    kind = p.get("kind", "org_invite")
    if kind == "org_invite":
        ok = await EmailService.send_org_invite_email(
            to_email=p["to_email"],
            token=p["token"],
            org_name=p.get("org_name", ""),
            role_name=p.get("role_name", "Member"),
            expires_in_days=p.get("expires_in_days", 7),
        )
    elif kind == "workspace_invite":
        ok = await EmailService.send_workspace_invite_email(
            to_email=p["to_email"],
            token=p["token"],
            org_name=p.get("org_name", ""),
            workspace_name=p.get("workspace_name", ""),
            role_name=p.get("role_name", "Member"),
            expires_in_days=p.get("expires_in_days", 7),
        )
    else:
        config = EmailService._get_config()
        ok = await EmailService._send_via_smtp(
            to_email=p["to_email"],
            from_email=p.get("from_email") or config["from_email"],
            subject=p.get("subject", "SentinelAI Notification"),
            plain_body=p.get("body", ""),
            html_body=p.get("html_body"),
            smtp_host=config["smtp_host"],
            smtp_port=config["smtp_port"],
            smtp_user=config["smtp_user"],
            smtp_password=config["smtp_password"],
            use_tls=config["use_tls"],
        )
    if not ok:
        raise RuntimeError(f"Email send failed for {p['to_email']}")


@register_job("dispatch_alert")
async def job_dispatch_alert(job: Job) -> None:
    from app.monitors.alert_integrations import alert_dispatcher

    p = job.payload
    await alert_dispatcher.dispatch(
        alert_type=p["alert_type"],
        severity=p.get("severity", "medium"),
        title=p["title"],
        description=p.get("description"),
        agent_id=p.get("agent_id"),
        tool_name=p.get("tool_name"),
        server_name=p.get("server_name"),
        channels=p.get("channels"),
        extra_fields=p.get("extra_fields"),
    )


@register_job("reindex_incident")
async def job_reindex_incident(job: Job) -> None:
    p = job.payload
    incident_id = p.get("incident_id")
    workspace_id = p.get("workspace_id")
    if incident_id is None:
        raise ValueError("payload missing 'incident_id'")
    # Integration point: call the index/vectorization backend here when ready.
    logger.info(
        "Incident index refresh: incident=%s workspace=%s (async, non-blocking)",
        incident_id,
        workspace_id,
    )


@register_job("aggregate_usage")
async def job_aggregate_usage(job: Job) -> None:
    from app.services.usage_service import UsageService
    from app.storage.db import SessionLocal

    org_id = job.payload.get("org_id")
    if org_id is None:
        raise ValueError("payload missing 'org_id'")

    def _sync_rollup() -> None:
        try:
            db = SessionLocal()
            try:
                UsageService.aggregate_for_org(db, org_id)
                db.commit()
            finally:
                db.close()
        except Exception as exc:  # pragma: no cover
            logger.error("usage rollup failed for org=%s: %s", org_id, exc)

    await asyncio.to_thread(_sync_rollup)