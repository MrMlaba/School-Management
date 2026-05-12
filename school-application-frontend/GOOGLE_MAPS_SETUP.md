# Google Maps API Setup Guide

## Overview
The school application system now includes address validation and auto-complete functionality using Google Maps API. This feature helps ensure that applicants enter valid South African addresses.

## Features
- **Address Auto-complete**: Real-time suggestions as users type
- **Address Validation**: Verifies addresses are valid South African locations
- **Debounced Search**: Reduces API calls for better performance
- **Country Restriction**: Only shows South African addresses

## Setup Instructions

### 1. Get Google Maps API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - **Places API** (for address auto-complete)
   - **Geocoding API** (for address validation)
4. Create credentials (API Key)
5. Restrict the API key to:
   - HTTP referrers: `localhost:3000/*` (for development)
   - Your production domain (for deployment)

### 2. Configure Environment Variables
Create a `.env` file in the `school-application-frontend` directory:

```env
REACT_APP_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

### 3. Update Configuration (Optional)
You can modify the settings in `src/config/maps.js`:
- `MAX_SUGGESTIONS`: Number of address suggestions to show (default: 5)
- `DEBOUNCE_DELAY`: Delay before API call in milliseconds (default: 300)
- `COUNTRY_CODE`: Country code for address filtering (default: 'za' for South Africa)

### 4. Test the Integration
1. Start the development server: `npm start`
2. Go to the application form
3. Start typing in the address field
4. You should see address suggestions appear

## API Usage
The system uses two Google Maps APIs:

### Places API (Auto-complete)
- **Endpoint**: `https://maps.googleapis.com/maps/api/place/autocomplete/json`
- **Purpose**: Provides address suggestions as users type
- **Parameters**: 
  - `input`: User's typed text
  - `components=country:za`: Restricts to South Africa
  - `key`: Your API key

### Geocoding API (Validation)
- **Endpoint**: `https://maps.googleapis.com/maps/api/geocode/json`
- **Purpose**: Validates if an address exists and is in South Africa
- **Parameters**:
  - `address`: Address to validate
  - `components=country:za`: Restricts to South Africa
  - `key`: Your API key

## Error Handling
- If API key is invalid: Suggestions won't load, but form still works
- If network error: Graceful fallback with console error
- If no suggestions found: Empty suggestion list

## Cost Considerations
- **Places API**: $2.83 per 1000 requests
- **Geocoding API**: $5 per 1000 requests
- **Free Tier**: $200 credit per month
- **Estimated Cost**: ~$0.01 per application (with address validation)

## Security Notes
- API key is restricted to your domain
- No sensitive data is sent to Google
- Only address text is transmitted for validation

## Troubleshooting
1. **No suggestions appearing**: Check API key and enabled APIs
2. **CORS errors**: Ensure API key has correct referrer restrictions
3. **Rate limiting**: Implement caching if needed for high traffic
4. **Invalid addresses**: Check if address format is correct

## Fallback Behavior
If Google Maps API is unavailable:
- Form still works without address validation
- Basic client-side validation remains active
- Users can manually enter addresses
- No application submission is blocked 