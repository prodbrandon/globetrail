import google.generativeai as genai
import json
import os
from typing import Dict, List, Any
import asyncio


class GeminiTravelAgent:
    def __init__(self, mcp_manager):
        self.mcp_manager = mcp_manager
        self.model = None

    async def initialize(self):
        """Initialize Gemini AI client"""
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment")

        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-1.5-pro')
        print("✅ Gemini client initialized")

    async def plan_trip(self, user_request: str) -> Dict[str, Any]:
        """Main trip planning function using Gemini + MCP servers"""

        try:
            # Step 1: Parse user request with Gemini
            parsed_request = await self._parse_travel_request(user_request)
            print(f"📋 Parsed request: {parsed_request}")

            # Step 2: Call MCP servers to get travel data
            travel_data = await self._gather_travel_data(parsed_request)
            print(f"📊 Gathered travel data: {len(travel_data)} sources")

            # Step 3: Cluster and optimize results
            clustered_results = await self._cluster_results(travel_data, parsed_request)
            print(f"🎯 Created {len(clustered_results.get('clusters', []))} clusters")

            # Step 4: Generate final recommendations
            recommendations = await self._generate_recommendations(clustered_results, parsed_request)

            return {
                "request": parsed_request,
                "clusters": clustered_results,
                "recommendations": recommendations,
                "raw_data": travel_data
            }

        except Exception as e:
            print(f"❌ Error in trip planning: {str(e)}")
            raise e

    async def _parse_travel_request(self, user_request: str) -> Dict[str, Any]:
        """Use Gemini to extract structured data from natural language"""

        prompt = f"""
        Extract travel parameters from this request: "{user_request}"

        Return a JSON object with these fields:
        {{
            "destination": "city, country",
            "departure_city": "city or airport code",
            "start_date": "YYYY-MM-DD or null",
            "end_date": "YYYY-MM-DD or null", 
            "budget": number or null,
            "travelers": number,
            "interests": ["list", "of", "interests"],
            "trip_type": "leisure/business/adventure/romantic/family"
        }}

        If information is missing, use null or reasonable defaults.
        """

        try:
            response = await asyncio.to_thread(
                self.model.generate_content,
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.1,
                    candidate_count=1,
                )
            )

            # Extract JSON from response
            text = response.text.strip()
            if text.startswith('```json'):
                text = text[7:-3]
            elif text.startswith('```'):
                text = text[3:-3]

            return json.loads(text)

        except Exception as e:
            print(f"⚠️  Error parsing request, using defaults: {str(e)}")
            # Fallback to basic parsing
            return {
                "destination": user_request,
                "departure_city": None,
                "start_date": None,
                "end_date": None,
                "budget": 2000,
                "travelers": 1,
                "interests": ["sightseeing"],
                "trip_type": "leisure"
            }

    async def _gather_travel_data(self, parsed_request: Dict[str, Any]) -> Dict[str, List[Any]]:
        """Call MCP servers to gather flight, hotel, activity data"""

        travel_data = {
            "flights": [],
            "hotels": [],
            "activities": [],
            "restaurants": []
        }

        try:
            # Get flights
            if parsed_request.get("departure_city") and parsed_request.get("destination"):
                flights = await self.mcp_manager.call_server(
                    "flight-server",
                    "search_flights",
                    {
                        "origin": parsed_request["departure_city"],
                        "destination": parsed_request["destination"],
                        "departure_date": parsed_request.get("start_date", "2024-12-01"),
                        "return_date": parsed_request.get("end_date"),
                        "adults": parsed_request.get("travelers", 1),
                        "max_price": parsed_request.get("budget", 2000)
                    }
                )
                travel_data["flights"] = flights.get("flights", [])

            # Get hotels
            hotels = await self.mcp_manager.call_server(
                "hotel-server",
                "search_hotels",
                {
                    "destination": parsed_request["destination"],
                    "checkin_date": parsed_request.get("start_date", "2024-12-01"),
                    "checkout_date": parsed_request.get("end_date", "2024-12-05"),
                    "adults": parsed_request.get("travelers", 1),
                    "max_rate": parsed_request.get("budget", 200)
                }
            )
            travel_data["hotels"] = hotels.get("hotels", [])

            # Get activities
            activities = await self.mcp_manager.call_server(
                "activity-server",
                "find_activities",
                {
                    "location": parsed_request["destination"],
                    "interests": parsed_request.get("interests", ["sightseeing"]),
                    "budget": parsed_request.get("budget", 100)
                }
            )
            travel_data["activities"] = activities.get("activities", [])

            # Get restaurants
            restaurants = await self.mcp_manager.call_server(
                "restaurant-server",
                "find_restaurants",
                {
                    "location": parsed_request["destination"],
                    "budget_per_meal": 50,
                    "cuisine_preferences": parsed_request.get("interests", [])
                }
            )
            travel_data["restaurants"] = restaurants.get("restaurants", [])

        except Exception as e:
            print(f"⚠️  Error gathering travel data: {str(e)}")

        return travel_data

    async def _cluster_results(self, travel_data: Dict[str, List[Any]], parsed_request: Dict[str, Any]) -> Dict[
        str, Any]:
        """Use clustering server to organize results"""

        try:
            clustering_result = await self.mcp_manager.call_server(
                "clustering-server",
                "cluster_travel_options",
                {
                    "flights": travel_data.get("flights", []),
                    "hotels": travel_data.get("hotels", []),
                    "activities": travel_data.get("activities", []),
                    "restaurants": travel_data.get("restaurants", []),
                    "user_priorities": {
                        "budget_weight": 0.4,
                        "convenience_weight": 0.3,
                        "quality_weight": 0.3
                    }
                }
            )
            return clustering_result

        except Exception as e:
            print(f"⚠️  Error clustering results: {str(e)}")
            # Return simple fallback clusters
            return {
                "clusters": [
                    {"name": "Budget", "items": []},
                    {"name": "Mid-range", "items": []},
                    {"name": "Luxury", "items": []}
                ]
            }

    async def _generate_recommendations(self, clustered_results: Dict[str, Any], parsed_request: Dict[str, Any]) -> \
    List[Dict[str, Any]]:
        """Generate final trip recommendations using Gemini"""

        prompt = f"""
        Based on this travel data, create 3 recommended itineraries for a trip to {parsed_request['destination']}:

        Clustered Results: {json.dumps(clustered_results, indent=2)}
        User Request: {json.dumps(parsed_request, indent=2)}

        Generate 3 itineraries:
        1. Budget-friendly option
        2. Balanced option  
        3. Premium option

        For each, provide:
        - Total estimated cost
        - Key highlights
        - Day-by-day schedule
        - Why this option fits the user's needs

        Return as JSON array.
        """

        try:
            response = await asyncio.to_thread(
                self.model.generate_content,
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.3,
                    candidate_count=1,
                )
            )

            text = response.text.strip()
            if text.startswith('```json'):
                text = text[7:-3]
            elif text.startswith('```'):
                text = text[3:-3]

            return json.loads(text)

        except Exception as e:
            print(f"⚠️  Error generating recommendations: {str(e)}")
            return [
                {"name": "Budget Option", "cost": 1000, "highlights": ["Basic accommodations", "Local experiences"]},
                {"name": "Balanced Option", "cost": 2000, "highlights": ["Mid-range hotels", "Mix of activities"]},
                {"name": "Premium Option", "cost": 4000,
                 "highlights": ["Luxury accommodations", "Exclusive experiences"]}
            ]