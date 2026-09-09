"""Async job queue and message broker abstraction.

Three interchangeable brokers share one contract:

* ``redis``  - Redis Streams with consumer groups, retries and a DLQ.
               Recommended for production (Render Key Value / Upstash).
* ``kafka``  - Apache Kafka via ``aiokafka`` when KAFKA_BOOTSTRAP_SERVERS
               is configured (dlq topic suffix ``.dlq``, retries tracked in
               the payload).
* ``memory`` - In-process asyncio queue with retries and a DLQ. Last-resort
               fallback so the app never crashes when a broker is missing.

Exposed through a module-level :class:`JobQueue` singleton (``get_queue``).
"""

import asyncio
import json
import logging
import time
import uuid
from collections import deque
from enum import Enum
from typing import Any, Awaitable, Callable, Dict, List, Optional

from app.infra.config import (
    BrokerKind,
    queue_backoff_seconds,
    queue_dlq_name,
    queue_group_name,
    queue_max_retries,
    queue_poll_interval,
    queue_retention_ms,
    queue_stream_name,
    queue_mode,
)

logger = logging.getLogger(__name__)


class Job:
    """Normalized job envelope passed to handlers."""

    __slots__ = (
        "job_id",
        "job_type",
        "payload",
        "attempts",
        "max_retries",
        "enqueued_at",
        "msg_id",
    )

    def __init__(
        self,
        job_id: str,
        job_type: str,
        payload: Dict[str, Any],
        attempts: int = 0,
        max_retries: int = 3,
        enqueued_at: Optional[float] = None,
        msg_id: Optional[str] = None,
    ):
        self.job_id = job_id
        self.job_type = job_type
        self.payload = payload or {}
        self.attempts = attempts
        self.max_retries = max_retries
        self.enqueued_at = enqueued_at or time.time()
        self.msg_id = msg_id

    def to_dict(self) -> Dict[str, Any]:
        return {
            "job_id": self.job_id,
            "job_type": self.job_type,
            "payload": self.payload,
            "attempts": self.attempts,
            "max_retries": self.max_retries,
            "enqueued_at": self.enqueued_at,
        }


JobHandler = Callable[[Job], Awaitable[None]]


class _MemoryBroker:
    """Single-process broker with retry/delay support and a DLQ."""

    def __init__(self) -> None:
        self._queue: "asyncio.Queue[Job]" = asyncio.Queue()
        self._delayed: List[tuple] = []  # (ready_at, job)
        self._dlq: deque = deque(maxlen=5000)
        self._recent: deque = deque(maxlen=500)

    async def enqueue(self, job: Job) -> str:
        await self._queue.put(job)
        return job.job_id

    async def _dequeue(self, timeout: float) -> Optional[Job]:
        now = time.monotonic()
        if self._delayed:
            due = [item for item in self._delayed if item[0] <= now]
            self._delayed = [item for item in self._delayed if item[0] > now]
            if due:
                for _, job in due:
                    self._queue.put_nowait(job)
        try:
            return await asyncio.wait_for(self._queue.get(), timeout)
        except asyncio.TimeoutError:
            return None

    async def requeue(self, job: Job, wait_seconds: float = 0.0) -> None:
        if wait_seconds > 0:
            self._delayed.append((time.monotonic() + wait_seconds, job))
        else:
            await self._queue.put(job)

    async def ack(self, job: Job) -> None:
        """Record acknowledgement. Memory broker keeps jobs for peek/audit."""
        self._recent.append(job)

    async def dead_letter(self, job: Job, reason: str = "") -> None:
        self._dlq.append(job)

    async def depth(self) -> int:
        return self._queue.qsize() + len(self._delayed)

    async def dlq_depth(self) -> int:
        return len(self._dlq)

    async def peek(self, kind: str, limit: int) -> List[Dict[str, Any]]:
        if kind == "dlq":
            items = list(self._dlq)[-limit:]
        else:
            items = list(self._recent)
            return [j.to_dict() for j in items[-limit:]]
        return [j.to_dict() for j in items]


