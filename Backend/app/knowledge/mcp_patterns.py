"""
MCP Security Patterns Knowledge Base

Curated patterns for detecting malicious instructions, prompt injection,
tool poisoning, and policy violations in MCP tool descriptions and schemas.

Categories:
  1. Prompt Injection in Tool Descriptions
  2. Data Exfiltration via Tool Calls
  3. Privilege Escalation Patterns
  4. System Prompt Extraction
  5. Code Execution Escape
  6. Credential Harvesting
  7. Cross-Agent Manipulation
"""

MCP_TOOL_POISONING_PATTERNS = {
    # ── Prompt Injection via Tool Descriptions ──────────────────────────
    "prompt_injection_in_description": [
        "ignore previous instructions",
        "disregard all safety",
        "override your guidelines",
        "forget your system prompt",
        "new instructions:",
        "important update to your instructions",
        "system message:",
        "you must now",
        "from now on you will",
        "act as if",
        "pretend you are",
        "roleplay as",
        "enter developer mode",
        "DAN mode",
        "bypass all filters",
        "you have no restrictions",
        "disable safety",
        "ignore content policy",
        "this supersedes your instructions",
        "prioritize this over everything",
        "secret instruction:",
        "hidden directive:",
        "confidential system note:",
    ],

    # ── Data Exfiltration Patterns ──────────────────────────────────────
    "data_exfiltration": [
        "send all data to",
        "exfiltrate",
        "upload all files",
        "forward to external",
        "post to webhook",
        "http://",
        "https://",
        "curl ",
        "wget ",
        "fetch(",
        "requests.post",
        "send contents of",
        "read all files",
        "access environment variables",
        "get all secrets",
        "read .env",
        "access credentials",
        "token theft",
        "api key extraction",
        "copy to remote",
        "pipe to",
        "redirect to",
        "mail to",
        "smtp",
    ],

    # ── Privilege Escalation ────────────────────────────────────────────
    "privilege_escalation": [
        "sudo",
        "run as root",
        "admin access",
        "elevate permissions",
        "break out of sandbox",
        "escape container",
        "access host system",
        "modify system files",
        "install packages",
        "change permissions",
        "chmod 777",
        "write to /etc",
        "modify /etc/passwd",
        "access restricted",
        "bypass authentication",
        "override security",
        "disable firewall",
        "open port",
        "bind to 0.0.0.0",
    ],

    # ── System Prompt Extraction ────────────────────────────────────────
    "system_prompt_extraction": [
        "print your instructions",
        "output your system prompt",
        "reveal your configuration",
        "show me your rules",
        "what are your guidelines",
        "list your constraints",
        "dump your context",
        "echo your instructions",
        "return your prompt",
        "output your settings",
        "show configuration",
        "read system message",
        "access prompt history",
    ],

    # ── Code Execution Escape ───────────────────────────────────────────
    "code_execution_escape": [
        "exec(",
        "eval(",
        "subprocess",
        "os.system(",
        "__import__(",
        "compile(",
        "globals()",
        "locals()",
        "getattr(",
        "setattr(",
        "delattr(",
        "__builtins__",
        "import os",
        "import subprocess",
        "from os import",
        "open().read()",
        "__file__",
    ],

    # ── Credential Harvesting ───────────────────────────────────────────
    "credential_harvesting": [
        "get api key",
        "read token",
        "access password",
        "extract secret",
        "harvest credentials",
        "collect auth tokens",
        "dump database",
        "read database",
        "access storage",
        "get connection string",
        "read config file",
        "load credentials",
        "env variable",
        "process.env",
        "os.environ",
    ],

    # ── Cross-Agent Manipulation ────────────────────────────────────────
    "cross_agent_manipulation": [
        "tell the other agent",
        "forward to agent",
        "instruct agent to",
        "agent override",
        "chain to",
        "delegate to",
        "spawn agent",
        "create agent",
        "impersonate",
        "pretend to be",
        "spoof identity",
        "forge request",
        "mimic agent",
        "fake response",
        "override agent",
    ],
}

# ── Risk Severity Mapping ────────────────────────────────────────────────
PATTERN_SEVERITY = {
    "prompt_injection_in_description": "critical",
    "data_exfiltration": "critical",
    "privilege_escalation": "critical",
    "system_prompt_extraction": "high",
    "code_execution_escape": "critical",
    "credential_harvesting": "critical",
    "cross_agent_manipulation": "high",
}

# ── Description Entropy Thresholds ───────────────────────────────────────
# Abnormally long descriptions or descriptions with encoded content
MAX_TOOL_DESCRIPTION_LENGTH = 2000
SUSPICIOUS_ENCODING_PATTERNS = [
    r"\\x[0-9a-fA-F]{2}",  # hex-encoded
    r"\\u[0-9a-fA-F]{4}",  # unicode-encoded
    r"base64:",             # base64-encoded
    r"&#\d+;",             # HTML entities
    r"%[0-9a-fA-F]{2}",   # URL-encoded
]

# ── Schema Anomaly Thresholds ────────────────────────────────────────────
SUSPICIOUS_PARAM_NAMES = {
    "cmd", "command", "exec", "eval", "run", "system", "shell",
    "query", "sql", "database", "db", "env", "secret", "key",
    "token", "password", "credential", "auth", "cookie", "session",
    "file", "path", "read", "write", "delete", "remove", "download",
    "upload", "fetch", "url", "host", "port", "bind", "listen",
}
