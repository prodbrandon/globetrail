from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from contextlib import asynccontextmanager
import asyncio
import traceback
from typing import Optional, Dict, Any
import json
import aiohttp
import google.generativeai as genai
from datetime import datetime, timedelta

load_dotenv()


# Request/Response models
class FlightSearchRequest(BaseModel):
    message: str
    user_id: Optional[str] = None
    locations: Optional[list] = None  # For multi-location searches from globe


class FlightSearchResponse(BaseModel):
    success: bool
    data: Optional[Dict[Any, Any]] = None
    error: Optional[str] = None
    extracted_params: Optional[Dict[str, Any]] = None


class PlacesSearchRequest(BaseModel):
    destination_city: str
    user_id: Optional[str] = None


class PlacesSearchResponse(BaseModel):
    success: bool
    data: Optional[list] = None
    error: Optional[str] = None
    destination_city: Optional[str] = None
    natural_language_response: Optional[str] = None
    is_fallback: Optional[bool] = False


class CombinedTravelRequest(BaseModel):
    message: str
    user_id: str = "hackathon_user"
    conversation_id: str = None
    force_refresh: bool = False


class CombinedTravelResponse(BaseModel):
    success: bool
    data: dict = None
    error: str = None
    places: list = None


class NaturalLanguageRequest(BaseModel):
    message: str
    user_id: Optional[str] = None
    error_context: Optional[str] = None


class NaturalLanguageResponse(BaseModel):
    success: bool
    response: str
    is_fallback: bool = True


class HotelSearchRequest(BaseModel):
    message: str  # Natural language input like flights
    check_in_date: Optional[str] = None  # Override if specified
    check_out_date: Optional[str] = None  # Override if specified
    adults: Optional[int] = None  # Override if specified
    children: Optional[int] = None  # Override if specified
    user_id: Optional[str] = None


class HotelSearchResponse(BaseModel):
    success: bool
    data: Optional[list] = None
    error: Optional[str] = None
    search_params: Optional[Dict[str, Any]] = None


async def get_places_for_destination(destination_city: str, api_key: str) -> Optional[list]:
    """Get places for the destination city using Google Places API"""

    if not api_key:
        print("⚠️ Google Places API key not provided")
        return None
    try:
        async with aiohttp.ClientSession() as session:
            # Step 1: Geocode the destination
            print(f"🗺️ Geocoding destination: {destination_city}")

            geocode_params = {
                'address': destination_city,
                'key': api_key
            }

            async with session.get(
                    'https://maps.googleapis.com/maps/api/geocode/json',
                    params=geocode_params,
                    timeout=10
            ) as response:

                if response.status != 200:
                    print(f"❌ Geocoding failed: {response.status}")
                    return None

                geocode_data = await response.json()

                if geocode_data['status'] != 'OK':
                    print(f"❌ Geocoding error: {geocode_data['status']}")
                    return None

                location = geocode_data['results'][0]['geometry']['location']
                print(f"✅ Found coordinates: {location['lat']}, {location['lng']}")

            # Step 2: Search for tourist attractions
            print("🏛️ Searching for attractions...")

            places_params = {
                'location': f"{location['lat']},{location['lng']}",
                'radius': 10000,  # 10km radius
                'type': 'tourist_attraction',
                'key': api_key
            }

            async with session.get(
                    'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
                    params=places_params,
                    timeout=10
            ) as response:

                if response.status == 200:
                    places_data = await response.json()
                    places = places_data.get('results', [])
                    print(f"✅ Found {len(places)} attractions in {destination_city}")

                    if places:
                        # Format places data for frontend
                        formatted_places = []
                        for place in places[:10]:  # Top 10 places
                            formatted_place = {
                                'name': place.get('name', 'Unknown'),
                                'rating': place.get('rating', 0),
                                'price_level': place.get('price_level', 0),
                                'types': place.get('types', []),
                                'vicinity': place.get('vicinity', ''),
                                'place_id': place.get('place_id', ''),
                                'photos': place.get('photos', [])
                            }
                            formatted_places.append(formatted_place)

                        # Show top 3 attractions in logs
                        print("📍 Top attractions:")
                        for i, place in enumerate(places[:3], 1):
                            name = place['name']
                            rating = place.get('rating', 'N/A')
                            price_level = place.get('price_level', 'N/A')
                            types = place.get('types', [])

                            print(f"   {i}. {name}")
                            print(f"      Rating: {rating}")
                            print(f"      Price level: {price_level}")
                            print(f"      Types: {', '.join(types[:2])}")

                        return formatted_places
                else:
                    print(f"❌ Places search failed: {response.status}")
                    return None
    except Exception as e:
        print(f"❌ Error getting places for {destination_city}: {str(e)}")
        return None


