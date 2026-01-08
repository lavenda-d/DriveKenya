import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import LocationSearchInput from './LocationSearchInput';
import LocationTracker from '../services/locationTracker';
import { genericAPI } from '../services/api';

/**
 * Google Maps Integration Test Page
 * Use this to verify all components are working
 */
const GoogleMapsTestPage = () => {
  const [tests, setTests] = useState({
    apiKey: { status: 'pending', message: '' },
    googleMapsLoaded: { status: 'pending', message: '' },
    placesAPI: { status: 'pending', message: '' },
    gpsPermission: { status: 'pending', message: '' },
    gpsAccuracy: { status: 'pending', message: '' },
    webSocket: { status: 'pending', message: '' }
  });

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [tracker, setTracker] = useState(null);

  useEffect(() => {
    runTests();
  }, []);

  const runTests = async () => {
    // Test 1: API Key Configuration
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    updateTest('apiKey', 
      apiKey && apiKey !== 'your_google_maps_api_key_here' ? 'pass' : 'fail',
      apiKey ? `Key: ${apiKey.substring(0, 10)}...` : 'API key not configured'
    );

    // Test 2: Google Maps Library
    setTimeout(() => {
      const loaded = window.google && window.google.maps;
      updateTest('googleMapsLoaded',
        loaded ? 'pass' : 'fail',
        loaded ? 'Google Maps JavaScript API loaded' : 'Google Maps not loaded. Check API key and script.'
      );
    }, 2000);

    // Test 3: Places API
    setTimeout(() => {
      const placesLoaded = window.google?.maps?.places;
      updateTest('placesAPI',
        placesLoaded ? 'pass' : 'fail',
        placesLoaded ? 'Places API available' : 'Places API not loaded. Enable in Google Cloud Console.'
      );
    }, 2500);

    // Test 4: GPS Permission
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      updateTest('gpsPermission',
        permission.state === 'granted' ? 'pass' : permission.state === 'prompt' ? 'warning' : 'fail',
        `GPS Permission: ${permission.state}`
      );
    } catch (error) {
      updateTest('gpsPermission', 'fail', 'Permission API not supported');
    }

    // Test 5: GPS Accuracy
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentPosition(position.coords);
          updateTest('gpsAccuracy',
            position.coords.accuracy < 50 ? 'pass' : 'warning',
            `Accuracy: ${position.coords.accuracy.toFixed(0)}m (${position.coords.accuracy < 50 ? 'Good' : 'Fair'})`
          );
        },
        (error) => {
          updateTest('gpsAccuracy', 'fail', `GPS Error: ${error.message}`);
        },
        { enableHighAccuracy: true }
      );
    } else {
      updateTest('gpsAccuracy', 'fail', 'Geolocation not supported');
    }

    // Test 6: WebSocket Connection
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/health`);
      updateTest('webSocket',
        response.ok ? 'pass' : 'fail',
        response.ok ? 'Backend API reachable' : 'Cannot connect to backend'
      );
    } catch (error) {
      updateTest('webSocket', 'fail', 'Backend not running. Start server first.');
    }
  };

  const updateTest = (testName, status, message) => {
    setTests(prev => ({
      ...prev,
      [testName]: { status, message }
    }));
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    }
  };

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    console.log('📍 Location selected:', location);
  };

  const testTracking = () => {
    if (tracker) {
      tracker.stopTracking();
      setTracker(null);
      return;
    }

    // Create dummy booking for testing
    const dummyBookingId = 999;
    const newTracker = new LocationTracker(dummyBookingId, genericAPI);
    
    newTracker.setLocationUpdateCallback((location) => {
      console.log('📍 Tracking update:', location);
      setCurrentPosition(location);
    });

    newTracker.setErrorCallback((error) => {
      console.error('❌ Tracking error:', error);
      alert(`Tracking Error: ${error.message}`);
    });

    newTracker.startTracking();
    setTracker(newTracker);
  };

  const allTestsPassed = Object.values(tests).every(t => t.status === 'pass');

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🗺️ Google Maps Integration Test
          </h1>
          <p className="text-gray-600">
            Verify all components are working correctly
          </p>
        </div>

        {/* System Tests */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            System Tests
          </h2>
          <div className="space-y-3">
            {Object.entries(tests).map(([key, test]) => (
              <div key={key} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                <div className="flex-shrink-0 mt-0.5">
                  {getStatusIcon(test.status)}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {test.message || 'Testing...'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {allTestsPassed && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">All tests passed! ✓</span>
              </div>
            </div>
          )}
        </div>

        {/* Location Search Test */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Location Search Test
          </h2>
          <LocationSearchInput
            onLocationSelect={handleLocationSelect}
            placeholder="Try searching: Westlands, JKIA, Karen, etc."
            label="Search any location in Kenya"
          />
          
          {selectedLocation && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Selected Location:</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <div><strong>Name:</strong> {selectedLocation.name}</div>
                <div><strong>Address:</strong> {selectedLocation.address}</div>
                <div><strong>Coordinates:</strong> {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}</div>
                <div><strong>Place ID:</strong> {selectedLocation.placeId}</div>
              </div>
            </div>
          )}
        </div>

        {/* GPS Tracking Test */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            GPS Tracking Test
          </h2>
          
          <button
            onClick={testTracking}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              tracker
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {tracker ? '🛑 Stop Tracking' : '▶️ Start Tracking'}
          </button>

          {currentPosition && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Current Position:</h3>
              <div className="text-sm text-gray-700 space-y-1">
                <div><strong>Latitude:</strong> {currentPosition.latitude?.toFixed(6)}</div>
                <div><strong>Longitude:</strong> {currentPosition.longitude?.toFixed(6)}</div>
                <div><strong>Accuracy:</strong> {currentPosition.accuracy?.toFixed(0)}m</div>
                {currentPosition.speed > 0 && (
                  <div><strong>Speed:</strong> {(currentPosition.speed * 3.6).toFixed(1)} km/h</div>
                )}
                {currentPosition.heading && (
                  <div><strong>Heading:</strong> {currentPosition.heading.toFixed(0)}°</div>
                )}
              </div>
            </div>
          )}

          {tracker && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              📡 Tracking active - Sending location updates every 5 seconds. Check console for logs.
            </div>
          )}
        </div>

        {/* Next Steps */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Next Steps
          </h2>
          <div className="space-y-3 text-gray-700">
            <div className="flex items-start gap-2">
              <span className="font-medium">1.</span>
              <span>If all tests pass, you can integrate the components into your app</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium">2.</span>
              <span>Add LocationSearchInput to your car listing form</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium">3.</span>
              <span>Use LocationTracker in driver/owner dashboard during trips</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium">4.</span>
              <span>Add LiveTrackingMap to booking details for customers</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium">5.</span>
              <span>Test on mobile device for real GPS tracking</span>
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-800">
              📚 <strong>Documentation:</strong> See GOOGLE_MAPS_QUICK_START.md and GOOGLE_MAPS_LIVE_TRACKING_GUIDE.md for detailed instructions.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleMapsTestPage;
