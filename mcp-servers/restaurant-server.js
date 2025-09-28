import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { API_CONFIG, validateApiKeys } from './config.js';

const app = express();
const port = process.argv[2] || 3004;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', server: 'restaurant-server' });
});

// MCP tool call endpoint
app.post('/call-tool', async (req, res) => {
    const { tool, parameters } = req.body;
    
    try {
        let result = {};
        
        switch (tool) {
            case 'search_restaurants':
                result = await searchRestaurants(parameters);
                break;
            case 'get_restaurant_details':
                result = await getRestaurantDetails(parameters);
                break;
            case 'make_reservation':
                result = await makeReservation(parameters);
                break;
            case 'get_menu':
                result = await getMenu(parameters);
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

async function searchRestaurants(params) {
    const { location, cuisine_type, price_range, date, party_size } = params;
    
    // Try Google Places API first, fallback to mock data
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
                
                // Search for restaurants using Places API
                let query = 'restaurant';
                if (cuisine_type) {
                    query = `${cuisine_type} restaurant`;
                }
                
                const placesResponse = await axios.get(`${API_CONFIG.GOOGLE_PLACES.BASE_URL}/nearbysearch/json`, {
                    params: {
                        location: `${coords.lat},${coords.lng}`,
                        radius: 5000, // 5km radius
                        type: 'restaurant',
                        keyword: cuisine_type || '',
                        key: API_CONFIG.GOOGLE_PLACES.API_KEY
                    }
                });
                
                if (placesResponse.data.results) {
                    const restaurants = placesResponse.data.results.slice(0, 10).map((place, index) => ({
                        id: `REST${String(index + 1).padStart(3, '0')}`,
                        name: place.name,
                        cuisine: place.types.filter(type => 
                            !['establishment', 'point_of_interest', 'food', 'restaurant'].includes(type)
                        ).join(', ') || 'Restaurant',
                        location: place.vicinity,
                        rating: place.rating || 0,
                        price_range: '$'.repeat(place.price_level || 1),
                        specialties: place.types.filter(type => 
                            !['establishment', 'point_of_interest'].includes(type)
                        ),
                        atmosphere: 'See Google reviews for details',
                        average_meal_price: (place.price_level || 1) * 20,
                        distance: 'Within 5km',
                        phone: place.formatted_phone_number || 'Not available',
                        image_url: place.photos ? 
                            `${API_CONFIG.GOOGLE_PLACES.BASE_URL}/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${API_CONFIG.GOOGLE_PLACES.API_KEY}` 
                            : '/placeholder.jpg',
                        google_place_id: place.place_id,
                        review_count: place.user_ratings_total || 0,
                        open_now: place.opening_hours?.open_now
                    }));
                    
                    return {
                        restaurants,
                        search_params: { location, cuisine_type, price_range, date, party_size },
                        source: 'google_places_api'
                    };
                }
            }
        } catch (error) {
            console.error('Google Places API error:', error.message);
        }
    }
    
    // Fallback to mock data
    console.log('Using mock restaurant data - configure Google Places API for real data');
    return {
        restaurants: [
            {
                id: 'REST001',
                name: 'The Golden Spoon',
                cuisine: cuisine_type || 'International',
                location,
                rating: 4.7,
                price_range: '$$$',
                specialties: ['Seafood', 'Steaks', 'Vegetarian Options'],
                atmosphere: 'Upscale Casual',
                average_meal_price: 45,
                distance: '0.3 km from city center'
            },
            {
                id: 'REST002',
                name: 'Local Flavors Bistro',
                cuisine: 'Local Cuisine',
                location,
                rating: 4.5,
                price_range: '$$',
                specialties: ['Traditional Dishes', 'Farm-to-Table', 'Craft Cocktails'],
                atmosphere: 'Cozy & Intimate',
                average_meal_price: 28,
                distance: '0.8 km from city center'
            }
        ],
        search_params: { location, cuisine_type, price_range, date, party_size },
        source: 'mock_data'
    };
}

async function getRestaurantDetails(params) {
    const { restaurant_id } = params;
    
    // For Google Places integration, we could fetch place details
    if (API_CONFIG.GOOGLE_PLACES.API_KEY && restaurant_id.includes('google_')) {
        try {
            const placeId = restaurant_id.replace('google_', '');
            const response = await axios.get(`${API_CONFIG.GOOGLE_PLACES.BASE_URL}/details/json`, {
                params: {
                    place_id: placeId,
                    fields: 'name,formatted_address,formatted_phone_number,website,opening_hours,reviews,photos',
                    key: API_CONFIG.GOOGLE_PLACES.API_KEY
                }
            });
            
            if (response.data.result) {
                const place = response.data.result;
                return {
                    restaurant: {
                        id: restaurant_id,
                        name: place.name,
                        description: place.reviews?.[0]?.text || 'No description available',
                        address: place.formatted_address,
                        phone: place.formatted_phone_number,
                        website: place.website,
                        hours: place.opening_hours?.weekday_text || {},
                        reviews: place.reviews?.slice(0, 3) || []
                    },
                    source: 'google_places_api'
                };
            }
        } catch (error) {
            console.error('Google Places API error:', error.message);
        }
    }
    
    return {
        restaurant: {
            id: restaurant_id,
            name: 'The Golden Spoon',
            description: 'An elegant dining experience featuring fresh, locally-sourced ingredients.',
            hours: {
                monday: '5:00 PM - 10:00 PM',
                tuesday: '5:00 PM - 10:00 PM',
                wednesday: '5:00 PM - 10:00 PM',
                thursday: '5:00 PM - 10:00 PM',
                friday: '5:00 PM - 11:00 PM',
                saturday: '4:00 PM - 11:00 PM',
                sunday: '4:00 PM - 9:00 PM'
            },
            contact: {
                phone: '+1-555-0456',
                email: 'reservations@goldenspoon.com'
            }
        },
        source: 'mock_data'
    };
}

async function makeReservation(params) {
    const { restaurant_id, date, time, party_size, special_requests } = params;
    
    return {
        reservation: {
            confirmation_id: 'RES' + Math.random().toString(36).substring(2, 9).toUpperCase(),
            restaurant_id,
            date,
            time,
            party_size,
            status: 'confirmed',
            special_requests: special_requests || 'None'
        }
    };
}

async function getMenu(params) {
    const { restaurant_id, meal_type = 'dinner' } = params;
    
    return {
        menu: {
            restaurant_id,
            meal_type,
            sections: [
                {
                    name: 'Appetizers',
                    items: [
                        { name: 'Truffle Arancini', price: 14, description: 'Crispy risotto balls' },
                        { name: 'Seared Scallops', price: 18, description: 'Pan-seared with cauliflower puree' }
                    ]
                }
            ]
        }
    };
}

app.listen(port, () => {
    console.log(`Restaurant server running on port ${port}`);
});