async def search_hotels_serp(destination_city: str, check_in_date: str = None, check_out_date: str = None,
                             adults: int = 1, children: int = 0) -> Dict[str, Any]:
    """Search hotels using SERP API for a destination city"""

    serp_key = os.getenv('SERP_API_KEY')
    if not serp_key:
        raise HTTPException(status_code=500, detail="SERP API key not configured")

    # Default dates if not provided (30 days from now for check-in, 33 days from now for check-out)
    if not check_in_date:
        check_in_date = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
    if not check_out_date:
        check_out_date = (datetime.now() + timedelta(days=33)).strftime('%Y-%m-%d')

    # Build SERP API parameters for hotels
    serp_params = {
        'api_key': serp_key,
        'engine': 'google_hotels',
        'q': destination_city,
        'check_in_date': check_in_date,
        'check_out_date': check_out_date,
        'adults': adults,
        'currency': 'USD',
        'gl': 'us',
        'hl': 'en',
        'booking_options': 'true',
        'include_offers': 'true'
    }

    # Add children if specified
    if children > 0:
        serp_params['children'] = children

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                    'https://serpapi.com/search',
                    params=serp_params,
                    timeout=30
            ) as response:
                if response.status == 200:
                    hotel_data = await response.json()
                    return hotel_data
                else:
                    error_text = await response.text()
                    raise HTTPException(
                        status_code=response.status,
                        detail=f"SERP Hotels API error: {error_text}"
                    )

    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Hotel search timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hotel search failed: {str(e)}")


def format_hotel_data(hotel_data: Dict[str, Any], search_params: Dict[str, Any]) -> list:
    """Format hotel data for frontend consumption"""

    properties = hotel_data.get('properties', [])
    formatted_hotels = []

    for hotel in properties:
        formatted_hotel = {
            'id': hotel.get('property_token', f"hotel_{len(formatted_hotels)}"),
            'name': hotel.get('name', 'Unknown Hotel'),
            'description': hotel.get('description', ''),
            'rate_per_night': None,
            'total_rate': None,
            'currency': 'USD',
            'rating': hotel.get('overall_rating', 0),
            'review_count': hotel.get('reviews', 0),
            'amenities': hotel.get('amenities', []),
            'images': hotel.get('images', []),
            'location': {
                'address': hotel.get('location', ''),
                'coordinates': hotel.get('gps_coordinates', {})
            },
            'booking_options': [],
            'hotel_class': hotel.get('hotel_class', 0),
            'check_in_time': hotel.get('check_in_time', ''),
            'check_out_time': hotel.get('check_out_time', '')
        }

        # Extract rate information
        rate_per_night = hotel.get('rate_per_night')
        if rate_per_night:
            formatted_hotel['rate_per_night'] = {
                'lowest': rate_per_night.get('lowest', 0),
                'extracted_lowest': rate_per_night.get('extracted_lowest', 0),
                'before_taxes_fees': rate_per_night.get('before_taxes_fees', 0),
                'extracted_before_taxes_fees': rate_per_night.get('extracted_before_taxes_fees', 0)
            }

        total_rate = hotel.get('total_rate')
        if total_rate:
            formatted_hotel['total_rate'] = {
                'lowest': total_rate.get('lowest', 0),
                'extracted_lowest': total_rate.get('extracted_lowest', 0),
                'before_taxes_fees': total_rate.get('before_taxes_fees', 0),
                'extracted_before_taxes_fees': total_rate.get('extracted_before_taxes_fees', 0)
            }

        # Extract booking options
        booking_options = []

        # Check 'prices' field
        if 'prices' in hotel:
            for price in hotel['prices']:
                booking_option = {
                    'source': price.get('source', 'Unknown'),
                    'rate': price.get('rate', 0),
                    'total': price.get('total', 0),
                    'link': price.get('link', ''),
                    'price_description': price.get('price_description', '')
                }
                booking_options.append(booking_option)

        # Check 'offers' field (another common location)
        if 'offers' in hotel:
            for offer in hotel['offers']:
                booking_option = {
                    'source': offer.get('partner', offer.get('source', 'Unknown')),
                    'rate': offer.get('rate', 0),
                    'total': offer.get('total', 0),
                    'link': offer.get('url', offer.get('link', '')),
                    'price_description': offer.get('description', '')
                }
                booking_options.append(booking_option)

        # Check 'booking_options' field directly
        if 'booking_options' in hotel:
            for option in hotel['booking_options']:
                booking_option = {
                    'source': option.get('partner', option.get('source', 'Unknown')),
                    'rate': option.get('rate', 0),
                    'total': option.get('total', 0),
                    'link': option.get('url', option.get('link', '')),
                    'price_description': option.get('description', '')
                }
                booking_options.append(option)

        formatted_hotel['booking_options'] = booking_options
        formatted_hotels.append(formatted_hotel)

    return formatted_hotels


