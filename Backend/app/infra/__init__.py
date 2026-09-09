"""Infrastructure primitives for SentinelAI production runtime.

Provides the async job queue (Redis Streams / Kafka / in-memory), pub/sub
messaging for cross-instance fan-out, and the in-process structured log tail
that powers observability endpoints.
"""

from app.infra.config import BrokerKind, queue_mode
from app.infra.queue import Job, JobQueue, get_queue

__all__ = [
    "BrokerKind",
    "queue_mode",
    "Job",
    "JobQueue",
    "get_queue",
]