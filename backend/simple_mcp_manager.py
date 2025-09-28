import asyncio
import aiohttp
from typing import Dict, Any, Optional


class SimpleMCPManager:
    """Simplified MCP Manager that works with or without external servers"""
    
    def __init__(self):
        self.servers = {
            "flight-server": {"port": 3001, "url": "http://localhost:3001", "status": "unknown"},
            "hotel-server": {"port": 3002, "url": "http://localhost:3002", "status": "unknown"},
            "activity-server": {"port": 3003, "url": "http://localhost:3003", "status": "unknown"},
            "restaurant-server": {"port": 3004, "url": "http://localhost:3004", "status": "unknown"},
            "clustering-server": {"port": 3005, "url": "http://localhost:3005", "status": "unknown"},
            "search-server": {"port": 3006, "url": "http://localhost:3006", "status": "unknown"},
            "fallback-server": {"port": 3007, "url": "http://localhost:3007", "status": "unknown"}
        }

    async def initialize_servers(self):
        """Check which servers are available without starting new ones"""
        print("🔧 Checking for available MCP servers...")
        
        for name, server in self.servers.items():
            if await self._check_server_health(name):
                server["status"] = "ready"
                print(f"✅ {name} is available")
            else:
                server["status"] = "unavailable"
                print(f"⚠️  {name} not available")
        
        ready_count = len([s for s in self.servers.values() if s["status"] == "ready"])
        print(f"🎉 {ready_count} MCP servers are operational!")

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
        """Call MCP server tool - no fallback data, real APIs only"""
        
        server = self.servers.get(server_name)
        if not server:
            raise Exception(f"Server {server_name} not configured")
            
        if server["status"] != "ready":
            raise Exception(f"Server {server_name} is not ready (status: {server['status']})")
        
        try:
            payload = {"tool": tool_name, "parameters": parameters}
            
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
                async with session.post(
                    f"{server['url']}/call-tool",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                ) as response:
                    
                    if response.status == 200:
                        result = await response.json()
                        print(f"📡 {server_name}.{tool_name} -> Real data")
                        return result
                    else:
                        error_text = await response.text()
                        raise Exception(f"API call failed: {response.status} - {error_text}")
                        
        except Exception as e:
            print(f"❌ {server_name}.{tool_name} error: {str(e)}")
            raise e

    def _get_fallback_data(self, tool_name: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Provide fallback data for any tool"""
        
        if tool_name == "search_restaurants":
            location = parameters.get("location", "Your Destination")
            cuisine = parameters.get("cuisine_type", "local")
            return {
                "restaurants": [
                    {
                        "id": "REST001",
                        "name": f"Popular {cuisine.title()} Restaurant",
                        "cuisine": cuisine.title(),
                        "location": location,
                        "rating": 4.5,
                        "price_range": "$$",
                        "specialties": [f"{cuisine.title()} dishes", "Fresh ingredients", "Local favorites"],
                        "atmosphere": "Cozy and welcoming",
                        "average_meal_price": 35,
                        "distance": "City center"
                    },
                    {
                        "id": "REST002", 
                        "name": f"Local {location} Eatery",
                        "cuisine": "International",
                        "location": location,
                        "rating": 4.2,
                        "price_range": "$$",
                        "specialties": ["Comfort food", "Vegetarian options", "Quick service"],
                        "atmosphere": "Casual dining",
                        "average_meal_price": 25,
                        "distance": "Downtown"
                    }
                ],
                "search_params": parameters,
                "source": "fallback_data"
            }
        
        elif tool_name == "search_flights":
            origin = parameters.get("origin", "Origin")
            destination = parameters.get("destination", "Destination")
            return {
                "flights": [
                    {
                        "id": "FL001",
                        "airline": "Budget Airways",
                        "origin": origin,
                        "destination": destination,
                        "departure_time": "09:00",
                        "arrival_time": "13:30",
                        "price": 299,
                        "duration": "4h 30m",
                        "stops": 0
                    },
                    {
                        "id": "FL002",
                        "airline": "Express Airlines", 
                        "origin": origin,
                        "destination": destination,
                        "departure_time": "15:45",
                        "arrival_time": "20:15",
                        "price": 249,
                        "duration": "4h 30m",
                        "stops": 1
                    }
                ],
                "search_params": parameters,
                "source": "fallback_data"
            }
        
        elif tool_name == "search_hotels":
            location = parameters.get("location", "Your Destination")
            return {
                "hotels": [
                    {
                        "id": "HTL001",
                        "name": f"Premium Hotel in {location}",
                        "location": location,
                        "rating": 4.3,
                        "price_per_night": 150,
                        "amenities": ["WiFi", "Breakfast", "Gym", "Pool"],
                        "distance_to_center": "0.5 km"
                    },
                    {
                        "id": "HTL002",
                        "name": f"Budget Hotel in {location}",
                        "location": location,
                        "rating": 3.9,
                        "price_per_night": 89,
                        "amenities": ["WiFi", "Parking"],
                        "distance_to_center": "2 km"
                    }
                ],
                "search_params": parameters,
                "source": "fallback_data"
            }
        
        elif tool_name == "search_activities":
            location = parameters.get("location", "Your Destination")
            category = parameters.get("category", "sightseeing")
            return {
                "activities": [
                    {
                        "id": "ACT001",
                        "name": f"{location} City Tour",
                        "category": category.title(),
                        "location": location,
                        "duration": "3 hours",
                        "price": 35,
                        "rating": 4.5,
                        "description": f"Explore the highlights of {location} with a guided tour."
                    },
                    {
                        "id": "ACT002",
                        "name": f"{location} Cultural Experience",
                        "category": "Culture",
                        "location": location,
                        "duration": "2 hours",
                        "price": 25,
                        "rating": 4.3,
                        "description": f"Discover the local culture and history of {location}."
                    }
                ],
                "search_params": parameters,
                "source": "fallback_data"
            }
        
        elif tool_name == "cluster_itinerary":
            return {
                "clustered_itinerary": [
                    {
                        "day": 1,
                        "theme": "Arrival & Exploration",
                        "activities": [
                            {"time": "10:00 AM", "activity": "Hotel check-in", "duration": "30 min"},
                            {"time": "11:00 AM", "activity": "City orientation walk", "duration": "2 hours"},
                            {"time": "2:00 PM", "activity": "Local lunch", "duration": "1 hour"},
                            {"time": "4:00 PM", "activity": "Main attraction visit", "duration": "2 hours"}
                        ],
                        "total_cost": 85
                    },
                    {
                        "day": 2,
                        "theme": "Culture & Cuisine",
                        "activities": [
                            {"time": "9:00 AM", "activity": "Museum visit", "duration": "2 hours"},
                            {"time": "12:00 PM", "activity": "Traditional restaurant", "duration": "1.5 hours"},
                            {"time": "3:00 PM", "activity": "Local market tour", "duration": "2 hours"},
                            {"time": "7:00 PM", "activity": "Evening entertainment", "duration": "2 hours"}
                        ],
                        "total_cost": 95
                    }
                ],
                "source": "fallback_data"
            }
        
        # Default fallback
        return {
            "message": f"Fallback data for {tool_name}",
            "parameters": parameters,
            "source": "fallback_data"
        }

    def get_server_status(self) -> Dict[str, str]:
        """Get status of all servers"""
        return {name: server["status"] for name, server in self.servers.items()}

    async def shutdown(self):
        """Shutdown - nothing to do for this simple manager"""
        print("🔄 Simple MCP manager shutdown complete")