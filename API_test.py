#!/usr/bin/env python3
"""
Quick API Test Script
Tests SERP API (Google Flights), Google Places, and Gemini APIs
Run: python test_apis.py
"""

import os
import asyncio
import aiohttp
import json
from dotenv import load_dotenv
import google.generativeai as genai
from datetime import datetime, timedelta

# Load environment variables
load_dotenv()

print("🧪 API Test Script Starting...")
print("=" * 50)


# ================================
# Test Gemini API
# ================================

async def test_gemini():
    print("\n1️⃣ Testing Gemini API...")

    try:
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            print("❌ GEMINI_API_KEY not found in .env")
            return False

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')

        # Test generation
        response = await asyncio.to_thread(
            model.generate_content,
            "Extract travel info from: 'Plan me a trip from Los Angeles to Tokyo for $2000'. Return JSON with destination, budget, departure_city."
        )

        print("✅ Gemini API working!")
        print(f"📝 Response: {response.text[:200]}...")
        return True

    except Exception as e:
        print(f"❌ Gemini API failed: {str(e)}")
        return False


# ================================
# Test SERP API (Google Flights)
# ================================

async def test_serp_api():
    print("\n2️⃣ Testing SERP API (Google Flights)...")

    try:
        api_key = os.getenv('SERP_API_KEY')
        if not api_key:
            print("❌ SERP_API_KEY not found in .env")
            return False

        # Use a future date (30 days from now)
        future_date = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
        print(f"🗓️ Using departure date: {future_date}")

        async with aiohttp.ClientSession() as session:
            print("✈️ Testing flight search...")

            # SERP API parameters for Google Flights
            params = {
                'api_key': api_key,
                'engine': 'google_flights',
                'departure_id': 'LAX',  # Los Angeles
                'arrival_id': 'NRT',  # Tokyo Narita
                'outbound_date': future_date,
                'type': '2',  # One-way trip (1=round-trip, 2=one-way)
                'adults': 1,
                'currency': 'USD',
                'hl': 'en'
            }

            async with session.get(
                    'https://serpapi.com/search',
                    params=params,
                    timeout=20
            ) as response:

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
                    print(f"❌ SERP API request failed: {response.status}")
                    text = await response.text()
                    print(f"Response: {text}")
                    return False

    except Exception as e:
        print(f"❌ SERP API failed: {str(e)}")
        return False


# ================================
# Test Google Places API
# ================================

async def test_google_places():
    print("\n3️⃣ Testing Google Places API...")

    try:
        api_key = os.getenv('GOOGLE_PLACES_API_KEY')
        if not api_key:
            print("❌ GOOGLE_PLACES_API_KEY not found in .env")
            return False

        async with aiohttp.ClientSession() as session:
            # Step 1: Geocode a location
            print("🗺️ Testing geocoding...")

            geocode_params = {
                'address': 'Tokyo, Japan',
                'key': api_key
            }

            async with session.get(
                    'https://maps.googleapis.com/maps/api/geocode/json',
                    params=geocode_params
            ) as response:

                if response.status != 200:
                    print(f"❌ Geocoding failed: {response.status}")
                    return False

                geocode_data = await response.json()

                if geocode_data['status'] != 'OK':
                    print(f"❌ Geocoding error: {geocode_data['status']}")
                    return False

                location = geocode_data['results'][0]['geometry']['location']
                print(f"✅ Geocoding working! Tokyo coordinates: {location['lat']}, {location['lng']}")

            # Step 2: Search for places
            print("🏛️ Testing places search...")

            places_params = {
                'location': f"{location['lat']},{location['lng']}",
                'radius': 5000,
                'type': 'tourist_attraction',
                'key': api_key
            }

            async with session.get(
                    'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
                    params=places_params
            ) as response:

                if response.status == 200:
                    places_data = await response.json()
                    places = places_data.get('results', [])
                    print(f"✅ Google Places API working! Found {len(places)} attractions")

                    if places:
                        first_place = places[0]
                        name = first_place['name']
                        rating = first_place.get('rating', 'N/A')
                        price_level = first_place.get('price_level', 'N/A')
                        types = first_place.get('types', [])

                        print(f"📍 Sample attraction: {name}")
                        print(f"   Rating: {rating}")
                        print(f"   Price level: {price_level}")
                        print(f"   Types: {', '.join(types[:3])}")

                    return True
                else:
                    print(f"❌ Places search failed: {response.status}")
                    text = await response.text()
                    print(f"Response: {text}")
                    return False

    except Exception as e:
        print(f"❌ Google Places API failed: {str(e)}")
        return False


