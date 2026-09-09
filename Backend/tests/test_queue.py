"""
Tests for the async job queue (app.infra.queue / app.infra.jobs).

Runs against the in-memory broker so it needs no Redis or Kafka. Env vars are
pinned before any app.infra import so the broker is always MEMORY.
"""

import asyncio
import os

os.environ.setdefault("QUEUE_MODE", "memory")
os.environ.setdefault("QUEUE_POLL_INTERVAL", "0.01")
os.environ.setdefault("QUEUE_BACKOFF_SECONDS", "0.1")


def _run(coro):
    return asyncio.run(coro)


def test_memory_broker_enqueue_and_ack():
    async def scenario():
        from app.infra.queue import get_queue, reset_queue

        queue = reset_queue()
        await queue.start()
        assert queue.kind.value == "memory"
        assert queue.active

        job_id = await queue.enqueue("echo", {"source": "unit-test"})
        assert job_id

        broker = queue._memory
        job = await broker._dequeue(timeout=0.2)
        assert job is not None
        assert job.job_id == job_id
        assert job.job_type == "echo"
        assert job.payload == {"source": "unit-test"}

        health = await queue.health()
        assert health["active"]

    _run(scenario())


def test_worker_processes_job_and_acks():
    async def scenario():
        from app.infra.queue import reset_queue
        from app.infra.jobs import JOB_HANDLERS, start_worker

        queue = reset_queue()
        await queue.start()
        worker_task = await start_worker()
        try:
            await asyncio.sleep(0.05)
            job_id = await queue.enqueue("echo", {"source": "worker-test"})
            for _ in range(100):
                recent = await queue.peek(kind="stream", limit=100)
                if any(j.get("job_id") == job_id for j in recent):
                    break
                await asyncio.sleep(0.02)
            else:
                raise AssertionError(f"job {job_id} never processed")
            assert await queue.depth() == 0
        finally:
            worker_task.cancel()
            try:
                await worker_task
            except BaseException:
                pass

    _run(scenario())


def test_failed_job_retries_then_dlq():
    async def scenario():
        from app.infra.queue import reset_queue
        from app.infra.jobs import JOB_HANDLERS, start_worker

        queue = reset_queue()
        await queue.start()
        worker_task = await start_worker()
        attempts = {"n": 0}

        async def always_fails(_job):
            attempts["n"] += 1
            raise RuntimeError("boom")

        JOB_HANDLERS["flaky"] = always_fails
        try:
            await asyncio.sleep(0.05)
            await queue.enqueue("flaky", {}, max_retries=2)
            for _ in range(200):
                if await queue.dlq_depth() >= 1:
                    break
                await asyncio.sleep(0.03)
            assert await queue.dlq_depth() >= 1, "job should land in DLQ"
            assert attempts["n"] >= 2, "job should be retried before DLQ"
            assert await queue.depth() == 0
        finally:
            worker_task.cancel()
            try:
                await worker_task
            except BaseException:
                pass

    _run(scenario())


def test_unknown_job_type_is_not_enqueued_as_hang():
    """An unregistered handler must go to the DLQ, not ack silently."""
    async def scenario():
        from app.infra.queue import reset_queue
        from app.infra.jobs import JOB_HANDLERS, start_worker

        queue = reset_queue()
        await queue.start()
        worker_task = await start_worker()
        try:
            await asyncio.sleep(0.05)
            await queue.enqueue("no-such-handler", {})
            for _ in range(200):
                if await queue.dlq_depth() >= 1:
                    break
                await asyncio.sleep(0.03)
            assert await queue.dlq_depth() >= 1
        finally:
            worker_task.cancel()
            try:
                await worker_task
            except BaseException:
                pass

    _run(scenario())