import time
import logging
import random
from functools import wraps
from typing import Callable, Type, Tuple, Optional, List

logger = logging.getLogger(__name__)


def retry(
    max_retries: int = 3,
    base_delay: float = 0.1,
    max_delay: float = 10.0,
    backoff_factor: float = 2.0,
    jitter: bool = True,
    retryable_exceptions: Optional[Tuple[Type[Exception], ...]] = None,
    on_retry: Optional[Callable] = None,
):
    if retryable_exceptions is None:
        retryable_exceptions = (ConnectionError, TimeoutError, OSError)

    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except retryable_exceptions as e:
                    last_exception = e
                    if attempt >= max_retries:
                        raise

                    delay = min(base_delay * (backoff_factor ** attempt), max_delay)
                    if jitter:
                        delay = delay * (0.5 + random.random() * 0.5)

                    logger.warning(
                        "Retry attempt %d/%d for %s after %.2fs: %s",
                        attempt + 1, max_retries, func.__name__, delay, str(e),
                        extra={"event_type": "retry", "function": func.__name__, "attempt": attempt + 1, "max_retries": max_retries, "delay": delay},
                    )

                    if on_retry:
                        on_retry(attempt + 1, delay, e)

                    time.sleep(delay)

            raise last_exception

        return wrapper

    return decorator


def retry_async(
    max_retries: int = 3,
    base_delay: float = 0.1,
    max_delay: float = 10.0,
    backoff_factor: float = 2.0,
    jitter: bool = True,
    retryable_exceptions: Optional[Tuple[Type[Exception], ...]] = None,
    on_retry: Optional[Callable] = None,
):
    if retryable_exceptions is None:
        retryable_exceptions = (ConnectionError, TimeoutError, OSError)

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            import asyncio
            last_exception = None
            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except retryable_exceptions as e:
                    last_exception = e
                    if attempt >= max_retries:
                        raise

                    delay = min(base_delay * (backoff_factor ** attempt), max_delay)
                    if jitter:
                        delay = delay * (0.5 + random.random() * 0.5)

                    logger.warning(
                        "Retry attempt %d/%d for %s after %.2fs: %s",
                        attempt + 1, max_retries, func.__name__, delay, str(e),
                    )

                    if on_retry:
                        on_retry(attempt + 1, delay, e)

                    await asyncio.sleep(delay)

            raise last_exception

        return wrapper

    return decorator
