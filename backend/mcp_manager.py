import asyncio
import subprocess
import json
import aiohttp
import time
from typing import Dict, Any, Optional


class MCPManager:
    def __init__(self):
        self.servers = {}
        self.server_processes = {}
        self.base_port = 3001

    async def initialize_servers(self):
        """Start all MCP servers"""

        servers_to_start = [
            {"name": "flight-server", "file": "flight-server.js"},
            {"name": "hotel-server", "file": "hotel-server.js"},
            {"name": "activity-server", "file": "activity-server.js"},
            {"name": "restaurant-server", "file": "restaurant-server.js"},
            {"name": "clustering-server", "file": "clustering-server.js"}
        ]

        print(f"🔧 Starting {len(servers_to_start)} MCP servers...")

        for i, server in enumerate(servers_to_start):
            port = self.base_port + i
            await self._start_server(server["name"], server["file"], port)

        # Wait for all servers to be ready
        await self._wait_for_servers()
        print("✅ All MCP servers ready!")

    async def _start_server(self, name: str, file: str, port: int):
        """Start individual MCP server"""

        try:
            # Start Node.js server process
            process = await asyncio.create_subprocess_exec(
                "node", f"../mcp-servers/{file}", str(port),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd="."
            )

            self.server_processes[name] = process
            self.servers[name] = {
                "port": port,
                "url": f"http://localhost:{port}",
                "status": "starting"
            }

            print(f"🔄 Started {name} on port {port}")

        except Exception as e:
            print(f"❌ Failed to start {name}: {str(e)}")
            self.servers[name] = {
                "port": port,
                "url": f"http://localhost:{port}",
                "status": "failed",
                "error": str(e)
            }

    async def _wait_for_servers(self):
        """Wait for all servers to be ready"""

        max_retries = 30
        retry_delay = 1

        for retry in range(max_retries):
            all_ready = True

            for name, server in self.servers.items():
                if server["status"] == "starting":
                    if await self._check_server_health(name):
                        server["status"] = "ready"
                        print(f"✅ {name} is ready")
                    else:
                        all_ready = False
                elif server["status"] == "failed":
                    all_ready = False

            if all_ready:
                return

            await asyncio.sleep(retry_delay)

        print("⚠️  Some servers may not be fully ready")

    async def _check_server_health(self, name: str) -> bool:
        """Check if server is responding"""

        server = self.servers.get(name)
        if not server:
            return False

        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=2)) as session:
                async with session.get(f"{server['url']}/health") as response:
                    return response.status == 200
        except:
            return False

    async def call_server(self, server_name: str, tool_name: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Call MCP server tool"""

        server = self.servers.get(server_name)
        if not server or server["status"] != "ready":
            print(f"⚠️  Server {server_name} not ready")
            return {}

        try:
            payload = {
                "tool": tool_name,
                "parameters": parameters
            }

            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
                async with session.post(
                        f"{server['url']}/call-tool",
                        json=payload,
                        headers={"Content-Type": "application/json"}
                ) as response:

                    if response.status == 200:
                        result = await response.json()
                        print(f"📡 {server_name}.{tool_name} -> {len(str(result))} chars")
                        return result
                    else:
                        error_text = await response.text()
                        print(f"❌ {server_name}.{tool_name} failed: {response.status} - {error_text}")
                        return {}

        except Exception as e:
            print(f"❌ Error calling {server_name}.{tool_name}: {str(e)}")
            return {}

    def get_server_status(self) -> Dict[str, str]:
        """Get status of all servers"""
        return {name: server["status"] for name, server in self.servers.items()}

    async def shutdown(self):
        """Shutdown all servers"""
        print("🔄 Shutting down MCP servers...")

        for name, process in self.server_processes.items():
            try:
                process.terminate()
                await process.wait()
                print(f"✅ Stopped {name}")
            except Exception as e:
                print(f"⚠️  Error stopping {name}: {str(e)}")

        self.servers.clear()
        self.server_processes.clear()