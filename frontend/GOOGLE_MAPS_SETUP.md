# Google Maps Integration for DriveKenya

## Required Dependencies

To install the Google Maps React components and utilities:

```bash
cd frontend
npm install @googlemaps/react-wrapper @googlemaps/js-api-loader
npm install @types/google.maps --save-dev
```

## Environment Variables

Add to your frontend .env file:
```
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

## Features Implemented

1. **Interactive Car Location Map** - Shows all available cars on a map
2. **Location Picker** - For selecting pickup/dropoff locations
3. **Route Planning** - Distance calculation and route display
4. **Search with Places API** - Location autocomplete
5. **Geolocation** - User's current location detection

## Usage

The GoogleMap component will be integrated into:
- Car browsing page (show all car locations)
- Car details page (show specific car location)
- Booking flow (pickup/dropoff selection)
- List car form (location selection for new cars)