# Google Maps Integration - Quick Start

## ✅ What's Been Implemented

### 1. **How Uber/Bolt Track Vehicles** 
Your system now uses the same technology:
- **GPS Tracking**: `locationTracker.js` gets device location every 5 seconds
- **WebSockets**: Real-time updates via Socket.io
- **Backend API**: `routes/tracking.js` stores and broadcasts locations
- **Live Map**: `LiveTrackingMap.jsx` shows moving cars in real-time

### 2. **Search ALL Locations in Kenya**
- **LocationSearchInput.jsx**: Uses Google Places Autocomplete
- Search ANY place: streets, estates, buildings, landmarks, cities
- Not limited to predefined locations anymore
- Works for entire Kenya, not just Nairobi

### 3. **Complete Integration**
All components work together:
```
Mobile GPS → locationTracker.js → Backend API → WebSocket → LiveTrackingMap.jsx → Google Maps
```

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Get Google Maps API Key
1. Go to https://console.cloud.google.com/
2. Create project: "DriveKenya"
3. Enable APIs:
   - Maps JavaScript API ✓
   - Places API ✓  
   - Directions API ✓
   - Geocoding API ✓
   - Distance Matrix API ✓
4. Create API Key
5. Restrict to your domain

### Step 2: Configure Environment
```bash
# Add to frontend/.env
VITE_GOOGLE_MAPS_API_KEY=AIza...your-key...xyz
```

### Step 3: Install Dependencies
```bash
cd frontend
npm install @googlemaps/js-api-loader socket.io-client
npm install @types/google.maps --save-dev
```

### Step 4: Test It
```bash
# Terminal 1 - Backend
cd backend-nodejs
npm start

# Terminal 2 - Frontend  
cd frontend
npm run dev

# Open browser: http://localhost:3000
```

---

## 📱 Usage Examples

### For Car Owners - Set Location
```javascript
import LocationSearchInput from './components/LocationSearchInput';

<LocationSearchInput
  placeholder="Where is your car located?"
  onLocationSelect={(location) => {
    console.log('Selected:', location);
    // location = { lat, lng, name, address, placeId }
    setCarLocation(location);
  }}
/>
```

### For Drivers - Start Tracking
```javascript
import LocationTracker from './services/locationTracker';
import { genericAPI } from './services/api';

// When trip starts
const tracker = new LocationTracker(bookingId, genericAPI);

tracker.setLocationUpdateCallback((location) => {
  console.log('Current location:', location);
});

tracker.startTracking(); // Starts sending GPS updates every 5s

// When trip ends
tracker.stopTracking();
```

### For Customers - View Live Tracking
```javascript
import LiveTrackingMap from './components/LiveTrackingMap';

<LiveTrackingMap 
  bookingId={booking.id}
  apiUrl="http://localhost:5000"
  showRoute={true}
  onTrackingDataUpdate={(data) => {
    console.log('Vehicle speed:', data.location.speed);
  }}
/>
```

---

## 🗺️ How It Works

### 1. **Location Search (Places API)**
```
User types "Westlands Mall" 
→ Google Places Autocomplete suggests matches
→ User selects location
→ Returns: { lat: -1.2675, lng: 36.8048, name: "Westlands Mall", address: "..." }
→ Saved to database
```

### 2. **Live Tracking (GPS + WebSockets)**
```
Driver's Phone GPS
↓ (every 5 seconds)
locationTracker.js
↓
POST /api/tracking/:bookingId/location
↓
Backend stores in location_history table
↓
Socket.io broadcasts to subscribed clients
↓
Customer's LiveTrackingMap.jsx receives update
↓
Google Maps marker moves in real-time
```

### 3. **Route Calculation (Directions API)**
```
Current Location + Destination
↓
Google Directions API
↓
Returns: route path, distance, ETA
↓
Drawn on map as blue line
↓
Shows: "12 km, ETA 25 mins"
```

---

## 📊 Database Schema

Your system uses these tables:

```sql
-- Stores all GPS points
location_history (
  id, booking_id, car_id,
  latitude, longitude, 
  speed, heading, accuracy,
  timestamp
)

-- Geofences for restricted areas
geofences (
  id, name, latitude, longitude,
  radius_km, type, booking_id
)

-- Emergency location sharing
location_shares (
  id, user_id, booking_id,
  latitude, longitude, shared_at
)
```

---

## 🎯 Features Enabled

