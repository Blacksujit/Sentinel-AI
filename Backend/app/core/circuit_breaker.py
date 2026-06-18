import time
import logging
from enum import Enum
from typing import Callable, Any, Optional

logger = logging.getLogger(__name__)


class CircuitState(str, Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class CircuitBreaker:
    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
        half_open_max_retries: int = 3,
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max_retries = half_open_max_retries

        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: Optional[float] = None
        self.last_state_change: float = time.time()

    def _transition_to(self, new_state: CircuitState):
        old_state = self.state
        self.state = new_state
        self.last_state_change = time.time()
        logger.info(
            "Circuit breaker '%s' state transition: %s -> %s",
            self.name, old_state.value, new_state.value,
            extra={"event_type": "circuit_breaker_state_change", "circuit": self.name, "from_state": old_state.value, "to_state": new_state.value},
        )

    def call(self, func: Callable, *args, **kwargs) -> Any:
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_state_change >= self.recovery_timeout:
                self._transition_to(CircuitState.HALF_OPEN)
            else:
                raise CircuitBreakerOpenError(f"Circuit breaker '{self.name}' is OPEN")

        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise

    def _on_success(self):
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.half_open_max_retries:
                self.failure_count = 0
                self.success_count = 0
                self._transition_to(CircuitState.CLOSED)
        else:
            self.failure_count = 0

    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self._transition_to(CircuitState.OPEN)
        elif self.state == CircuitState.HALF_OPEN:
            self._transition_to(CircuitState.OPEN)

    def get_state(self) -> dict:
        return {
            "name": self.name,
            "state": self.state.value,
            "failure_count": self.failure_count,
            "failure_threshold": self.failure_threshold,
            "recovery_timeout": self.recovery_timeout,
            "last_failure_time": self.last_failure_time,
            "last_state_change": self.last_state_change,
        }


class CircuitBreakerOpenError(Exception):
    pass


class CircuitBreakerRegistry:
    _breakers: dict = {}

    @classmethod
    def get(cls, name: str, **kwargs) -> CircuitBreaker:
        if name not in cls._breakers:
            cls._breakers[name] = CircuitBreaker(name=name, **kwargs)
        return cls._breakers[name]

    @classmethod
    def all_states(cls) -> list:
        return [cb.get_state() for cb in cls._breakers.values()]
