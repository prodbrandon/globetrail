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
        # Try different model names that are available
        try:
            self.model = genai.GenerativeModel('gemini-pro')
            print("✅ Gemini client initialized with gemini-pro")
        except Exception as e:
            try:
                self.model = genai.GenerativeModel('gemini-1.5-flash')
                print("✅ Gemini client initialized with gemini-1.5-flash")
            except Exception as e2:
                print(f"⚠️  Model initialization error: {e}, {e2}")
                self.model = genai.GenerativeModel('gemini-pro')  # Fallback
                print("✅ Gemini client initialized with fallback model")

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
            print(f"⚠️  Error parsing request, using smart defaults: {str(e)}")
            # Smart fallback parsing
            request_lower = user_request.lower()
            
            # Extract destination from common patterns
            destination = None
            
            # Common city patterns
            city_patterns = {
                "rome": "Rome, Italy",
                "tokyo": "Tokyo, Japan", 
                "japan": "Tokyo, Japan",
                "paris": "Paris, France",
                "france": "Paris, France", 
                "london": "London, UK",
                "uk": "London, UK",
                "new york": "New York, NY",
                "nyc": "New York, NY",
                "cape town": "Cape Town, South Africa",
                "south africa": "Cape Town, South Africa",
                "barcelona": "Barcelona, Spain",
                "spain": "Barcelona, Spain",
                "amsterdam": "Amsterdam, Netherlands",
                "netherlands": "Amsterdam, Netherlands",
                "berlin": "Berlin, Germany",
                "germany": "Berlin, Germany",
                "sydney": "Sydney, Australia",
                "australia": "Sydney, Australia",
                "dubai": "Dubai, UAE",
                "bangkok": "Bangkok, Thailand",
                "thailand": "Bangkok, Thailand",
                "istanbul": "Istanbul, Turkey",
                "turkey": "Istanbul, Turkey",
                "moscow": "Moscow, Russia",
                "russia": "Moscow, Russia",
                "mumbai": "Mumbai, India",
                "delhi": "Delhi, India",
                "india": "Mumbai, India",
                "beijing": "Beijing, China",
                "shanghai": "Shanghai, China",
                "china": "Beijing, China",
                "los angeles": "Los Angeles, CA",
                "la": "Los Angeles, CA",
                "san francisco": "San Francisco, CA",
                "chicago": "Chicago, IL",
                "miami": "Miami, FL",
                "las vegas": "Las Vegas, NV",
                "vegas": "Las Vegas, NV"
            }
            
            # Find matching city
            for pattern, city in city_patterns.items():
                if pattern in request_lower:
                    destination = city
                    break
            
            # If no city found, try to extract from "in [city]" or "to [city]" patterns
            if not destination:
                import re
                # Look for patterns like "in [city]", "to [city]", "visit [city]"
                patterns = [
                    r'\bin\s+([A-Za-z\s]+?)(?:\s|$|[,.])',
                    r'\bto\s+([A-Za-z\s]+?)(?:\s|$|[,.])',
                    r'\bvisit\s+([A-Za-z\s]+?)(?:\s|$|[,.])',
                    r'\bactivities.*?in\s+([A-Za-z\s]+?)(?:\s|$|[,.])',
                    r'\bthings.*?do.*?in\s+([A-Za-z\s]+?)(?:\s|$|[,.])'
                ]
                
                for pattern in patterns:
                    match = re.search(pattern, request_lower)
                    if match:
                        extracted_city = match.group(1).strip().title()
                        if len(extracted_city) > 2:  # Avoid single letters
                            destination = extracted_city
                            break
            
            # Final fallback
            if not destination:
                destination = "Rome, Italy"
            
            # Extract activity type from question
            interests = ["sightseeing"]
            if "activities" in request_lower or "things to do" in request_lower:
                interests = ["sightseeing", "culture", "entertainment"]
            elif "food" in request_lower or "restaurant" in request_lower:
                interests = ["dining", "food"]
            elif "museum" in request_lower or "art" in request_lower:
                interests = ["culture", "museums"]
            
            return {
                "destination": destination,
                "departure_city": None,
                "start_date": None,
                "end_date": None,
                "budget": 2000,
                "travelers": 1,
                "interests": interests,
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

        # Check if any servers are available
        server_status = self.mcp_manager.get_server_status()
        ready_servers = [name for name, status in server_status.items() if status == "ready"]
        
        if not ready_servers:
            print("⚠️  No MCP servers available, using fallback data")
            return self._get_fallback_travel_data(parsed_request)

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
                    "location": parsed_request["destination"],
                    "check_in": parsed_request.get("start_date", "2024-12-01"),
                    "check_out": parsed_request.get("end_date", "2024-12-05"),
                    "guests": parsed_request.get("travelers", 1),
                    "budget_range": parsed_request.get("budget", 200)
                }
            )
            travel_data["hotels"] = hotels.get("hotels", [])

            # Get activities
            activities = await self.mcp_manager.call_server(
                "activity-server",
                "search_activities",
                {
                    "location": parsed_request["destination"],
                    "category": "sightseeing",
                    "budget_range": parsed_request.get("budget", 100)
                }
            )
            travel_data["activities"] = activities.get("activities", [])

            # Get restaurants
            restaurants = await self.mcp_manager.call_server(
                "restaurant-server",
                "search_restaurants",
                {
                    "location": parsed_request["destination"],
                    "cuisine_type": "local",
                    "price_range": "$$",
                    "party_size": parsed_request.get("travelers", 1)
                }
            )
            travel_data["restaurants"] = restaurants.get("restaurants", [])

        except Exception as e:
            print(f"⚠️  Error gathering travel data: {str(e)}")

        return travel_data

    def _get_fallback_travel_data(self, parsed_request: Dict[str, Any]) -> Dict[str, List[Any]]:
        """Provide fallback travel data when MCP servers are unavailable"""
        destination = parsed_request.get("destination", "Your Destination")
        
        return {
            "flights": [
                {
                    "id": "FB001",
                    "airline": "Budget Airways",
                    "origin": parsed_request.get("departure_city", "Origin"),
                    "destination": destination,
                    "departure_time": "09:00",
                    "arrival_time": "13:30",
                    "price": 299,
                    "duration": "4h 30m"
                }
            ],
            "hotels": [
                {
                    "id": "FH001",
                    "name": f"{destination} Central Hotel",
                    "location": destination,
                    "rating": 4.2,
                    "price_per_night": 150,
                    "amenities": ["WiFi", "Breakfast", "Gym"]
                }
            ],
            "activities": [
                {
                    "id": "FA001",
                    "name": f"{destination} City Tour",
                    "category": "Sightseeing",
                    "location": destination,
                    "duration": "3 hours",
                    "price": 35,
                    "rating": 4.5
                }
            ],
            "restaurants": [
                {
                    "id": "FR001",
                    "name": f"Local Cuisine {destination}",
                    "cuisine": "Local",
                    "location": destination,
                    "rating": 4.3,
                    "price_range": "$$"
                }
            ]
        }

    async def _cluster_results(self, travel_data: Dict[str, List[Any]], parsed_request: Dict[str, Any]) -> Dict[
        str, Any]:
        """Use clustering server to organize results"""

        try:
            clustering_result = await self.mcp_manager.call_server(
                "clustering-server",
                "cluster_itinerary",
                {
                    "activities": travel_data.get("activities", []) + travel_data.get("restaurants", []),
                    "preferences": parsed_request.get("interests", ["sightseeing"]),
                    "duration_days": 3
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