def validate_travel_params(params: Dict[str, Any], required_fields: list) -> tuple[bool, list, str]:
    """
    Validate extracted travel parameters and generate follow-up questions if needed

    Returns:
        (is_valid, missing_fields, follow_up_question)
    """
    missing_fields = []

    # Check required fields
    for field in required_fields:
        if field not in params or params[field] is None or params[field] == "":
            missing_fields.append(field)

    # Check for reasonable dates
    if 'outbound_date' in params and params['outbound_date']:
        try:
            outbound = datetime.strptime(params['outbound_date'], '%Y-%m-%d')
            if outbound < datetime.now() - timedelta(days=1):  # Allow today
                missing_fields.append('outbound_date')
        except ValueError:
            missing_fields.append('outbound_date')

    if missing_fields:
        # Generate contextual follow-up question
        questions = {
            'departure_id': "Which city or airport are you departing from?",
            'arrival_id': "Which city or airport is your destination?",
            'destination_city': "What city would you like to visit?",
            'outbound_date': "When would you like to travel? Please provide a specific date.",
            'return_date': "When would you like to return? (or say 'one-way' if not returning)",
            'adults': "How many adults will be traveling?",
            'children': "How many children will be traveling?"
        }

        if len(missing_fields) == 1:
            question = questions.get(missing_fields[0], f"Could you please specify {missing_fields[0]}?")
        elif len(missing_fields) == 2:
            field1, field2 = missing_fields[0], missing_fields[1]
            q1 = questions.get(field1, field1)
            q2 = questions.get(field2, field2)
            question = f"{q1} Also, {q2.lower()}"
        else:
            # Multiple missing fields - ask for key ones first
            priority_fields = ['departure_id', 'arrival_id', 'destination_city', 'outbound_date']
            missing_priority = [f for f in missing_fields if f in priority_fields]

            if missing_priority:
                key_field = missing_priority[0]
                question = questions.get(key_field, f"Could you please specify {key_field}?")
            else:
                question = f"Could you please provide more details about {', '.join(missing_fields[:2])}?"

        return False, missing_fields, question

    return True, [], ""

async def parse_enhanced_travel_request(user_input: str) -> Dict[str, Any]:
    """Use Gemini to parse travel request with both flight and destination info"""

    gemini_key = os.getenv('GEMINI_API_KEY')
    if not gemini_key:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")

    genai.configure(api_key=gemini_key)
    model = genai.GenerativeModel('gemini-2.5-flash')

    parse_prompt = f"""
    Parse this travel request: "{user_input}"

    Extract these exact parameters:
    {{
        "departure_id": "3-letter airport code",
        "arrival_id": "3-letter airport code",
        "destination_city": "full destination city name for places search",
        "outbound_date": "YYYY-MM-DD",
        "return_date": "YYYY-MM-DD or null",
        "type": "1 or 2",
        "adults": number,
        "children": number,
        "currency": "USD",
        "hl": "en"
    }}

    Rules:
    - departure_id/arrival_id: Convert cities to codes (LA->LAX, Tokyo->NRT, NYC->JFK, Paris->CDG, London->LHR, Boston->BOS)
    - destination_city: Full city name for Google Places (Tokyo, Paris, London, etc)
    - type: "1" for round-trip, "2" for one-way
    - return_date: null if one-way, calculate date if round-trip (default 7 days after outbound)
    - outbound_date: use specified date or 30 days from today if not specified
    - adults: extract number or default 1
    - children: extract number or default 0
    - currency: always "USD"
    - hl: always "en"

    Return ONLY the JSON object, no other text.
    """

    try:
        response = await asyncio.to_thread(model.generate_content, parse_prompt)

        # Extract JSON from response
        text = response.text.strip()
        if text.startswith('```json'):
            text = text[7:-3]
        elif text.startswith('```'):
            text = text[3:-3]

        params = json.loads(text)
        return params

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse travel request: {str(e)}")


