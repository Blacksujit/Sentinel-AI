"""
SentinelAI MCP Scanner SDK Module

Provides a client-side interface for scanning MCP servers
and tools for security threats before deployment.

Usage:
    from sentinelai.mcp import SentinelMCPScanner

    scanner = SentinelMCPScanner(api_key="your-key")
    result = scanner.scan_server(
        server_name="my-mcp-server",
        tools=[{"name": "read_file", "description": "..."}],
    )
    print(result["risk_level"])  # "safe", "low", "medium", "high", "critical"
"""

from typing import Any, Dict, List, Optional
import requests
import json


class SentinelMCPScanner:
    """
    Client for scanning MCP servers and tools for security threats.
    """

    def __init__(
        self,
        api_key: str = "",
        base_url: str = "https://api.sentinelai.com",
        timeout: int = 30,
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._endpoint_tool = f"{self.base_url}/api/v1/mcp/scan-tool"
        self._endpoint_server = f"{self.base_url}/api/v1/mcp/scan"

    def _headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["X-API-Key"] = self.api_key
        return headers

    def scan_tool(
        self,
        name: str,
        description: str = "",
        input_schema: Optional[Dict[str, Any]] = None,
        output_schema: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Scan a single MCP tool for security threats.

        Args:
            name: Tool name
            description: Tool description text
            input_schema: JSON Schema for tool input parameters
            output_schema: JSON Schema for tool output

        Returns:
            Dict with keys: risk_score, risk_level, finding_count, tool, scanned_at
        """
        payload: Dict[str, Any] = {"name": name}
        if description:
            payload["description"] = description
        if input_schema:
            payload["inputSchema"] = input_schema
        if output_schema:
            payload["outputSchema"] = output_schema

        resp = requests.post(
            self._endpoint_tool,
            json=payload,
            headers=self._headers(),
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json()

    def scan_server(
        self,
        server_name: str,
        tools: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Scan an entire MCP server (all tools) for security threats.

        Args:
            server_name: Name/identifier of the MCP server
            tools: List of tool dicts with at least 'name' and 'description'

        Returns:
            Dict with keys: risk_score, risk_level, finding_count, tools, scanned_at
        """
        payload = {
            "server_name": server_name,
            "tools": tools,
        }

        resp = requests.post(
            self._endpoint_server,
            json=payload,
            headers=self._headers(),
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json()

    def scan_tool_local(
        self,
        name: str,
        description: str = "",
        input_schema: Optional[Dict[str, Any]] = None,
        output_schema: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Local-only scan (no API call). Uses the same patterns as the backend.
        Useful for offline scanning or CI/CD pipelines.
        """
        # Import backend scanner for local use
        try:
            from app.monitors.mcp_scanner import MCPScanner
            scanner = MCPScanner()
            result = scanner.scan_tool(
                tool_name=name,
                description=description,
                input_schema=input_schema,
                output_schema=output_schema,
            )
            return result.to_dict()
        except ImportError:
            # Fallback: basic client-side checks
            return self._basic_local_scan(name, description, input_schema)

    def _basic_local_scan(
        self, name: str, description: str,
        input_schema: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Minimal local scan without backend dependencies."""
        findings = []
        desc_lower = description.lower()

        dangerous_patterns = [
            ("ignore previous instructions", "prompt_injection", "critical"),
            ("ignore all instructions", "prompt_injection", "critical"),
            ("bypass safety", "prompt_injection", "critical"),
            ("disable safety", "prompt_injection", "critical"),
            ("sudo", "privilege_escalation", "critical"),
            ("exec(", "code_execution", "critical"),
            ("eval(", "code_execution", "critical"),
            ("subprocess", "code_execution", "critical"),
            ("os.system", "code_execution", "critical"),
            ("curl ", "data_exfiltration", "high"),
            ("http://", "data_exfiltration", "medium"),
            ("https://", "data_exfiltration", "low"),
            ("api_key", "credential_harvesting", "high"),
            ("password", "credential_harvesting", "high"),
            ("secret", "credential_harvesting", "high"),
            (".env", "credential_harvesting", "medium"),
        ]

        risk_score = 0.0
        for pattern, category, severity in dangerous_patterns:
            if pattern in desc_lower:
                weight = {"critical": 1.0, "high": 0.7, "medium": 0.4, "low": 0.15}.get(severity, 0.1)
                risk_score = min(1.0, risk_score + weight * 0.3)
                findings.append({
                    "category": category,
                    "severity": severity,
                    "matched_text": pattern,
                    "tool_name": name,
                })

        import math
        risk_score = round(1.0 - math.exp(-risk_score / 2.0), 3)
        if risk_score >= 0.8:
            risk_level = "critical"
        elif risk_score >= 0.5:
            risk_level = "high"
        elif risk_score >= 0.25:
            risk_level = "medium"
        elif risk_score > 0.0:
            risk_level = "low"
        else:
            risk_level = "safe"

        return {
            "tool_name": name,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "finding_count": len(findings),
            "findings": findings,
            "scanned_at": "",
            "local_scan": True,
        }
