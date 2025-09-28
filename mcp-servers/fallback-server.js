import express from 'express';
import cors from 'cors';

const app = express();
const port = process.argv[2] || 3007;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', server: 'fallback-server' });
});

// MCP tool call endpoint
app.post('/call-tool', async (req, res) => {
    const { tool, parameters } = req.body;
    
    try {
        let result = {};
        
        switch (tool) {
            case 'search_flights':
                result = await searchFlights(parameters);
                break;
            case 'search_hotels':
                result = await searchHotels(parameters);
                break;
            case 'search_activities':
                result = await searchActivities(parameters);
                break;
            case 'optimize_route':
                result = await optimizeRoute(parameters);
                break;
            case 'get_travel_tips':
                result = await getTravelTips(parameters);
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

async function searchFlights(params) {
    const { origin, destination, departure_date, passengers = 1 } = params;
    
    return {
        flights: [
            {
                id: 'FB001',
                airline: 'Budget Airways',
                origin,
                destination,
                departure_time: '09:00',
                arrival_time: '13:30',
                price: 299,
                duration: '4h 30m',
                stops: 0,
                booking_class: 'Economy'
            },
            {
                id: 'FB002',
                airline: 'Express Airlines',
                origin,
                destination,
                departure_time: '15:45',
                arrival_time: '20:15',
                price: 249,
                duration: '4h 30m',
                stops: 1,
                booking_class: 'Economy'
            }
        ],
        search_params: { origin, destination, departure_date, passengers },
        source: 'fallback_data',
        note: 'Basic flight information - configure Amadeus API for real-time data'
    };
}

async function searchHotels(params) {
    const { location, check_in, check_out, guests = 2 } = params;
    
    return {
        hotels: [
            {
                id: 'FH001',
                name: `${location} Central Hotel`,
                location,
                rating: 4.2,
                price_per_night: 150,
                amenities: ['WiFi', 'Breakfast', 'Gym'],
                distance_to_center: '0.5 km'
            },
            {
                id: 'FH002',
                name: `Budget Inn ${location}`,
                location,
                rating: 3.8,
                price_per_night: 89,
                amenities: ['WiFi', 'Parking'],
                distance_to_center: '2 km'
            }
        ],
        search_params: { location, check_in, check_out, guests },
        source: 'fallback_data',
        note: 'Basic hotel information - configure Google Places API for real data'
    };
}

async function searchActivities(params) {
    const { location, category = 'sightseeing' } = params;
    
    return {
        activities: [
            {
                id: 'FA001',
                name: `${location} City Tour`,
                category: 'Sightseeing',
                location,
                duration: '3 hours',
                price: 35,
                rating: 4.5,
                description: `Explore the highlights of ${location} with a guided tour.`
            },
            {
                id: 'FA002',
                name: `${location} Food Experience`,
                category: 'Culinary',
                location,
                duration: '2 hours',
                price: 55,
                rating: 4.7,
                description: `Taste the local cuisine of ${location}.`
            }
        ],
        search_params: { location, category },
        source: 'fallback_data',
        note: 'Basic activity information - configure Google Places API for real data'
    };
}

async function optimizeRoute(params) {
    const { locations = [] } = params;
    
    return {
        optimized_route: locations.map((location, index) => ({
            order: index + 1,
            location,
            travel_time: index === 0 ? '0 min' : '15 min',
            method: 'Walking'
        })),
        total_travel_time: `${(locations.length - 1) * 15} minutes`,
        source: 'fallback_data',
        note: 'Basic route optimization - configure Google Maps API for real routing'
    };
}

async function getTravelTips(params) {
    const { destination } = params;
    
    return {
        tips: [
            {
                category: 'Transportation',
                tip: `Research public transportation options in ${destination} before arrival.`
            },
            {
                category: 'Currency',
                tip: `Check current exchange rates and payment methods accepted in ${destination}.`
            },
            {
                category: 'Culture',
                tip: `Learn about local customs and etiquette in ${destination}.`
            },
            {
                category: 'Safety',
                tip: `Keep copies of important documents and emergency contacts for ${destination}.`
            }
        ],
        destination,
        source: 'fallback_data',
        note: 'General travel tips - configure SERP API for current information'
    };
}

app.listen(port, () => {
    console.log(`Fallback server running on port ${port}`);
});