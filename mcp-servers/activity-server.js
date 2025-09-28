import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { API_CONFIG } from './config.js';

const app = express();
const port = process.argv[2] || 3003;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', server: 'activity-server' });
});

// MCP tool call endpoint
app.post('/call-tool', async (req, res) => {
    const { tool, parameters } = req.body;
    
    try {
        let result = {};
        
        switch (tool) {
            case 'search_activities':
                result = await searchActivities(parameters);
                break;
            case 'get_activity_details':
                result = await getActivityDetails(parameters);
                break;
            case 'book_activity':
                result = await bookActivity(parameters);
                break;
            default:
                return res.status(400).json({ error: `Unknown tool: ${tool}` });
        }
        
        res.json(result);
    } catch (error) {
        console.error(`Error in ${tool}:`, error);
        res.status(500).json({ error: error.message });
    }
});

async function searchActivities(params) {
    const { location, date, category, budget_range } = params;
    
    // Try Google Places API for tourist attractions and activities
    if (API_CONFIG.GOOGLE_PLACES.API_KEY) {
        try {
            // First, get coordinates for the location
            const geocodeResponse = await axios.get(`${API_CONFIG.GOOGLE_MAPS.BASE_URL}/geocode/json`, {
                params: {
                    address: location,
                    key: API_CONFIG.GOOGLE_PLACES.API_KEY
                }
            });
            
            if (geocodeResponse.data.results.length > 0) {
                const coords = geocodeResponse.data.results[0].geometry.location;
                
                // Map category to Google Places types
                const typeMapping = {
                    'sightseeing': 'tourist_attraction',
                    'culture': 'museum',
                    'outdoor': 'park',
                    'entertainment': 'amusement_park',
                    'shopping': 'shopping_mall'
                };
                
                const placeType = typeMapping[category?.toLowerCase()] || 'tourist_attraction';
                
                // Search for activities using Places API
                const placesResponse = await axios.get(`${API_CONFIG.GOOGLE_PLACES.BASE_URL}/nearbysearch/json`, {
                    params: {
                        location: `${coords.lat},${coords.lng}`,
                        radius: 15000, // 15km radius
                        type: placeType,
                        key: API_CONFIG.GOOGLE_PLACES.API_KEY
                    }
                });
                
                if (placesResponse.data.results) {
                    const activities = placesResponse.data.results.slice(0, 10).map((place, index) => ({
                        id: `ACT${String(index + 1).padStart(3, '0')}`,
                        name: place.name,
                        category: category || 'Sightseeing',
                        location: place.vicinity,
                        duration: '2-4 hours', // Estimated
                        price: (place.price_level || 1) * 15, // Estimate based on price level
                        rating: place.rating || 0,
                        description: `Visit ${place.name} - a popular ${placeType.replace('_', ' ')} in ${location}`,
                        includes: ['Entry access', 'Self-guided exploration'],
                        image_url: place.photos ? 
                            `${API_CONFIG.GOOGLE_PLACES.BASE_URL}/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${API_CONFIG.GOOGLE_PLACES.API_KEY}` 
                            : '/placeholder.jpg',
                        google_place_id: place.place_id,
                        review_count: place.user_ratings_total || 0,
                        open_now: place.opening_hours?.open_now
                    }));
                    
                    return {
                        activities,
                        search_params: { location, date, category, budget_range },
                        source: 'google_places_api'
                    };
                }
            }
        } catch (error) {
            console.error('Google Places API error:', error.message);
        }
    }
    
    // Fallback to mock data if API fails
    console.log('Google Places API not available or failed - using mock data');
    return {
        activities: [
            {
                id: 'ACT001',
                name: `${location} City Walking Tour`,
                category: 'Sightseeing',
                location,
                duration: '3 hours',
                price: 25,
                rating: 4.6,
                description: `Explore the historic downtown area of ${location} with a knowledgeable local guide.`,
                includes: ['Professional guide', 'Historical insights', 'Photo opportunities']
            },
            {
                id: 'ACT002',
                name: `${location} Food & Culture Experience`,
                category: 'Culinary',
                location,
                duration: '2.5 hours',
                price: 65,
                rating: 4.8,
                description: `Sample local cuisine and learn about the culture of ${location}.`,
                includes: ['Food tastings', 'Cultural insights', 'Local guide']
            }
        ],
        search_params: { location, date, category, budget_range },
        source: 'mock_data'
    };
}

async function getActivityDetails(params) {
    const { activity_id } = params;
    
    // Try to get details from Google Places if it's a Google Place ID
    if (API_CONFIG.GOOGLE_PLACES.API_KEY && activity_id.includes('google_')) {
        try {
            const placeId = activity_id.replace('google_', '');
            const response = await axios.get(`${API_CONFIG.GOOGLE_PLACES.BASE_URL}/details/json`, {
                params: {
                    place_id: placeId,
                    fields: 'name,formatted_address,formatted_phone_number,website,opening_hours,reviews,photos,rating,user_ratings_total',
                    key: API_CONFIG.GOOGLE_PLACES.API_KEY
                }
            });
            
            if (response.data.result) {
                const place = response.data.result;
                return {
                    activity: {
                        id: activity_id,
                        name: place.name,
                        full_description: place.reviews?.[0]?.text || `Visit ${place.name}, a popular attraction with ${place.user_ratings_total || 0} reviews and a ${place.rating || 'N/A'} star rating.`,
                        address: place.formatted_address,
                        phone: place.formatted_phone_number,
                        website: place.website,
                        hours: place.opening_hours?.weekday_text || [],
                        reviews: place.reviews?.slice(0, 3) || [],
                        rating: place.rating,
                        review_count: place.user_ratings_total
                    },
                    source: 'google_places_api'
                };
            }
        } catch (error) {
            console.error('Google Places API error:', error.message);
        }
    }
    
    // Fallback to mock data
    return {
        activity: {
            id: activity_id,
            name: 'City Walking Tour',
            full_description: 'Join us for an immersive 3-hour walking tour through the historic heart of the city. Our expert local guides will share fascinating stories, hidden gems, and insider knowledge about the areas rich history and vibrant culture.',
            schedule: [
                { time: '9:00 AM', activity: 'Meet at central square' },
                { time: '9:15 AM', activity: 'Historic district exploration' },
                { time: '10:30 AM', activity: 'Local market visit' },
                { time: '11:45 AM', activity: 'Scenic viewpoint stop' },
                { time: '12:00 PM', activity: 'Tour conclusion' }
            ],
            requirements: ['Comfortable walking shoes', 'Weather-appropriate clothing'],
            meeting_point: 'Central Square Fountain',
            cancellation_policy: 'Free cancellation up to 24 hours before start time',
            group_size: 'Maximum 15 people'
        },
        source: 'mock_data'
    };
}

async function bookActivity(params) {
    const { activity_id, date, participants, contact_info } = params;
    
    // Mock booking confirmation
    return {
        booking: {
            confirmation_id: 'BK' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            activity_id,
            date,
            participants,
            total_price: participants * 25,
            status: 'confirmed',
            payment_status: 'pending',
            instructions: 'Please arrive 15 minutes before the scheduled start time at the meeting point.'
        }
    };
}

app.listen(port, () => {
    console.log(`Activity server running on port ${port}`);
});