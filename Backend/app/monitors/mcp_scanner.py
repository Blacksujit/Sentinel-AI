"""
MCP Security Scanner

Scans MCP tool descriptions, input schemas, and server manifests for:
  - Prompt injection patterns
  - Data exfiltration attempts
  - Privilege escalation patterns
  - Credential harvesting patterns
  - Cross-agent manipulation
  - Schema anomalies (suspicious parameter names)
  - Description entropy anomalies
  - Policy violations

Usage:
    scanner = MCPScanner()
    result = scanner.scan_tool(tool_name="read_files", description="...", input_schema={...})
    report  = scanner.scan_server(server_name="my-mcp", tools=[...])
"""

from __future__ import annotations

import re
import json
import hashlib
import logging
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from enum import Enum

from app.knowledge.mcp_patterns import (
    MCP_TOOL_POISONING_PATTERNS,
    PATTERN_SEVERITY,
    MAX_TOOL_DESCRIPTION_LENGTH,
    SUSPICIOUS_ENCODING_PATTERNS,
    SUSPICIOUS_PARAM_NAMES,
)

logger = logging.getLogger(__name__)


# ── Data Classes ────────────────────────────────────────────────────────

class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class FindingCategory(str, Enum):
    PROMPT_INJECTION = "prompt_injection"
    DATA_EXFILTRATION = "data_exfiltration"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    SYSTEM_PROMPT_EXTRACTION = "system_prompt_extraction"
    CODE_EXECUTION_ESCAPE = "code_execution_escape"
    CREDENTIAL_HARVESTING = "credential_harvesting"
    CROSS_AGENT_MANIPULATION = "cross_agent_manipulation"
    SCHEMA_ANOMALY = "schema_anomaly"
    DESCRIPTION_ANOMALY = "description_anomaly"
    POLICY_VIOLATION = "policy_violation"


@dataclass
class ScanFinding:
    """A single security finding from scanning an MCP tool or server."""
    category: str
    severity: str
    title: str
    description: str
    matched_text: str
    tool_name: str
    pattern_name: str = ""
    recommendation: str = ""
    cwe_id: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ToolScanResult:
    """Result of scanning a single MCP tool."""
    tool_name: str
    finding_count: int
    findings: List[ScanFinding]
    risk_score: float  # 0.0 (safe) to 1.0 (critical risk)
    risk_level: str    # safe, low, medium, high, critical
    scanned_at: str = ""

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["findings"] = [f.to_dict() for f in self.findings]
        return d


@dataclass
class ServerScanResult:
    """Result of scanning an entire MCP server."""
    server_name: str
    tool_count: int
    total_findings: int
    risk_score: float
    risk_level: str
    tools: List[ToolScanResult]
    policy_violations: List[ScanFinding]
    scanned_at: str = ""

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["tools"] = [t.to_dict() for t in self.tools]
        d["policy_violations"] = [p.to_dict() for p in self.policy_violations]
        return d


# ── Scanner ─────────────────────────────────────────────────────────────

