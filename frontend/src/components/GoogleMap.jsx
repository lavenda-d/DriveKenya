import React, { useState, useEffect, useRef, useCallback } from 'react';

// Google Maps Component for DriveKenya
const GoogleMap = ({ 
  cars = [], 
  selectedCar = null,
  onLocationSelect = null,
  showRouting = false,
  userLocation = null,
  mapHeight = '400px',
  initialCenter = { lat: -1.2921, lng: 36.8219 }, // Nairobi coordinates
  initialZoom = 12
}) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [directionsService, setDirectionsService] = useState(null);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);

  // Check if Google Maps API is available
  useEffect(() => {
    const checkGoogleMaps = () => {
      if (window.google && window.google.maps) {
        setIsGoogleMapsLoaded(true);
        initializeMap();
      } else {
        // Try to load Google Maps API
        loadGoogleMapsAPI();
      }
    };

    checkGoogleMaps();
  }, []);

  // Load Google Maps API dynamically
  const loadGoogleMapsAPI = () => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    console.log('🔑 Google Maps API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'Not found');
    
    if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
      console.error('❌ Google Maps API key not configured in .env file');
      console.log('💡 Add VITE_GOOGLE_MAPS_API_KEY to frontend/.env and restart dev server');
      setIsLoaded(true);
      return;
    }

    if (!window.google) {
      console.log('📥 Loading Google Maps API...');
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('✅ Google Maps API loaded successfully');
        setIsGoogleMapsLoaded(true);
        initializeMap();
      };
      script.onerror = (error) => {
        console.error('❌ Failed to load Google Maps API. Check if:', error);
        console.error('   1. API key is valid');
        console.error('   2. Maps JavaScript API is enabled in Google Cloud Console');
        console.error('   3. Billing is enabled for your Google Cloud project');
        setIsLoaded(true);
      };
      document.head.appendChild(script);
    } else {
      console.log('✅ Google Maps already loaded');
      setIsGoogleMapsLoaded(true);
      initializeMap();
    }
  };

  // Initialize Google Maps
  const initializeMap = async () => {
    if (!mapRef.current || !window.google) {
      setIsLoaded(true);
      return;
    }

    try {
      const mapInstance = new window.google.maps.Map(mapRef.current, {
        center: initialCenter,
        zoom: initialZoom,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      setMap(mapInstance);
      setDirectionsService(new window.google.maps.DirectionsService());
      setDirectionsRenderer(new window.google.maps.DirectionsRenderer());

      // Add click listener for location selection
      if (onLocationSelect) {
        mapInstance.addListener('click', (event) => {
          handleMapClick(event.latLng);
        });
      }

      setIsLoaded(true);
      console.log('🗺️ Google Maps initialized successfully');
    } catch (error) {
      console.error('❌ Google Maps initialization failed:', error);
      setIsLoaded(true);
    }
  };

  // Handle map click for location selection
  const handleMapClick = (latLng) => {
    const location = {
      lat: latLng.lat(),
      lng: latLng.lng(),
      name: 'Selected Location',
      address: `${latLng.lat().toFixed(6)}, ${latLng.lng().toFixed(6)}`
    };

    setSelectedLocation(location);
    if (onLocationSelect) {
      onLocationSelect(location);
    }

    // Add marker for selected location
    if (map && window.google) {
      clearMarkers();
      const marker = new window.google.maps.Marker({
        position: latLng,
        map: map,
        title: 'Selected Location',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#ef4444"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(32, 32)
        }
      });
      setMarkers([marker]);
    }
  };

  // Clear existing markers
  const clearMarkers = () => {
    markers.forEach(marker => marker.setMap(null));
    setMarkers([]);
  };

  // Update markers when cars change
  useEffect(() => {
    if (isLoaded && cars.length > 0 && map && window.google) {
      updateCarMarkers();
    }
  }, [isLoaded, cars, map]);

  // Add car markers to map
  const updateCarMarkers = () => {
    clearMarkers();
    
    const newMarkers = cars.map(car => {
      // Generate realistic coordinates around Nairobi
      const nairobiLocations = [
        { lat: -1.2921, lng: 36.8219 }, // CBD
        { lat: -1.3033, lng: 36.7856 }, // Karen
        { lat: -1.2574, lng: 36.7871 }, // Westlands
        { lat: -1.2637, lng: 36.8084 }, // Kilimani
        { lat: -1.2844, lng: 36.8212 }, // Upper Hill
        { lat: -1.3197, lng: 36.7854 }  // Langata
      ];
      
      const randomLocation = nairobiLocations[car.id % nairobiLocations.length];
      
      const marker = new window.google.maps.Marker({
        position: randomLocation,
        map: map,
        title: `${car.make} ${car.model}`,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 11l1.5-4.5h11L19 11m-1.5 5a1.5 1.5 0 01-3 0 1.5 1.5 0 013 0zm-11 0a1.5 1.5 0 01-3 0 1.5 1.5 0 013 0zM4 16h16v2H4z" fill="#3b82f6"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(32, 32)
        }
      });

      // Add info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div class="p-3 max-w-sm">
            <img src="${car.image_url}" alt="${car.make} ${car.model}" class="w-full h-32 object-cover rounded mb-2">
            <h3 class="font-bold text-lg">${car.make} ${car.model}</h3>
            <p class="text-gray-600">${car.year} • ${car.fuel_type}</p>
            <p class="text-blue-600 font-semibold">KSh ${car.price_per_day}/day</p>
            <button class="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 w-full" onclick="window.selectCar(${car.id})">
              Select Car
            </button>
          </div>
        `
      });

      marker.addListener('click', () => {
        // Close other info windows
        markers.forEach(m => {
          if (m.infoWindow) m.infoWindow.close();
        });
        infoWindow.open(map, marker);
      });

      marker.infoWindow = infoWindow;
      return marker;
    });

    setMarkers(newMarkers);
  };
      console.log('📍 Updating car markers on map');
      // Here you would create markers for each car location
      cars.forEach((car, index) => {
        console.log(`🚗 Car ${index + 1}: ${car.name} at ${car.location || 'Nairobi'}`);
      });
    }
  }, [isLoaded, cars]);

  // Handle map click for location selection
  const handleMapClick = useCallback((event) => {
    if (onLocationSelect) {
      const location = {
        lat: event.latLng?.lat() || 0,
        lng: event.latLng?.lng() || 0,
        address: 'Selected Location' // In real implementation, reverse geocode this
      };
      setSelectedLocation(location);
      onLocationSelect(location);
      console.log('📍 Location selected:', location);
    }
  }, [onLocationSelect]);

  // Calculate route between two points
  const calculateRoute = useCallback((origin, destination) => {
    if (showRouting && directionsService && directionsRenderer) {
      console.log('🛣️ Calculating route from', origin, 'to', destination);
      // In real implementation, use Google Directions API
      const mockRoute = {
        distance: '12.5 km',
        duration: '25 minutes',
        cost: 'KSh 250'
      };
      console.log('📊 Route calculated:', mockRoute);
      return mockRoute;
    }
  }, [showRouting, directionsService, directionsRenderer]);

  // Demo map with Kenya locations
  const renderDemoMap = () => (
    <div className="relative w-full bg-gradient-to-br from-blue-100 to-green-100 rounded-lg overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🗺️</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Google Maps Integration</h3>
          <p className="text-gray-600 mb-4">Interactive map with car locations</p>
          
          {/* Demo location pins */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            {cars.slice(0, 4).map((car, index) => (
              <div 
                key={car.id} 
                className="bg-white/80 backdrop-blur-sm p-3 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer"
                onClick={() => console.log('📍 Car selected:', car.name)}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">📍</span>
                  <div className="text-left">
                    <div className="font-semibold text-sm">{car.name}</div>
                    <div className="text-xs text-gray-600">{car.location || 'Nairobi'}</div>
                    <div className="text-xs text-green-600">KSh {car.price?.toLocaleString()}/day</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Map controls */}
          <div className="flex justify-center space-x-2 mt-6">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
              📍 My Location
            </button>
            <button className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors">
              🛣️ Directions
            </button>
            <button className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 transition-colors">
              🔍 Search Area
            </button>
          </div>

          {/* Status indicator */}
          <div className="mt-4 inline-flex items-center space-x-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
            <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
            <span>Demo Mode - Add Google Maps API key to activate</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full" style={{ height: mapHeight }}>
      {/* Map container */}
      <div 
        ref={mapRef}
        className="w-full h-full rounded-lg shadow-lg"
        style={{ minHeight: '300px' }}
      >
        {renderDemoMap()}
      </div>

      {/* Map overlay controls */}
      {selectedLocation && (
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg">
          <div className="text-sm font-semibold">📍 Selected Location</div>
          <div className="text-xs text-gray-600">
            {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
          </div>
          <div className="text-xs text-gray-600">{selectedLocation.address}</div>
        </div>
      )}

      {/* Loading indicator */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <div className="text-sm text-gray-600">Loading map...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleMap;