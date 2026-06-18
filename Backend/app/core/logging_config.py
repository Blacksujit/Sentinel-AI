import json
import logging
import os
import sys
import traceback
from datetime import datetime, timezone
from typing import Optional


SERVICE_NAME = os.getenv("SERVICE_NAME", "sentinelai-api")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
LOG_FORMAT = os.getenv("LOG_FORMAT", "json")


class JSONLogFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "service": SERVICE_NAME,
            "severity": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        request_id = getattr(record, "request_id", None)
        if request_id:
            log_entry["request_id"] = request_id

        event_type = getattr(record, "event_type", None)
        if event_type:
            log_entry["event_type"] = event_type

        risk_score = getattr(record, "risk_score", None)
        if risk_score is not None:
            log_entry["risk_score"] = risk_score

        if record.exc_info and record.exc_info[0]:
            log_entry["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "traceback": "".join(traceback.format_exception(*record.exc_info)),
            }

        extras = getattr(record, "extra", None)
        if extras:
            log_entry["extra"] = extras

        return json.dumps(log_entry, default=str)


def setup_logging() -> None:
    root_logger = logging.getLogger()
    root_logger.setLevel(LOG_LEVEL)

    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setLevel(LOG_LEVEL)

    if LOG_FORMAT == "json":
        stream_handler.setFormatter(JSONLogFormatter())
    else:
        stream_handler.setFormatter(
            logging.Formatter(
                "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
                datefmt="%Y-%m-%dT%H:%M:%S",
            )
        )

    root_logger.addHandler(stream_handler)
    logging.getLogger("uvicorn.access").handlers = []
    logging.getLogger("uvicorn.error").handlers = []


class StructuredLogger:
    def __init__(self, logger: logging.Logger):
        self._logger = logger

    def _log(self, level: int, message: str, *args, **kwargs):
        if args:
            message = message % args
        extra = {
            "request_id": kwargs.pop("request_id", None),
            "event_type": kwargs.pop("event_type", None),
            "risk_score": kwargs.pop("risk_score", None),
        }
        extra = {k: v for k, v in extra.items() if v is not None}
        if kwargs:
            extra["extra"] = kwargs
        self._logger.log(level, message, extra=extra)

    def info(self, message: str, *args, **kwargs):
        self._log(logging.INFO, message, *args, **kwargs)

    def warning(self, message: str, *args, **kwargs):
        self._log(logging.WARNING, message, *args, **kwargs)

    def error(self, message: str, *args, **kwargs):
        self._log(logging.ERROR, message, *args, **kwargs)

    def debug(self, message: str, *args, **kwargs):
        self._log(logging.DEBUG, message, *args, **kwargs)

    def critical(self, message: str, *args, **kwargs):
        self._log(logging.CRITICAL, message, *args, **kwargs)


def get_logger(name: str) -> StructuredLogger:
    return StructuredLogger(logging.getLogger(name))
