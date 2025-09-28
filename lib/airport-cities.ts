// Comprehensive list of cities with major international airports
// Organized by continent for better maintainability

export interface AirportCity {
  name: string
  lng: number
  lat: number
  country: string
  iata: string // Airport code
  continent: string
}

export const AIRPORT_CITIES: AirportCity[] = [
  // North America
  { name: "New York", lng: -74.006, lat: 40.7128, country: "USA", iata: "JFK", continent: "North America" },
  { name: "Los Angeles", lng: -118.2437, lat: 34.0522, country: "USA", iata: "LAX", continent: "North America" },
  { name: "Chicago", lng: -87.6298, lat: 41.8781, country: "USA", iata: "ORD", continent: "North America" },
  { name: "Miami", lng: -80.1918, lat: 25.7617, country: "USA", iata: "MIA", continent: "North America" },
  { name: "San Francisco", lng: -122.4194, lat: 37.7749, country: "USA", iata: "SFO", continent: "North America" },
  { name: "Seattle", lng: -122.3321, lat: 47.6062, country: "USA", iata: "SEA", continent: "North America" },
  { name: "Boston", lng: -71.0589, lat: 42.3601, country: "USA", iata: "BOS", continent: "North America" },
  { name: "Washington DC", lng: -77.0369, lat: 38.9072, country: "USA", iata: "DCA", continent: "North America" },
  { name: "Atlanta", lng: -84.3880, lat: 33.7490, country: "USA", iata: "ATL", continent: "North America" },
  { name: "Dallas", lng: -96.7970, lat: 32.7767, country: "USA", iata: "DFW", continent: "North America" },
  { name: "Denver", lng: -104.9903, lat: 39.7392, country: "USA", iata: "DEN", continent: "North America" },
  { name: "Las Vegas", lng: -115.1398, lat: 36.1699, country: "USA", iata: "LAS", continent: "North America" },
  { name: "Phoenix", lng: -112.0740, lat: 33.4484, country: "USA", iata: "PHX", continent: "North America" },
  { name: "Houston", lng: -95.3698, lat: 29.7604, country: "USA", iata: "IAH", continent: "North America" },
  { name: "Toronto", lng: -79.3832, lat: 43.6532, country: "Canada", iata: "YYZ", continent: "North America" },
  { name: "Vancouver", lng: -123.1207, lat: 49.2827, country: "Canada", iata: "YVR", continent: "North America" },
  { name: "Montreal", lng: -73.5673, lat: 45.5017, country: "Canada", iata: "YUL", continent: "North America" },
  { name: "Calgary", lng: -114.0719, lat: 51.0447, country: "Canada", iata: "YYC", continent: "North America" },
  { name: "Mexico City", lng: -99.1332, lat: 19.4326, country: "Mexico", iata: "MEX", continent: "North America" },
  { name: "Cancun", lng: -86.8515, lat: 21.1619, country: "Mexico", iata: "CUN", continent: "North America" },

  // Europe
  { name: "London", lng: -0.1276, lat: 51.5074, country: "UK", iata: "LHR", continent: "Europe" },
  { name: "Paris", lng: 2.3522, lat: 48.8566, country: "France", iata: "CDG", continent: "Europe" },
  { name: "Amsterdam", lng: 4.9041, lat: 52.3676, country: "Netherlands", iata: "AMS", continent: "Europe" },
  { name: "Frankfurt", lng: 8.6821, lat: 50.1109, country: "Germany", iata: "FRA", continent: "Europe" },
  { name: "Munich", lng: 11.5820, lat: 48.1351, country: "Germany", iata: "MUC", continent: "Europe" },
  { name: "Berlin", lng: 13.4050, lat: 52.5200, country: "Germany", iata: "BER", continent: "Europe" },
  { name: "Madrid", lng: -3.7038, lat: 40.4168, country: "Spain", iata: "MAD", continent: "Europe" },
  { name: "Barcelona", lng: 2.1734, lat: 41.3851, country: "Spain", iata: "BCN", continent: "Europe" },
  { name: "Rome", lng: 12.4964, lat: 41.9028, country: "Italy", iata: "FCO", continent: "Europe" },
  { name: "Milan", lng: 9.1900, lat: 45.4642, country: "Italy", iata: "MXP", continent: "Europe" },
  { name: "Zurich", lng: 8.5417, lat: 47.3769, country: "Switzerland", iata: "ZUR", continent: "Europe" },
  { name: "Vienna", lng: 16.3738, lat: 48.2082, country: "Austria", iata: "VIE", continent: "Europe" },
  { name: "Brussels", lng: 4.3517, lat: 50.8503, country: "Belgium", iata: "BRU", continent: "Europe" },
  { name: "Copenhagen", lng: 12.5683, lat: 55.6761, country: "Denmark", iata: "CPH", continent: "Europe" },
  { name: "Stockholm", lng: 18.0686, lat: 59.3293, country: "Sweden", iata: "ARN", continent: "Europe" },
  { name: "Oslo", lng: 10.7522, lat: 59.9139, country: "Norway", iata: "OSL", continent: "Europe" },
  { name: "Helsinki", lng: 24.9384, lat: 60.1699, country: "Finland", iata: "HEL", continent: "Europe" },
  { name: "Moscow", lng: 37.6173, lat: 55.7558, country: "Russia", iata: "SVO", continent: "Europe" },
  { name: "Istanbul", lng: 28.9784, lat: 41.0082, country: "Turkey", iata: "IST", continent: "Europe" },
  { name: "Athens", lng: 23.7275, lat: 37.9838, country: "Greece", iata: "ATH", continent: "Europe" },
  { name: "Lisbon", lng: -9.1393, lat: 38.7223, country: "Portugal", iata: "LIS", continent: "Europe" },
  { name: "Dublin", lng: -6.2603, lat: 53.3498, country: "Ireland", iata: "DUB", continent: "Europe" },
  { name: "Edinburgh", lng: -3.1883, lat: 55.9533, country: "UK", iata: "EDI", continent: "Europe" },
  { name: "Manchester", lng: -2.2426, lat: 53.4808, country: "UK", iata: "MAN", continent: "Europe" },
  { name: "Prague", lng: 14.4378, lat: 50.0755, country: "Czech Republic", iata: "PRG", continent: "Europe" },
  { name: "Warsaw", lng: 21.0122, lat: 52.2297, country: "Poland", iata: "WAW", continent: "Europe" },
  { name: "Budapest", lng: 19.0402, lat: 47.4979, country: "Hungary", iata: "BUD", continent: "Europe" },

  // Asia
  { name: "Tokyo", lng: 139.6503, lat: 35.6762, country: "Japan", iata: "NRT", continent: "Asia" },
  { name: "Osaka", lng: 135.5023, lat: 34.6937, country: "Japan", iata: "KIX", continent: "Asia" },
  { name: "Seoul", lng: 126.9780, lat: 37.5665, country: "South Korea", iata: "ICN", continent: "Asia" },
  { name: "Beijing", lng: 116.4074, lat: 39.9042, country: "China", iata: "PEK", continent: "Asia" },
  { name: "Shanghai", lng: 121.4737, lat: 31.2304, country: "China", iata: "PVG", continent: "Asia" },
  { name: "Hong Kong", lng: 114.1694, lat: 22.3193, country: "China", iata: "HKG", continent: "Asia" },
  { name: "Singapore", lng: 103.8198, lat: 1.3521, country: "Singapore", iata: "SIN", continent: "Asia" },
  { name: "Bangkok", lng: 100.5018, lat: 13.7563, country: "Thailand", iata: "BKK", continent: "Asia" },
  { name: "Kuala Lumpur", lng: 101.6869, lat: 3.1390, country: "Malaysia", iata: "KUL", continent: "Asia" },
  { name: "Jakarta", lng: 106.8456, lat: -6.2088, country: "Indonesia", iata: "CGK", continent: "Asia" },
  { name: "Manila", lng: 120.9842, lat: 14.5995, country: "Philippines", iata: "MNL", continent: "Asia" },
  { name: "Ho Chi Minh City", lng: 106.6297, lat: 10.8231, country: "Vietnam", iata: "SGN", continent: "Asia" },
  { name: "Hanoi", lng: 105.8342, lat: 21.0285, country: "Vietnam", iata: "HAN", continent: "Asia" },
  { name: "Mumbai", lng: 72.8777, lat: 19.076, country: "India", iata: "BOM", continent: "Asia" },
  { name: "Delhi", lng: 77.1025, lat: 28.7041, country: "India", iata: "DEL", continent: "Asia" },
  { name: "Bangalore", lng: 77.5946, lat: 12.9716, country: "India", iata: "BLR", continent: "Asia" },
  { name: "Chennai", lng: 80.2707, lat: 13.0827, country: "India", iata: "MAA", continent: "Asia" },
  { name: "Kolkata", lng: 88.3639, lat: 22.5726, country: "India", iata: "CCU", continent: "Asia" },
  { name: "Hyderabad", lng: 78.4867, lat: 17.3850, country: "India", iata: "HYD", continent: "Asia" },
  { name: "Karachi", lng: 67.0011, lat: 24.8607, country: "Pakistan", iata: "KHI", continent: "Asia" },
  { name: "Lahore", lng: 74.3587, lat: 31.5204, country: "Pakistan", iata: "LHE", continent: "Asia" },
  { name: "Islamabad", lng: 73.0479, lat: 33.6844, country: "Pakistan", iata: "ISB", continent: "Asia" },
  { name: "Dhaka", lng: 90.4125, lat: 23.8103, country: "Bangladesh", iata: "DAC", continent: "Asia" },
  { name: "Colombo", lng: 79.8612, lat: 6.9271, country: "Sri Lanka", iata: "CMB", continent: "Asia" },
  { name: "Kathmandu", lng: 85.3240, lat: 27.7172, country: "Nepal", iata: "KTM", continent: "Asia" },

  // Middle East
  { name: "Dubai", lng: 55.2708, lat: 25.2048, country: "UAE", iata: "DXB", continent: "Middle East" },
  { name: "Abu Dhabi", lng: 54.3773, lat: 24.2992, country: "UAE", iata: "AUH", continent: "Middle East" },
  { name: "Doha", lng: 51.5310, lat: 25.2854, country: "Qatar", iata: "DOH", continent: "Middle East" },
  { name: "Kuwait City", lng: 47.9774, lat: 29.3759, country: "Kuwait", iata: "KWI", continent: "Middle East" },
  { name: "Riyadh", lng: 46.6753, lat: 24.7136, country: "Saudi Arabia", iata: "RUH", continent: "Middle East" },
  { name: "Jeddah", lng: 39.1975, lat: 21.5433, country: "Saudi Arabia", iata: "JED", continent: "Middle East" },
  { name: "Tehran", lng: 51.3890, lat: 35.6892, country: "Iran", iata: "IKA", continent: "Middle East" },
  { name: "Baghdad", lng: 44.3661, lat: 33.3152, country: "Iraq", iata: "BGW", continent: "Middle East" },
  { name: "Beirut", lng: 35.5018, lat: 33.8547, country: "Lebanon", iata: "BEY", continent: "Middle East" },
  { name: "Damascus", lng: 36.2765, lat: 33.5138, country: "Syria", iata: "DAM", continent: "Middle East" },
  { name: "Amman", lng: 35.9394, lat: 31.9454, country: "Jordan", iata: "AMM", continent: "Middle East" },
  { name: "Tel Aviv", lng: 34.7818, lat: 32.0853, country: "Israel", iata: "TLV", continent: "Middle East" },

  // Africa
  { name: "Cairo", lng: 31.2357, lat: 30.0444, country: "Egypt", iata: "CAI", continent: "Africa" },
  { name: "Cape Town", lng: 18.4241, lat: -33.9249, country: "South Africa", iata: "CPT", continent: "Africa" },
  { name: "Johannesburg", lng: 28.0473, lat: -26.2041, country: "South Africa", iata: "JNB", continent: "Africa" },
  { name: "Lagos", lng: 3.3792, lat: 6.5244, country: "Nigeria", iata: "LOS", continent: "Africa" },
  { name: "Abuja", lng: 7.3986, lat: 9.0579, country: "Nigeria", iata: "ABV", continent: "Africa" },
  { name: "Nairobi", lng: 36.8219, lat: -1.2921, country: "Kenya", iata: "NBO", continent: "Africa" },
  { name: "Addis Ababa", lng: 38.7578, lat: 9.1450, country: "Ethiopia", iata: "ADD", continent: "Africa" },
  { name: "Casablanca", lng: -7.5898, lat: 33.5731, country: "Morocco", iata: "CMN", continent: "Africa" },
  { name: "Marrakech", lng: -8.0116, lat: 31.6295, country: "Morocco", iata: "RAK", continent: "Africa" },
  { name: "Tunis", lng: 10.1815, lat: 36.8065, country: "Tunisia", iata: "TUN", continent: "Africa" },
  { name: "Algiers", lng: 3.0588, lat: 36.7538, country: "Algeria", iata: "ALG", continent: "Africa" },
  { name: "Accra", lng: -0.1870, lat: 5.6037, country: "Ghana", iata: "ACC", continent: "Africa" },
  { name: "Dakar", lng: -17.4441, lat: 14.7167, country: "Senegal", iata: "DKR", continent: "Africa" },
  { name: "Khartoum", lng: 32.5599, lat: 15.5007, country: "Sudan", iata: "KRT", continent: "Africa" },
  { name: "Kampala", lng: 32.5825, lat: 0.3476, country: "Uganda", iata: "EBB", continent: "Africa" },
  { name: "Dar es Salaam", lng: 39.2083, lat: -6.7924, country: "Tanzania", iata: "DAR", continent: "Africa" },
  { name: "Lusaka", lng: 28.3228, lat: -15.3875, country: "Zambia", iata: "LUN", continent: "Africa" },
  { name: "Harare", lng: 31.0492, lat: -17.8252, country: "Zimbabwe", iata: "HRE", continent: "Africa" },

  // South America
  { name: "São Paulo", lng: -46.6333, lat: -23.5505, country: "Brazil", iata: "GRU", continent: "South America" },
  { name: "Rio de Janeiro", lng: -43.1729, lat: -22.9068, country: "Brazil", iata: "GIG", continent: "South America" },
  { name: "Brasília", lng: -47.8825, lat: -15.7942, country: "Brazil", iata: "BSB", continent: "South America" },
  { name: "Buenos Aires", lng: -58.3816, lat: -34.6118, country: "Argentina", iata: "EZE", continent: "South America" },
  { name: "Lima", lng: -77.0428, lat: -12.0464, country: "Peru", iata: "LIM", continent: "South America" },
  { name: "Bogotá", lng: -74.0721, lat: 4.7110, country: "Colombia", iata: "BOG", continent: "South America" },
  { name: "Santiago", lng: -70.6693, lat: -33.4489, country: "Chile", iata: "SCL", continent: "South America" },
  { name: "Caracas", lng: -66.9036, lat: 10.4806, country: "Venezuela", iata: "CCS", continent: "South America" },
  { name: "Quito", lng: -78.4678, lat: -0.1807, country: "Ecuador", iata: "UIO", continent: "South America" },
  { name: "La Paz", lng: -68.1193, lat: -16.5000, country: "Bolivia", iata: "LPB", continent: "South America" },
  { name: "Asunción", lng: -57.5759, lat: -25.2637, country: "Paraguay", iata: "ASU", continent: "South America" },
  { name: "Montevideo", lng: -56.1645, lat: -34.9011, country: "Uruguay", iata: "MVD", continent: "South America" },
  { name: "Georgetown", lng: -58.1551, lat: 6.8013, country: "Guyana", iata: "GEO", continent: "South America" },
  { name: "Paramaribo", lng: -55.2038, lat: 5.8520, country: "Suriname", iata: "PBM", continent: "South America" },

  // Oceania
  { name: "Sydney", lng: 151.2093, lat: -33.8688, country: "Australia", iata: "SYD", continent: "Oceania" },
  { name: "Melbourne", lng: 144.9631, lat: -37.8136, country: "Australia", iata: "MEL", continent: "Oceania" },
  { name: "Brisbane", lng: 153.0251, lat: -27.3817, country: "Australia", iata: "BNE", continent: "Oceania" },
  { name: "Perth", lng: 115.8605, lat: -31.9505, country: "Australia", iata: "PER", continent: "Oceania" },
  { name: "Adelaide", lng: 138.6007, lat: -34.9285, country: "Australia", iata: "ADL", continent: "Oceania" },
  { name: "Auckland", lng: 174.7633, lat: -36.8485, country: "New Zealand", iata: "AKL", continent: "Oceania" },
  { name: "Wellington", lng: 174.7762, lat: -41.2865, country: "New Zealand", iata: "WLG", continent: "Oceania" },
  { name: "Christchurch", lng: 172.6362, lat: -43.5321, country: "New Zealand", iata: "CHC", continent: "Oceania" },
  { name: "Suva", lng: 178.4417, lat: -18.1248, country: "Fiji", iata: "SUV", continent: "Oceania" },
  { name: "Port Moresby", lng: 147.1803, lat: -9.4438, country: "Papua New Guinea", iata: "POM", continent: "Oceania" },
  { name: "Nadi", lng: 177.4454, lat: -17.7553, country: "Fiji", iata: "NAN", continent: "Oceania" },
  { name: "Apia", lng: -171.7610, lat: -13.8506, country: "Samoa", iata: "APW", continent: "Oceania" },
  { name: "Nuku'alofa", lng: -175.2018, lat: -21.1789, country: "Tonga", iata: "TBU", continent: "Oceania" },
  { name: "Port Vila", lng: 168.3273, lat: -17.7334, country: "Vanuatu", iata: "VLI", continent: "Oceania" },
  { name: "Honiara", lng: 159.9729, lat: -9.4280, country: "Solomon Islands", iata: "HIR", continent: "Oceania" },

  // Additional major hubs and regional airports
  { name: "Anchorage", lng: -149.9003, lat: 61.2181, country: "USA", iata: "ANC", continent: "North America" },
  { name: "Honolulu", lng: -157.8583, lat: 21.3099, country: "USA", iata: "HNL", continent: "North America" },
  { name: "Reykjavik", lng: -21.9426, lat: 64.1466, country: "Iceland", iata: "KEF", continent: "Europe" },
  { name: "Tashkent", lng: 69.2401, lat: 41.2995, country: "Uzbekistan", iata: "TAS", continent: "Asia" },
  { name: "Almaty", lng: 76.8512, lat: 43.2220, country: "Kazakhstan", iata: "ALA", continent: "Asia" },
  { name: "Baku", lng: 49.8671, lat: 40.4093, country: "Azerbaijan", iata: "GYD", continent: "Asia" },
  { name: "Tbilisi", lng: 44.7830, lat: 41.7151, country: "Georgia", iata: "TBS", continent: "Asia" },
  { name: "Yerevan", lng: 44.5152, lat: 40.1792, country: "Armenia", iata: "EVN", continent: "Asia" },
  { name: "Ulaanbaatar", lng: 106.9057, lat: 47.8864, country: "Mongolia", iata: "ULN", continent: "Asia" },
  { name: "Phnom Penh", lng: 104.9160, lat: 11.5449, country: "Cambodia", iata: "PNH", continent: "Asia" },
  { name: "Vientiane", lng: 102.6331, lat: 17.9757, country: "Laos", iata: "VTE", continent: "Asia" },
  { name: "Yangon", lng: 96.1951, lat: 16.8661, country: "Myanmar", iata: "RGN", continent: "Asia" },
  { name: "Male", lng: 73.5362, lat: 4.1755, country: "Maldives", iata: "MLE", continent: "Asia" },
  { name: "Thimphu", lng: 89.6177, lat: 27.4728, country: "Bhutan", iata: "PBH", continent: "Asia" },
]

// Helper functions for filtering cities
export const getCitiesByContinent = (continent: string): AirportCity[] => {
  return AIRPORT_CITIES.filter(city => city.continent === continent)
}

export const getCitiesByCountry = (country: string): AirportCity[] => {
  return AIRPORT_CITIES.filter(city => city.country === country)
}

export const searchCities = (query: string): AirportCity[] => {
  const lowerQuery = query.toLowerCase()
  return AIRPORT_CITIES.filter(city => 
    city.name.toLowerCase().includes(lowerQuery) ||
    city.country.toLowerCase().includes(lowerQuery) ||
    city.iata.toLowerCase().includes(lowerQuery)
  )
}

export const CONTINENTS = [
  "North America",
  "South America", 
  "Europe",
  "Asia",
  "Africa",
  "Oceania",
  "Middle East"
]