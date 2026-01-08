import React, { useState, useEffect, useRef } from 'react';
import { Car, Navigation, Clock, MapPin, AlertCircle, Signal } from 'lucide-react';
import io from 'socket.io-client';

/**
 * Live Tracking Map Component
 * Real-time vehicle tracking like Uber/Bolt
 * Shows live location updates via WebSockets
 */
const LiveTrackingMap = ({ 
  bookingId, 
  apiUrl = 'http://localhost:5000',
  onTrackingDataUpdate = null,
  showRoute = true,
  className = ""
}) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [carMarker, setCarMarker] = useState(null);
  const [destinationMarker, setDestinationMarker] = useState(null);
  const [routePolyline, setRoutePolyline] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);

  // Initialize Google Map
  useEffect(() => {
    if (!window.google || !window.google.maps || !mapRef.current) {
      setError('Google Maps not loaded');
      return;
    }

    try {
      const newMap = new window.google.maps.Map(mapRef.current, {
        center: { lat: -1.2921, lng: 36.8219 }, // Nairobi center
        zoom: 14,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'on' }]
          }
        ],
        mapTypeControl: true,
        mapTypeControlOptions: {
          position: window.google.maps.ControlPosition.TOP_RIGHT
        },
        fullscreenControl: true,
        streetViewControl: true,
        zoomControl: true,
        zoomControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_CENTER
        }
      });

      setMap(newMap);
      console.log('🗺️ Map initialized');
    } catch (error) {
      console.error('Error initializing map:', error);
      setError('Failed to initialize map');
    }
  }, []);

  // Setup WebSocket connection for real-time updates
  useEffect(() => {
    if (!bookingId) return;

    const token = localStorage.getItem('driveKenya_token');
    
    const newSocket = io(apiUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('🔌 WebSocket connected');
      setIsConnected(true);
      newSocket.emit('join-tracking', { bookingId });
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      setIsConnected(false);
    });

    // Listen for real-time location updates
    newSocket.on('location-update', (data) => {
      console.log('📍 Real-time location update:', data);
      
      if (data.location) {
        updateCarMarker(data.location);
        setLocationHistory(prev => [...prev, data.location].slice(-50)); // Keep last 50 points
        
        if (onTrackingDataUpdate) {
          onTrackingDataUpdate(data);
        }
      }
    });

    // Listen for tracking data updates
    newSocket.on('tracking-update', (data) => {
      console.log('📊 Tracking data update:', data);
      setTrackingData(data);
    });

    setSocket(newSocket);

    return () => {
      console.log('🔌 Cleaning up WebSocket connection');
      newSocket.disconnect();
    };
  }, [bookingId, apiUrl, onTrackingDataUpdate]);

  // Fetch initial tracking data
  useEffect(() => {
    if (!bookingId) return;

    const fetchInitialData = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/tracking/${bookingId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('driveKenya_token')}`
          }
        });

        if (!response.ok) throw new Error('Failed to fetch tracking data');

        const data = await response.json();
        console.log('📊 Initial tracking data:', data);

        if (data.success) {
          setTrackingData(data.trackingData);
          
          // Set initial car location
          if (data.currentLocation) {
            updateCarMarker(data.currentLocation);
          }

          // Set destination
          if (data.destination && map) {
            addDestinationMarker(data.destination);
          }

          // Draw route if enabled
          if (showRoute && data.currentLocation && data.destination) {
            drawRoute(data.currentLocation, data.destination);
          }
        }
      } catch (error) {
        console.error('❌ Error fetching initial tracking data:', error);
        setError('Failed to load tracking data');
      }
    };

    fetchInitialData();
  }, [bookingId, apiUrl, map, showRoute]);

  // Update car marker on map
  const updateCarMarker = (location) => {
    if (!map || !location) return;

    const position = { lat: location.lat, lng: location.lng };

    if (carMarker) {
      // Animate marker movement
      animateMarker(carMarker, position);
      
      // Update icon rotation based on heading
      if (location.heading !== undefined) {
        carMarker.setIcon({
          path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#4F46E5',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
          rotation: location.heading
        });
      }
    } else {
      // Create new car marker
      const newMarker = new window.google.maps.Marker({
        position,
        map,
        title: 'Vehicle Location',
        icon: {
          path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#4F46E5',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
          rotation: location.heading || 0
        },
        zIndex: 1000
      });

      // Add info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold;">Vehicle</h3>
            <p style="margin: 0;">Speed: ${location.speed?.toFixed(1) || 0} km/h</p>
          </div>
        `
      });

      newMarker.addListener('click', () => {
        infoWindow.open(map, newMarker);
      });

      setCarMarker(newMarker);
    }

    // Update tracking data display
    setTrackingData(prev => ({
      ...prev,
      speed: location.speed || 0,
      lastUpdate: location.timestamp || new Date().toISOString()
    }));

    // Smoothly pan to car location
    map.panTo(position);
  };

  // Animate marker movement
  const animateMarker = (marker, destination) => {
    const start = marker.getPosition();
    const end = new window.google.maps.LatLng(destination.lat, destination.lng);
    
    let step = 0;
    const steps = 30; // Number of animation frames
    
    const animate = () => {
      step++;
      if (step > steps) return;
      
      const progress = step / steps;
      const lat = start.lat() + (end.lat() - start.lat()) * progress;
      const lng = start.lng() + (end.lng() - start.lng()) * progress;
      
      marker.setPosition(new window.google.maps.LatLng(lat, lng));
      
      if (step < steps) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  };

  // Add destination marker
  const addDestinationMarker = (destination) => {
    if (!map || !destination) return;

    if (destinationMarker) {
      destinationMarker.setPosition(destination);
    } else {
      const marker = new window.google.maps.Marker({
        position: destination,
        map,
        title: 'Destination',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#10B981',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2
        },
        label: {
          text: 'D',
          color: '#FFFFFF',
          fontWeight: 'bold'
        }
      });
      setDestinationMarker(marker);
    }
  };

  // Draw route between current location and destination
  const drawRoute = async (origin, destination) => {
    if (!map || !window.google.maps.DirectionsService) return;

    try {
      const directionsService = new window.google.maps.DirectionsService();
      const request = {
        origin: new window.google.maps.LatLng(origin.lat, origin.lng),
        destination: new window.google.maps.LatLng(destination.lat, destination.lng),
        travelMode: window.google.maps.TravelMode.DRIVING
      };

      directionsService.route(request, (result, status) => {
        if (status === 'OK') {
          // Remove old route
          if (routePolyline) {
            routePolyline.setMap(null);
          }

          // Draw new route
          const route = result.routes[0];
          const polyline = new window.google.maps.Polyline({
            path: route.overview_path,
            geodesic: true,
            strokeColor: '#4F46E5',
            strokeOpacity: 0.7,
            strokeWeight: 4,
            map
          });

          setRoutePolyline(polyline);

          // Update ETA
          const duration = route.legs[0].duration.text;
          const distance = route.legs[0].distance.text;
          
          setTrackingData(prev => ({
            ...prev,
            eta: duration,
            distance: distance
          }));
        } else {
          console.error('Directions request failed:', status);
        }
      });
    } catch (error) {
      console.error('Error drawing route:', error);
    }
  };

  // Format timestamp for display
  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Map Container */}
      <div ref={mapRef} className="w-full h-full rounded-lg" />

      {/* Error Message */}
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Tracking Info Overlay */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-xs">
        <div className="flex items-center gap-2 mb-3">
          <Car className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Live Tracking</h3>
        </div>
        
        {trackingData ? (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700">
                Speed: <span className="font-medium">{trackingData.speed?.toFixed(1) || 0} km/h</span>
              </span>
            </div>
            
            {trackingData.distance && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700">
                  Distance: <span className="font-medium">{trackingData.distance}</span>
                </span>
              </div>
            )}
            
            {trackingData.eta && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700">
                  ETA: <span className="font-medium">{trackingData.eta}</span>
                </span>
              </div>
            )}
            
            <div className="pt-2 border-t border-gray-200 text-xs text-gray-500">
              Last update: {formatTime(trackingData.lastUpdate)}
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">Loading tracking data...</div>
        )}
      </div>

      {/* Connection Status */}
      <div className="absolute top-4 right-4">
        <div className={`px-3 py-2 rounded-full text-xs font-medium flex items-center gap-2 shadow-lg ${
          isConnected 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          <Signal className="w-3 h-3" />
          {isConnected ? 'Live' : 'Offline'}
        </div>
      </div>

      {/* Location History Trail */}
      {locationHistory.length > 1 && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg px-3 py-2 text-xs text-gray-600">
          Tracking {locationHistory.length} location points
        </div>
      )}
    </div>
  );
};

export default LiveTrackingMap;