# ================================
# Environment Check
# ================================

def check_environment():
    print("\n🔍 Checking environment variables...")

    required_vars = [
        'GEMINI_API_KEY',
        'SERP_API_KEY',
        'GOOGLE_PLACES_API_KEY'
    ]

    missing = []
    for var in required_vars:
        value = os.getenv(var)
        if value:
            # Show first 10 characters only
            masked = value[:10] + "..." if len(value) > 10 else value
            print(f"✅ {var}: {masked}")
        else:
            print(f"❌ {var}: Missing")
            missing.append(var)

    # Optional variables
    optional_vars = [
        'GOOGLE_MAPS_API_KEY',
        'OPENWEATHER_API_KEY'
    ]

    print("\n🔍 Optional environment variables:")
    for var in optional_vars:
        value = os.getenv(var)
        if value:
            masked = value[:10] + "..." if len(value) > 10 else value
            print(f"⭐ {var}: {masked}")
        else:
            print(f"⚪ {var}: Not set (optional)")

    if missing:
        print(f"\n❌ Missing required variables: {', '.join(missing)}")
        print("Add them to your .env file!")
        print("\n📝 Quick setup:")
        print("   GEMINI_API_KEY     → https://ai.google.dev/")
        print("   SERP_API_KEY       → https://serpapi.com/ (100 free searches)")
        print("   GOOGLE_PLACES_API_KEY → https://console.cloud.google.com/")
        return False

    return True


# ================================
# Main Test Function
# ================================

async def main():
    print("🧪 API Connectivity Test")
    print("=" * 50)

    # Check environment first
    if not check_environment():
        return

    # Test each API
    results = {}

    results['gemini'] = await test_gemini()
    results['serp_api'] = await test_serp_api()
    results['google_places'] = await test_google_places()

    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 50)

    api_names = {
        'gemini': 'GEMINI AI',
        'serp_api': 'SERP API (Google Flights)',
        'google_places': 'GOOGLE PLACES'
    }

    for api, success in results.items():
        status = "✅ WORKING" if success else "❌ FAILED"
        name = api_names.get(api, api.upper())
        print(f"{name:<25}: {status}")

    working_count = sum(results.values())
    total_count = len(results)

    print(f"\n🎯 {working_count}/{total_count} APIs working")

    if working_count == total_count:
        print("🚀 All APIs ready for hackathon!")
        print("💰 SERP API gives you REAL flight prices!")
    elif working_count >= 2:
        print("⚠️ Some APIs working - you can start development")
    else:
        print("🔧 Fix API keys before continuing")

    print("\n✅ Test complete!")


# ================================
# Quick Individual Tests
# ================================

async def quick_serp_test():
    """Just test SERP API quickly"""
    print("✈️ Quick SERP API test...")
    try:
        api_key = os.getenv('SERP_API_KEY')
        if not api_key:
            print("❌ SERP_API_KEY not found")
            return False

        async with aiohttp.ClientSession() as session:
            params = {
                'api_key': api_key,
                'engine': 'google_flights',
                'departure_id': 'LAX',
                'arrival_id': 'JFK',
                'outbound_date': '2024-12-15',
                'adults': 1
            }

            async with session.get('https://serpapi.com/search', params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    flights = data.get('best_flights', [])
                    print(f"✅ SERP API: Found {len(flights)} flights")
                    if flights:
                        print(f"💰 Sample price: ${flights[0].get('price', 'N/A')}")
                    return True
                else:
                    print(f"❌ SERP API failed: {response.status}")
                    return False
    except Exception as e:
        print(f"❌ SERP API error: {e}")
        return False


if __name__ == "__main__":
    # Uncomment for quick tests:
    # asyncio.run(quick_serp_test())

    # Full test suite:
    asyncio.run(main())