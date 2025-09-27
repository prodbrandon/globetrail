import express from 'express';
import cors from 'cors';

const app = express();
const port = process.argv[2] || 3001;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', server: 'flight-server' });
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
            case 'get_flight_details':
                result = await getFlightDetails(parameters);
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
    const { origin, destination, departure_date, return_date, passengers = 1 } = params;
    
    // Mock flight search results
    return {
        flights: [
            {
                id: 'FL001',
                airline: 'SkyLine Airways',
                origin,
                destination,
                departure_time: '08:30',
                arrival_time: '12:45',
                price: 299,
                duration: '4h 15m',
                stops: 0
            },
            {
                id: 'FL002',
                airline: 'Global Wings',
                origin,
                destination,
                departure_time: '14:20',
                arrival_time: '18:50',
                price: 249,
                duration: '4h 30m',
                stops: 1
            },
            {
                id: 'FL003',
                airline: 'Premium Air',
                origin,
                destination,
                departure_time: '19:15',
                arrival_time: '23:30',
                price: 399,
                duration: '4h 15m',
                stops: 0
            }
        ],
        search_params: { origin, destination, departure_date, return_date, passengers }
    };
}

async function getFlightDetails(params) {
    const { flight_id } = params;
    
    // Mock flight details
    return {
        flight: {
            id: flight_id,
            airline: 'SkyLine Airways',
            aircraft: 'Boeing 737-800',
            amenities: ['WiFi', 'In-flight entertainment', 'Meals included'],
            baggage: {
                carry_on: 'Included',
                checked: '1 bag included'
            },
            seat_map: 'Available for selection',
            cancellation_policy: 'Free cancellation up to 24 hours before departure'
        }
    };
}

app.listen(port, () => {
    console.log(`Flight server running on port ${port}`);
});