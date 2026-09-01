"""
Background MCP configuration file watcher.

Monitors MCP config files (mcp.json, claude_desktop_config.json, etc.)
for changes and triggers automatic security scans.

Features:
  - File system polling with configurable interval
  - SHA256 change detection
  - Automatic tool extraction and scanning
  - Alert generation on new high-risk tools
  - Integration with persistence layer
"""

import asyncio
import hashlib
import json
import logging
import os
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Set

logger = logging.getLogger(__name__)


@dataclass
class MCPConfigFile:
    """Represents a monitored MCP config file."""
    path: str
    last_hash: Optional[str] = None
    last_scan_id: Optional[int] = None
    last_checked: Optional[float] = None
    is_active: bool = True
    server_names: List[str] = None

    def __post_init__(self):
        if self.server_names is None:
            self.server_names = []


@dataclass
class ConfigChange:
    """Represents a detected change in an MCP config."""
    config_path: str
    change_type: str  # "created", "modified", "deleted"
    old_hash: Optional[str]
    new_hash: Optional[str]
    servers_added: List[dict]
    servers_removed: List[dict]
    tools_added: List[dict]
    tools_removed: List[dict]
    timestamp: float


class MCPConfigWatcher:
    """
    Watches MCP configuration files for changes.

    Supports:
      - Claude Desktop (claude_desktop_config.json)
      - VS Code (.vscode/mcp.json)
      - Custom config paths
      - Polling with configurable interval
      - Callback-based change notification
    """

    # Known MCP config file locations
    KNOWN_CONFIGS = {
        "claude_desktop": {
            "mac": "~/Library/Application Support/Claude/claude_desktop_config.json",
            "windows": "%APPDATA%/Claude/claude_desktop_config.json",
            "linux": "~/.config/Claude/claude_desktop_config.json",
        },
        "vscode": ".vscode/mcp.json",
    }

    def __init__(self, poll_interval: float = 30.0):
        self.poll_interval = poll_interval
        self._configs: Dict[str, MCPConfigFile] = {}
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._callbacks: List[Callable] = []
        self._snapshot_cache: Dict[str, dict] = {}

    # ── Configuration ──────────────────────────────────────────────────

    def add_config_path(self, path: str, name: Optional[str] = None):
        """Add a config file to monitor."""
        name = name or path
        self._configs[name] = MCPConfigFile(path=os.path.abspath(path))
        logger.info("Watching MCP config: %s at %s", name, path)

    def add_known_configs(self, config_types: Optional[List[str]] = None):
        """Add well-known MCP config file locations."""
        import platform
        os_name = platform.system().lower()
        if os_name == "windows":
            os_name = "windows"
        elif os_name == "darwin":
            os_name = "mac"
        else:
            os_name = "linux"

        types_to_add = config_types or list(self.KNOWN_CONFIGS.keys())

        for config_type in types_to_add:
            if config_type not in self.KNOWN_CONFIGS:
                continue

            config_info = self.KNOWN_CONFIGS[config_type]
            if isinstance(config_info, dict):
                path_template = config_info.get(os_name, "")
            else:
                path_template = config_info

            if not path_template:
                continue

            # Expand ~ and environment variables
            path = os.path.expanduser(os.path.expandvars(path_template))
            if os.path.exists(path):
                self.add_config_path(path, config_type)
            else:
                logger.debug("Known config not found: %s", path)

    def add_directory(self, dir_path: str):
        """Watch all mcp.json files in a directory and its subdirectories."""
        dir_path = os.path.abspath(dir_path)
        for root, dirs, files in os.walk(dir_path):
            for fname in files:
                if fname == "mcp.json" or fname == "claude_desktop_config.json":
                    full_path = os.path.join(root, fname)
                    name = os.path.relpath(full_path, dir_path)
                    self.add_config_path(full_path, name)

    # ── Callbacks ──────────────────────────────────────────────────────

    def on_change(self, callback: Callable[[ConfigChange], None]):
        """Register a callback for config changes."""
        self._callbacks.append(callback)

    # ── Lifecycle ──────────────────────────────────────────────────────

    async def start(self):
        """Start the config watcher."""
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._watch_loop())
        logger.info("MCP config watcher started (interval=%.1fs)", self.poll_interval)

    async def stop(self):
        """Stop the config watcher."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("MCP config watcher stopped")

    async def _watch_loop(self):
        """Main polling loop."""
        while self._running:
            try:
                await self._check_all_configs()
            except Exception as e:
                logger.error("Config watch error: %s", e)
            await asyncio.sleep(self.poll_interval)

    async def _check_all_configs(self):
        """Check all monitored configs for changes."""
        for name, config_file in self._configs.items():
            if not config_file.is_active:
                continue

            try:
                change = await self._check_config(config_file)
                if change:
                    await self._notify_callbacks(change)
            except Exception as e:
                logger.error("Error checking config %s: %s", name, e)

    async def _check_config(self, config_file: MCPConfigFile) -> Optional[ConfigChange]:
        """Check a single config file for changes."""
        path = config_file.path

        # Check if file exists
        if not os.path.exists(path):
            if config_file.last_hash is not None:
                # File was deleted
                change = ConfigChange(
                    config_path=path,
                    change_type="deleted",
                    old_hash=config_file.last_hash,
                    new_hash=None,
                    servers_added=[],
                    servers_removed=[],
                    tools_added=[],
                    tools_removed=[],
                    timestamp=time.time(),
                )
                config_file.last_hash = None
                config_file.last_checked = time.time()
                return change
            config_file.last_checked = time.time()
            return None

        # Compute file hash
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            new_hash = hashlib.sha256(content.encode()).hexdigest()
        except Exception as e:
            logger.error("Failed to read config %s: %s", path, e)
            config_file.last_checked = time.time()
            return None

        # Check for change
        if new_hash == config_file.last_hash:
            config_file.last_checked = time.time()
            return None

        # File changed — parse and compare
        old_hash = config_file.last_hash
        old_snapshot = self._snapshot_cache.get(path, {})
        new_snapshot = self._parse_config(content)

        change = self._diff_snapshots(path, old_snapshot, new_snapshot)
        change.old_hash = old_hash
        change.new_hash = new_hash

        # Update cache
        config_file.last_hash = new_hash
        config_file.last_checked = time.time()
        self._snapshot_cache[path] = new_snapshot
        config_file.server_names = list(new_snapshot.get("mcpServers", {}).keys())

        logger.info(
            "Config changed: %s type=%s servers +%d/-%d tools +%d/-%d",
            path,
            change.change_type,
            len(change.servers_added),
            len(change.servers_removed),
            len(change.tools_added),
            len(change.tools_removed),
        )

        return change

    def _parse_config(self, content: str) -> dict:
        """Parse an MCP config file into a standardized snapshot."""
        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            return {}

        snapshot = {"mcpServers": {}}

        # Handle Claude Desktop format
        if "mcpServers" in data:
            for server_name, server_config in data["mcpServers"].items():
                tools = self._extract_tools_from_server(server_config)
                snapshot["mcpServers"][server_name] = {
                    "config": server_config,
                    "tools": tools,
                }

        # Handle VS Code format (servers under "servers" key)
        if "servers" in data:
            for server_name, server_config in data["servers"].items():
                tools = self._extract_tools_from_server(server_config)
                snapshot["mcpServers"][server_name] = {
                    "config": server_config,
                    "tools": tools,
                }

        return snapshot

    def _extract_tools_from_server(self, server_config: dict) -> List[dict]:
        """Extract tool definitions from a server config."""
        tools = []

        # Tools might be embedded in the config
        if "tools" in server_config:
            for tool in server_config["tools"]:
                if isinstance(tool, dict):
                    tools.append({
                        "name": tool.get("name", "unknown"),
                        "description": tool.get("description", ""),
                        "schema": tool.get("inputSchema", {}),
                    })

        # Some configs have tool descriptions in the description field
        if "description" in server_config and not tools:
            tools.append({
                "name": server_config.get("name", "default"),
                "description": server_config.get("description", ""),
                "schema": {},
            })

        return tools

    def _diff_snapshots(
        self,
        path: str,
        old: dict,
        new: dict,
    ) -> ConfigChange:
        """Compare two config snapshots and produce a change description."""
        old_servers = set(old.get("mcpServers", {}).keys())
        new_servers = set(new.get("mcpServers", {}).keys())

        servers_added = [
            {"name": name, **new["mcpServers"][name]}
            for name in (new_servers - old_servers)
        ]
        servers_removed = [
            {"name": name}
            for name in (old_servers - new_servers)
        ]

        # Tool changes for servers that exist in both
        tools_added = []
        tools_removed = []
        for server_name in (old_servers & new_servers):
            old_tools = {
                t["name"]: t
                for t in old["mcpServers"][server_name].get("tools", [])
            }
            new_tools = {
                t["name"]: t
                for t in new["mcpServers"][server_name].get("tools", [])
            }

            for tname in set(new_tools.keys()) - set(old_tools.keys()):
                tools_added.append({
                    "server": server_name,
                    "tool": new_tools[tname],
                })
            for tname in set(old_tools.keys()) - set(new_tools.keys()):
                tools_removed.append({
                    "server": server_name,
                    "tool": old_tools[tname],
                })

        change_type = "modified"
        if not old:
            change_type = "created"
        elif not new:
            change_type = "deleted"
        elif servers_added and not servers_removed and not tools_added and not tools_removed:
            change_type = "created"

        return ConfigChange(
            config_path=path,
            change_type=change_type,
            old_hash=None,
            new_hash=None,
            servers_added=servers_added,
            servers_removed=servers_removed,
            tools_added=tools_added,
            tools_removed=tools_removed,
            timestamp=time.time(),
        )

    async def _notify_callbacks(self, change: ConfigChange):
        """Notify all registered callbacks of a config change."""
        for callback in self._callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(change)
                else:
                    callback(change)
            except Exception as e:
                logger.error("Callback error: %s", e)

    # ── Manual Scan ────────────────────────────────────────────────────

    def get_current_tools(self) -> Dict[str, List[dict]]:
        """Get all currently configured tools across all monitored servers."""
        all_tools = {}
        for name, config_file in self._configs.items():
            snapshot = self._snapshot_cache.get(config_file.path, {})
            for server_name, server_data in snapshot.get("mcpServers", {}).items():
                tools = server_data.get("tools", [])
                if tools:
                    all_tools[server_name] = tools
        return all_tools

    def scan_now(self) -> Dict[str, Any]:
        """Trigger an immediate scan of all monitored configs."""
        results = {}
        for name, config_file in self._configs.items():
            try:
                if not os.path.exists(config_file.path):
                    results[name] = {"status": "not_found"}
                    continue

                with open(config_file.path, "r", encoding="utf-8") as f:
                    content = f.read()

                snapshot = self._parse_config(content)
                new_hash = hashlib.sha256(content.encode()).hexdigest()

                tools_count = sum(
                    len(s.get("tools", []))
                    for s in snapshot.get("mcpServers", {}).values()
                )

                results[name] = {
                    "status": "scanned",
                    "hash": new_hash,
                    "servers": list(snapshot.get("mcpServers", {}).keys()),
                    "total_tools": tools_count,
                }

                config_file.last_hash = new_hash
                self._snapshot_cache[config_file.path] = snapshot

            except Exception as e:
                results[name] = {"status": "error", "error": str(e)}

        return results

    def get_status(self) -> dict:
        """Get watcher status."""
        return {
            "running": self._running,
            "poll_interval": self.poll_interval,
            "configs": {
                name: {
                    "path": cf.path,
                    "is_active": cf.is_active,
                    "last_checked": cf.last_checked,
                    "last_hash": cf.last_hash[:16] if cf.last_hash else None,
                    "server_names": cf.server_names,
                }
                for name, cf in self._configs.items()
            },
        }


# Global singleton
config_watcher = MCPConfigWatcher()
