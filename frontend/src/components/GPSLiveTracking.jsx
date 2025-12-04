import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigation, MapPin, Clock, Gauge, AlertTriangle, Share2, Phone } from 'lucide-react';
import io from 'socket.io-client';

const GPSLiveTracking = ({ bookingId, userRole = 'user' }) => {
  const { t } = useTranslation();
  const [currentLocation, setCurrentLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [route, setRoute] = useState(null);
  const [trackingData, setTrackingData] = useState({
    speed: 0,
    distance: 0,
    eta: null,
    status: 'inactive'
  });
  const [geofences, setGeofences] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [socket, setSocket] = useState(null);
  const mapRef = useRef();
  const watchIdRef = useRef();

  const mapContainerStyle = {
    width: '100%',
    height: '500px'
  };

  const defaultCenter = {
    lat: -1.286389,
    lng: 36.817223 // Nairobi, Kenya
  };

  useEffect(() => {
    // Initialize WebSocket connection
    const newSocket = io(import.meta.env.VITE_WEBSOCKET_URL || 'http://localhost:5000');
    setSocket(newSocket);

    // Join tracking room
    newSocket.emit('join-tracking', { bookingId, userRole });

    // Listen for location updates
    newSocket.on('location-update', handleLocationUpdate);
    newSocket.on('geofence-alert', handleGeofenceAlert);
    newSocket.on('route-deviation', handleRouteDeviation);

    // Fetch initial data
    fetchTrackingData();
    
    return () => {
      newSocket.disconnect();
      stopTracking();
    };
  }, [bookingId]);

  const fetchTrackingData = async () => {
    try {
      const response = await fetch(`/api/tracking/${bookingId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setCurrentLocation(data.currentLocation);
        setDestination(data.destination);
        setGeofences(data.geofences || []);
        setTrackingData(data.trackingData || {});
      }
    } catch (error) {
      console.error('Failed to fetch tracking data:', error);
    }
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser');
      return;
    }

    setIsTracking(true);
    
    const options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      handlePositionError,
      options
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  };

  const handlePositionUpdate = (position) => {
    const { latitude, longitude, speed, heading } = position.coords;
    const newLocation = {
      lat: latitude,
      lng: longitude,
      speed: speed || 0,
      heading: heading || 0,
      timestamp: new Date().toISOString()
    };

    setCurrentLocation(newLocation);
    
    // Send location update via WebSocket
    if (socket) {
      socket.emit('location-update', {
        bookingId,
        location: newLocation,
        userRole
      });
    }

    // Calculate distance and ETA if destination is set
    if (destination) {
      calculateRouteMetrics(newLocation, destination);
    }

    // Check geofences
    checkGeofenceViolations(newLocation);
  };

  const handlePositionError = (error) => {
    console.error('Geolocation error:', error);
    switch(error.code) {
      case error.PERMISSION_DENIED:
        alert('Location access denied by user');
        break;
      case error.POSITION_UNAVAILABLE:
        alert('Location information is unavailable');
        break;
      case error.TIMEOUT:
        alert('Location request timed out');
        break;
    }
  };

  const handleLocationUpdate = (data) => {
    if (data.userRole !== userRole) {
      setCurrentLocation(data.location);
      setTrackingData(prev => ({ ...prev, ...data.metrics }));
    }
  };

  const handleGeofenceAlert = (alert) => {
    setAlerts(prev => [...prev, alert]);
    
    // Show notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Geofence Alert', {
        body: alert.message,
        icon: '/icon-192x192.png'
      });
    }
  };

  const handleRouteDeviation = (deviation) => {
    setAlerts(prev => [...prev, {
      type: 'route_deviation',
      message: 'Vehicle deviated from planned route',
      data: deviation,
      timestamp: new Date().toISOString()
    }]);
  };

  const calculateRouteMetrics = (current, dest) => {
    const distance = calculateDistance(current.lat, current.lng, dest.lat, dest.lng);
    const speed = current.speed * 3.6; // Convert m/s to km/h
    const eta = speed > 0 ? new Date(Date.now() + (distance / speed) * 60 * 60 * 1000) : null;

    setTrackingData(prev => ({
      ...prev,
      distance,
      speed,
      eta
    }));
  };

  const checkGeofenceViolations = (location) => {
    geofences.forEach(fence => {
      const distance = calculateDistance(
        location.lat, location.lng,
        fence.center.lat, fence.center.lng
      );

      const isInside = distance <= fence.radius;
      const shouldBeInside = fence.type === 'allowed';
      const shouldNotBeInside = fence.type === 'restricted';

      if ((shouldBeInside && !isInside) || (shouldNotBeInside && isInside)) {
        const alert = {
          type: 'geofence_violation',
          fenceId: fence.id,
          fenceName: fence.name,
          violationType: shouldBeInside ? 'exit' : 'entry',
          location,
          timestamp: new Date().toISOString()
        };

        // Emit geofence violation
        if (socket) {
          socket.emit('geofence-violation', { bookingId, alert });
        }
      }
    });
  };

  const shareLocation = async () => {
    if (!currentLocation) return;

    try {
      await fetch('/api/tracking/share-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          bookingId,
          location: currentLocation
        })
      });

      alert('Location shared with emergency contacts');
    } catch (error) {
      console.error('Failed to share location:', error);
    }
  };

  const emergencyCall = () => {
    window.location.href = 'tel:+254911'; // Kenya emergency number
  };

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  if (!currentLocation) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg">
        <Navigation className="text-gray-400 mb-4" size={48} />
        <h3 className="text-lg font-medium text-gray-900 mb-2">GPS Tracking</h3>
        <p className="text-gray-600 text-center mb-4">
          Enable location services to start real-time tracking
        </p>
        <button
          onClick={startTracking}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Start Tracking
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Navigation className="text-blue-500" size={24} />
          <h2 className="text-2xl font-bold">{t('tracking.title')}</h2>
          <div className={`px-2 py-1 rounded-full text-xs ${
            isTracking ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
          }`}>
            {isTracking ? 'Live' : 'Inactive'}
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={shareLocation}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Share2 size={16} />
            <span>Share Location</span>
          </button>
          
          <button
            onClick={emergencyCall}
            className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Phone size={16} />
            <span>Emergency</span>
          </button>
        </div>
      </div>

      {/* Tracking Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-2">
            <Gauge className="text-blue-500" size={20} />
            <div>
              <div className="text-sm text-gray-500">Speed</div>
              <div className="text-lg font-semibold">
                {trackingData.speed?.toFixed(0) || 0} km/h
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-2">
            <MapPin className="text-green-500" size={20} />
            <div>
              <div className="text-sm text-gray-500">Distance</div>
              <div className="text-lg font-semibold">
                {trackingData.distance?.toFixed(1) || 0} km
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-2">
            <Clock className="text-orange-500" size={20} />
            <div>
              <div className="text-sm text-gray-500">ETA</div>
              <div className="text-lg font-semibold">
                {trackingData.eta ? new Date(trackingData.eta).toLocaleTimeString() : '--:--'}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="text-red-500" size={20} />
            <div>
              <div className="text-sm text-gray-500">Alerts</div>
              <div className="text-lg font-semibold">{alerts.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div style={{ width: '100%', height: '500px', position: 'relative' }}>
          {currentLocation ? (
            <iframe
              width="100%"
              height="100%"
              frameBorder="0"
              style={{ border: 0 }}
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${currentLocation.lng - 0.01},${currentLocation.lat - 0.01},${currentLocation.lng + 0.01},${currentLocation.lat + 0.01}&layer=mapnik&marker=${currentLocation.lat},${currentLocation.lng}`}
              allowFullScreen
            ></iframe>
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-100">
              <div className="text-center">
                <MapPin className="mx-auto text-gray-400 mb-2" size={48} />
                <p className="text-gray-600">Waiting for location...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Alerts</h3>
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
              >
                <AlertTriangle className="text-yellow-600" size={20} />
                <div className="flex-1">
                  <div className="font-medium">{alert.type.replace('_', ' ').toUpperCase()}</div>
                  <div className="text-sm text-gray-600">{alert.message}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(alert.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Control Panel */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Tracking Controls</h3>
        <div className="flex flex-wrap gap-3">
          {!isTracking ? (
            <button
              onClick={startTracking}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Start Tracking
            </button>
          ) : (
            <button
              onClick={stopTracking}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Stop Tracking
            </button>
          )}
          
          <button
            onClick={fetchTrackingData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh Data
          </button>
          
          <button
            onClick={() => setAlerts([])}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Clear Alerts
          </button>
        </div>
      </div>
    </div>
  );
};

export default GPSLiveTracking;