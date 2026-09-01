"""
ML-based anomaly detection for agent behavior profiling.

Uses statistical methods (Z-score, EWMA, frequency analysis) to detect
deviations from established behavioral baselines. No external ML
dependencies — pure Python with math module for portability.

Production approach:
  1. Build baseline from historical call data
  2. Score each new observation against the baseline
  3. Flag anomalies when observations exceed threshold
  4. Update baseline incrementally (online learning)
"""

import json
import logging
import math
import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


@dataclass
class AnomalyScore:
    """Result of an anomaly check."""
    agent_id: str
    is_anomaly: bool
    score: float
    reason: str
    details: Dict[str, Any]
    timestamp: float = field(default_factory=time.time)

    def as_dict(self) -> dict:
        return {
            "agent_id": self.agent_id,
            "is_anomaly": self.is_anomaly,
            "score": self.score,
            "reason": self.reason,
            "details": self.details,
            "timestamp": self.timestamp,
        }


class BehavioralBaseline:
    """
    Maintains a statistical baseline for agent behavior.
    Uses online (incremental) statistics — no need to store full history.
    """

    def __init__(self, agent_id: str, window_size: int = 1000):
        self.agent_id = agent_id
        self.window_size = window_size

        # Tool usage frequency (tool_name -> count)
        self._tool_counts: Dict[str, int] = defaultdict(int)
        self._tool_total: int = 0

        # Call rate tracking (timestamps of recent calls)
        self._call_timestamps: List[float] = []
        self._minute_counts: List[int] = []
        self._hour_counts: List[int] = []

        # Parameter patterns (tool_name -> param_name -> value distribution)
        self._param_patterns: Dict[str, Dict[str, List]] = defaultdict(lambda: defaultdict(list))

        # Data source access
        self._data_source_counts: Dict[str, int] = defaultdict(int)
        self._data_source_total: int = 0

        # Timing between calls
        self._call_intervals: List[float] = []

        # EWMA state for rate tracking
        self._ewma_minute: Optional[float] = None
        self._ewma_hour: Optional[float] = None
        self._ewma_alpha = 0.1  # Smoothing factor

        # Statistics cache
        self._stats_cache: Optional[dict] = None
        self._cache_time: float = 0

    def record_tool_call(
        self,
        tool_name: str,
        params: Optional[dict] = None,
        data_source: Optional[str] = None,
    ):
        """Record a tool call observation."""
        now = time.time()

        # Tool frequency
        self._tool_counts[tool_name] += 1
        self._tool_total += 1

        # Call timestamps for rate calculation
        self._call_timestamps.append(now)
        if len(self._call_timestamps) > self.window_size:
            self._call_timestamps = self._call_timestamps[-self.window_size:]

        # Call interval
        if len(self._call_timestamps) >= 2:
            interval = self._call_timestamps[-1] - self._call_timestamps[-2]
            self._call_intervals.append(interval)
            if len(self._call_intervals) > self.window_size:
                self._call_intervals = self._call_intervals[-self.window_size:]

        # Minute-level rate
        minute_count = sum(
            1 for ts in self._call_timestamps if now - ts < 60
        )
        self._minute_counts.append(minute_count)
        if len(self._minute_counts) > self.window_size:
            self._minute_counts = self._minute_counts[-self.window_size:]

        # Hour-level rate
        hour_count = sum(
            1 for ts in self._call_timestamps if now - ts < 3600
        )
        self._hour_counts.append(hour_count)
        if len(self._hour_counts) > self.window_size:
            self._hour_counts = self._hour_counts[-self.window_size:]

        # Update EWMA
        if self._ewma_minute is None:
            self._ewma_minute = minute_count
        else:
            self._ewma_minute = self._ewma_alpha * minute_count + (1 - self._ewma_alpha) * self._ewma_minute

        if self._ewma_hour is None:
            self._ewma_hour = hour_count
        else:
            self._ewma_hour = self._ewma_alpha * hour_count + (1 - self._ewma_alpha) * self._ewma_hour

        # Parameter patterns
        if params:
            for k, v in params.items():
                self._param_patterns[tool_name][k].append(str(v)[:100])
                if len(self._param_patterns[tool_name][k]) > 100:
                    self._param_patterns[tool_name][k] = self._param_patterns[tool_name][k][-100:]

        # Data source access
        if data_source:
            self._data_source_counts[data_source] += 1
            self._data_source_total += 1

        # Invalidate cache
        self._stats_cache = None

    def get_tool_frequency(self) -> Dict[str, float]:
        """Get normalized tool usage frequencies."""
        if self._tool_total == 0:
            return {}
        return {tool: count / self._tool_total for tool, count in self._tool_counts.items()}

    def get_rate_stats(self) -> Dict[str, Any]:
        """Get call rate statistics."""
        def mean(vals):
            return sum(vals) / len(vals) if vals else 0.0

        def std(vals):
            m = mean(vals)
            variance = sum((v - m) ** 2 for v in vals) / len(vals) if vals else 0.0
            return math.sqrt(variance)

        return {
            "mean_calls_per_minute": mean(self._minute_counts),
            "std_calls_per_minute": std(self._minute_counts),
            "mean_calls_per_hour": mean(self._hour_counts),
            "std_calls_per_hour": std(self._hour_counts),
            "ewma_minute": self._ewma_minute or 0.0,
            "ewma_hour": self._ewma_hour or 0.0,
            "mean_interval": mean(self._call_intervals) if self._call_intervals else 0.0,
            "std_interval": std(self._call_intervals) if self._call_intervals else 0.0,
            "observation_count": self._tool_total,
        }

    def get_data_source_frequency(self) -> Dict[str, float]:
        """Get normalized data source access frequencies."""
        if self._data_source_total == 0:
            return {}
        return {
            ds: count / self._data_source_total
            for ds, count in self._data_source_counts.items()
        }

    def to_dict(self) -> dict:
        """Serialize the baseline."""
        return {
            "agent_id": self.agent_id,
            "tool_frequency": self.get_tool_frequency(),
            "rate_stats": self.get_rate_stats(),
            "data_source_frequency": self.get_data_source_frequency(),
            "tool_counts": dict(self._tool_counts),
            "data_source_counts": dict(self._data_source_counts),
        }

    def to_persistence_dict(self) -> dict:
        """Get dict suitable for database persistence."""
        stats = self.get_rate_stats()
        return {
            "agent_id": self.agent_id,
            "tool_frequency": self.get_tool_frequency(),
            "param_patterns": {
                tool: {k: len(v) for k, v in params.items()}
                for tool, params in self._param_patterns.items()
            },
            "mean_calls_per_minute": stats["mean_calls_per_minute"],
            "std_calls_per_minute": stats["std_calls_per_minute"],
            "mean_calls_per_hour": stats["mean_calls_per_hour"],
            "std_calls_per_hour": stats["std_calls_per_hour"],
            "data_source_frequency": self.get_data_source_frequency(),
            "observation_count": stats["observation_count"],
        }


