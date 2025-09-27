import express from 'express';
import cors from 'cors';

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
    
    // Mock hotel search results
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
            },
            {
                id: 'HTL003',
                name: 'Luxury Resort & Spa',
                location,
                rating: 4.8,
                price_per_night: 350,
                amenities: ['Pool', 'Spa', 'Beach Access', 'Multiple Restaurants', 'Golf Course'],
                distance_to_center: '5 km',
                image_url: '/placeholder.jpg'
            }
        ],
        search_params: { location, check_in, check_out, guests, budget_range }
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