async def parse_flight_request_with_locations(user_input: str, locations: list) -> Dict[str, Any]:
    """Parse flight request with globe-selected locations"""
    
    gemini_key = os.getenv('GEMINI_API_KEY')
    if not gemini_key:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")

    genai.configure(api_key=gemini_key)
    model = genai.GenerativeModel('gemini-2.5-flash')

    # Create location context
    location_names = [loc['name'] for loc in locations]
    origin = locations[0]['name']
    destination = locations[-1]['name']
    
    parse_prompt = f"""
    Parse this flight request with selected locations: "{user_input}"
    
    Selected locations from globe: {location_names}
    Origin: {origin}
    Destination: {destination}

    Extract these exact parameters for SERP API:
    {{
        "departure_id": "3-letter airport code for {origin}",
        "arrival_id": "3-letter airport code for {destination}", 
        "outbound_date": "YYYY-MM-DD",
        "return_date": "YYYY-MM-DD or null",
        "type": "1 or 2",
        "adults": number,
        "children": number,
        "currency": "USD",
        "hl": "en"
    }}

    Rules:
    - departure_id/arrival_id: Convert cities to codes ({origin}->airport code, {destination}->airport code)
    - Use common airport codes: LA/Los Angeles->LAX, Tokyo->NRT, NYC/New York->JFK, Paris->CDG, London->LHR, Boston->BOS, Dubai->DXB, Sydney->SYD, Singapore->SIN, Hong Kong->HKG, Mumbai->BOM, São Paulo->GRU, Cairo->CAI, Moscow->SVO, Mexico City->MEX, Cape Town->CPT
    - type: "1" for round-trip, "2" for one-way (default to round-trip unless specified)
    - return_date: null if one-way, calculate date if round-trip (default 7 days after outbound)
    - outbound_date: use specified date or 30 days from today if not specified
    - adults: extract number or default 1
    - children: extract number or default 0
    - currency: always "USD" 
    - hl: always "en"

    Return ONLY the JSON object, no other text.
    """

    try:
        response = await asyncio.to_thread(model.generate_content, parse_prompt)

        # Extract JSON from response
        text = response.text.strip()
        if text.startswith('```json'):
            text = text[7:-3]
        elif text.startswith('```'):
            text = text[3:-3]

        params = json.loads(text)
        
        # Add location metadata
        params['selected_locations'] = locations
        params['origin_city'] = origin
        params['destination_city'] = destination
        
        return params

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse flight request with locations: {str(e)}")


async def parse_flight_request(user_input: str) -> Dict[str, Any]:
    """Use Gemini to parse flight request into SERP API parameters (basic version)"""

    gemini_key = os.getenv('GEMINI_API_KEY')
    if not gemini_key:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")

    genai.configure(api_key=gemini_key)
    model = genai.GenerativeModel('gemini-2.5-flash')

    parse_prompt = f"""
    Parse this flight request: "{user_input}"

    Extract these exact parameters for SERP API:
    {{
        "departure_id": "3-letter airport code",
        "arrival_id": "3-letter airport code", 
        "outbound_date": "YYYY-MM-DD",
        "return_date": "YYYY-MM-DD or null",
        "type": "1 or 2",
        "adults": number,
        "children": number,
        "currency": "USD",
        "hl": "en"
    }}

    Rules:
    - departure_id/arrival_id: Convert cities to codes (LA->LAX, Tokyo->NRT, NYC->JFK, Paris->CDG, London->LHR, Boston->BOS)
    - type: "1" for round-trip, "2" for one-way
    - return_date: null if one-way, calculate date if round-trip (default 7 days after outbound)
    - outbound_date: use specified date or 30 days from today if not specified
    - adults: extract number or default 1
    - children: extract number or default 0
    - currency: always "USD" 
    - hl: always "en"

    Return ONLY the JSON object, no other text.
    """

    try:
        response = await asyncio.to_thread(model.generate_content, parse_prompt)

        # Extract JSON from response
        text = response.text.strip()
        if text.startswith('```json'):
            text = text[7:-3]
        elif text.startswith('```'):
            text = text[3:-3]

        params = json.loads(text)
        return params

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse flight request: {str(e)}")


async def search_flights_serp(params: Dict[str, Any]) -> Dict[str, Any]:
    """Search flights using SERP API with extracted parameters"""

    serp_key = os.getenv('SERP_API_KEY')
    if not serp_key:
        raise HTTPException(status_code=500, detail="SERP API key not configured")

    # Build SERP API parameters
    serp_params = {
        'api_key': serp_key,
        'engine': 'google_flights',
        'departure_id': params['departure_id'],
        'arrival_id': params['arrival_id'],
        'outbound_date': params['outbound_date'],
        'type': params['type'],
        'adults': params['adults'],
        'currency': params['currency'],
        'hl': params['hl']
    }

    # Add optional parameters
    if params['return_date']:
        serp_params['return_date'] = params['return_date']
    if params['children'] > 0:
        serp_params['children'] = params['children']

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                    'https://serpapi.com/search',
                    params=serp_params,
                    timeout=30
            ) as response:
                if response.status == 200:
                    flight_data = await response.json()
                    return flight_data
                else:
                    error_text = await response.text()
                    raise HTTPException(
                        status_code=response.status,
                        detail=f"SERP API error: {error_text}"
                    )

    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Flight search timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Flight search failed: {str(e)}")