✅ **Search ANY location** - Streets, estates, buildings, landmarks  
✅ **Live GPS tracking** - Like Uber/Bolt  
✅ **Real-time map updates** - WebSocket connection  
✅ **Speed & heading display** - km/h and direction  
✅ **ETA calculation** - Auto-updated based on route  
✅ **Route visualization** - Blue line showing path  
✅ **Location history** - Trail of movement  
✅ **Emergency sharing** - Share location with contacts  
✅ **Geofencing** - Alerts for restricted areas  
✅ **Offline handling** - Queues updates when offline  

---

## 🔧 Troubleshooting

### Map not loading?
```javascript
// Check console for errors
console.log('Google Maps loaded?', window.google?.maps);

// Verify API key in .env
console.log(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
```

### Location permission denied?
```javascript
// Check browser permission
navigator.permissions.query({ name: 'geolocation' })
  .then(result => console.log('Permission:', result.state));

// Request permission
navigator.geolocation.getCurrentPosition(
  (pos) => console.log('Granted:', pos),
  (err) => console.error('Denied:', err)
);
```

### WebSocket not connecting?
```javascript
// Check backend is running
fetch('http://localhost:5000/api/health')
  .then(r => r.json())
  .then(console.log);

// Check Socket.io connection
const socket = io('http://localhost:5000');
socket.on('connect', () => console.log('Connected!'));
socket.on('error', console.error);
```

### Tracking not updating?
```javascript
// Verify GPS is working
navigator.geolocation.watchPosition(
  (pos) => console.log('GPS:', pos.coords),
  (err) => console.error('GPS Error:', err),
  { enableHighAccuracy: true }
);
```

---

## 💰 Cost Optimization

Google Maps APIs have FREE tier:
- **28,500 map loads/month** - FREE
- **40,000 API calls/month** - FREE

To stay within limits:

### 1. Cache geocoding results
```javascript
const cache = new Map();
const geocode = async (address) => {
  if (cache.has(address)) return cache.get(address);
  const result = await googleMapsAPI.geocode(address);
  cache.set(address, result);
  return result;
};
```

### 2. Throttle location updates
```javascript
// Only send updates every 5-10 seconds
tracker.setUpdateInterval(10000); // 10 seconds
```

### 3. Batch API calls
```javascript
// Send multiple locations in one request
const locations = [loc1, loc2, loc3];
await api.post('/tracking/batch', { locations });
```

---

## 📱 Mobile App Considerations

### Battery Usage
- Continuous GPS = ~20% battery per hour
- Use `significantLocationChanges` on iOS to reduce drain
- Only track during active trips

### Data Usage
- Location update = ~200 bytes
- At 5s intervals = ~14 KB per minute
- 1 hour trip = ~850 KB data

### Accuracy
- **Indoor**: 10-50 meters
- **Outdoor**: 5-10 meters  
- **With WiFi/Cell**: 20-30 meters
- **GPS only**: 3-5 meters

---

## 🔒 Privacy & Security

### User Consent
```javascript
// Always ask permission
const permission = await navigator.permissions.query({ name: 'geolocation' });
if (permission.state === 'prompt') {
  // Show explanation before requesting
  showLocationPermissionDialog();
}
```

### Data Retention
```sql
-- Delete old location history (keep 30 days)
DELETE FROM location_history 
WHERE timestamp < datetime('now', '-30 days');
```

### Secure Transmission
```javascript
// Always use HTTPS in production
const apiUrl = process.env.NODE_ENV === 'production'
  ? 'https://api.drivekenya.com'
  : 'http://localhost:5000';
```

---

## 🎓 Learn More

- **Full Guide**: See `GOOGLE_MAPS_LIVE_TRACKING_GUIDE.md`
- **Google Maps Docs**: https://developers.google.com/maps
- **Socket.io Docs**: https://socket.io/docs/v4/
- **Geolocation API**: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API

---

## ✨ What Makes This Like Uber/Bolt?

1. **Real-time Updates** ✓  
   Location sent every 5 seconds, not on demand

2. **WebSocket Connection** ✓  
   Bi-directional, instant updates

3. **Smooth Animation** ✓  
   Marker slides between points, not jumps

4. **Accurate ETA** ✓  
   Recalculated based on traffic & route

5. **Live Map** ✓  
   Both driver and customer see same info

6. **Location History** ✓  
   Trail showing where vehicle has been

---

**🎉 You're all set! Your car hiring system now has professional-grade GPS tracking!**

Need help? Check the full guide or contact support.