class _RedisBroker:
    def __init__(self, client) -> None:
        self._r = client
        self._stream = queue_stream_name()
        self._dlq = queue_dlq_name()
        self._group = queue_group_name()
        self._consumer = f"worker-{uuid.uuid4().hex[:8]}"

    async def _ensure_group(self) -> None:
        try:
            await self._r.xgroup_create(self._stream, self._group, id="0", mkstream=True)
        except Exception as exc:
            if "BUSYGROUP" not in str(exc):
                logger.debug("xgroup_create: %s", exc)

    async def enqueue(self, job: Job) -> str:
        await self._r.xadd(
            self._stream,
            {
                "payload": json.dumps(job.to_dict()),
                "job_id": job.job_id,
            },
            maxlen=100_000,
            approximate=True,
        )
        return job.job_id

    async def _read_batch(self, count: int, block_ms: int) -> List[Job]:
        res = await self._r.xreadgroup(
            self._group, self._consumer, {self._stream: ">"}, count=count, block=block_ms
        )
        jobs: List[Job] = []
        if not res:
            return jobs
        for _, messages in res:
            for msg_id, fields in messages:
                job = self._job_from_msg(msg_id, fields)
                if job:
                    jobs.append(job)
        return jobs

    async def _recover_stale(self) -> List[Job]:
        res = await self._r.xautoclaim(
            self._stream, self._group, self._consumer, min_idle_time=30_000, start_id="0", count=20
        )
        claims, _, _ = res or ([], [], [])
        jobs: List[Job] = []
        for msg_id, fields in claims:
            job = self._job_from_msg(msg_id, fields)
            if job:
                jobs.append(job)
        return jobs

    @staticmethod
    def _job_from_msg(msg_id: str, fields: Dict[str, Any]):
        try:
            payload = json.loads(fields.get("payload", "{}"))
        except (TypeError, ValueError):
            payload = {}
        job_id = fields.get("job_id") or payload.get("job_id") or msg_id
        return Job(
            job_id=str(job_id),
            job_type=payload.get("job_type", "unknown"),
            payload=payload.get("payload", {}),
            attempts=int(payload.get("attempts", 0)),
            max_retries=int(payload.get("max_retries", queue_max_retries())),
            enqueued_at=payload.get("enqueued_at"),
            msg_id=msg_id,
        )

    async def ack(self, job: Job) -> None:
        try:
            await self._r.xack(self._stream, self._group, job.msg_id or job.job_id)
        except Exception:  # pragma: no cover
            logger.debug("xack failed", exc_info=True)

    async def requeue(self, job: Job, wait_seconds: float = 0.0) -> str:
        if wait_seconds > 0:
            await asyncio.sleep(wait_seconds)
        return await self.enqueue(job)

    async def dead_letter(self, job: Job, reason: str = "") -> None:
        entry = job.to_dict()
        if reason:
            entry["reason"] = reason
        await self._r.xadd(self._dlq, {"payload": json.dumps(entry)})

    async def depth(self) -> int:
        try:
            return int(await self._r.xlen(self._stream))
        except Exception:  # pragma: no cover
            return 0

    async def dlq_depth(self) -> int:
        try:
            return int(await self._r.xlen(self._dlq))
        except Exception:  # pragma: no cover
            return 0

    async def peek(self, kind: str, limit: int) -> List[Dict[str, Any]]:
        stream = self._dlq if kind == "dlq" else self._stream
        try:
            rows = await self._r.xrevrange(stream, max="-", min="-+", count=limit)
        except Exception:  # pragma: no cover
            return []
        out = []
        for msg_id, fields in rows or []:
            try:
                out.append(json.loads(fields.get("payload", "{}")))
            except (TypeError, ValueError):
                out.append({"message_id": msg_id, "raw": fields})
        return out