def format_enhanced_flight_data(flight_data: Dict[str, Any], extracted_params: Dict[str, Any],
                                places_data: Optional[list] = None) -> Dict[str, Any]:
    """Format flight data with places integration for frontend consumption"""

    best_flights = flight_data.get('best_flights', [])
    other_flights = flight_data.get('other_flights', [])
    search_metadata = flight_data.get('search_metadata', {})

    # Format flights for easier frontend consumption
    formatted_flights = []

    # Debug: Print first flight structure to understand SERP API response
    if best_flights:
        print("🔍 Debug: First flight structure from SERP API:")
        first_flight_debug = best_flights[0]
        print(f"   Flight keys: {list(first_flight_debug.keys())}")
        if 'flights' in first_flight_debug and first_flight_debug['flights']:
            flight_segment = first_flight_debug['flights'][0]
            print(f"   Flight segment keys: {list(flight_segment.keys())}")
            if 'departure_airport' in flight_segment:
                print(f"   Departure airport: {flight_segment['departure_airport']}")
            if 'arrival_airport' in flight_segment:
                print(f"   Arrival airport: {flight_segment['arrival_airport']}")

    for flight in best_flights + other_flights:
        formatted_flight = {
            'id': flight.get('flight_id', f"flight_{len(formatted_flights)}"),
            'price': flight.get('price', 0),
            'currency': flight.get('currency', 'USD'),
            'airline': None,
            'flight_number': None,
            'departure_time': None,
            'arrival_time': None,
            'departure_code': None,
            'departure_name': None,
            'arrival_code': None,
            'arrival_name': None,
            'duration': flight.get('total_duration', 'N/A'),
            'stops': len(flight.get('layovers', [])),
            'booking_options': flight.get('booking_options', []),
            'flights': flight.get('flights', [])
        }

        # Extract flight details - show actual route as returned by API
        flights = flight.get('flights', [])
        if flights:
            first_flight = flights[0]
            last_flight = flights[-1]  # Last segment for final destination
            
            departure_airport = first_flight.get('departure_airport', {})
            arrival_airport = last_flight.get('arrival_airport', {})
            
            # Use actual airport codes from the API response
            departure_code = departure_airport.get('id', 'N/A')
            arrival_code = arrival_airport.get('id', 'N/A')
            
            # Get airport names directly from API, fallback to code + Airport
            departure_name = departure_airport.get('name') or f"{departure_code} Airport"
            arrival_name = arrival_airport.get('name') or f"{arrival_code} Airport"
            
            formatted_flight.update({
                'airline': first_flight.get('airline', 'N/A'),
                'flight_number': first_flight.get('flight_number', 'N/A'),
                'departure_time': departure_airport.get('time', 'N/A'),
                'arrival_time': arrival_airport.get('time', 'N/A'),
                'departure_code': departure_code,
                'departure_name': departure_name,
                'arrival_code': arrival_code,
                'arrival_name': arrival_name,
            })

        formatted_flights.append(formatted_flight)

    result = {
        'flights': formatted_flights,
        'search_params': extracted_params,
        'total_results': len(formatted_flights),
        'best_flights_count': len(best_flights),
        'other_flights_count': len(other_flights),
        'search_metadata': search_metadata,
        'source': 'serp_api'
    }

    # Add places data if available
    if places_data:
        result['places'] = places_data
        result['destination_city'] = extracted_params.get('destination_city', 'Unknown')

    return result


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Starting AI Travel Agent...")
    print("✅ REST API ready!")
    yield
    # Shutdown
    print("🔄 Shutting down...")


app = FastAPI(title="AI Travel Agent API", lifespan=lifespan)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/flights/search", response_model=FlightSearchResponse)
async def search_flights(request: FlightSearchRequest):
    """
    Search for flights based on natural language input

    Example requests:
    - "Round trip from Los Angeles to Tokyo for 2 people departing January 15th"
    - "One way flight from NYC to Paris for 3 adults and 2 children"
    - "Business class round trip Boston to London departing next month"
    """

    try:
        # Step 1: Parse the natural language request
        # If locations are provided from globe, use them to enhance the parsing
        if request.locations and len(request.locations) >= 2:
            print(f"🌍 Globe locations provided: {[loc['name'] for loc in request.locations]}")
            extracted_params = await parse_flight_request_with_locations(request.message, request.locations)
        else:
            extracted_params = await parse_flight_request(request.message)

        # Step 1.5: Set default outbound_date if missing (30 days from now)
        if not extracted_params.get('outbound_date'):
            default_date = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
            extracted_params['outbound_date'] = default_date
            print(f"📅 Setting default outbound date to: {default_date}")

        # Step 2: Validate required parameters
        required_fields = ['departure_id', 'arrival_id', 'outbound_date']
        is_valid, missing_fields, follow_up_question = validate_travel_params(extracted_params, required_fields)

        if not is_valid:
            print(f"❓ Missing flight info: {missing_fields}")
            return FlightSearchResponse(
                success=True,  # Still successful, just needs clarification
                needs_clarification=True,
                follow_up_question=follow_up_question,
                missing_info=missing_fields,
                extracted_params=extracted_params
            )

        # Step 3: Search flights using SERP API
        flight_data = await search_flights_serp(extracted_params)

        # Step 4: Format data for frontend (flights only)
        formatted_data = format_enhanced_flight_data(flight_data, extracted_params)

        return FlightSearchResponse(
            success=True,
            data=formatted_data,
            extracted_params=extracted_params
        )

    except HTTPException as e:
        return FlightSearchResponse(
            success=False,
            error=e.detail
        )
    except Exception as e:
        return FlightSearchResponse(
            success=False,
            error=f"Unexpected error: {str(e)}"
        )