class AnomalyDetector:
    """
    Detects anomalous agent behavior by comparing observations against baselines.

    Uses a multi-signal approach:
      1. Z-score on call rate (is the agent calling tools too fast?)
      2. Tool distribution divergence (is the agent using unusual tools?)
      3. Parameter pattern anomalies (are params unusual for this tool?)
      4. Data source access anomalies (accessing unusual data?)
      5. Timing anomalies (call intervals unusually short?)

    Each signal produces an anomaly score. The composite score is weighted.
    """

    def __init__(self, z_threshold: float = 3.0):
        self.z_threshold = z_threshold
        self._baselines: Dict[str, BehavioralBaseline] = {}

        # Weights for composite score
        self._weights = {
            "rate": 0.30,
            "tool_distribution": 0.25,
            "parameter": 0.15,
            "data_source": 0.15,
            "timing": 0.15,
        }

    def get_or_create_baseline(self, agent_id: str) -> BehavioralBaseline:
        """Get existing baseline or create a new one."""
        if agent_id not in self._baselines:
            self._baselines[agent_id] = BehavioralBaseline(agent_id)
        return self._baselines[agent_id]

    def load_baseline(self, agent_id: str, data: dict):
        """Load a baseline from persisted data."""
        baseline = BehavioralBaseline(agent_id)
        if "tool_counts" in data:
            baseline._tool_counts = defaultdict(int, data["tool_counts"])
            baseline._tool_total = sum(data["tool_counts"].values())
        if "data_source_counts" in data:
            baseline._data_source_counts = defaultdict(int, data["data_source_counts"])
            baseline._data_source_total = sum(data["data_source_counts"].values())
        self._baselines[agent_id] = baseline

    def check_anomaly(
        self,
        agent_id: str,
        tool_name: str,
        params: Optional[dict] = None,
        data_source: Optional[str] = None,
        call_interval: Optional[float] = None,
    ) -> AnomalyScore:
        """
        Check if a tool call is anomalous for this agent.

        Returns an AnomalyScore with is_anomaly flag and details.
        """
        baseline = self.get_or_create_baseline(agent_id)
        details = {}
        sub_scores = {}

        # Skip check if baseline is too small
        if baseline._tool_total < 10:
            baseline.record_tool_call(tool_name, params, data_source)
            return AnomalyScore(
                agent_id=agent_id,
                is_anomaly=False,
                score=0.0,
                reason="Building baseline (need >=10 observations)",
                details={"observation_count": baseline._tool_total},
            )

        # 1. Rate anomaly (Z-score on minute-level call count)
        rate_stats = baseline.get_rate_stats()
        if rate_stats["std_calls_per_minute"] > 0:
            current_rate = sum(
                1 for ts in baseline._call_timestamps if time.time() - ts < 60
            )
            z_rate = (current_rate - rate_stats["mean_calls_per_minute"]) / rate_stats["std_calls_per_minute"]
            sub_scores["rate"] = min(abs(z_rate) / self.z_threshold, 1.0)
            details["rate"] = {
                "current": current_rate,
                "mean": rate_stats["mean_calls_per_minute"],
                "std": rate_stats["std_calls_per_minute"],
                "z_score": round(z_rate, 2),
            }
        else:
            sub_scores["rate"] = 0.0

        # 2. Tool distribution anomaly (entropy-based)
        tool_freq = baseline.get_tool_frequency()
        if tool_freq:
            # Calculate surprise: -log2(frequency of observed tool)
            if tool_name in tool_freq and tool_freq[tool_name] > 0:
                surprise = -math.log2(tool_freq[tool_name])
                # Normalize: max surprise is log2(num_tools)
                max_surprise = math.log2(max(len(tool_freq), 2))
                sub_scores["tool_distribution"] = min(surprise / max_surprise, 1.0) if max_surprise > 0 else 0.0
            else:
                # Tool never seen before — high anomaly
                sub_scores["tool_distribution"] = 0.9
                details["unknown_tool"] = True
            details["tool_frequency"] = tool_freq
        else:
            sub_scores["tool_distribution"] = 0.0

        # 3. Parameter anomaly
        if params:
            param_anomalies = []
            for k, v in params.items():
                val_str = str(v)[:100]
                if k in baseline._param_patterns.get(tool_name, {}):
                    known_values = baseline._param_patterns[tool_name][k]
                    if known_values and val_str not in known_values:
                        # New parameter value — might be anomalous
                        param_anomalies.append(k)
                else:
                    # New parameter name for this tool
                    param_anomalies.append(k)

            if params:
                sub_scores["parameter"] = min(len(param_anomalies) / len(params), 1.0)
            else:
                sub_scores["parameter"] = 0.0
            if param_anomalies:
                details["anomalous_params"] = param_anomalies
        else:
            sub_scores["parameter"] = 0.0

        # 4. Data source anomaly
        if data_source:
            ds_freq = baseline.get_data_source_frequency()
            if ds_freq:
                if data_source in ds_freq:
                    # Frequent access — less anomalous
                    freq = ds_freq[data_source]
                    sub_scores["data_source"] = max(0, 1.0 - freq * 5)
                else:
                    # Never accessed before — anomalous
                    sub_scores["data_source"] = 0.8
                    details["unknown_data_source"] = True
                details["data_source_frequency"] = ds_freq
            else:
                sub_scores["data_source"] = 0.5
        else:
            sub_scores["data_source"] = 0.0

        # 5. Timing anomaly
        if call_interval is not None and rate_stats["std_interval"] > 0:
            z_timing = (call_interval - rate_stats["mean_interval"]) / rate_stats["std_interval"]
            # Short intervals are suspicious (rapid-fire calls)
            if z_timing < -2:
                sub_scores["timing"] = min(abs(z_timing) / self.z_threshold, 1.0)
            else:
                sub_scores["timing"] = 0.0
            details["timing"] = {
                "interval": round(call_interval, 3),
                "mean": round(rate_stats["mean_interval"], 3),
                "z_score": round(z_timing, 2),
            }
        else:
            sub_scores["timing"] = 0.0

        # Composite score
        composite = sum(
            sub_scores[k] * self._weights[k]
            for k in self._weights
        )

        # Determine if anomaly
        is_anomaly = composite > 0.5 or any(
            sub_scores[k] > 0.8 for k in sub_scores
        )

        # Determine reason
        if is_anomaly:
            reasons = []
            if sub_scores.get("rate", 0) > 0.5:
                reasons.append(f"High call rate (z={details.get('rate', {}).get('z_score', '?')})")
            if sub_scores.get("tool_distribution", 0) > 0.5:
                if details.get("unknown_tool"):
                    reasons.append(f"Unknown tool: {tool_name}")
                else:
                    reasons.append("Unusual tool selection")
            if sub_scores.get("parameter", 0) > 0.5:
                reasons.append(f"Anomalous params: {details.get('anomalous_params', [])}")
            if sub_scores.get("data_source", 0) > 0.5:
                if details.get("unknown_data_source"):
                    reasons.append(f"Unknown data source: {data_source}")
                else:
                    reasons.append("Unusual data source access")
            if sub_scores.get("timing", 0) > 0.5:
                reasons.append("Suspicious call timing")
            reason = "; ".join(reasons)
        else:
            reason = "Within baseline parameters"

        details["sub_scores"] = {k: round(v, 3) for k, v in sub_scores.items()}
        details["observation_count"] = baseline._tool_total

        # Record the call for future baselining
        baseline.record_tool_call(tool_name, params, data_source)

        return AnomalyScore(
            agent_id=agent_id,
            is_anomaly=is_anomaly,
            score=round(composite, 3),
            reason=reason,
            details=details,
        )

    def get_baseline(self, agent_id: str) -> Optional[BehavioralBaseline]:
        """Get baseline for an agent."""
        return self._baselines.get(agent_id)

    def get_all_baselines(self) -> Dict[str, dict]:
        """Get all baselines as serializable dicts."""
        return {aid: b.to_dict() for aid, b in self._baselines.items()}

    def train_batch(self, agent_id: str, observations: List[dict]):
        """
        Train a baseline from a batch of historical observations.

        Each observation: {"tool_name": str, "params": dict, "data_source": str, "timestamp": float}
        """
        baseline = self.get_or_create_baseline(agent_id)
        sorted_obs = sorted(observations, key=lambda x: x.get("timestamp", 0))

        for obs in sorted_obs:
            baseline.record_tool_call(
                tool_name=obs["tool_name"],
                params=obs.get("params"),
                data_source=obs.get("data_source"),
            )

        logger.info(
            "Trained baseline for %s: %d observations",
            agent_id, len(sorted_obs),
        )


# Global singleton
anomaly_detector = AnomalyDetector()
