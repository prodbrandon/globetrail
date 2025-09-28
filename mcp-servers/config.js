import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from parent directory or current directory
const envPath = path.join(process.cwd(), '../.env');
const localEnvPath = path.join(process.cwd(), '.env');

// Try parent directory first, then current directory
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else if (fs.existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath });
} else {
    dotenv.config(); // Use default .env loading
}

// API Configuration
export const API_CONFIG = {
    // SERP API for flights and web search (primary flight data source)
    SERP: {
        API_KEY: process.env.SERP_API_KEY,
        BASE_URL: 'https://serpapi.com/search'
    },
    
    // Google Places API for restaurants, hotels, and activities
    GOOGLE_PLACES: {
        API_KEY: process.env.GOOGLE_PLACES_API_KEY,
        BASE_URL: 'https://maps.googleapis.com/maps/api/place'
    },
    
    // Google Maps API for geocoding and route optimization  
    GOOGLE_MAPS: {
        API_KEY: process.env.GOOGLE_PLACES_API_KEY, // Same key works for both
        BASE_URL: 'https://maps.googleapis.com/maps/api'
    },
    
    // Yelp API for restaurant data
    YELP: {
        API_KEY: process.env.YELP_API_KEY,
        BASE_URL: 'https://api.yelp.com/v3'
    }
};

// Helper function to check if required API keys are present
export function validateApiKeys() {
    const missing = [];
    const available = [];
    
    if (!API_CONFIG.SERP.API_KEY) {
        missing.push('SERP_API_KEY');
    } else {
        available.push('SERP API (Flights & Search)');
    }
    
    if (!API_CONFIG.GOOGLE_PLACES.API_KEY) {
        missing.push('GOOGLE_PLACES_API_KEY');
    } else {
        available.push('Google Places (Restaurants, Hotels, Activities, Routes)');
    }
    
    if (!API_CONFIG.YELP.API_KEY) {
        missing.push('YELP_API_KEY');
    } else {
        available.push('Yelp (Restaurants)');
    }
    
    if (available.length > 0) {
        console.log('✅ Available APIs:', available.join(', '));
    }
    
    if (missing.length > 0) {
        console.warn('⚠️  Missing API keys:', missing.join(', '));
        console.warn('Some features will use mock data until API keys are configured.');
    }
    
    return missing.length === 0;
}