@app.post("/api/places/search", response_model=PlacesSearchResponse)
async def search_places(request: PlacesSearchRequest):
    """
    Search for tourist attractions and places in a destination city

    Example requests:
    - destination_city: "Tokyo"
    - destination_city: "Paris"
    - destination_city: "London"
    """

    try:
        if not request.destination_city or request.destination_city.strip() == "":
            return PlacesSearchResponse(
                success=True,
                needs_clarification=True,
                follow_up_question="Which city would you like me to find attractions for?"
            )

        places_key = os.getenv('GOOGLE_PLACES_API_KEY')
        if not places_key:
            return PlacesSearchResponse(
                success=False,
                error="Google Places API key not configured"
            )

        # Get places data for the destination
        places_data = await get_places_for_destination(request.destination_city, places_key)

        if places_data is None:
            # Try to provide natural language response as fallback
            try:
                natural_response = await generate_natural_language_response(
                    f"What are the top attractions and things to do in {request.destination_city}?",
                    "Places API unavailable"
                )
                return PlacesSearchResponse(
                    success=True,
                    data=[],
                    destination_city=request.destination_city,
                    natural_language_response=natural_response,
                    is_fallback=True
                )
            except Exception as fallback_error:
                print(f"❌ Natural language fallback also failed: {str(fallback_error)}")
                return PlacesSearchResponse(
                    success=False,
                    error=f"Could not find places for {request.destination_city}"
                )

        return PlacesSearchResponse(
            success=True,
            data=places_data,
            destination_city=request.destination_city
        )

    except Exception as e:
        return PlacesSearchResponse(
            success=False,
            error=f"Unexpected error: {str(e)}"
        )


async def generate_natural_language_response(user_query: str, error_context: str = None) -> str:
    """Generate a natural language response using Gemini when APIs fail"""
    
    gemini_key = os.getenv('GEMINI_API_KEY')
    if not gemini_key:
        return "I'm having trouble accessing my travel services right now. Please try again later."
    
    try:
        genai.configure(api_key=gemini_key)
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Create a prompt that provides helpful travel information
        prompt = f"""
        The user asked: "{user_query}"
        
        Please provide a comprehensive and helpful response about their travel query. Act as a knowledgeable travel assistant and include:

        If they're asking about a specific destination:
        - Top attractions and must-see places
        - Popular activities and experiences
        - Best time to visit and weather considerations
        - Local culture, food, and customs
        - Transportation options within the city
        - Approximate budget considerations
        - Travel tips and recommendations

        If they're asking about flights:
        - General advice about booking flights to that destination
        - Typical flight duration and connections
        - Best times to book for better prices
        - Airport information and transportation

        If they're asking about hotels:
        - Popular neighborhoods to stay in
        - Types of accommodations available
        - General price ranges
        - Booking tips

        Be conversational, enthusiastic, and informative. Provide specific examples and practical advice. Keep the response under 400 words but make it comprehensive and engaging.
        """
        
        response = await asyncio.to_thread(model.generate_content, prompt)
        return response.text.strip()
        
    except Exception as e:
        print(f"❌ Error generating natural language response: {str(e)}")
        return "I'm having trouble with my travel services right now, but I'd be happy to help you plan your trip once the connection is restored. Please try again in a few moments."