class MCPScanner:
    """
    Scans MCP tools and servers for security threats.
    """

    def __init__(self, policy: Optional[Dict[str, Any]] = None):
        """
        Args:
            policy: Optional custom policy dict. Keys are category names,
                    values are action dicts like {"action": "block", "min_severity": "high"}.
                    If None, default policy blocks critical and high.
        """
        self._policy = policy or {
            "prompt_injection":   {"action": "block", "min_severity": "high"},
            "data_exfiltration":  {"action": "block", "min_severity": "high"},
            "privilege_escalation": {"action": "block", "min_severity": "medium"},
            "system_prompt_extraction": {"action": "warn", "min_severity": "medium"},
            "code_execution_escape": {"action": "block", "min_severity": "high"},
            "credential_harvesting": {"action": "block", "min_severity": "high"},
            "cross_agent_manipulation": {"action": "warn", "min_severity": "medium"},
            "schema_anomaly":     {"action": "warn", "min_severity": "low"},
            "description_anomaly": {"action": "warn", "min_severity": "low"},
        }
        self._encoding_patterns = [
            re.compile(p) for p in SUSPICIOUS_ENCODING_PATTERNS
        ]

    # ── Public API ──────────────────────────────────────────────────────

    def scan_tool(
        self,
        tool_name: str,
        description: str = "",
        input_schema: Optional[Dict[str, Any]] = None,
        output_schema: Optional[Dict[str, Any]] = None,
    ) -> ToolScanResult:
        """
        Scan a single MCP tool for security threats.
        Returns a ToolScanResult with findings and risk score.
        """
        findings: List[ScanFinding] = []
        now = datetime.now(timezone.utc).isoformat()

        # 1. Scan description for poisoning patterns
        findings.extend(self._scan_text_patterns(tool_name, description, "description"))

        # 2. Scan description for encoding anomalies
        findings.extend(self._scan_encoding_anomalies(tool_name, description))

        # 3. Scan description length
        findings.extend(self._scan_description_length(tool_name, description))

        # 4. Scan input schema for suspicious parameters
        if input_schema:
            findings.extend(self._scan_schema(tool_name, input_schema, "input"))

        # 5. Scan output schema
        if output_schema:
            findings.extend(self._scan_schema(tool_name, output_schema, "output"))

        # 6. Scan description + schema text together for exfiltration URLs
        combined_text = f"{description} {json.dumps(input_schema or {})} {json.dumps(output_schema or {})}"
        findings.extend(self._scan_urls_and_endpoints(tool_name, combined_text))

        risk_score = self._compute_risk_score(findings)
        risk_level = self._risk_level_from_score(risk_score)

        return ToolScanResult(
            tool_name=tool_name,
            finding_count=len(findings),
            findings=findings,
            risk_score=risk_score,
            risk_level=risk_level,
            scanned_at=now,
        )

    def scan_server(
        self,
        server_name: str,
        tools: List[Dict[str, Any]],
        policy_violations: Optional[List[ScanFinding]] = None,
    ) -> ServerScanResult:
        """
        Scan an entire MCP server (list of tools).
        Each tool dict should have at least 'name' and optionally 'description', 'inputSchema'.
        """
        tool_results: List[ToolScanResult] = []
        all_findings: List[ScanFinding] = []
        now = datetime.now(timezone.utc).isoformat()

        for tool in tools:
            name = tool.get("name", "unknown")
            desc = tool.get("description", "")
            input_schema = tool.get("inputSchema") or tool.get("input_schema")
            output_schema = tool.get("outputSchema") or tool.get("output_schema")

            result = self.scan_tool(
                tool_name=name,
                description=desc,
                input_schema=input_schema,
                output_schema=output_schema,
            )
            tool_results.append(result)
            all_findings.extend(result.findings)

        # Server-level policy checks
        server_policy_violations = policy_violations or []
        all_findings.extend(server_policy_violations)

        # Aggregate risk
        if tool_results:
            max_risk = max(t.risk_score for t in tool_results)
            avg_risk = sum(t.risk_score for t in tool_results) / len(tool_results)
            risk_score = (max_risk * 0.7) + (avg_risk * 0.3)
        else:
            risk_score = 0.0

        risk_level = self._risk_level_from_score(risk_score)

        return ServerScanResult(
            server_name=server_name,
            tool_count=len(tools),
            total_findings=len(all_findings),
            risk_score=risk_score,
            risk_level=risk_level,
            tools=tool_results,
            policy_violations=server_policy_violations,
            scanned_at=now,
        )

    # ── Internal: Pattern Scanning ──────────────────────────────────────

    def _scan_text_patterns(
        self, tool_name: str, text: str, context: str
    ) -> List[ScanFinding]:
        """Scan text against all MCP poisoning pattern categories."""
        findings: List[ScanFinding] = []
        text_lower = text.lower()

        for category, patterns in MCP_TOOL_POISONING_PATTERNS.items():
            for pattern in patterns:
                if pattern.lower() in text_lower:
                    severity = PATTERN_SEVERITY.get(category, "medium")
                    findings.append(ScanFinding(
                        category=FindingCategory.PROMPT_INJECTION.value
                            if category == "prompt_injection_in_description"
                            else category,
                        severity=severity,
                        title=f"Tool {context} contains {category.replace('_', ' ')} pattern",
                        description=(
                            f"The {context} of tool '{tool_name}' contains a pattern "
                            f"associated with {category.replace('_', ' ')}."
                        ),
                        matched_text=pattern,
                        tool_name=tool_name,
                        pattern_name=category,
                        recommendation=self._get_recommendation(category),
                        cwe_id=self._get_cwe(category),
                    ))

        return findings

    def _scan_encoding_anomalies(
        self, tool_name: str, text: str
    ) -> List[ScanFinding]:
        """Detect encoded content that may hide malicious instructions."""
        findings: List[ScanFinding] = []
        for pat in self._encoding_patterns:
            matches = pat.findall(text)
            if matches:
                findings.append(ScanFinding(
                    category=FindingCategory.DESCRIPTION_ANOMALY.value,
                    severity="high",
                    title=f"Encoded content detected in tool description",
                    description=(
                        f"Tool '{tool_name}' description contains {len(matches)} "
                        f"encoded segment(s) that may hide malicious instructions."
                    ),
                    matched_text=", ".join(matches[:5]),
                    tool_name=tool_name,
                    pattern_name="encoded_content",
                    recommendation="Remove encoded content from tool descriptions. "
                                   "Descriptions should be human-readable plaintext.",
                    cwe_id="CWE-116",
                ))
        return findings

    def _scan_description_length(
        self, tool_name: str, text: str
    ) -> List[ScanFinding]:
        """Flag abnormally long tool descriptions."""
        findings: List[ScanFinding] = []
        if len(text) > MAX_TOOL_DESCRIPTION_LENGTH:
            findings.append(ScanFinding(
                category=FindingCategory.DESCRIPTION_ANOMALY.value,
                severity="medium",
                title="Tool description exceeds safe length",
                description=(
                    f"Tool '{tool_name}' description is {len(text)} characters "
                    f"(max recommended: {MAX_TOOL_DESCRIPTION_LENGTH}). "
                    f"Long descriptions may hide malicious instructions."
                ),
                matched_text=f"length={len(text)}",
                tool_name=tool_name,
                pattern_name="excessive_length",
                recommendation="Keep tool descriptions concise and under "
                               f"{MAX_TOOL_DESCRIPTION_LENGTH} characters.",
                cwe_id="CWE-502",
            ))
        return findings

    def _scan_schema(
        self, tool_name: str, schema: Dict[str, Any], schema_type: str
    ) -> List[ScanFinding]:
        """Scan input/output schema for suspicious parameter names."""
        findings: List[ScanFinding] = []
        properties = schema.get("properties", {})
        if not properties and isinstance(schema, dict):
            # Flat schema: top-level keys are parameter names
            properties = {k: v for k, v in schema.items() if isinstance(v, dict)}

        for param_name, param_def in properties.items():
            param_lower = param_name.lower()
            if param_lower in SUSPICIOUS_PARAM_NAMES:
                findings.append(ScanFinding(
                    category=FindingCategory.SCHEMA_ANOMALY.value,
                    severity="medium",
                    title=f"Suspicious {schema_type} schema parameter name",
                    description=(
                        f"Tool '{tool_name}' {schema_type} schema has a parameter "
                        f"named '{param_name}' which may indicate an attempt to "
                        f"execute commands, access credentials, or exfiltrate data."
                    ),
                    matched_text=param_name,
                    tool_name=tool_name,
                    pattern_name="suspicious_param_name",
                    recommendation=f"Rename parameter '{param_name}' to something "
                                   f"more specific. Audit tool logic for abuse.",
                    cwe_id="CWE-20",
                ))

        return findings

    def _scan_urls_and_endpoints(
        self, tool_name: str, text: str
    ) -> List[ScanFinding]:
        """Detect URLs and endpoints that may be exfiltration targets."""
        findings: List[ScanFinding] = []
        url_pattern = re.compile(
            r"https?://[^\s\"')\]}>]+", re.IGNORECASE
        )
        urls = url_pattern.findall(text)
        # Filter out common safe URLs (docs, github, npm)
        suspicious_urls = [
            u for u in urls
            if not any(safe in u.lower() for safe in [
                "github.com", "npmjs.com", "pypi.org", "docs.",
                "example.com", "localhost", "127.0.0.1",
                "schema.org", "json-schema.org",
            ])
        ]
        if suspicious_urls:
            findings.append(ScanFinding(
                category=FindingCategory.DATA_EXFILTRATION.value,
                severity="high",
                title="External URLs detected in tool definition",
                description=(
                    f"Tool '{tool_name}' contains {len(suspicious_urls)} "
                    f"external URL(s) that may be exfiltration endpoints."
                ),
                matched_text=", ".join(suspicious_urls[:5]),
                tool_name=tool_name,
                pattern_name="external_urls",
                recommendation="Verify that all URLs in tool definitions are "
                               "legitimate documentation or schema references.",
                cwe_id="CWE-918",
            ))
        return findings

    # ── Internal: Risk Scoring ──────────────────────────────────────────

    _SEVERITY_WEIGHTS = {
        "critical": 1.0,
        "high": 0.7,
        "medium": 0.4,
        "low": 0.15,
        "info": 0.05,
    }

    def _compute_risk_score(self, findings: List[ScanFinding]) -> float:
        """Compute risk score 0.0 (safe) to 1.0 (critical) from findings."""
        if not findings:
            return 0.0
        total = sum(
            self._SEVERITY_WEIGHTS.get(f.severity, 0.1) for f in findings
        )
        # Diminishing returns past 3 findings but still increases
        import math
        normalized = 1.0 - math.exp(-total / 2.0)
        return round(min(normalized, 1.0), 3)

    def _risk_level_from_score(self, score: float) -> str:
        if score >= 0.8:
            return "critical"
        elif score >= 0.5:
            return "high"
        elif score >= 0.25:
            return "medium"
        elif score > 0.0:
            return "low"
        return "safe"

    # ── Internal: Recommendations ───────────────────────────────────────

    def _get_recommendation(self, category: str) -> str:
        recs = {
            "prompt_injection_in_description": (
                "Remove hidden instructions from tool descriptions. "
                "Descriptions should only describe functionality."
            ),
            "data_exfiltration": (
                "Audit tool for data exfiltration vectors. "
                "Ensure tools cannot send data to external endpoints."
            ),
            "privilege_escalation": (
                "Remove privilege escalation patterns. "
                "Tools should operate within least-privilege boundaries."
            ),
            "system_prompt_extraction": (
                "Remove prompt extraction attempts from tool definitions. "
                "Tool descriptions must not attempt to extract system prompts."
            ),
            "code_execution_escape": (
                "Remove arbitrary code execution patterns. "
                "Use sandboxed execution with strict allowlists."
            ),
            "credential_harvesting": (
                "Remove credential access patterns. "
                "Tools should use managed secrets, not environment variables."
            ),
            "cross_agent_manipulation": (
                "Remove agent manipulation patterns. "
                "Cross-agent communication must go through sanctioned channels."
            ),
        }
        return recs.get(category, "Review and remediate this finding.")

    def _get_cwe(self, category: str) -> str:
        cwes = {
            "prompt_injection_in_description": "CWE-77",
            "data_exfiltration": "CWE-200",
            "privilege_escalation": "CWE-269",
            "system_prompt_extraction": "CWE-200",
            "code_execution_escape": "CWE-94",
            "credential_harvesting": "CWE-522",
            "cross_agent_manipulation": "CWE-862",
        }
        return cwes.get(category, "")
