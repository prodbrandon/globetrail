import { API_CONFIG, validateApiKeys } from './config.js';
import axios from 'axios';

console.log('🧪 Testing MCP Server API Integrations\n');

// Test API key configuration
console.log('📋 Checking API Key Configuration:');
const hasAllKeys = validateApiKeys();

console.log(`✅ SERP API: ${API_CONFIG.SERP.API_KEY ? '✓' : '✗'}`);
console.log(`✅ Google Places: ${API_CONFIG.GOOGLE_PLACES.API_KEY ? '✓' : '✗'}`);
console.log(`✅ Yelp API: ${API_CONFIG.YELP.API_KEY ? '✓' : '✗'}\n`);

// Test server endpoints
async function testServerEndpoint(port, serverName) {
    try {
        const response = await axios.get(`http://localhost:${port}/health`, { timeout: 5000 });
        console.log(`✅ ${serverName}: ${response.data.status}`);
        return true;
    } catch (error) {
        console.log(`❌ ${serverName}: Not running (${error.message})`);
        return false;
    }
}

async function testServers() {
    console.log('🚀 Testing Server Health:');
    
    const servers = [
        { port: 3001, name: 'Flight Server' },
        { port: 3002, name: 'Hotel Server' },
        { port: 3003, name: 'Activity Server' },
        { port: 3004, name: 'Restaurant Server' },
        { port: 3005, name: 'Clustering Server' }
    ];
    
    const results = await Promise.all(
        servers.map(server => testServerEndpoint(server.port, server.name))
    );
    
    const runningCount = results.filter(Boolean).length;
    console.log(`\n📊 ${runningCount}/${servers.length} servers running\n`);
}

// Test real API calls (if keys are available)
async function testRealAPIs() {
    console.log('🌐 Testing Real API Connections:');
    
    // Test Google Places API
    if (API_CONFIG.GOOGLE_PLACES.API_KEY) {
        try {
            const response = await axios.get(`${API_CONFIG.GOOGLE_PLACES.BASE_URL}/nearbysearch/json`, {
                params: { 
                    location: '40.7589,-73.9851', // Times Square coordinates
                    radius: 1000,
                    type: 'restaurant',
                    key: API_CONFIG.GOOGLE_PLACES.API_KEY 
                },
                timeout: 10000
            });
            console.log(`✅ Google Places API: Connected (found ${response.data.results?.length || 0} places)`);
        } catch (error) {
            console.log(`❌ Google Places API: ${error.response?.status || error.message}`);
        }
    }
    
    // Test Google Maps Geocoding
    if (API_CONFIG.GOOGLE_PLACES.API_KEY) {
        try {
            const response = await axios.get(`${API_CONFIG.GOOGLE_MAPS.BASE_URL}/geocode/json`, {
                params: { 
                    address: 'Times Square, New York',
                    key: API_CONFIG.GOOGLE_PLACES.API_KEY 
                },
                timeout: 10000
            });
            console.log(`✅ Google Maps API: Connected (status: ${response.data.status})`);
        } catch (error) {
            console.log(`❌ Google Maps API: ${error.response?.status || error.message}`);
        }
    }
    
    // Test SERP API
    if (API_CONFIG.SERP.API_KEY) {
        try {
            const response = await axios.get(API_CONFIG.SERP.BASE_URL, {
                params: {
                    api_key: API_CONFIG.SERP.API_KEY,
                    engine: 'google',
                    q: 'test search',
                    num: 1
                },
                timeout: 10000
            });
            console.log(`✅ SERP API: Connected (status: ${response.data.search_information ? 'OK' : 'Limited'})`);
        } catch (error) {
            console.log(`❌ SERP API: ${error.response?.status || error.message}`);
        }
    }
    
    console.log('\n');
}

// Run all tests
async function runTests() {
    await testServers();
    await testRealAPIs();
    
    console.log('🎯 Next Steps:');
    if (!hasAllKeys) {
        console.log('1. Copy .env.example to .env');
        console.log('2. Add your API keys to .env');
        console.log('3. Run npm run start:all to start all servers');
    } else {
        console.log('1. All APIs configured! 🎉');
        console.log('2. Run npm run start:all to start all servers');
        console.log('3. Test with your travel chatbot');
    }
}

runTests().catch(console.error);