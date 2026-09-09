"""
Tests for the tail log store (app.infra.log_store): ring buffer, tail, and
handler integration.
"""

import asyncio
import logging
import os

os.environ.setdefault("QUEUE_MODE", "memory")


def _run(coro):
    return asyncio.run(coro)


def _make_store(maxlen=100):
    from app.infra.log_store import TailLogStore

    return TailLogStore(maxlen=maxlen)


def test_push_and_tail_ordered():
    async def scenario():
        store = _make_store()
        for i in range(5):
            await store.push({"ts": i, "level": "INFO", "logger": "tests", "message": f"entry-{i}"})
        tail = await store.tail(limit=3)
        assert len(tail) == 3
        assert tail[0]["message"] == "entry-2"
        assert tail[-1]["message"] == "entry-4"

    _run(scenario())


def test_ring_buffer_caps_size():
    async def scenario():
        store = _make_store(maxlen=100)
        for i in range(250):
            await store.push({"ts": i, "level": "INFO", "logger": "tests", "message": str(i)})
        records = list(store._records)
        assert len(records) == 100
        assert records[0]["message"] == "150"

    _run(scenario())


def test_tail_handles_large_limit():
    async def scenario():
        store = _make_store()
        tail = await store.tail(limit=999)
        assert len(tail) == 0

    _run(scenario())


def test_handler_emits_push_to_store():
    from app.infra.log_store import TailLogHandler

    async def scenario():
        store = _make_store()
        handler = TailLogHandler(store=store)
        record = logging.LogRecord(
            name="sentinel.tests",
            level=logging.INFO,
            pathname="test_log_store.py",
            lineno=1,
            msg="handled %s",
            args=("entry",),
            exc_info=None,
        )
        handler.emit(record)
        for _ in range(20):
            await asyncio.sleep(0)
        entries = await store.tail(limit=10)
        assert entries, "handler emit should push to the store"
        assert entries[-1]["message"] == "handled entry"
        assert entries[-1]["severity"] == "INFO"
        assert entries[-1]["logger"] == "sentinel.tests"

    _run(scenario())


def test_handler_emits_without_running_loop():
    """emit must not crash when no event loop is running (sync startup/teardown)."""
    from app.infra.log_store import TailLogHandler

    store = _make_store()
    handler = TailLogHandler(store=store)
    record = logging.LogRecord(
        name="sentinel.tests.sync",
        level=logging.WARNING,
        pathname="test_log_store.py",
        lineno=1,
        msg="sync emit works",
        args=(),
        exc_info=None,
    )
    handler.emit(record)

    async def drain():
        entries = await store.tail(limit=10)
        assert entries, "sync emit should push via push_nowait"
        assert entries[-1]["message"] == "sync emit works"
        assert entries[-1]["severity"] == "WARNING"

    _run(drain())


def test_attach_tail_log_handler_roundtrip():
    async def scenario():
        from app.infra.log_store import attach_tail_log_handler, tail_log

        before = await tail_log.tail(limit=999)
        attach_tail_log_handler()
        logger = logging.getLogger("sentinel.tailtest_roundtrip")
        logger.warning("roundtrip works")
        for _ in range(20):
            await asyncio.sleep(0)
        after = await tail_log.tail(limit=999)
        new_entries = [e for e in after if e.get("message") == "roundtrip works"]
        assert new_entries, "tail should contain the message logged after handler attach"

    _run(scenario())