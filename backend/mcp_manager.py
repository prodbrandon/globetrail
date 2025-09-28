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
            {"name": "clustering-server", "file": "clustering-server.js"},
            {"name": "search-server", "file": "search-server.js"}
        ]

        print(f"🔧 Starting {len(servers_to_start)} MCP servers...")

        for i, server in enumerate(servers_to_start):
            port = self.base_port + i
            if server["name"] == "search-server":
                port = 3006  # Special port for search server
            await self._start_server(server["name"], server["file"], port)

        # Wait for all servers to be ready
        await self._wait_for_servers()
        print("✅ All MCP servers ready!")

    async def _start_server(self, name: str, file: str, port: int):
        """Start individual MCP server or connect to existing one"""

        # First check if server is already running on this port
        self.servers[name] = {
            "port": port,
            "url": f"http://localhost:{port}",
            "status": "checking"
        }
        
        if await self._check_server_health(name):
            print(f"✅ {name} already running on port {port}")
            self.servers[name]["status"] = "ready"
            return

        try:
            # Start Node.js server process with environment variables
            import os
            env = os.environ.copy()
            
            # Check if the server file exists
            server_path = f"../mcp-servers/{file}"
            if not os.path.exists(server_path):
                raise Exception(f"Server file not found: {server_path}")
            
            print(f"🔄 Starting {name} on port {port}...")
            
            process = await asyncio.create_subprocess_exec(
                "node", "-r", "dotenv/config", file, str(port),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd="../mcp-servers",
                env=env
            )

            self.server_processes[name] = process
            self.servers[name]["status"] = "starting"
            
            # Give the process a moment to start and check if it immediately fails
            await asyncio.sleep(2)
            if process.returncode is not None:
                # Process has already exited
                try:
                    stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=3.0)
                    stdout_text = stdout.decode() if stdout else ""
                    stderr_text = stderr.decode() if stderr else ""
                    
                    # Check for common errors
                    if "EADDRINUSE" in stderr_text:
                        # Port already in use - check if existing server is working
                        if await self._check_server_health(name):
                            print(f"✅ {name} already running on port {port} (detected after startup attempt)")
                            self.servers[name]["status"] = "ready"
                            return
                        else:
                            error_msg = f"Port {port} in use but server not responding"
                    else:
                        error_msg = f"Exit code {process.returncode}"
                        if stderr_text:
                            error_msg += f" - {stderr_text.strip()[:200]}"  # Limit error message length
                        if stdout_text:
                            error_msg += f" - {stdout_text.strip()[:200]}"
                    
                    print(f"❌ {name} failed to start: {error_msg}")
                except asyncio.TimeoutError:
                    print(f"❌ {name} failed to start: Process communication timeout")
                    error_msg = "Process communication timeout"
                
                self.servers[name]["status"] = "failed"
                self.servers[name]["error"] = error_msg

        except Exception as e:
            print(f"❌ Failed to start {name}: {str(e)}")
            self.servers[name]["status"] = "failed"
            self.servers[name]["error"] = str(e)

    async def _wait_for_servers(self):
        """Wait for all servers to be ready"""

        max_retries = 30
        retry_delay = 1

        for retry in range(max_retries):
            all_ready = True
            failed_servers = []
            starting_servers = []

            for name, server in self.servers.items():
                if server["status"] == "starting":
                    if await self._check_server_health(name):
                        server["status"] = "ready"
                        print(f"✅ {name} is ready")
                    else:
                        all_ready = False
                        starting_servers.append(name)
                elif server["status"] == "failed":
                    all_ready = False
                    failed_servers.append(name)

            if all_ready:
                ready_count = len([s for s in self.servers.values() if s["status"] == "ready"])
                print(f"✅ All {ready_count} MCP servers are ready!")
                return

            if retry == max_retries - 1:
                if failed_servers:
                    print(f"❌ Failed servers: {', '.join(failed_servers)}")
                if starting_servers:
                    print(f"⏳ Still starting: {', '.join(starting_servers)}")

            await asyncio.sleep(retry_delay)

        # Final status report
        ready_servers = [name for name, server in self.servers.items() if server["status"] == "ready"]
        failed_servers = [name for name, server in self.servers.items() if server["status"] == "failed"]
        
        if ready_servers:
            print(f"✅ Ready servers: {', '.join(ready_servers)}")
        if failed_servers:
            print(f"❌ Failed servers: {', '.join(failed_servers)}")
            
        if not ready_servers:
            print("⚠️  No MCP servers are ready, but continuing anyway...")
        else:
            print(f"🎉 {len(ready_servers)} MCP servers are operational!")

    async def _check_server_health(self, name: str) -> bool:
        """Check if server is responding"""

        server = self.servers.get(name)
        if not server:
            return False

        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=3)) as session:
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