@app.post("/api/travel/search", response_model=CombinedTravelResponse)
async def combined_travel_search(request: CombinedTravelRequest):
    """
    Combined travel search that calls flights, hotels, and places endpoints

    Example requests:
    - "Round trip from Los Angeles to Tokyo for 2 people departing January 15th"
    - "Plan a trip to Paris from NYC with attractions"
    - "Flight and activities for London from Boston"

    Returns combined results from:
    - Flights search
    - Hotels search
    - Places search
    """

    try:
        print(f"🌍 Combined travel search: {request.message}")

        # Step 1: Parse the travel request to validate we have enough info
        extracted_params = await parse_enhanced_travel_request(request.message)

        # Step 2: Validate required parameters for complete travel search
        required_fields = ['departure_id', 'arrival_id', 'destination_city', 'outbound_date']
        is_valid, missing_fields, follow_up_question = validate_travel_params(extracted_params, required_fields)

        if not is_valid:
            print(f"❓ Missing travel info for combined search: {missing_fields}")
            return CombinedTravelResponse(
                success=True,  # Still successful, just needs clarification
                needs_clarification=True,
                follow_up_question=follow_up_question,
                missing_info=missing_fields
            )

        # Step 3: Call individual endpoints concurrently
        print("🔄 Calling flights, hotels, and places endpoints...")

        # Create request objects for each endpoint
        flight_request = FlightSearchRequest(message=request.message, user_id=request.user_id)
        hotel_request = HotelSearchRequest(message=request.message, user_id=request.user_id)
        places_request = PlacesSearchRequest(destination_city=extracted_params['destination_city'])

        # Call all three endpoints concurrently
        flight_task = search_flights(flight_request)
        hotel_task = search_hotels(hotel_request)
        places_task = search_places(places_request)

        # Wait for all results
        flight_result, hotel_result, places_result = await asyncio.gather(
            flight_task, hotel_task, places_task, return_exceptions=True
        )

        # Step 4: Process results and handle any errors
        flights_data = None
        hotels_data = None
        places_data = None
        errors = []

        # Process flight results
        if isinstance(flight_result, Exception):
            errors.append(f"Flights: {str(flight_result)}")
        elif flight_result.success and flight_result.data:
            flights_data = flight_result.data
        elif flight_result.needs_clarification:
            # If flights need clarification, the combined search should too
            return CombinedTravelResponse(
                success=True,
                needs_clarification=True,
                follow_up_question=flight_result.follow_up_question,
                missing_info=flight_result.missing_info
            )

        # Process hotel results
        if isinstance(hotel_result, Exception):
            errors.append(f"Hotels: {str(hotel_result)}")
        elif hotel_result.success and hotel_result.data:
            hotels_data = hotel_result.data

        # Process places results
        if isinstance(places_result, Exception):
            errors.append(f"Places: {str(places_result)}")
        elif places_result.success and places_result.data:
            places_data = places_result.data

        # Step 5: Log results
        print(f"✅ Combined search results:")
        print(f"   🛫 Flights: {len(flights_data.get('flights', [])) if flights_data else 0} found")
        print(f"   🏨 Hotels: {len(hotels_data) if hotels_data else 0} found")
        print(f"   📍 Places: {len(places_data) if places_data else 0} found")

        if errors:
            print(f"⚠️ Some errors occurred: {'; '.join(errors)}")

        # Step 6: Return combined results
        return CombinedTravelResponse(
            success=True,
            flights=flights_data,
            hotels=hotels_data,
            places=places_data,
            search_params={
                'message': request.message,
                'extracted_params': extracted_params,
                'user_id': request.user_id,
                'conversation_id': request.conversation_id,
                'errors': errors if errors else None
            }
        )

    except HTTPException as e:
        return CombinedTravelResponse(
            success=False,
            error=e.detail
        )
    except Exception as e:
        return CombinedTravelResponse(
            success=False,
            error=f"Unexpected error: {str(e)}"
        )

    except HTTPException as e:
        return CombinedTravelResponse(
            success=False,
            error=e.detail
        )
    except Exception as e:
        return CombinedTravelResponse(
            success=False,
            error=f"Unexpected error: {str(e)}"
        )


