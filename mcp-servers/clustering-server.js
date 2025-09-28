import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { API_CONFIG, validateApiKeys } from './config.js';

const app = express();
const port = process.argv[2] || 3005;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', server: 'clustering-server' });
});

// MCP tool call endpoint
app.post('/call-tool', async (req, res) => {
    const { tool, parameters } = req.body;
    
    try {
        let result = {};
        
        switch (tool) {
            case 'cluster_itinerary':
                result = await clusterItinerary(parameters);
                break;
            case 'optimize_route':
                result = await optimizeRoute(parameters);
                break;
            case 'suggest_groupings':
                result = await suggestGroupings(parameters);
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

async function clusterItinerary(params) {
    const { activities, preferences, duration_days } = params;
    
    // Mock clustering algorithm - groups activities by location/theme
    const clusters = [
        {
            day: 1,
            theme: 'Historic & Cultural',
            activities: [
                { time: '9:00 AM', activity: 'City Walking Tour', duration: '3 hours', location: 'Downtown' },
                { time: '1:00 PM', activity: 'Lunch at Local Flavors Bistro', duration: '1.5 hours', location: 'Downtown' },
                { time: '3:00 PM', activity: 'Museum & Art Gallery Tour', duration: '4 hours', location: 'Arts District' }
            ],
            estimated_travel_time: '45 minutes total',
            total_cost: 88
        },
        {
            day: 2,
            theme: 'Adventure & Nature',
            activities: [
                { time: '8:00 AM', activity: 'Adventure Hiking Trail', duration: '5 hours', location: 'Nature Reserve' },
                { time: '2:00 PM', activity: 'Lunch at Mountain View Cafe', duration: '1 hour', location: 'Nature Reserve' },
                { time: '4:00 PM', activity: 'Scenic Drive & Photography', duration: '2 hours', location: 'Scenic Route' }
            ],
            estimated_travel_time: '1.5 hours total',
            total_cost: 75
        },
        {
            day: 3,
            theme: 'Culinary & Relaxation',
            activities: [
                { time: '10:00 AM', activity: 'Food & Wine Tasting', duration: '2.5 hours', location: 'Wine District' },
                { time: '1:30 PM', activity: 'Spa & Wellness Session', duration: '2 hours', location: 'Hotel Spa' },
                { time: '7:00 PM', activity: 'Dinner at Rooftop Garden Restaurant', duration: '2 hours', location: 'City Center' }
            ],
            estimated_travel_time: '30 minutes total',
            total_cost: 195
        }
    ];
    
    return {
        clustered_itinerary: clusters,
        optimization_notes: [
            'Activities grouped by geographic proximity to minimize travel time',
            'Themes selected based on user preferences and activity types',
            'Meal times strategically placed between major activities'
        ],
        total_estimated_cost: clusters.reduce((sum, day) => sum + day.total_cost, 0),
        total_travel_time: '2 hours 45 minutes across all days'
    };
}

async function optimizeRoute(params) {
    const { locations, start_point, preferences } = params;
    
    // Try Google Maps API for real route optimization
    if (API_CONFIG.GOOGLE_MAPS.API_KEY && locations && locations.length > 1) {
        try {
            // Geocode locations first
            const geocodedLocations = await Promise.all(
                locations.map(async (location) => {
                    const response = await axios.get(`${API_CONFIG.GOOGLE_MAPS.BASE_URL}/geocode/json`, {
                        params: {
                            address: location,
                            key: API_CONFIG.GOOGLE_MAPS.API_KEY
                        }
                    });
                    
                    if (response.data.results.length > 0) {
                        const result = response.data.results[0];
                        return {
                            name: location,
                            lat: result.geometry.location.lat,
                            lng: result.geometry.location.lng,
                            formatted_address: result.formatted_address
                        };
                    }
                    return { name: location, lat: null, lng: null };
                })
            );
            
            // Get directions between locations
            const waypoints = geocodedLocations
                .filter(loc => loc.lat && loc.lng)
                .slice(1, -1) // Remove start and end points
                .map(loc => `${loc.lat},${loc.lng}`)
                .join('|');
            
            const startLoc = geocodedLocations[0];
            const endLoc = geocodedLocations[geocodedLocations.length - 1];
            
            if (startLoc.lat && endLoc.lat) {
                const directionsResponse = await axios.get(`${API_CONFIG.GOOGLE_MAPS.BASE_URL}/directions/json`, {
                    params: {
                        origin: `${startLoc.lat},${startLoc.lng}`,
                        destination: `${endLoc.lat},${endLoc.lng}`,
                        waypoints: waypoints,
                        optimize: true,
                        mode: preferences?.transport_mode || 'driving',
                        key: API_CONFIG.GOOGLE_MAPS.API_KEY
                    }
                });
                
                if (directionsResponse.data.routes.length > 0) {
                    const route = directionsResponse.data.routes[0];
                    const optimizedRoute = route.legs.map((leg, index) => ({
                        order: index + 1,
                        location: index === 0 ? startLoc.name : geocodedLocations[route.waypoint_order[index - 1] + 1].name,
                        travel_time: leg.duration.text,
                        distance: leg.distance.text,
                        method: preferences?.transport_mode || 'driving'
                    }));
                    
                    return {
                        optimized_route: optimizedRoute,
                        total_travel_time: route.legs.reduce((total, leg) => total + leg.duration.value, 0) / 60 + ' minutes',
                        total_distance: route.legs.reduce((total, leg) => total + leg.distance.value, 0) / 1000 + ' km',
                        source: 'google_maps_api'
                    };
                }
            }
        } catch (error) {
            console.error('Google Maps API error:', error.message);
        }
    }
    
    // Fallback to mock route optimization
    console.log('Using mock route optimization - configure Google Maps API for real data');
    return {
        optimized_route: [
            { order: 1, location: 'Hotel', travel_time: '0 min', method: 'Start' },
            { order: 2, location: 'Downtown Historic District', travel_time: '15 min', method: 'Walk' },
            { order: 3, location: 'Local Market', travel_time: '8 min', method: 'Walk' },
            { order: 4, location: 'Arts District Museum', travel_time: '12 min', method: 'Public Transit' },
            { order: 5, location: 'Restaurant District', travel_time: '10 min', method: 'Walk' },
            { order: 6, location: 'Hotel', travel_time: '20 min', method: 'Taxi' }
        ],
        total_travel_time: '65 minutes',
        estimated_cost: 15,
        source: 'mock_data'
    };
}

async function suggestGroupings(params) {
    const { activities, group_size, interests, budget } = params;
    
    // Mock activity grouping suggestions
    return {
        suggested_groups: [
            {
                group_name: 'Culture Enthusiasts',
                activities: ['Museum Tour', 'Historic Walking Tour', 'Art Gallery Visit'],
                estimated_time: '6 hours',
                cost_per_person: 85,
                best_for: 'History and art lovers'
            },
            {
                group_name: 'Adventure Seekers',
                activities: ['Hiking Trail', 'Rock Climbing', 'Kayaking'],
                estimated_time: '8 hours',
                cost_per_person: 120,
                best_for: 'Active travelers seeking outdoor experiences'
            },
            {
                group_name: 'Food & Drink Lovers',
                activities: ['Food Tour', 'Wine Tasting', 'Cooking Class'],
                estimated_time: '5 hours',
                cost_per_person: 150,
                best_for: 'Culinary enthusiasts'
            },
            {
                group_name: 'Relaxation Package',
                activities: ['Spa Day', 'Beach Time', 'Sunset Cruise'],
                estimated_time: '7 hours',
                cost_per_person: 200,
                best_for: 'Those seeking rest and rejuvenation'
            }
        ],
        recommendations: [
            'Mix and match activities from different groups for variety',
            'Consider group discounts for parties of 4 or more',
            'Book spa activities in advance during peak season'
        ]
    };
}

app.listen(port, () => {
    console.log(`Clustering server running on port ${port}`);
});