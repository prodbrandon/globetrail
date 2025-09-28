#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Configuration for SERP API
const API_CONFIG = {
    SERP: {
        API_KEY: process.env.SERP_API_KEY,
        BASE_URL: 'https://serpapi.com/search'
    }
};

// Validate API key on startup
function validateApiKey() {
    if (!API_CONFIG.SERP.API_KEY) {
        console.error('❌ SERP_API_KEY not found in environment variables');
        console.error('Please set SERP_API_KEY in your .env file');
        process.exit(1);
    }
    console.log('✅ SERP API key configured');
}

// Create the MCP server
const server = new Server(
    {
        name: 'flight-server',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'search_flights',
                description: 'Search for flight options between two airports using SERP API',
                inputSchema: {
                    type: 'object',
                    properties: {
                        origin: {
                            type: 'string',
                            description: 'Origin airport code (e.g., LAX, JFK)',
                        },
                        destination: {
                            type: 'string',
                            description: 'Destination airport code (e.g., NRT, LHR)',
                        },
                        departure_date: {
                            type: 'string',
                            description: 'Departure date in YYYY-MM-DD format',
                        },
                        return_date: {
                            type: 'string',
                            description: 'Return date in YYYY-MM-DD format (optional)',
                        },
                        adults: {
                            type: 'integer',
                            description: 'Number of adult passengers',
                            default: 1,
                        },
                        max_price: {
                            type: 'integer',
                            description: 'Maximum price budget per person',
                        },
                    },
                    required: ['origin', 'destination', 'departure_date'],
                },
            },
            {
                name: 'get_flight_details',
                description: 'Get detailed information about a specific flight',
                inputSchema: {
                    type: 'object',
                    properties: {
                        flight_id: {
                            type: 'string',
                            description: 'Unique flight identifier',
                        },
                    },
                    required: ['flight_id'],
                },
            },
        ],
    };
});

// Tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        switch (name) {
            case 'search_flights':
                const flightResults = await searchFlights(args);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(flightResults, null, 2),
                        },
                    ],
                };

            case 'get_flight_details':
                const flightDetails = await getFlightDetails(args);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(flightDetails, null, 2),
                        },
                    ],
                };

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error: ${error.message}`,
                },
            ],
            isError: true,
        };
    }
});

// Flight search implementation using SERP API
async function searchFlights(params) {
    const { origin, destination, departure_date, return_date, adults = 1, max_price } = params;
    
    console.log(`🔍 Searching flights: ${origin} → ${destination} on ${departure_date}`);
    
    try {
        // Build SERP API parameters
        const serpParams = {
            api_key: API_CONFIG.SERP.API_KEY,
            engine: 'google_flights',
            departure_id: origin,
            arrival_id: destination,
            outbound_date: departure_date,
            type: '2', // Default to one-way
            adults: adults,
            currency: 'USD',
            hl: 'en'
        };

        // Handle return date logic for round-trip vs one-way
        if (return_date && 
            return_date.trim() && 
            return_date !== 'null' && 
            return_date !== 'undefined' && 
            return_date !== '' &&
            return_date !== departure_date) {
            
            serpParams.return_date = return_date;
            serpParams.type = '1'; // Round-trip
            console.log(`🔄 Round-trip search: ${departure_date} → ${return_date}`);
        } else {
            console.log(`➡️ One-way search: ${departure_date}`);
        }

        console.log('📡 Calling SERP API with params:', serpParams);
        
        const response = await axios.get(API_CONFIG.SERP.BASE_URL, {
            params: serpParams,
            timeout: 30000
        });

        if (!response.data) {
            throw new Error('No data received from SERP API');
        }

        // Extract flight data from SERP response
        const flights = extractFlightData(response.data, max_price);
        
        console.log(`✅ Found ${flights.length} flights from SERP API`);
        
        return {
            flights: flights,
            search_params: {
                origin,
                destination,
                departure_date,
                return_date: serpParams.type === '1' ? return_date : null,
                adults,
                max_price
            },
            source: 'serp_api',
            total_results: flights.length,
            note: max_price ? `Filtered by budget: $${max_price}` : 'All available flights'
        };

    } catch (error) {
        console.error('❌ SERP API error:', error.message);
        
        // If it's an API error, provide detailed error info
        if (error.response) {
            throw new Error(`SERP API error: ${error.response.status} - ${error.response.data?.error || 'Unknown error'}`);
        } else if (error.code === 'ECONNABORTED') {
            throw new Error('SERP API timeout - please try again');
        } else {
            throw new Error(`Flight search failed: ${error.message}`);
        }
    }
}

// Extract and format flight data from SERP API response
function extractFlightData(serpData, maxPrice) {
    const flights = [];
    
    // Process best flights
    if (serpData.best_flights && Array.isArray(serpData.best_flights)) {
        console.log(`📋 Processing ${serpData.best_flights.length} best flights`);
        serpData.best_flights.forEach((flight, index) => {
            const flightData = formatFlightData(flight, `BEST_${index + 1}`, 'best');
            if (!maxPrice || flightData.price <= maxPrice) {
                flights.push(flightData);
            }
        });
    }

    // Process other flights
    if (serpData.other_flights && Array.isArray(serpData.other_flights)) {
        console.log(`📋 Processing ${serpData.other_flights.length} other flights`);
        serpData.other_flights.forEach((flight, index) => {
            const flightData = formatFlightData(flight, `OTHER_${index + 1}`, 'other');
            if (!maxPrice || flightData.price <= maxPrice) {
                flights.push(flightData);
            }
        });
    }

    // Process cheapest flights if available
    if (serpData.cheapest_flights && Array.isArray(serpData.cheapest_flights)) {
        console.log(`📋 Processing ${serpData.cheapest_flights.length} cheapest flights`);
        serpData.cheapest_flights.forEach((flight, index) => {
            const flightData = formatFlightData(flight, `CHEAP_${index + 1}`, 'cheapest');
            if (!maxPrice || flightData.price <= maxPrice) {
                flights.push(flightData);
            }
        });
    }

    // Log search metadata
    if (serpData.search_metadata) {
        const metadata = serpData.search_metadata;
        console.log(`🔍 Search metadata:`);
        console.log(`   Status: ${metadata.status || 'N/A'}`);
        console.log(`   Processing time: ${metadata.total_time_taken || 'N/A'}s`);
        console.log(`   Google Flights URL: ${metadata.google_flights_url || 'N/A'}`);
    }

    return flights;
}

// Format individual flight data with comprehensive details
function formatFlightData(flight, idPrefix, category) {
    const flights = flight.flights || [];
    const firstFlight = flights[0] || {};
    const lastFlight = flights[flights.length - 1] || {};
    
    // Extract departure details
    const departureAirport = firstFlight.departure_airport || {};
    const arrivalAirport = lastFlight.arrival_airport || {};
    
    // Calculate layovers/stops
    const layovers = flight.layovers || [];
    const stops = Math.max(0, flights.length - 1);
    
    // Extract booking options
    const bookingOptions = flight.booking_options || [];
    const primaryBooking = bookingOptions[0] || {};
    
    // Extract carbon emissions
    const carbonEmissions = flight.carbon_emissions || {};
    
    const formattedFlight = {
        // Basic identification
        id: `${idPrefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        category: category,
        
        // Airline information
        airline: firstFlight.airline || 'Unknown Airline',
        airline_logo: firstFlight.airline_logo || null,
        flight_number: firstFlight.flight_number || null,
        aircraft: firstFlight.airplane || null,
        
        // Route information
        origin: departureAirport.id || 'Unknown',
        origin_name: departureAirport.name || 'Unknown Airport',
        origin_time: departureAirport.time || null,
        destination: arrivalAirport.id || 'Unknown',
        destination_name: arrivalAirport.name || 'Unknown Airport',
        arrival_time: arrivalAirport.time || null,
        
        // Timing
        departure_time: departureAirport.time || null,
        duration: flight.total_duration || firstFlight.duration || 'Unknown',
        
        // Pricing
        price: flight.price || 0,
        currency: 'USD',
        
        // Route complexity
        stops: stops,
        layovers: layovers.map(layover => ({
            airport: layover.id || 'Unknown',
            airport_name: layover.name || 'Unknown Airport',
            duration: layover.duration || 'Unknown'
        })),
        
        // Environmental impact
        carbon_emissions: {
            this_flight: carbonEmissions.this_flight || null,
            typical_for_route: carbonEmissions.typical_for_this_route || null,
            difference_percent: carbonEmissions.difference_percent || null
        },
        
        // Booking information
        booking_options: bookingOptions.map(option => ({
            agent: option.agent || 'Unknown',
            price: option.price || flight.price,
            link: option.link || null
        })),
        primary_booking_link: primaryBooking.link || null,
        
        // Aircraft and amenities
        legroom: firstFlight.legroom || null,
        amenities: firstFlight.extensions || [],
        
        // Additional flight segments for multi-stop flights
        flight_segments: flights.map((segment, index) => ({
            segment_number: index + 1,
            airline: segment.airline || 'Unknown',
            flight_number: segment.flight_number || null,
            aircraft: segment.airplane || null,
            departure_airport: {
                id: segment.departure_airport?.id || 'Unknown',
                name: segment.departure_airport?.name || 'Unknown',
                time: segment.departure_airport?.time || null
            },
            arrival_airport: {
                id: segment.arrival_airport?.id || 'Unknown', 
                name: segment.arrival_airport?.name || 'Unknown',
                time: segment.arrival_airport?.time || null
            },
            duration: segment.duration || 'Unknown',
            legroom: segment.legroom || null
        })),
        
        // Metadata
        type: flight.type || 'economy',
        booking_token: flight.booking_token || null,
        often_delayed_by_over_30_min: flight.often_delayed_by_over_30_min || false
    };

    // Log sample flight details (only for first flight of each category)
    if (idPrefix.endsWith('_1')) {
        console.log(`📍 Sample ${category} flight details:`);
        console.log(`   Flight: ${formattedFlight.flight_number || 'N/A'}`);
        console.log(`   Airline: ${formattedFlight.airline}`);
        console.log(`   Price: $${formattedFlight.price}`);
        console.log(`   Departure: ${formattedFlight.departure_time || 'N/A'}`);
        console.log(`   Arrival: ${formattedFlight.arrival_time || 'N/A'}`);
        console.log(`   Duration: ${formattedFlight.duration}`);
        console.log(`   Stops: ${formattedFlight.stops}`);
        if (formattedFlight.booking_options.length > 0) {
            console.log(`   Booking options: ${formattedFlight.booking_options.length} available`);
        }
    }

    return formattedFlight;
}

