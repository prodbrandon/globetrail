import { API_CONFIG } from './config.js';
import axios from 'axios';

console.log('Testing Google Places API integration...');
console.log('API Key available:', !!API_CONFIG.GOOGLE_PLACES.API_KEY);
console.log('API Key (first 10 chars):', API_CONFIG.GOOGLE_PLACES.API_KEY?.substring(0, 10));

async function testGooglePlaces() {
    try {
        // Test geocoding first
        console.log('\n1. Testing Geocoding API...');
        const geocodeResponse = await axios.get(`${API_CONFIG.GOOGLE_MAPS.BASE_URL}/geocode/json`, {
            params: {
                address: 'New York City',
                key: API_CONFIG.GOOGLE_PLACES.API_KEY
            }
        });
        
        console.log('Geocoding status:', geocodeResponse.data.status);
        if (geocodeResponse.data.results.length > 0) {
            const coords = geocodeResponse.data.results[0].geometry.location;
            console.log('Coordinates:', coords);
            
            // Test Places API
            console.log('\n2. Testing Places API...');
            const placesResponse = await axios.get(`${API_CONFIG.GOOGLE_PLACES.BASE_URL}/nearbysearch/json`, {
                params: {
                    location: `${coords.lat},${coords.lng}`,
                    radius: 5000,
                    type: 'tourist_attraction',
                    key: API_CONFIG.GOOGLE_PLACES.API_KEY
                }
            });
            
            console.log('Places status:', placesResponse.data.status);
            console.log('Places found:', placesResponse.data.results?.length || 0);
            
            if (placesResponse.data.results && placesResponse.data.results.length > 0) {
                console.log('First place:', placesResponse.data.results[0].name);
                console.log('✅ Google Places API is working correctly!');
            }
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

testGooglePlaces();