@app.post("/api/hotels/search", response_model=HotelSearchResponse)
async def search_hotels(request: HotelSearchRequest):
    """
    Search for hotels based on natural language travel input (uses same parsing as flights)

    Example requests:
    - "Round trip from Los Angeles to Tokyo for 2 people departing January 15th"
    - "Trip to Paris from NYC, staying 3 nights"
    - "Business trip to London from Boston for 1 week"

    Optional overrides:
    - check_in_date: "2025-02-15" (overrides parsed date)
    - check_out_date: "2025-02-18" (overrides parsed date)
    - adults: 3 (overrides parsed number)
    - children: 1 (overrides parsed number)
    """

    try:
        # Step 1: Parse the travel request to extract destination and dates
        print(f"🏨 Parsing travel request for hotels: {request.message}")
        extracted_params = await parse_enhanced_travel_request(request.message)

        # Step 2: Validate required information for hotels
        destination_city = extracted_params.get('destination_city')
        outbound_date = extracted_params.get('outbound_date')

        missing_info = []
        if not destination_city:
            missing_info.append('destination_city')
        if not outbound_date:
            missing_info.append('outbound_date')

        if missing_info:
            questions = {
                'destination_city': "Which city are you looking for hotels in?",
                'outbound_date': "When do you need the hotel? Please provide your check-in date."
            }

            if len(missing_info) == 1:
                question = questions.get(missing_info[0])
            else:
                question = "Which city are you looking for hotels in, and when do you need to check in?"

            return HotelSearchResponse(
                success=True,
                needs_clarification=True,
                follow_up_question=question,
                missing_info=missing_info
            )

        # Step 3: Use extracted dates or overrides
        check_in_date = request.check_in_date or extracted_params.get('outbound_date')
        check_out_date = request.check_out_date or extracted_params.get('return_date')

        # If no return date (one-way flight), default to 2 nights
        if not check_out_date and check_in_date:
            check_out_date = (datetime.strptime(check_in_date, '%Y-%m-%d') + timedelta(days=2)).strftime('%Y-%m-%d')

        # Use extracted passenger counts or overrides
        adults = request.adults if request.adults is not None else extracted_params.get('adults', 1)
        children = request.children if request.children is not None else extracted_params.get('children', 0)

        print(f"🏨 Searching hotels in: {destination_city}")
        print(f"📅 Check-in: {check_in_date}, Check-out: {check_out_date}")
        print(f"👥 Adults: {adults}, Children: {children}")

        # Step 4: Search hotels using SERP API
        hotel_data = await search_hotels_serp(
            destination_city=destination_city,
            check_in_date=check_in_date,
            check_out_date=check_out_date,
            adults=adults,
            children=children
        )

        # Step 5: Format hotel data for frontend
        formatted_hotels = format_hotel_data(hotel_data, {
            'destination_city': destination_city,
            'check_in_date': check_in_date,
            'check_out_date': check_out_date,
            'adults': adults,
            'children': children
        })

        print(f"✅ Found {len(formatted_hotels)} hotels in {destination_city}")

        # Log top 3 hotels
        if formatted_hotels:
            print("🏨 Top hotels:")
            for i, hotel in enumerate(formatted_hotels[:3], 1):
                name = hotel['name']
                rating = hotel.get('rating', 'N/A')
                rate = hotel.get('rate_per_night', {}).get('lowest', 'N/A') if hotel.get('rate_per_night') else 'N/A'
                booking_options = hotel.get('booking_options', [])

                print(f"   {i}. {name}")
                print(f"      Rating: {rating}")
                print(f"      Rate per night: ${rate}" if rate != 'N/A' else f"      Rate per night: {rate}")

                # Add booking links to console output
                if booking_options:
                    print(f"      Booking options: {len(booking_options)} available")
                    for j, option in enumerate(booking_options[:2], 1):  # Show first 2 booking options
                        source = option.get('source', 'Unknown')
                        link = option.get('link', 'N/A')
                        print(f"        {j}. {source}: {link}")
                else:
                    print(f"      Booking options: None available")

        return HotelSearchResponse(
            success=True,
            data=formatted_hotels,
            search_params={
                'destination_city': destination_city,
                'check_in_date': check_in_date,
                'check_out_date': check_out_date,
                'adults': adults,
                'children': children,
                'extracted_from_message': request.message,
                'overrides_used': {
                    'check_in_date': request.check_in_date is not None,
                    'check_out_date': request.check_out_date is not None,
                    'adults': request.adults is not None,
                    'children': request.children is not None
                }
            }
        )

    except HTTPException as e:
        return HotelSearchResponse(
            success=False,
            error=e.detail
        )
    except Exception as e:
        return HotelSearchResponse(
            success=False,
            error=f"Unexpected error: {str(e)}"
        )


@app.post("/api/chat/natural", response_model=NaturalLanguageResponse)
async def natural_language_chat(request: NaturalLanguageRequest):
    """
    Provide natural language responses when travel APIs fail
    
    This endpoint uses Gemini to provide helpful travel information
    when specific travel data cannot be retrieved.
    """
    
    try:
        response_text = await generate_natural_language_response(
            request.message, 
            request.error_context
        )
        
        return NaturalLanguageResponse(
            success=True,
            response=response_text,
            is_fallback=True
        )
        
    except Exception as e:
        return NaturalLanguageResponse(
            success=False,
            response="I'm experiencing technical difficulties right now. Please try again later.",
            is_fallback=True
        )


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "gemini": "connected" if os.getenv('GEMINI_API_KEY') else "needs_api_key",
        "flight_search": "available" if os.getenv('GEMINI_API_KEY') and os.getenv('SERP_API_KEY') else "needs_api_keys",
        "hotel_search": "available" if os.getenv('SERP_API_KEY') else "needs_serp_api_key",
        "google_places": "available" if os.getenv('GOOGLE_PLACES_API_KEY') else "needs_api_key",
        "enhanced_travel": "available" if all([
            os.getenv('GEMINI_API_KEY'),
            os.getenv('SERP_API_KEY'),
            os.getenv('GOOGLE_PLACES_API_KEY')
        ]) else "partial_keys"
    }


@app.get("/")
async def root():
    return {"message": "AI Travel Agent API - Ready for hackathon! 🚀"}


if __name__ == "__main__":
    import uvicorn

    print("🚀 Starting FastAPI server...")
    print("📍 Server will be available at: http://localhost:8000")
    print("📖 API docs will be available at: http://localhost:8000/docs")
    print("🔧 Health check: http://localhost:8000/api/health")

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)