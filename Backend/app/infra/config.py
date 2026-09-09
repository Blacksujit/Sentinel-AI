"""Runtime configuration for the production infra stack (queues, brokers, logs).

Resolution order for the async job broker:
1. Kafka       - when KAFKA_BOOTSTRAP_SERVERS is set (aiokafka must be installed).
2. Redis       - when REDIS_URL is set (Redis Streams - recommended on Render/Upstash).
3. In-memory   - last resort, single-process only (local dev / DB-down recovery).
"""

import os
from enum import Enum


class BrokerKind(str, Enum):
    KAFKA = "kafka"
    REDIS = "redis"
    MEMORY = "memory"


def get_redis_url() -> str:
    return os.getenv("REDIS_URL", "").strip()


def get_kafka_servers() -> str:
    return os.getenv("KAFKA_BOOTSTRAP_SERVERS", "").strip()


def queue_mode() -> BrokerKind:
    explicit = os.getenv("QUEUE_MODE", "").strip().lower()
    if explicit in {k.value for k in BrokerKind}:
        return BrokerKind(explicit)
    if get_kafka_servers():
        return BrokerKind.KAFKA
    if get_redis_url():
        return BrokerKind.REDIS
    return BrokerKind.MEMORY


def queue_stream_name() -> str:
    return os.getenv("QUEUE_STREAM_NAME", "sentinelai-jobs")


def queue_dlq_name() -> str:
    return os.getenv("QUEUE_DLQ_NAME", "sentinelai-jobs-dlq")


def queue_group_name() -> str:
    return os.getenv("QUEUE_GROUP_NAME", "sentinelai-workers")


def queue_max_retries() -> int:
    return int(os.getenv("QUEUE_MAX_RETRIES", "3"))


def queue_backoff_seconds() -> float:
    return float(os.getenv("QUEUE_BACKOFF_SECONDS", "5"))


def queue_poll_interval() -> float:
    return float(os.getenv("QUEUE_POLL_INTERVAL", "1.0"))


def queue_retention_ms() -> int:
    return int(os.getenv("QUEUE_RETENTION_MS", "604800000"))


def log_tail_size() -> int:
    return int(os.getenv("LOG_TAIL_SIZE", "1000"))


def channel_prefix() -> str:
    return os.getenv("CHANNEL_PREFIX", "sentinelai")


def ws_broadcast_channel() -> str:
    return f"{channel_prefix()}:ws:broadcast"