// Get flight details (placeholder for future enhancement)
async function getFlightDetails(params) {
    const { flight_id } = params;
    
    // For now, return basic structure
    // In a real implementation, you might store flight details or make additional API calls
    return {
        flight_id,
        message: 'Flight details endpoint - currently returns basic info',
        note: 'This endpoint can be enhanced to store and retrieve detailed flight information',
        status: 'available'
    };
}

// Express server for HTTP endpoint compatibility (for your Python MCP manager)
const app = express();
const port = process.argv[2] || 3001;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        server: 'flight-server',
        serp_api_configured: !!API_CONFIG.SERP.API_KEY
    });
});

// HTTP endpoint for MCP tool calls (for Python integration)
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

// Start the server
async function main() {
    // Validate API configuration
    validateApiKey();
    
    // Check if we should run as HTTP server or MCP server
    if (process.argv.includes('--http') || process.argv[2]) {
        // HTTP mode for Python integration
        app.listen(port, () => {
            console.log(`🚀 Flight server running on port ${port}`);
            console.log(`📍 Health check: http://localhost:${port}/health`);
            console.log(`🔧 Tool endpoint: http://localhost:${port}/call-tool`);
        });
    } else {
        // MCP mode for direct MCP clients
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.log('🚀 Flight MCP server running on stdio');
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🔄 Shutting down flight server...');
    process.exit(0);
});

// Error handling
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the server
main().catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
});