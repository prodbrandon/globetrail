import google.generativeai as genai
import json
import os
from typing import Dict, List, Any
import asyncio


class GeminiTravelAgent:
    def __init__(self, mcp_manager):
        self.mcp_manager = mcp_manager
        self.model = None

        # Conversation memory and caching
        self.conversation_history = {}  # {conversation_id: {messages: [], last_travel_data: {}}}
        self.travel_data_cache = {}  # {cache_key: travel_data}

    async def initialize(self):
        """Initialize Gemini AI client"""
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment")

        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash')
        print("✅ Gemini client initialized")

    async def plan_trip(self, user_request: str, conversation_id: str = None, force_refresh: bool = False) -> Dict[
        str, Any]:
        """Main trip planning function with smart caching"""

        try:
            # Initialize conversation if needed
            if conversation_id and conversation_id not in self.conversation_history:
                self.conversation_history[conversation_id] = {
                    "messages": [],
                    "last_travel_data": {},
                    "last_parsed_request": {}
                }

            # Add current message to history
            if conversation_id:
                self.conversation_history[conversation_id]["messages"].append({
                    "role": "user",
                    "content": user_request,
                    "timestamp": asyncio.get_event_loop().time()
                })

            # Step 1: Determine if this needs new travel data
            needs_new_data = await self._needs_travel_data_refresh(user_request, conversation_id, force_refresh)

            if needs_new_data:
                print("🔄 New travel search required - calling APIs")

                # Parse request and get fresh data
                parsed_request = await self._parse_travel_request(user_request, conversation_id)
                travel_data = await self._gather_travel_data(parsed_request)
                clusters = await self._create_clusters(travel_data)

                # Cache the results
                if conversation_id:
                    self.conversation_history[conversation_id]["last_travel_data"] = {
                        "travel_data": travel_data,
                        "clusters": clusters,
                        "parsed_request": parsed_request
                    }

            else:
                print("💡 Using cached data + Gemini-only response")

                # Use cached data or create empty structure
                if conversation_id and self.conversation_history[conversation_id]["last_travel_data"]:
                    cached = self.conversation_history[conversation_id]["last_travel_data"]
                    travel_data = cached["travel_data"]
                    clusters = cached["clusters"]
                    parsed_request = cached["parsed_request"]
                else:
                    # No cached data available - create minimal structure
                    travel_data = {"flights": [], "hotels": [], "activities": [], "restaurants": []}
                    clusters = {"clusters": []}
                    parsed_request = await self._parse_travel_request(user_request, conversation_id)

            # Step 2: Generate response (always use Gemini for this)
            recommendations = await self._generate_contextual_response(
                user_request, travel_data, clusters, parsed_request, conversation_id
            )

            # Add assistant response to history
            if conversation_id:
                self.conversation_history[conversation_id]["messages"].append({
                    "role": "assistant",
                    "content": str(recommendations),
                    "timestamp": asyncio.get_event_loop().time()
                })

            return {
                "request": parsed_request,
                "travel_data": travel_data,
                "clusters": clusters,
                "recommendations": recommendations,
                "used_cache": not needs_new_data,
                "conversation_id": conversation_id
            }

        except Exception as e:
            print(f"❌ Error in trip planning: {str(e)}")
            raise e

    async def _needs_travel_data_refresh(self, user_request: str, conversation_id: str = None,
                                         force_refresh: bool = False) -> bool:
        """Determine if we need to call travel APIs or can use cached data + Gemini"""

        if force_refresh:
            return True

        if not conversation_id or conversation_id not in self.conversation_history:
            return True  # First message always needs data

        # Check if we have any cached travel data
        cached_data = self.conversation_history[conversation_id].get("last_travel_data", {})
        if not cached_data:
            return True

        # Use Gemini to classify the query type
        classification_prompt = f"""
        Analyze this user message and determine if it requires NEW travel data (flights, hotels, activities) or can be answered using EXISTING travel data.

        User message: "{user_request}"

        Return ONLY "NEW_DATA" or "EXISTING_DATA":

        NEW_DATA examples:
        - "Actually, let's go to Paris instead of Tokyo"
        - "Change dates to next month"
        - "I want to increase my budget to $3000"
        - "Find flights from New York instead"
        - "Show me hotels in a different area"

        EXISTING_DATA examples:
        - "Tell me more about that first hotel"
        - "What's included in the luxury package?"
        - "Explain the difference between these flight options"
        - "Which option is best for families?"
        - "What are the pros and cons?"
        - "Can you summarize the recommendations?"
        - "I like option 2, tell me more"
        """

        try:
            response = await asyncio.to_thread(
                self.model.generate_content,
                classification_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.1,
                    candidate_count=1,
                )
            )

            classification = response.text.strip().upper()
            print(f"🤖 Query classification: {classification}")

            return "NEW_DATA" in classification

        except Exception as e:
            print(f"⚠️ Classification failed, defaulting to cached data: {str(e)}")
            return False  # Default to using cached data on error

    async def _parse_travel_request(self, user_request: str, conversation_id: str = None) -> Dict[str, Any]:
        """Parse natural language request with conversation context"""

        # Build context from conversation history
        context = ""
        if conversation_id and conversation_id in self.conversation_history:
            history = self.conversation_history[conversation_id]["messages"]
            if history:
                context = "Previous conversation:\n"
                for msg in history[-4:]:  # Last 4 messages for context
                    context += f"{msg['role']}: {msg['content'][:100]}...\n"
                context += "\n"

        if not self.model:
            # Fallback parsing without Gemini
            return {
                "destination": user_request,
                "budget": 2000,
                "travelers": 1,
                "trip_type": "leisure"
            }

        prompt = f"""
        {context}Current request: "{user_request}"

        Extract travel parameters. If this is a follow-up message, use context from previous conversation. Make sure the
        departure and arrival cities are in airport code. Example: Los Angeles is LAX.

        Return JSON:
        {{
            "destination": "city, country",
            "departure_city": "departure location",
            "budget": number,
            "travelers": number,
            "start_date": "YYYY-MM-DD or null",
            "end_date": "YYYY-MM-DD or null",
            "interests": ["list of interests"],
            "trip_type": "leisure/business/adventure"
        }}
        """

        try:
            response = await asyncio.to_thread(
                self.model.generate_content, prompt
            )

            text = response.text.strip()
            if text.startswith('```json'):
                text = text[7:-3]
            elif text.startswith('```'):
                text = text[3:-3]

            return json.loads(text)

        except Exception as e:
            print(f"⚠️ Gemini parsing failed: {str(e)}")
            return {
                "destination": user_request,
                "budget": 2000,
                "travelers": 1,
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
            if self.mcp_manager and parsed_request.get("departure_city") and parsed_request.get("destination"):
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
            if self.mcp_manager:
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
            if self.mcp_manager:
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
            if self.mcp_manager:
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
            print(f"⚠️ Error gathering travel data: {str(e)}")

        # If no MCP manager or servers failed, generate mock data
        if not any(travel_data.values()):
            travel_data = self._generate_mock_travel_data(parsed_request)

        return travel_data

    def _generate_mock_travel_data(self, parsed_request: Dict[str, Any]) -> Dict[str, List[Any]]:
        """Generate realistic mock travel data for testing"""
        destination = parsed_request.get("destination", "Tokyo")
        budget = parsed_request.get("budget", 2000)

        return {
            "flights": [
                {
                    "id": "mock-flight-1",
                    "price": int(budget * 0.4),
                    "airline": "Delta",
                    "departure_time": "08:30",
                    "arrival_time": "16:45",
                    "duration": "8h 15m",
                    "stops": 0,
                    "convenience_score": 8,
                    "quality_score": 7
                },
                {
                    "id": "mock-flight-2",
                    "price": int(budget * 0.3),
                    "airline": "United",
                    "departure_time": "14:20",
                    "arrival_time": "23:50",
                    "duration": "9h 30m",
                    "stops": 1,
                    "convenience_score": 6,
                    "quality_score": 6
                }
            ],
            "hotels": [
                {
                    "id": "mock-hotel-1",
                    "name": f"Luxury {destination} Hotel",
                    "price_per_night": int(budget * 0.15),
                    "rating": 4.5,
                    "convenience_score": 9,
                    "quality_score": 9
                },
                {
                    "id": "mock-hotel-2",
                    "name": f"Budget {destination} Inn",
                    "price_per_night": int(budget * 0.08),
                    "rating": 3.8,
                    "convenience_score": 6,
                    "quality_score": 6
                }
            ],
            "activities": [
                {
                    "id": "mock-activity-1",
                    "name": f"{destination} City Tour",
                    "price": 50,
                    "rating": 4.3,
                    "type": "sightseeing"
                }
            ],
            "restaurants": [
                {
                    "id": "mock-restaurant-1",
                    "name": f"Best {destination} Restaurant",
                    "price_level": 3,
                    "rating": 4.6,
                    "cuisine": "local"
                }
            ]
        }

    async def _create_clusters(self, travel_data: Dict[str, List[Any]]) -> Dict[str, Any]:
        """Simple clustering logic without external server"""

        flights = travel_data.get("flights", [])
        hotels = travel_data.get("hotels", [])

        # Simple price-based clustering
        def categorize_by_price(items, price_key):
            if not items:
                return {"budget": [], "mid_range": [], "luxury": []}

            prices = [item.get(price_key, 0) for item in items]
            if not prices or all(p == 0 for p in prices):
                return {"budget": items, "mid_range": [], "luxury": []}

            low_threshold = min(prices) + (max(prices) - min(prices)) * 0.33
            high_threshold = min(prices) + (max(prices) - min(prices)) * 0.66

            budget = [item for item in items if item.get(price_key, 0) <= low_threshold]
            luxury = [item for item in items if item.get(price_key, 0) >= high_threshold]
            mid_range = [item for item in items if item not in budget and item not in luxury]

            return {"budget": budget, "mid_range": mid_range, "luxury": luxury}

        return {
            "flight_clusters": categorize_by_price(flights, "price"),
            "hotel_clusters": categorize_by_price(hotels, "price_per_night"),
            "summary": f"Created clusters from {len(flights)} flights and {len(hotels)} hotels"
        }

    async def _generate_contextual_response(self, user_request: str, travel_data: Dict[str, List[Any]],
                                            clusters: Dict[str, Any], parsed_request: Dict[str, Any],
                                            conversation_id: str = None) -> List[Dict[str, Any]]:
        """Generate response considering conversation context"""

        # Build conversation context
        context = ""
        if conversation_id and conversation_id in self.conversation_history:
            history = self.conversation_history[conversation_id]["messages"]
            if len(history) > 1:  # More than just current message
                context = "Previous conversation context:\n"
                for msg in history[:-1]:  # All except current message
                    context += f"{msg['role']}: {msg['content'][:150]}...\n"
                context += "\n"

        prompt = f"""
        {context}Current user request: "{user_request}"

        Available travel data:
        - Flights: {len(travel_data.get('flights', []))} options
        - Hotels: {len(travel_data.get('hotels', []))} options  
        - Activities: {len(travel_data.get('activities', []))} options
        - Restaurants: {len(travel_data.get('restaurants', []))} options

        Destination: {parsed_request.get('destination', 'Unknown')}
        Budget: ${parsed_request.get('budget', 'Unknown')}

        Based on the user's request and conversation context, provide a helpful response. 
        If they're asking follow-up questions about specific options, focus on those.
        If they want comparisons, use the available data.
        If they're asking general questions, provide comprehensive recommendations.

        Return helpful recommendations as a JSON array of recommendation objects.
        Each recommendation should have: name, description, highlights, estimated_cost.
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
            print(f"⚠️ Error generating recommendations: {str(e)}")
            return [
                {
                    "name": "Quick Response",
                    "description": f"Response to: {user_request}",
                    "highlights": ["AI-generated response"],
                    "estimated_cost": 0
                }
            ]