class _KafkaBroker:
    """Kafka adapter (aiokafka). Falls back to redis/memory when unavailable."""

    def __init__(self) -> None:
        from app.infra.config import get_kafka_servers

        self._servers = get_kafka_servers()
        self._topic = queue_stream_name()
        self._dlg = f"{self._topic}.dlq"
        self._group = queue_group_name()
        self._producer = None
        self._consumer = None
        self._available = False

    async def start(self) -> bool:
        try:
            from aiokafka import AIOKafkaProducer, AIOKafkaConsumer  # type: ignore

            self._producer = AIOKafkaProducer(
                bootstrap_servers=self._servers, value_serializer=lambda v: json.dumps(v).encode()
            )
            await self._producer.start()
            self._consumer = AIOKafkaConsumer(
                self._topic,
                group_id=self._group,
                bootstrap_servers=self._servers,
                enable_auto_commit=False,
                auto_offset_reset="earliest",
                value_deserializer=lambda b: json.loads(b.decode()),
            )
            await self._consumer.start()
            self._available = True
            return True
        except Exception as exc:  # pragma: no cover
            logger.warning("Kafka unavailable (%s) - will fall back to redis/memory", exc)
            await self.close()
            return False

    async def enqueue(self, job: Job) -> str:
        if not self._available or self._producer is None:
            raise RuntimeError("Kafka not available")
        await self._producer.send(self._topic, job.to_dict(), key=job.job_id.encode())
        return job.job_id

    async def poll(self) -> Optional[Job]:
        if not self._available or self._consumer is None:
            return None
        try:
            batch = await self._consumer.getmany(timeout_ms=1000, max_records=10)
            for consumer_record in batch.values():
                for record in consumer_record:
                    payload = record.value or {}
                    return Job(
                        job_id=str(payload.get("job_id", record.key or "")),
                        job_type=payload.get("job_type", "unknown"),
                        payload=payload.get("payload", {}),
                        attempts=int(payload.get("attempts", 0)),
                        max_retries=int(payload.get("max_retries", queue_max_retries())),
                        enqueued_at=payload.get("enqueued_at"),
                    )
        except Exception:  # pragma: no cover
            logger.debug("kafka poll error", exc_info=True)
        return None

    async def ack(self, job: Job) -> None:
        try:
            await self._consumer.commit()
        except Exception:  # pragma: no cover
            logger.debug("kafka commit error", exc_info=True)

    async def requeue(self, job: Job, wait_seconds: float = 0.0) -> str:
        if wait_seconds > 0:
            await asyncio.sleep(wait_seconds)
        return await self.enqueue(job)

    async def dead_letter(self, job: Job, reason: str = "") -> None:
        if not self._available or self._producer is None:
            return
        entry = job.to_dict()
        if reason:
            entry["reason"] = reason
        await self._producer.send(self._dlg, entry, key=job.job_id.encode())

    async def depth(self) -> int:
        return 0

    async def dlq_depth(self) -> int:
        return 0

    async def peek(self, kind: str, limit: int) -> List[Dict[str, Any]]:
        return []

    async def close(self) -> None:
        for client in (self._consumer, self._producer):
            if client is not None:
                try:
                    await client.stop()
                except Exception:  # pragma: no cover
                    logger.debug("kafka stop error", exc_info=True)
        self._available = False


