// Google Maps API Configuration
export const GOOGLE_MAPS_CONFIG = {
  API_KEY: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY',
  PLACES_API_BASE_URL: 'https://maps.googleapis.com/maps/api/place',
  GEOCODING_API_BASE_URL: 'https://maps.googleapis.com/maps/api/geocode',
  COUNTRY_CODE: 'za', // South Africa
  MAX_SUGGESTIONS: 5,
  DEBOUNCE_DELAY: 300, // milliseconds
};

// API Endpoints
export const MAPS_ENDPOINTS = {
  PLACE_AUTOCOMPLETE: `${GOOGLE_MAPS_CONFIG.PLACES_API_BASE_URL}/autocomplete/json`,
  GEOCODING: `${GOOGLE_MAPS_CONFIG.GEOCODING_API_BASE_URL}/json`,
}; 



