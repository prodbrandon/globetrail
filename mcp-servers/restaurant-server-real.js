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
    
    // Try Yelp API first, fallback to mock data
    if (API_CONFIG.YELP.API_KEY) {
        try {
            const response = await axios.get(`${API_CONFIG.YELP.BASE_URL}/businesses/search`, {
                headers: { 'Authorization': `Bearer ${API_CONFIG.YELP.API_KEY}` },
                params: {
                    location: location,
                    categories: cuisine_type ? `restaurants,${cuisine_type}` : 'restaurants',
                    price: price_range,
                    limit: 20,
                    sort_by: 'rating'
                }
            });
            
            const restaurants = response.data.businesses.map((business, index) => ({
                id: `REST${String(index + 1).padStart(3, '0')}`,
                name: business.name,
                cuisine: business.categories.map(cat => cat.title).join(', '),
                location: business.location.display_address.join(', '),
                rating: business.rating,
                price_range: business.price || '$',
                specialties: business.categories.map(cat => cat.title),
                atmosphere: 'See reviews for details',
                average_meal_price: business.price ? business.price.length * 15 : 30,
                distance: business.distance ? `${(business.distance / 1000).toFixed(1)} km` : 'Distance not available',
                phone: business.phone,
                image_url: business.image_url,
                yelp_url: business.url,
                review_count: business.review_count
            }));
            
            return {
                restaurants,
                search_params: { location, cuisine_type, price_range, date, party_size },
                source: 'yelp_api'
            };
        } catch (error) {
            console.error('Yelp API error:', error.message);
        }
    }
    
    // Fallback to mock data
    console.log('Using mock restaurant data - configure Yelp API for real data');
    return {
        restaurants: [
            {
                id: 'REST001',
                name: 'The Golden Spoon',
                cuisine: cuisine_type || 'International',
                location,
                rating: 4.7,
                price_range: '$',
                specialties: ['Seafood', 'Steaks', 'Vegetarian Options'],
                atmosphere: 'Upscale Casual',
                average_meal_price: 45,
                distance: '0.3 km from city center'
            }
        ],
        search_params: { location, cuisine_type, price_range, date, party_size },
        source: 'mock_data'
    };
}

async function getRestaurantDetails(params) {
    const { restaurant_id } = params;
    
    // For Yelp integration, we could fetch business details
    if (API_CONFIG.YELP.API_KEY && restaurant_id.startsWith('REST')) {
        try {
            // In a real implementation, you'd store the Yelp business ID
            // For now, return enhanced mock data
            console.log('Enhanced restaurant details available with Yelp API');
        } catch (error) {
            console.error('Yelp API error:', error.message);
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
        }
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