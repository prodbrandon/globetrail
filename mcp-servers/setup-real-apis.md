# MCP Servers - Real API Integration Setup

## Overview
Your MCP servers have been upgraded to use real APIs while maintaining fallback to mock data. This gives you production-ready travel data with graceful degradation.

## Quick Start

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Get your API keys** (see sections below)

3. **Update your .env file** with real API keys

4. **Test the servers:**
   ```bash
   npm start
   ```

## API Providers & Setup

### 1. Amadeus API (Flights) ✈️
- **Free Tier:** 2,000 calls/month
- **Sign up:** https://developers.amadeus.com/
- **What you get:** Real flight search, prices, schedules
- **Keys needed:** `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET`

### 2. Yelp Fusion API (Restaurants) 🍽️
- **Free Tier:** 5,000 calls/day
- **Sign up:** https://www.yelp.com/developers/v3/manage_app
- **What you get:** Restaurant search, ratings, reviews, photos
- **Keys needed:** `YELP_API_KEY`

### 3. Google Maps API (Route Optimization) 🗺️
- **Free Tier:** $200 credit/month
- **Setup:** https://console.cloud.google.com/apis/library
- **Enable:** Geocoding API, Directions API
- **What you get:** Real route optimization, travel times, distances
- **Keys needed:** `GOOGLE_MAPS_API_KEY`

### 4. Hotel APIs (Coming Soon) 🏨
Options being evaluated:
- Booking.com API (via RapidAPI)
- Hotels.com API
- Expedia API

### 5. Activity APIs (Coming Soon) 🎯
Options being evaluated:
- GetYourGuide API
- Viator API
- TripAdvisor API

## Features

### Smart Fallback System
- **Real API available:** Uses live data
- **API unavailable:** Falls back to mock data
- **Rate limit hit:** Graceful degradation
- **No interruption:** Always returns results

### Enhanced Data Quality
- **Flights:** Real prices, schedules, airlines
- **Restaurants:** Actual ratings, reviews, photos
- **Routes:** Accurate travel times and distances
- **Activities:** Live availability and pricing

## Testing Your Setup

### Test Flight Search
```bash
curl -X POST http://localhost:3001/call-tool \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "search_flights",
    "parameters": {
      "origin": "NYC",
      "destination": "LAX", 
      "departure_date": "2024-12-01",
      "passengers": 1
    }
  }'
```

### Test Restaurant Search  
```bash
curl -X POST http://localhost:3004/call-tool \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "search_restaurants",
    "parameters": {
      "location": "New York, NY",
      "cuisine_type": "italian"
    }
  }'
```

### Test Route Optimization
```bash
curl -X POST http://localhost:3005/call-tool \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "optimize_route", 
    "parameters": {
      "locations": ["Times Square, NYC", "Central Park, NYC", "Brooklyn Bridge, NYC"],
      "start_point": "Times Square, NYC"
    }
  }'
```

## Response Format Changes

### New Fields Added
- `source`: Indicates data source (`"amadeus_api"`, `"yelp_api"`, `"mock_data"`)
- Enhanced location data with real addresses
- Actual travel times and distances
- Live pricing and availability

### Backward Compatibility
- All existing fields maintained
- Mock data structure unchanged
- No breaking changes to your frontend

## Cost Management

### Free Tier Limits
- **Amadeus:** 2,000 calls/month
- **Yelp:** 5,000 calls/day  
- **Google Maps:** $200 credit/month

### Optimization Tips
- Cache responses when possible
- Use mock data for development
- Monitor usage in API dashboards
- Implement request throttling

## Next Steps

1. **Start with Yelp API** - Easiest to set up, immediate results
2. **Add Google Maps** - Enhances route optimization significantly  
3. **Configure Amadeus** - Real flight data transforms the experience
4. **Monitor usage** - Set up alerts for API limits
5. **Add hotel/activity APIs** - Complete the real data integration

## Support

Check the console logs for:
- API connection status
- Fallback notifications  
- Error messages
- Usage statistics

The servers will always work - with or without API keys!