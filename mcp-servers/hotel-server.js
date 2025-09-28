import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { API_CONFIG, validateApiKeys } from './config.js';

const app = express();
const port = process.argv[2] || 3002;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', server: 'hotel-server' });
});

// MCP tool call endpoint
app.post('/call-tool', async (req, res) => {
    const { tool, parameters } = req.body;
    
    try {
        let result = {};
        
        switch (tool) {
            case 'search_hotels':
                result = await searchHotels(parameters);
                break;
            case 'get_hotel_details':
                result = await getHotelDetails(parameters);
                break;
            case 'check_availability':
                result = await checkAvailability(parameters);
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

async function searchHotels(params) {
    const { location, check_in, check_out, guests = 2, budget_range } = params;
    
    // Try Google Places API for hotels
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
                
                // Search for hotels using Places API
                const placesResponse = await axios.get(`${API_CONFIG.GOOGLE_PLACES.BASE_URL}/nearbysearch/json`, {
                    params: {
                        location: `${coords.lat},${coords.lng}`,
                        radius: 10000, // 10km radius
                        type: 'lodging',
                        key: API_CONFIG.GOOGLE_PLACES.API_KEY
                    }
                });
                
                if (placesResponse.data.results) {
                    const hotels = placesResponse.data.results.slice(0, 10).map((place, index) => ({
                        id: `HTL${String(index + 1).padStart(3, '0')}`,
                        name: place.name,
                        location: place.vicinity,
                        rating: place.rating || 0,
                        price_per_night: (place.price_level || 2) * 50, // Estimate based on price level
                        amenities: place.types.filter(type => 
                            !['establishment', 'point_of_interest', 'lodging'].includes(type)
                        ),
                        distance_to_center: 'Within 10km',
                        image_url: place.photos ? 
                            `${API_CONFIG.GOOGLE_PLACES.BASE_URL}/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${API_CONFIG.GOOGLE_PLACES.API_KEY}` 
                            : '/placeholder.jpg',
                        google_place_id: place.place_id,
                        review_count: place.user_ratings_total || 0,
                        open_now: place.opening_hours?.open_now
                    }));
                    
                    return {
                        hotels,
                        search_params: { location, check_in, check_out, guests, budget_range },
                        source: 'google_places_api'
                    };
                }
            }
        } catch (error) {
            console.error('Google Places API error:', error.message);
        }
    }
    
    // Fallback to mock hotel data
    console.log('Google Places API not available or failed - using mock data');
    return {
        hotels: [
            {
                id: 'HTL001',
                name: 'Grand Plaza Hotel',
                location,
                rating: 4.5,
                price_per_night: 180,
                amenities: ['Pool', 'Gym', 'WiFi', 'Restaurant', 'Spa'],
                distance_to_center: '0.5 km',
                image_url: '/placeholder.jpg'
            },
            {
                id: 'HTL002',
                name: 'City Center Inn',
                location,
                rating: 4.2,
                price_per_night: 120,
                amenities: ['WiFi', 'Restaurant', 'Business Center'],
                distance_to_center: '0.2 km',
                image_url: '/placeholder.jpg'
            }
        ],
        search_params: { location, check_in, check_out, guests, budget_range },
        source: 'mock_data'
    };
}

async function getHotelDetails(params) {
    const { hotel_id } = params;
    
    // Mock hotel details
    return {
        hotel: {
            id: hotel_id,
            name: 'Grand Plaza Hotel',
            description: 'A luxurious hotel in the heart of the city with modern amenities and exceptional service.',
            room_types: [
                { type: 'Standard Room', price: 180, capacity: 2 },
                { type: 'Deluxe Suite', price: 280, capacity: 4 },
                { type: 'Presidential Suite', price: 500, capacity: 6 }
            ],
            policies: {
                check_in: '3:00 PM',
                check_out: '11:00 AM',
                cancellation: 'Free cancellation up to 48 hours before check-in'
            },
            contact: {
                phone: '+1-555-0123',
                email: 'reservations@grandplaza.com'
            }
        }
    };
}

async function checkAvailability(params) {
    const { hotel_id, check_in, check_out, room_type } = params;
    
    // Mock availability check
    return {
        available: true,
        rooms_available: 5,
        total_price: 540, // 3 nights * 180
        includes: ['Breakfast', 'WiFi', 'Parking']
    };
}

app.listen(port, () => {
    console.log(`Hotel server running on port ${port}`);
});