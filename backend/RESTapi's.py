#!/usr/bin/env python3
"""
Simple Gemini + SERP API Test
Input string -> Gemini parsing -> SERP API with variables
"""

import os
import asyncio
import aiohttp
import json
from dotenv import load_dotenv
import google.generativeai as genai
from datetime import datetime, timedelta

load_dotenv()


async def test_gemini_serp_integration():
    """Test Gemini parsing + SERP API with variable parameters"""

    # Interactive input - allows full multi-line input until Enter
    print("Enter your travel request (press Enter when done):")
    print("Examples:")
    print("  - Round trip from Los Angeles to Tokyo for 2 people departing January 15th")
    print("  - One way flight from NYC to Paris for 3 adults and 2 children")
    print("  - Business class round trip Boston to London departing next month")
    print()

    user_input = input("Your travel request: ").strip()

    if not user_input:
        print("No input provided")
        return False

    print(f"\nInput received: {user_input}")
    print("=" * 80)

    # Step 1: Gemini parses the input
    gemini_key = os.getenv('GEMINI_API_KEY')
    serp_key = os.getenv('SERP_API_KEY')

    if not gemini_key or not serp_key:
        print("Missing API keys")
        return

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
    - departure_id/arrival_id: Convert cities to codes (LA->LAX, Tokyo->NRT, NYC->JFK, Paris->CDG)
    - type: "1" for round-trip, "2" for one-way
    - return_date: null if one-way, calculate date if round-trip
    - outbound_date: use specified date or 30 days from today
    - adults: extract number or default 1
    - children: extract number or default 0
    - currency: always "USD"
    - hl: always "en"

    Return ONLY the JSON object.
    """

    try:
        print("Gemini parsing...")
        response = await asyncio.to_thread(model.generate_content, parse_prompt)

        # Extract JSON
        text = response.text.strip()
        if text.startswith('```json'):
            text = text[7:-3]
        elif text.startswith('```'):
            text = text[3:-3]

        params_from_gemini = json.loads(text)

        print("Extracted parameters:")
        for key, value in params_from_gemini.items():
            print(f"  {key}: {value}")

        # Step 2: Use extracted parameters in SERP API
        print("\nCalling SERP API...")

        async with aiohttp.ClientSession() as session:
            # Build SERP params using Gemini's extracted variables
            params = {
                'api_key': serp_key,
                'engine': 'google_flights',
                'departure_id': params_from_gemini['departure_id'],
                'arrival_id': params_from_gemini['arrival_id'],
                'outbound_date': params_from_gemini['outbound_date'],
                'type': params_from_gemini['type'],
                'adults': params_from_gemini['adults'],
                'currency': params_from_gemini['currency'],
                'hl': params_from_gemini['hl']
            }

            # Add return_date if not null
            if params_from_gemini['return_date']:
                params['return_date'] = params_from_gemini['return_date']

            # Add children if > 0
            if params_from_gemini['children'] > 0:
                params['children'] = params_from_gemini['children']

            print("SERP API parameters:")
            for key, value in params.items():
                if key != 'api_key':
                    print(f"  {key}: {value}")

            async with session.get('https://serpapi.com/search', params=params, timeout=30) as response:
                if response.status == 200:
                    flight_data = await response.json()

                    # Check if we have flight data
                    best_flights = flight_data.get('best_flights', [])
                    other_flights = flight_data.get('other_flights', [])
                    total_flights = len(best_flights) + len(other_flights)

                    print(f"✅ SERP API working! Found {total_flights} flights")
                    print(f"   Best flights: {len(best_flights)}")
                    print(f"   Other flights: {len(other_flights)}")

                    # Show sample flight from best flights
                    if best_flights:
                        sample_flight = best_flights[0]
                        price = sample_flight.get('price', 'N/A')

                        # Extract flight details
                        flights = sample_flight.get('flights', [])
                        if flights:
                            first_flight = flights[0]
                            airline = first_flight.get('airline', 'N/A')
                            flight_number = first_flight.get('flight_number', 'N/A')
                            departure_time = first_flight.get('departure_airport', {}).get('time', 'N/A')
                            arrival_time = first_flight.get('arrival_airport', {}).get('time', 'N/A')
                            duration = sample_flight.get('total_duration', 'N/A')
                            layovers = len(sample_flight.get('layovers', []))

                            print(f"📍 Sample flight details:")
                            print(f"   Flight: {flight_number}")
                            print(f"   Airline: {airline}")
                            print(f"   Price: ${price}")
                            print(f"   Departure: {departure_time}")
                            print(f"   Arrival: {arrival_time}")
                            print(f"   Duration: {duration}")
                            print(f"   Stops: {layovers}")

                            # Show booking options if available
                            booking_options = sample_flight.get('booking_options', [])
                            if booking_options:
                                print(f"   Booking options: {len(booking_options)} available")
                                print(f"   Primary booking: {booking_options[0].get('link', 'N/A')}")

                    # Show search metadata
                    search_metadata = flight_data.get('search_metadata', {})
                    if search_metadata:
                        print(f"🔍 Search info:")
                        print(f"   Status: {search_metadata.get('status', 'N/A')}")
                        print(f"   Processing time: {search_metadata.get('total_time_taken', 'N/A')}s")
                        print(f"   Google Flights URL: {search_metadata.get('google_flights_url', 'N/A')}")

                    return True
                else:
                    print(f"SERP API failed: {response.status}")
                    text = await response.text()
                    print(f"Response: {text}")
                    return False

    except Exception as e:
        print(f"Error: {e}")
        return False


if __name__ == "__main__":
    asyncio.run(test_gemini_serp_integration())