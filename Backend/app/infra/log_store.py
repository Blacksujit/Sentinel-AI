"""In-process structured log tail used by observability endpoints.

Keeps the most recent LOG_TAIL_SIZE structured records in memory so the
operator can stream/dump recent logs without external log shipping.
For persistent log shipping, point LOG_FORMAT=json at any collector that
ingests stdout (e.g. New Relic, Grafana, Axiom push agents).
"""

import asyncio
import logging
import threading
from collections import deque
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.infra.config import log_tail_size

_logger = logging.getLogger(__name__)


class TailLogStore:
    def __init__(self, maxlen: int = 1000):
        self._maxlen = max(maxlen, 50)
        self._records: deque = deque(maxlen=self._maxlen)
        self._lock = threading.Lock()

    def _append(self, record: Dict[str, Any]) -> None:
        record.setdefault("timestamp", datetime.now(timezone.utc).isoformat())
        with self._lock:
            self._records.append(record)

    async def push(self, record: Dict[str, Any]) -> None:
        self._append(record)

    def push_nowait(self, record: Dict[str, Any]) -> None:
        """Synchronous push for use outside a running event loop (logging.Handler.emit)."""
        self._append(record)

    async def tail(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        with self._lock:
            records = list(self._records)
        if limit is not None and limit > 0:
            records = records[-limit:]
        return records

    async def clear(self) -> None:
        with self._lock:
            self._records.clear()


tail_log = TailLogStore(maxlen=log_tail_size())


class TailLogHandler(logging.Handler):
    """logging.Handler that mirrors formatted records into the tail store."""

    def __init__(self, store: Optional[TailLogStore] = None, min_level: int = logging.INFO):
        super().__init__(level=min_level)
        self._store = store or tail_log
        from app.core.logging_config import JSONLogFormatter

        self.setFormatter(JSONLogFormatter())

    def emit(self, record: logging.LogRecord) -> None:
        try:
            line = self.format(record)
            import json as _json

            entry = _json.loads(line)
        except Exception:  # pragma: no cover - logging must never crash
            self.handleError(record)
            return

        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop is not None and loop.is_running():
            loop.call_soon_threadsafe(self._schedule_push, entry)
        else:
            # No running loop (e.g. sync startup, teardown): push synchronously.
            self._store.push_nowait(entry)

    def _schedule_push(self, entry: Dict[str, Any]) -> None:
        try:
            asyncio.create_task(self._store.push(entry))
        except (RuntimeError, Exception):  # pragma: no cover
            _logger.debug("Tail store push skipped (no running loop)")


_attached = False


def attach_tail_log_handler(min_level: int = logging.INFO) -> None:
    """Attach the tail handler to the root logger exactly once."""
    global _attached
    if _attached:
        return
    root = logging.getLogger()
    handler = TailLogHandler(min_level=min_level)
    root.addHandler(handler)
    _attached = True