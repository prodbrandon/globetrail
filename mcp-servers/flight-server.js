import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { API_CONFIG, validateApiKeys } from './config.js';

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

// Helper function to search flights using SERP API
async function searchFlightsWithSERP(origin, destination, departureDate, returnDate) {
    if (!API_CONFIG.SERP.API_KEY) {
        return null;
    }
    
    try {
        const searchQuery = `flights from ${origin} to ${destination} ${departureDate}`;
        const response = await axios.get(API_CONFIG.SERP.BASE_URL, {
            params: {
                engine: 'google_flights',
                departure_id: origin,
                arrival_id: destination,
                outbound_date: departureDate,
                return_date: returnDate,
                currency: 'USD',
                hl: 'en',
                api_key: API_CONFIG.SERP.API_KEY
            }
        });
        
        if (response.data.best_flights || response.data.other_flights) {
            const allFlights = [
                ...(response.data.best_flights || []),
                ...(response.data.other_flights || [])
            ];
            
            return allFlights.slice(0, 10).map((flight, index) => {
                const firstFlight = flight.flights[0];
                return {
                    id: `FL${String(index + 1).padStart(3, '0')}`,
                    airline: firstFlight.airline || 'Unknown Airline',
                    airline_code: firstFlight.airline_logo || '',
                    origin: firstFlight.departure_airport?.id || origin,
                    destination: firstFlight.arrival_airport?.id || destination,
                    departure_time: firstFlight.departure_airport?.time || 'TBD',
                    arrival_time: firstFlight.arrival_airport?.time || 'TBD',
                    price: flight.price || Math.floor(Math.random() * 500 + 300),
                    duration: flight.total_duration || firstFlight.duration || 'Unknown',
                    stops: flight.flights.length - 1,
                    currency: 'USD',
                    route: flight.flights.length === 1 ? 'Direct' : `${flight.flights.length - 1} stop(s)`,
                    carbon_emissions: flight.carbon_emissions?.this_flight || 'N/A'
                };
            });
        }
        
        return null;
    } catch (error) {
        console.error('SERP API error:', error.message);
        return null;
    }
}

async function searchFlights(params) {
    const { origin, destination, departure_date, return_date, passengers = 1, budget } = params;
    
    // Try SERP API first for real flight data
    if (API_CONFIG.SERP.API_KEY) {
        console.log('🔍 Searching flights with SERP API...');
        try {
            const serpFlights = await searchFlightsWithSERP(origin, destination, departure_date, return_date);
            
            if (serpFlights && serpFlights.length > 0) {
                // Filter by budget if specified
                const maxBudget = budget ? parseInt(budget.replace(/[^0-9]/g, '')) : Infinity;
                const filteredFlights = serpFlights.filter(flight => flight.price <= maxBudget);
                
                console.log(`✅ Found ${filteredFlights.length} flights via SERP API`);
                return {
                    flights: filteredFlights,
                    search_params: { origin, destination, departure_date, return_date, passengers, budget: maxBudget },
                    source: 'serp_api',
                    note: budget ? `Found ${filteredFlights.length} flights under $${maxBudget}` : `Found ${filteredFlights.length} flights`
                };
            }
        } catch (error) {
            console.error('SERP API error:', error.message);
        }
    }
    
    // Fallback to enhanced mock data
    console.log('SERP API not available or failed - using simplified mock data');
    
    // Parse destination for Japan-specific logic
    const isJapanDestination = destination.toLowerCase().includes('japan') || 
                              destination.toLowerCase().includes('tokyo') ||
                              destination.toLowerCase().includes('nrt') ||
                              destination.toLowerCase().includes('hnd');
    
    const targetAirport = isJapanDestination ? 'NRT' : destination.toUpperCase();
    const sourceAirport = origin ? origin.toUpperCase() : 'LAX';
    
    const airlines = [
        { code: 'JL', name: 'Japan Airlines', priceMultiplier: 1.2 },
        { code: 'NH', name: 'ANA', priceMultiplier: 1.15 },
        { code: 'UA', name: 'United Airlines', priceMultiplier: 1.0 },
        { code: 'DL', name: 'Delta Air Lines', priceMultiplier: 1.05 },
        { code: 'AA', name: 'American Airlines', priceMultiplier: 0.95 },
        { code: 'AS', name: 'Alaska Airlines', priceMultiplier: 0.9 }
    ];
    
    const maxBudget = budget ? parseInt(budget.replace(/[^0-9]/g, '')) : 1000;
    
    const flights = airlines.map((airline, index) => {
        const basePrice = isJapanDestination ? 
            Math.floor(Math.random() * 400 + 450) : // Japan flights: $450-850
            Math.floor(Math.random() * 300 + 200);   // Other flights: $200-500
            
        const price = Math.floor(basePrice * airline.priceMultiplier);
        const stops = price < (maxBudget * 0.7) ? Math.floor(Math.random() * 2) + 1 : 0;
        
        let duration;
        if (isJapanDestination) {
            duration = stops === 0 ? '11h 30m' : stops === 1 ? '15h 45m' : '18h 20m';
        } else {
            duration = stops === 0 ? '4h 30m' : stops === 1 ? '6h 45m' : '8h 20m';
        }
        
        // Only include flights under budget
        if (price <= maxBudget) {
            const departureHour = 6 + (index * 2);
            const arrivalHour = isJapanDestination ? 
                (departureHour + 11 + stops * 2) % 24 : 
                (departureHour + 4 + stops * 2) % 24;
                
            return {
                id: `FL${String(index + 1).padStart(3, '0')}`,
                airline: airline.name,
                airline_code: airline.code,
                origin: sourceAirport,
                destination: targetAirport,
                departure_time: `${String(departureHour).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
                arrival_time: `${String(arrivalHour).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}${isJapanDestination ? ' +1' : ''}`,
                price: price,
                duration: duration,
                stops: stops,
                currency: 'USD',
                route: stops === 0 ? 'Direct' : 
                       stops === 1 ? (isJapanDestination ? 'Via SEA' : 'Via DEN') : 
                       (isJapanDestination ? 'Via SEA, ICN' : 'Via DEN, PHX'),
                carbon_emissions: `${Math.floor(price * 0.8)} kg CO2`
            };
        }
        return null;
    }).filter(flight => flight !== null);
    
    return {
        flights: flights.slice(0, 6), // Return top 6 flights
        search_params: { origin: sourceAirport, destination: targetAirport, departure_date, return_date, passengers, budget: maxBudget },
        source: 'enhanced_mock_data',
        note: `Found ${flights.length} flights under $${maxBudget} (using mock data - configure SERP API for real results)`
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