import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { API_CONFIG, validateApiKeys } from './config.js';

const app = express();
const port = process.argv[2] || 3006;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', server: 'search-server' });
});

// MCP tool call endpoint
app.post('/call-tool', async (req, res) => {
    const { tool, parameters } = req.body;
    
    try {
        let result = {};
        
        switch (tool) {
            case 'search_web':
                result = await searchWeb(parameters);
                break;
            case 'search_travel_info':
                result = await searchTravelInfo(parameters);
                break;
            case 'search_local_attractions':
                result = await searchLocalAttractions(parameters);
                break;
            case 'search_travel_tips':
                result = await searchTravelTips(parameters);
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

async function searchWeb(params) {
    const { query, location, num_results = 10 } = params;
    
    // Try SERP API first, fallback to mock data
    if (API_CONFIG.SERP.API_KEY) {
        try {
            console.log(`🔍 Searching with SERP API: "${query}" in ${location || 'global'}`);
            
            const searchParams = {
                api_key: API_CONFIG.SERP.API_KEY,
                engine: 'google',
                q: query,
                num: num_results
            };
            
            // Add location if provided
            if (location) {
                searchParams.location = location;
            }
            
            const response = await axios.get(API_CONFIG.SERP.BASE_URL, {
                params: searchParams
            });
            
            if (response.data.organic_results && response.data.organic_results.length > 0) {
                const results = response.data.organic_results.map((result, index) => ({
                    id: `SEARCH${String(index + 1).padStart(3, '0')}`,
                    title: result.title,
                    link: result.link,
                    snippet: result.snippet,
                    position: result.position || index + 1,
                    source: result.displayed_link || new URL(result.link).hostname
                }));
                
                console.log(`✅ Found ${results.length} results via SERP API`);
                return {
                    results,
                    search_params: { query, location, num_results },
                    source: 'serp_api',
                    total_results: response.data.search_information?.total_results || results.length
                };
            }
        } catch (error) {
            console.error('SERP API error:', error.message);
        }
    }
    
    // Fallback to mock data
    console.log('SERP API not available or failed - using mock data');
    return {
        results: [
            {
                id: 'SEARCH001',
                title: `Travel Guide: ${query}`,
                link: 'https://example.com/travel-guide',
                snippet: `Comprehensive travel information about ${query}. Find the best attractions, restaurants, and activities.`,
                position: 1,
                source: 'travel-guide'
            },
            {
                id: 'SEARCH002', 
                title: `${query} - Tourism Information`,
                link: 'https://example.com/tourism',
                snippet: `Official tourism information for ${query}. Plan your perfect trip with insider tips and recommendations.`,
                position: 2,
                source: 'tourism-board'
            }
        ],
        search_params: { query, location, num_results },
        source: 'mock_data',
        total_results: 2
    };
}

async function searchTravelInfo(params) {
    const { destination, travel_type = 'general' } = params;
    
    const query = `${destination} travel guide ${travel_type} tips attractions`;
    return await searchWeb({ query, location: destination, num_results: 8 });
}

async function searchLocalAttractions(params) {
    const { location, category = 'attractions' } = params;
    
    const query = `${location} best ${category} things to do tourist attractions`;
    return await searchWeb({ query, location, num_results: 10 });
}

async function searchTravelTips(params) {
    const { destination, topic = 'general' } = params;
    
    const query = `${destination} travel tips ${topic} advice local customs`;
    return await searchWeb({ query, location: destination, num_results: 6 });
}

app.listen(port, () => {
    console.log(`Search server running on port ${port}`);
});