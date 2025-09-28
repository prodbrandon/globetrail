# Quick Setup Guide - Amadeus + Google Places

## 🎯 Your Perfect API Combo

You have the two most powerful travel APIs:
- **Amadeus**: Real flight data (prices, schedules, airlines)
- **Google Places**: Everything else (restaurants, hotels, activities, routes)

## ⚡ 5-Minute Setup

### 1. Copy Environment File
```bash
cp .env.example .env
```

### 2. Add Your API Keys to `.env`
```bash
# Your Amadeus credentials
AMADEUS_CLIENT_ID=your_amadeus_client_id
AMADEUS_CLIENT_SECRET=your_amadeus_client_secret

# Your Google Places API key (works for everything Google)
GOOGLE_PLACES_API_KEY=your_google_places_api_key
```

### 3. Test Your Setup
```bash
npm test
```

### 4. Start All Servers
```bash
npm run start:all
```

## 🔧 Google Places API Setup

If you need to enable additional APIs in Google Cloud Console:

1. **Go to**: https://console.cloud.google.com/apis/library
2. **Enable these APIs**:
   - ✅ Places API (restaurants, hotels, activities)
   - ✅ Maps JavaScript API (photos, details)
   - ✅ Geocoding API (address → coordinates)
   - ✅ Directions API (route optimization)

**One API key works for all of these!**

## 🧪 Test Your Integration

### Test Flight Search (Amadeus)
```bash
curl -X POST http://localhost:3001/call-tool \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "search_flights",
    "parameters": {
      "origin": "NYC",
      "destination": "LAX",
      "departure_date": "2024-12-01"
    }
  }'
```

### Test Restaurant Search (Google Places)
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

### Test Route Optimization (Google Maps)
```bash
curl -X POST http://localhost:3005/call-tool \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "optimize_route",
    "parameters": {
      "locations": ["Times Square, NYC", "Central Park, NYC", "Brooklyn Bridge, NYC"]
    }
  }'
```

## 📊 What You Get

### With Amadeus ✈️
- **Real flight prices** (not estimates)
- **Live availability** and schedules
- **Actual airlines** and aircraft types
- **Current routes** and connections

### With Google Places 🗺️
- **Real restaurants** with photos and reviews
- **Actual hotels** with ratings and amenities  
- **Tourist attractions** with opening hours
- **Accurate routes** with real travel times
- **Live business info** (phone, website, hours)

## 💰 Cost Management

### Free Tier Limits
- **Amadeus**: 2,000 calls/month
- **Google Places**: $200 credit/month (~40,000 requests)

### Usage Tips
- Cache responses when possible
- Use mock data for development
- Monitor usage in dashboards
- Set billing alerts

## 🚀 What's Different Now

### Before (Mock Data)
```json
{
  "restaurants": [{"name": "Generic Restaurant", "rating": 4.5}],
  "source": "mock_data"
}
```

### After (Real APIs)
```json
{
  "restaurants": [
    {
      "name": "Joe's Pizza", 
      "rating": 4.2,
      "review_count": 1247,
      "phone": "+1-212-555-0123",
      "image_url": "https://maps.googleapis.com/...",
      "open_now": true
    }
  ],
  "source": "google_places_api"
}
```

## ✅ Success Indicators

When everything is working, you'll see:
- ✅ `source: "amadeus_api"` for flight data
- ✅ `source: "google_places_api"` for restaurants/hotels/activities
- ✅ Real business names, ratings, and photos
- ✅ Accurate travel times and distances

## 🆘 Troubleshooting

**"Using mock data" in logs**
- Normal when API keys aren't configured
- Add keys to `.env` to enable real data

**Google Places quota exceeded**
- Check usage in Google Cloud Console
- Servers automatically fall back to mock data

**Amadeus authentication failed**
- Verify CLIENT_ID and CLIENT_SECRET
- Check if using test vs production endpoints

## 🎉 You're All Set!

Your travel chatbot now has access to:
- Real flight prices from Amadeus
- Live restaurant/hotel data from Google Places  
- Accurate route optimization
- Professional-grade travel recommendations

Perfect combo for a production travel app! 🚀