class JobQueue:
    """Front door for enqueueing and consuming jobs across brokers."""

    def __init__(self) -> None:
        kind = queue_mode()
        self._kind: BrokerKind = kind
        self._memory: Optional[_MemoryBroker] = None
        self._redis: Optional[_RedisBroker] = None
        self._kafka: Optional[_KafkaBroker] = None
        self.worker_running = False
        self.worker_started_at: Optional[float] = None
        self._started = False

    @property
    def kind(self) -> BrokerKind:
        return self._kind

    async def start(self) -> None:
        """Initialize the selected broker. Never raises - degrades to memory."""
        if self._started:
            return
        self._started = True
        kind = queue_mode()
        self._kind = kind
        try:
            if kind == BrokerKind.KAFKA:
                kafka_broker = _KafkaBroker()
                if await kafka_broker.start():
                    self._kafka = kafka_broker
                    return
                self._kind = BrokerKind.REDIS if queue_mode() != BrokerKind.REDIS else BrokerKind.MEMORY
                self._kafka = None
        except Exception as exc:  # pragma: no cover
            logger.warning("Kafka init failed - falling back: %s", exc)

        try:
            from app.infra.redis import get_redis

            client = await get_redis()
            if client is not None:
                self._redis = _RedisBroker(client)
                await self._redis._ensure_group()
                self._kind = BrokerKind.REDIS
                return
        except Exception as exc:  # pragma: no cover
            logger.warning("Redis init failed - falling back: %s", exc)

        self._memory = _MemoryBroker()
        self._kind = BrokerKind.MEMORY
        logger.warning("Job queue running in MEMORY mode (no REDIS_URL / KAFKA)")

    @property
    def active(self) -> bool:
        return self._started

    async def enqueue(
        self,
        job_type: str,
        payload: Dict[str, Any],
        *,
        max_retries: Optional[int] = None,
        delay: float = 0.0,
    ) -> str:
        job = Job(
            job_id=f"{job_type}-{uuid.uuid4().hex[:12]}",
            job_type=job_type,
            payload=payload,
            max_retries=max_retries if max_retries is not None else queue_max_retries(),
        )
        if delay > 0:
            await asyncio.sleep(delay)
        if self._redis is not None:
            return await self._redis.enqueue(job)
        if self._kafka is not None:
            return await self._kafka.enqueue(job)
        if self._memory is not None:
            return await self._memory.enqueue(job)
        broker = _MemoryBroker()
        self._memory = broker
        return await broker.enqueue(job)

    async def worker(self, handler: JobHandler) -> None:
        """Run the consumption loop until the process shuts down."""
        self.worker_running = True
        self.worker_started_at = time.time()
        logger.info("Job worker started (broker=%s)", self._kind.value)
        try:
            while True:
                processed = 0
                if self._redis is not None:
                    processed = await self._redis_round(handler)
                elif self._kafka is not None:
                    job = await self._kafka.poll()
                    if job:
                        await self._run(handler, job, ack=self._kafka.ack, requeue=self._kafka.requeue, dlq=self._kafka.dead_letter)
                        processed = 1
                elif self._memory is not None:
                    processed = await self._memory_round(handler)

                if processed == 0:
                    await asyncio.sleep(queue_poll_interval())
        except asyncio.CancelledError:
            logger.info("Job worker stopped")
        finally:
            self.worker_running = False

    async def _redis_round(self, handler: JobHandler) -> int:
        await self._redis._ensure_group()
        processed = 0
        for job in await self._redis._recover_stale():
            await self._run_and_ack(handler, job, self._redis)
            processed += 1
        for job in await self._redis._read_batch(count=10, block_ms=2000):
            await self._run_and_ack(handler, job, self._redis)
            processed += 1
        return processed

    async def _memory_round(self, handler: JobHandler) -> int:
        job = await self._memory._dequeue(timeout=0.5)
        if job is None:
            return 0
        await self._run(
            handler,
            job,
            ack=self._memory.ack,
            requeue=self._memory.requeue,
            dlq=self._memory.dead_letter,
        )
        return 1

    async def _run_and_ack(self, handler, job, broker) -> None:
        try:
            await self._observe(handler, job)
            await broker.ack(job)
            self._mark_success(job)
        except Exception as exc:
            await self._handle_failure(
                job,
                ack=broker.ack,
                requeue=broker.requeue,
                dlq=broker.dead_letter,
                exc=exc,
            )

    async def _run(self, handler, job, ack, requeue, dlq) -> None:
        try:
            await self._observe(handler, job)
            await ack(job)
            self._mark_success(job)
        except Exception as exc:
            await self._handle_failure(job, ack=ack, requeue=requeue, dlq=dlq, exc=exc)

    async def _observe(self, handler: JobHandler, job: Job) -> None:
        try:
            from app.core.metrics import JOB_PROCESS_TIME

            start = time.perf_counter()
            await handler(job)
            JOB_PROCESS_TIME.labels(job_type=job.job_type).observe(time.perf_counter() - start)
        except Exception:
            try:
                from app.core.metrics import JOB_PROCESS_TIME

                JOB_PROCESS_TIME.labels(job_type=job.job_type).observe(time.perf_counter() - start)
            except Exception:  # pragma: no cover
                pass
            raise

    async def _handle_failure(self, job, *, ack=None, requeue=None, dlq=None, broker=None, exc=None) -> None:
        job.attempts += 1
        reason = f"{type(exc).__name__}: {exc}" if exc else "unknown"
        self._mark_failure(job, reason)
        if job.attempts >= job.max_retries:
            logger.error(
                "Job %s (%s) failed permanently after %d attempts: %s",
                job.job_id, job.job_type, job.attempts, reason,
            )
            if dlq is not None:
                await dlq(job, reason=reason)
        else:
            logger.warning(
                "Job %s (%s) attempt %d/%d failed; retrying: %s",
                job.job_id, job.job_type, job.attempts, job.max_retries, reason,
            )
            if requeue is not None:
                await requeue(job, wait_seconds=queue_backoff_seconds())
        if ack is not None:
            try:
                await ack(job)
            except Exception:  # pragma: no cover
                pass

    def _mark_success(self, job: Job) -> None:
        try:
            from app.core.metrics import JOBS_PROCESSED

            JOBS_PROCESSED.labels(job_type=job.job_type).inc()
        except Exception:  # pragma: no cover
            pass

    def _mark_failure(self, job: Job, reason: str) -> None:
        try:
            from app.core.metrics import JOBS_FAILED

            JOBS_FAILED.labels(job_type=job.job_type).inc()
        except Exception:  # pragma: no cover
            pass

    async def depth(self) -> int:
        if self._redis:
            return await self._redis.depth()
        if self._kafka:
            return await self._kafka.depth()
        if self._memory:
            return await self._memory.depth()
        return 0

    async def dlq_depth(self) -> int:
        if self._redis:
            return await self._redis.dlq_depth()
        if self._kafka:
            return await self._kafka.dlq_depth()
        if self._memory:
            return await self._memory.dlq_depth()
        return 0

    async def peek(self, kind: str = "stream", limit: int = 20) -> List[Dict[str, Any]]:
        if self._redis:
            return await self._redis.peek(kind, limit)
        if self._kafka:
            return await self._kafka.peek(kind, limit)
        if self._memory:
            return await self._memory.peek(kind, limit)
        return []

    async def health(self) -> Dict[str, Any]:
        return {
            "mode": self._kind.value,
            "active": self.active,
            "worker_running": self.worker_running,
            "worker_started_at": self.worker_started_at,
            "queue_depth": await self.depth(),
            "dlq_depth": await self.dlq_depth(),
        }

    async def close(self) -> None:
        if self._kafka:
            await self._kafka.close()
        self._redis = None
        self._kafka = None
        self._memory = None
        self._started = False
        self.worker_running = False


_queue: Optional[JobQueue] = None


def get_queue() -> JobQueue:
    global _queue
    if _queue is None:
        _queue = JobQueue()
    return _queue


def reset_queue() -> JobQueue:
    """Discard the singleton (tests, reconfiguration). Never call while a worker is running."""
    global _queue
    _queue = JobQueue()
    return _queue