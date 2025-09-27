import express from 'express';
import cors from 'cors';

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
    
    // Mock restaurant search results
    return {
        restaurants: [
            {
                id: 'REST001',
                name: 'The Golden Spoon',
                cuisine: cuisine_type || 'International',
                location,
                rating: 4.7,
                price_range: '$$',
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
                price_range: '$',
                specialties: ['Traditional Dishes', 'Farm-to-Table', 'Craft Cocktails'],
                atmosphere: 'Cozy & Intimate',
                average_meal_price: 28,
                distance: '0.8 km from city center'
            },
            {
                id: 'REST003',
                name: 'Rooftop Garden Restaurant',
                cuisine: 'Modern Fusion',
                location,
                rating: 4.8,
                price_range: '$$$',
                specialties: ['Fusion Cuisine', 'Craft Cocktails', 'City Views'],
                atmosphere: 'Trendy & Sophisticated',
                average_meal_price: 65,
                distance: '1.2 km from city center'
            }
        ],
        search_params: { location, cuisine_type, price_range, date, party_size }
    };
}

async function getRestaurantDetails(params) {
    const { restaurant_id } = params;
    
    // Mock restaurant details
    return {
        restaurant: {
            id: restaurant_id,
            name: 'The Golden Spoon',
            description: 'An elegant dining experience featuring fresh, locally-sourced ingredients and innovative culinary techniques.',
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
                email: 'reservations@goldenspoon.com',
                website: 'www.goldenspoon.com'
            },
            amenities: ['Outdoor Seating', 'Full Bar', 'Private Dining', 'Valet Parking'],
            dress_code: 'Smart Casual',
            reservation_policy: 'Reservations recommended, walk-ins welcome based on availability'
        }
    };
}

async function makeReservation(params) {
    const { restaurant_id, date, time, party_size, contact_info, special_requests } = params;
    
    // Mock reservation confirmation
    return {
        reservation: {
            confirmation_id: 'RES' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            restaurant_id,
            date,
            time,
            party_size,
            status: 'confirmed',
            special_requests: special_requests || 'None',
            cancellation_policy: 'Free cancellation up to 2 hours before reservation time',
            reminder: 'We will send a confirmation email and SMS reminder 2 hours before your reservation.'
        }
    };
}

async function getMenu(params) {
    const { restaurant_id, meal_type = 'dinner' } = params;
    
    // Mock menu
    return {
        menu: {
            restaurant_id,
            meal_type,
            sections: [
                {
                    name: 'Appetizers',
                    items: [
                        { name: 'Truffle Arancini', price: 14, description: 'Crispy risotto balls with truffle oil and parmesan' },
                        { name: 'Seared Scallops', price: 18, description: 'Pan-seared scallops with cauliflower puree' },
                        { name: 'Charcuterie Board', price: 22, description: 'Selection of artisanal meats and cheeses' }
                    ]
                },
                {
                    name: 'Main Courses',
                    items: [
                        { name: 'Grilled Salmon', price: 28, description: 'Atlantic salmon with seasonal vegetables' },
                        { name: 'Ribeye Steak', price: 42, description: '12oz ribeye with garlic mashed potatoes' },
                        { name: 'Vegetarian Pasta', price: 24, description: 'House-made pasta with seasonal vegetables' }
                    ]
                },
                {
                    name: 'Desserts',
                    items: [
                        { name: 'Chocolate Lava Cake', price: 12, description: 'Warm chocolate cake with vanilla ice cream' },
                        { name: 'Tiramisu', price: 10, description: 'Classic Italian dessert with espresso' }
                    ]
                }
            ]
        }
    };
}

app.listen(port, () => {
    console.log(`Restaurant server running on port ${port}`);
});