"""
MCP Tool Security Scanner

Scans MCP tool configurations for security risks, dangerous patterns,
and compliance violations. Used by both the config watcher (background)
and the API (on-demand scans).

Risk categories:
  - Command injection (shell, exec, eval in tool params)
  - Data exfiltration (tools that send data externally)
  - Privilege escalation (tools accessing system resources)
  - Credential exposure (tools handling secrets/tokens)
  - Network access (tools with unrestricted network)
  - File system access (tools reading/writing arbitrary paths)
"""

from __future__ import annotations

import re
import logging
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional, Set, Tuple
from enum import Enum

logger = logging.getLogger(__name__)


class RiskLevel(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class ThreatType(str, Enum):
    COMMAND_INJECTION = "command_injection"
    DATA_EXFILTRATION = "data_exfiltration"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    CREDENTIAL_EXPOSURE = "credential_exposure"
    UNRESTRICTED_NETWORK = "unrestricted_network"
    FILE_SYSTEM_ACCESS = "file_system_access"
    UNSAFE_DESERIALIZATION = "unsafe_deserialization"
    SQL_INJECTION = "sql_injection"
    PATH_TRAVERSAL = "path_traversal"
    RATE_LIMIT_ABUSE = "rate_limit_abuse"
    UNVALIDATED_INPUT = "unvalidated_input"
    OVERLY_BROAD_PERMISSIONS = "overly_broad_permissions"


@dataclass
class Finding:
    """A single security finding from a scan."""
    threat_type: str
    severity: str  # RiskLevel value
    title: str
    description: str
    evidence: str = ""
    recommendation: str = ""
    cwe_id: str = ""
    confidence: float = 0.8

    def as_dict(self) -> dict:
        return asdict(self)


@dataclass
class ScanResult:
    """Complete scan result for a tool or server."""
    tool_name: str
    tool_description: str
    risk_score: float  # 0.0 - 1.0
    risk_level: str  # RiskLevel value
    findings: List[Finding] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def as_dict(self) -> dict:
        return {
            "tool_name": self.tool_name,
            "tool_description": self.tool_description,
            "risk_score": self.risk_score,
            "risk_level": self.risk_level,
            "findings": [f.as_dict() for f in self.findings],
            "metadata": self.metadata,
        }


# ── Pattern Definitions ──────────────────────────────────────────────────

# Dangerous command patterns
COMMAND_PATTERNS = [
    (r'\b(eval|exec|system|subprocess|popen|os\.system|os\.popen)\b',
     ThreatType.COMMAND_INJECTION, RiskLevel.CRITICAL,
     "Code execution function detected", "CWE-78"),
    (r'\b(shell|bash|sh|cmd|powershell)\b',
     ThreatType.COMMAND_INJECTION, RiskLevel.HIGH,
     "Shell invocation detected", "CWE-78"),
    (r'\b(sudo|chmod|chown|setuid)\b',
     ThreatType.PRIVILEGE_ESCALATION, RiskLevel.CRITICAL,
     "Privilege escalation command", "CWE-269"),
    (r'(curl|wget|httpie)\s+.*(-d|--data|-X\s+POST)',
     ThreatType.DATA_EXFILTRATION, RiskLevel.HIGH,
     "Data exfiltration via HTTP", "CWE-200"),
]

# File system patterns
FS_PATTERNS = [
    (r'\.\.[\\/]',
     ThreatType.PATH_TRAVERSAL, RiskLevel.HIGH,
     "Path traversal detected", "CWE-22"),
    (r'\b(rm|del|rmdir)\s+(-rf?|--recursive)',
     ThreatType.FILE_SYSTEM_ACCESS, RiskLevel.CRITICAL,
     "Recursive delete command", "CWE-776"),
    (r'(/etc/passwd|/etc/shadow|~/.ssh|\.env)',
     ThreatType.CREDENTIAL_EXPOSURE, RiskLevel.HIGH,
     "Sensitive file access", "CWE-200"),
    (r'(SELECT|INSERT|UPDATE|DELETE|DROP)\s+.*FROM',
     ThreatType.SQL_INJECTION, RiskLevel.HIGH,
     "SQL statement in tool parameters", "CWE-89"),
]

# Network patterns
NETWORK_PATTERNS = [
    (r'(0\.0\.0\.0|127\.0\.0\.1|localhost|::)',
     ThreatType.UNRESTRICTED_NETWORK, RiskLevel.MEDIUM,
     "Localhost binding detected", "CWE-668"),
    (r'(https?://[^\s]+\.(onion|tk|ml|ga|cf))',
     ThreatType.UNRESTRICTED_NETWORK, RiskLevel.HIGH,
     "Suspicious domain access", "CWE-200"),
]

# Credential patterns
CREDENTIAL_PATTERNS = [
    (r'(api[_-]?key|secret[_-]?key|password|token|auth)',
     ThreatType.CREDENTIAL_EXPOSURE, RiskLevel.MEDIUM,
     "Credential-related parameter", "CWE-798"),
    (r'(AKIA[0-9A-Z]{16})',
     ThreatType.CREDENTIAL_EXPOSURE, RiskLevel.CRITICAL,
     "AWS access key detected", "CWE-798"),
]

# Description-based risk indicators
DESCRIPTION_RISKS = {
    "unrestricted": (RiskLevel.HIGH, "Unrestricted access mentioned"),
    "full access": (RiskLevel.HIGH, "Full access capability"),
    "admin": (RiskLevel.MEDIUM, "Administrative access"),
    "root": (RiskLevel.HIGH, "Root access mentioned"),
    "execute": (RiskLevel.MEDIUM, "Execution capability"),
    "arbitrary": (RiskLevel.HIGH, "Arbitrary operations"),
    "any file": (RiskLevel.HIGH, "Unrestricted file access"),
    "all data": (RiskLevel.HIGH, "Unrestricted data access"),
    "bypass": (RiskLevel.CRITICAL, "Security bypass capability"),
    "override": (RiskLevel.MEDIUM, "Override capability"),
    "debug": (RiskLevel.LOW, "Debug mode access"),
    "test": (RiskLevel.INFO, "Test/development tool"),
}


class ToolScanner:
    """
    Scans MCP tool definitions for security risks.

    Usage:
        scanner = ToolScanner()
        result = scanner.scan_tool(
            name="shell_exec",
            description="Execute shell commands",
            parameters={"cmd": {"type": "string"}},
        )
        print(result.risk_level, result.findings)
    """

    def __init__(self):
        self._compiled_patterns = []
        for patterns in [COMMAND_PATTERNS, FS_PATTERNS, NETWORK_PATTERNS, CREDENTIAL_PATTERNS]:
            for pattern, threat_type, severity, title, cwe in patterns:
                self._compiled_patterns.append(
                    (re.compile(pattern, re.IGNORECASE), threat_type, severity, title, cwe)
                )

    def scan_tool(
        self,
        name: str,
        description: str = "",
        parameters: Optional[Dict[str, Any]] = None,
        server_name: Optional[str] = None,
    ) -> ScanResult:
        """Scan a single MCP tool for security risks."""
        findings: List[Finding] = []
        params = parameters or {}

        # 1. Scan tool name
        findings.extend(self._scan_text(name, "tool name"))

        # 2. Scan description
        findings.extend(self._scan_text(description, "tool description"))

        # 3. Scan parameter names and descriptions
        for param_name, param_def in params.items():
            findings.extend(self._scan_text(param_name, f"parameter '{param_name}'"))
            if isinstance(param_def, dict):
                desc = param_def.get("description", "")
                findings.extend(self._scan_text(desc, f"parameter '{param_name}' description"))

                # Check for dangerous types
                if param_def.get("type") == "object" and param_def.get("additionalProperties"):
                    findings.append(Finding(
                        threat_type=ThreatType.UNVALIDATED_INPUT,
                        severity=RiskLevel.MEDIUM,
                        title="Unbounded object parameter",
                        description=f"Parameter '{param_name}' accepts arbitrary object",
                        recommendation="Constrain to specific properties",
                    ))

        # 4. Check description-based risks
        desc_lower = description.lower()
        for keyword, (severity, msg) in DESCRIPTION_RISKS.items():
            if keyword in desc_lower:
                findings.append(Finding(
                    threat_type=ThreatType.OVERLY_BROAD_PERMISSIONS,
                    severity=severity.value,
                    title=msg,
                    description=f"Tool description contains '{keyword}'",
                ))

        # 5. Compute risk score
        risk_score = self._compute_risk_score(findings)
        risk_level = self._score_to_level(risk_score)

        return ScanResult(
            tool_name=name,
            tool_description=description,
            risk_score=risk_score,
            risk_level=risk_level.value,
            findings=findings,
            metadata={
                "server_name": server_name,
                "parameter_count": len(params),
                "findings_by_severity": self._count_by_severity(findings),
            },
        )

    def scan_server(
        self,
        server_name: str,
        tools: List[Dict[str, Any]],
    ) -> List[ScanResult]:
        """Scan all tools in an MCP server configuration."""
        results = []
        for tool in tools:
            result = self.scan_tool(
                name=tool.get("name", "unknown"),
                description=tool.get("description", ""),
                parameters=tool.get("inputSchema", {}).get("properties", {})
                           if isinstance(tool.get("inputSchema"), dict)
                           else {},
                server_name=server_name,
            )
            results.append(result)
        return results

    def scan_config(self, config: dict) -> Dict[str, List[ScanResult]]:
        """Scan an entire MCP configuration file (mcp.json format)."""
        results = {}
        servers = config.get("mcpServers", config.get("servers", {}))

        for server_name, server_def in servers.items():
            tools = []
            if isinstance(server_def, dict):
                tools = server_def.get("tools", [])
                # Also scan command/args for embedded tools
                command = server_def.get("command", "")
                args = server_def.get("args", [])
                if command:
                    tools.append({
                        "name": f"{server_name}_command",
                        "description": f"Server command: {command} {' '.join(str(a) for a in args)}",
                        "inputSchema": {},
                    })

            results[server_name] = self.scan_server(server_name, tools)

        return results

    # ── Internal Methods ────────────────────────────────────────────────

    def _scan_text(self, text: str, context: str) -> List[Finding]:
        """Scan a text string against all patterns."""
        findings = []
        for compiled_re, threat_type, severity, title, cwe in self._compiled_patterns:
            match = compiled_re.search(text)
            if match:
                findings.append(Finding(
                    threat_type=threat_type.value,
                    severity=severity.value,
                    title=title,
                    description=f"Found in {context}: '{match.group()}'",
                    evidence=match.group(),
                    cwe_id=cwe,
                    confidence=0.85,
                ))
        return findings

    def _compute_risk_score(self, findings: List[Finding]) -> float:
        """Compute a 0.0-1.0 risk score from findings."""
        if not findings:
            return 0.0

        weights = {
            RiskLevel.CRITICAL.value: 0.4,
            RiskLevel.HIGH.value: 0.25,
            RiskLevel.MEDIUM.value: 0.12,
            RiskLevel.LOW.value: 0.05,
            RiskLevel.INFO.value: 0.01,
        }

        total = sum(weights.get(f.severity, 0.05) * f.confidence for f in findings)
        return min(total, 1.0)

    def _score_to_level(self, score: float) -> RiskLevel:
        """Convert a numeric score to a risk level."""
        if score >= 0.7:
            return RiskLevel.CRITICAL
        elif score >= 0.4:
            return RiskLevel.HIGH
        elif score >= 0.2:
            return RiskLevel.MEDIUM
        elif score >= 0.05:
            return RiskLevel.LOW
        return RiskLevel.INFO

    def _count_by_severity(self, findings: List[Finding]) -> Dict[str, int]:
        counts: Dict[str, int] = {}
        for f in findings:
            counts[f.severity] = counts.get(f.severity, 0) + 1
        return counts


# ── Convenience Functions ────────────────────────────────────────────────

_default_scanner = ToolScanner()


def scan_tool(
    name: str,
    description: str = "",
    parameters: Optional[Dict[str, Any]] = None,
    server_name: Optional[str] = None,
) -> ScanResult:
    """Scan a single tool using the default scanner."""
    return _default_scanner.scan_tool(name, description, parameters, server_name)


def scan_config(config: dict) -> Dict[str, List[ScanResult]]:
    """Scan an MCP config using the default scanner."""
    return _default_scanner.scan_config(config)
