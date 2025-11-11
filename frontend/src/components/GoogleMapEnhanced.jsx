import React, { useState, useEffect, useRef, useCallback } from 'react';

// Real Nairobi and Kenya locations with coordinates
const NAIROBI_LOCATIONS = {
  // Nairobi Central Areas
  CBD: { lat: -1.2864, lng: 36.8172, name: "Nairobi CBD", area: "Central Business District" },
  WESTLANDS: { lat: -1.2675, lng: 36.8048, name: "Westlands", area: "Business & Shopping Hub" },
  KAREN: { lat: -1.3197, lng: 36.6854, name: "Karen", area: "Upmarket Residential" },
  KILIMANI: { lat: -1.2930, lng: 36.7878, name: "Kilimani", area: "Modern Apartments" },
  UPPERHILL: { lat: -1.2970, lng: 36.8059, name: "Upper Hill", area: "Financial District" },
  
  // Popular Neighborhoods
  LAVINGTON: { lat: -1.2826, lng: 36.7678, name: "Lavington", area: "Quiet Residential" },
  KILELESHWA: { lat: -1.2885, lng: 36.7873, name: "Kileleshwa", area: "Family Neighborhood" },
  PANGANI: { lat: -1.2586, lng: 36.8414, name: "Pangani", area: "Cultural Hub" },
  SOUTH_B: { lat: -1.3157, lng: 36.8357, name: "South B", area: "Residential Area" },
  SOUTH_C: { lat: -1.3234, lng: 36.8284, name: "South C", area: "Shopping & Dining" },
  
  // Airport and Transport Hubs
  JKIA: { lat: -1.3192, lng: 36.9278, name: "Jomo Kenyatta International Airport", area: "Main Airport" },
  WILSON_AIRPORT: { lat: -1.3218, lng: 36.8148, name: "Wilson Airport", area: "Domestic Flights" },
  RAILWAYS: { lat: -1.2840, lng: 36.8281, name: "Nairobi Railway Station", area: "Transport Hub" },
  
  // Shopping and Business Areas  
  VILLAGE_MARKET: { lat: -1.2410, lng: 36.8037, name: "Village Market", area: "Shopping Mall" },
  SARIT_CENTER: { lat: -1.2664, lng: 36.8018, name: "Sarit Center", area: "Shopping Complex" },
  YAYA_CENTER: { lat: -1.2932, lng: 36.7851, name: "Yaya Center", area: "Shopping & Dining" },
  JUNCTION_MALL: { lat: -1.2586, lng: 36.7623, name: "Junction Mall", area: "Family Shopping" },
  
  // Universities and Institutions
  UNIVERSITY_OF_NAIROBI: { lat: -1.2797, lng: 36.8158, name: "University of Nairobi", area: "Main Campus" },
  KENYATTA_UNIVERSITY: { lat: -1.1847, lng: 36.9275, name: "Kenyatta University", area: "Education Hub" },
  
  // Tourist Attractions
  NAIROBI_NATIONAL_PARK: { lat: -1.3731, lng: 36.8353, name: "Nairobi National Park", area: "Wildlife Safari" },
  KAREN_BLIXEN: { lat: -1.3537, lng: 36.7073, name: "Karen Blixen Museum", area: "Historical Site" },
  GIRAFFE_CENTER: { lat: -1.3683, lng: 36.7456, name: "Giraffe Center", area: "Wildlife Conservation" }
};

// Major Kenyan cities for wider coverage
const KENYA_CITIES = {
  MOMBASA: { lat: -4.0435, lng: 39.6682, name: "Mombasa", area: "Coastal City" },
  KISUMU: { lat: -0.0917, lng: 34.7680, name: "Kisumu", area: "Lake Victoria" },
  NAKURU: { lat: -0.3031, lng: 36.0800, name: "Nakuru", area: "Rift Valley" },
  ELDORET: { lat: 0.5143, lng: 35.2698, name: "Eldoret", area: "Athletics Hub" },
  THIKA: { lat: -1.0332, lng: 37.0693, name: "Thika", area: "Industrial Town" },
  MACHAKOS: { lat: -1.5177, lng: 37.2634, name: "Machakos", area: "Eastern Province" },
  NYERI: { lat: -0.4169, lng: 36.9484, name: "Nyeri", area: "Mount Kenya Region" }
};

// Enhanced Google Maps Component for DriveKenya
const GoogleMap = ({ 
  cars = [], 
  selectedCar = null,
  onLocationSelect = null,
  onCarSelect = null,
  onChatClick = null,
  user = null,
  showRouting = false,
  userLocation = null,
  mapHeight = '400px',
  initialCenter = { lat: -1.2921, lng: 36.8219 }, // Nairobi coordinates
  initialZoom = 12,
  className = ""
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
        loadGoogleMapsAPI();
      }
    };

    checkGoogleMaps();
  }, []);

  // Load Google Maps API dynamically
  const loadGoogleMapsAPI = () => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
      console.log('🗺️ Google Maps API key not configured, using demo mode');
      setIsLoaded(true);
      return;
    }

    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setIsGoogleMapsLoaded(true);
        initializeMap();
      };
      script.onerror = () => {
        console.error('❌ Failed to load Google Maps API');
        setIsLoaded(true);
      };
      document.head.appendChild(script);
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
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: window.google.maps.ControlPosition.TOP_CENTER,
        },
        zoomControl: true,
        zoomControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_CENTER,
        },
        scaleControl: true,
        streetViewControl: true,
        streetViewControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_TOP,
        },
        fullscreenControl: true,
        styles: [
          {
            featureType: 'poi.business',
            elementType: 'labels',
            stylers: [{ visibility: 'on' }]
          },
          {
            featureType: 'poi.attraction',
            elementType: 'labels',
            stylers: [{ visibility: 'on' }]
          },
          {
            featureType: 'transit.station',
            elementType: 'labels',
            stylers: [{ visibility: 'on' }]
          },
          {
            featureType: 'road.highway',
            elementType: 'labels',
            stylers: [{ visibility: 'on' }]
          }
        ]
      });

      setMap(mapInstance);
      setDirectionsService(new window.google.maps.DirectionsService());
      const directionsRendererInstance = new window.google.maps.DirectionsRenderer({
        draggable: true,
        panel: null
      });
      directionsRendererInstance.setMap(mapInstance);
      setDirectionsRenderer(directionsRendererInstance);

      // Add markers for popular Nairobi locations
      addNairobiLocationMarkers(mapInstance);

      // Add click listener for location selection
      if (onLocationSelect) {
        mapInstance.addListener('click', (event) => {
          handleMapClick(event.latLng);
        });
      }

      setIsLoaded(true);
      console.log('🗺️ Google Maps initialized successfully with Nairobi locations');
    } catch (error) {
      console.error('❌ Google Maps initialization failed:', error);
      setIsLoaded(true);
    }
  };

  // Add markers for popular Nairobi locations
  const addNairobiLocationMarkers = (mapInstance) => {
    if (!window.google) return;

    const infoWindow = new window.google.maps.InfoWindow();
    
    // Add markers for major Nairobi locations
    Object.values(NAIROBI_LOCATIONS).forEach(location => {
      const marker = new window.google.maps.Marker({
        position: { lat: location.lat, lng: location.lng },
        map: mapInstance,
        title: location.name,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#3B82F6"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(24, 24),
        }
      });

      marker.addListener('click', () => {
        infoWindow.setContent(`
          <div style="padding: 8px; max-width: 200px;">
            <h3 style="margin: 0 0 4px 0; color: #1f2937; font-size: 14px; font-weight: bold;">${location.name}</h3>
            <p style="margin: 0; color: #6b7280; font-size: 12px;">${location.area}</p>
            <p style="margin: 4px 0 0 0; color: #9ca3af; font-size: 11px;">📍 ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}</p>
          </div>
        `);
        infoWindow.open(mapInstance, marker);
      });
    });
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
      clearUserMarkers();
      const marker = new window.google.maps.Marker({
        position: latLng,
        map: map,
        title: 'Selected Location',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#ef4444"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(32, 32)
        }
      });
      
      // Store user marker separately from car markers
      if (!markers.userMarker) {
        setMarkers(prev => ({ ...prev, userMarker: marker }));
      }
    }
  };

  // Clear user-selected markers (not car markers)
  const clearUserMarkers = () => {
    if (markers.userMarker) {
      markers.userMarker.setMap(null);
      setMarkers(prev => ({ ...prev, userMarker: null }));
    }
  };

  // Clear all markers
  const clearAllMarkers = () => {
    if (markers.carMarkers) {
      markers.carMarkers.forEach(marker => marker.setMap(null));
    }
    clearUserMarkers();
    setMarkers({ carMarkers: [], userMarker: null });
  };

  // Update markers when cars change
  useEffect(() => {
    if (isLoaded && cars.length > 0 && map && window.google) {
      updateCarMarkers();
    }
  }, [isLoaded, cars, map]);

  // Set up global functions for map interactions
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Global car selection handler
      window.handleCarSelect = (carId) => {
        console.log('🚗 Car selected from map:', carId);
        const selectedCar = cars.find(car => car.id === carId);
        if (selectedCar && onCarSelect) {
          onCarSelect(selectedCar);
        }
      };

      // Global chat handler
      window.handleCarChat = (carId) => {
        console.log('💬 Chat requested for car:', carId);
        const selectedCar = cars.find(car => car.id === carId);
        if (selectedCar && onChatClick) {
          onChatClick(selectedCar);
        }
      };

      // Cleanup function
      return () => {
        delete window.handleCarSelect;
        delete window.handleCarChat;
      };
    }
  }, [cars, onCarSelect, onChatClick]);

  // Add car markers to map
  const updateCarMarkers = () => {
    // Clear existing car markers
    if (markers.carMarkers) {
      markers.carMarkers.forEach(marker => marker.setMap(null));
    }
    
    // Use real Nairobi locations for cars
    const carLocations = [
      NAIROBI_LOCATIONS.CBD,
      NAIROBI_LOCATIONS.WESTLANDS,
      NAIROBI_LOCATIONS.KAREN,
      NAIROBI_LOCATIONS.KILIMANI,
      NAIROBI_LOCATIONS.UPPERHILL,
      NAIROBI_LOCATIONS.LAVINGTON,
      NAIROBI_LOCATIONS.KILELESHWA,
      NAIROBI_LOCATIONS.SOUTH_B,
      NAIROBI_LOCATIONS.SOUTH_C,
      NAIROBI_LOCATIONS.VILLAGE_MARKET,
      NAIROBI_LOCATIONS.SARIT_CENTER,
      NAIROBI_LOCATIONS.YAYA_CENTER,
      NAIROBI_LOCATIONS.JKIA,
      NAIROBI_LOCATIONS.WILSON_AIRPORT
    ];
    
    const newMarkers = cars.map((car, index) => {
      // Assign cars to different real locations
      const carLocation = carLocations[index % carLocations.length];
      
      const marker = new window.google.maps.Marker({
        position: { lat: carLocation.lat, lng: carLocation.lng },
        map: map,
        title: `${car.name || car.make} ${car.model || ''}`,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="#3b82f6" stroke="#ffffff" stroke-width="2"/>
              <path d="M5 11l1.5-4.5h11L19 11m-1.5 5a1.5 1.5 0 01-3 0 1.5 1.5 0 013 0zm-11 0a1.5 1.5 0 01-3 0 1.5 1.5 0 013 0zM4 16h16v2H4z" fill="#ffffff"/>
              <text x="12" y="25" text-anchor="middle" fill="#3b82f6" font-size="8" font-weight="bold">🚗</text>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(40, 40),
          anchor: new window.google.maps.Point(20, 20)
        },
        animation: window.google.maps.Animation.DROP
      });

      // Enhanced info window with better styling
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 12px; max-width: 280px; font-family: system-ui, -apple-system, sans-serif;">
            <img src="${car.image || '/api/placeholder/280/160'}" alt="${car.name || car.make}" 
                 style="width: 100%; height: 140px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;">
            <h3 style="margin: 0 0 6px 0; color: #1f2937; font-size: 16px; font-weight: bold;">
              ${car.name || `${car.make} ${car.model}`}
            </h3>
            <div style="display: flex; gap: 12px; margin-bottom: 8px; font-size: 12px; color: #6b7280;">
              <span>📍 ${carLocation.name}</span>
              <span>👥 ${car.seats || 4} seats</span>
              <span>⛽ ${car.fuel || car.fuel_type || 'Petrol'}</span>
            </div>
            <div style="margin-bottom: 8px;">
              <span style="color: #059669; font-weight: bold; font-size: 18px;">
                KSh ${(car.price || car.price_per_day || 3000).toLocaleString()}/day
              </span>
            </div>
            <div style="font-size: 11px; color: #9ca3af; margin-bottom: 10px;">
              ${carLocation.area} • Available Now
            </div>
            <div style="display: flex; gap: 8px;">
              ${onChatClick && user ? `
                <button onclick="window.handleCarChat && window.handleCarChat(${car.id})" 
                        style="flex: 1; background: #10b981; color: white; border: none; padding: 8px 12px; 
                               border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 500;">
                  💬 Chat
                </button>
              ` : ''}
              <button onclick="window.handleCarSelect && window.handleCarSelect(${car.id})" 
                      style="flex: 2; background: #3b82f6; color: white; border: none; padding: 8px 12px; 
                             border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 500;">
                📅 Book Now
              </button>
            </div>
          </div>
        `,
        maxWidth: 300
      });

      marker.addListener('click', () => {
        // Close other info windows
        markers.carMarkers?.forEach(m => {
          if (m.infoWindow) m.infoWindow.close();
        });
        infoWindow.open(map, marker);
        
        if (onCarSelect) {
          onCarSelect(car);
        }
      });

      marker.infoWindow = infoWindow;
      return marker;
    });

    setMarkers(prev => ({ ...prev, carMarkers: newMarkers }));
  };

  // Calculate route between two points
  const calculateRoute = useCallback((origin, destination) => {
    if (!showRouting || !directionsService || !directionsRenderer || !map) {
      return;
    }

    const request = {
      origin: origin,
      destination: destination,
      travelMode: window.google.maps.TravelMode.DRIVING,
    };

    directionsService.route(request, (result, status) => {
      if (status === 'OK') {
        directionsRenderer.setDirections(result);
        
        const route = result.routes[0];
        const leg = route.legs[0];
        
        console.log('🛣️ Route calculated:', {
          distance: leg.distance.text,
          duration: leg.duration.text,
          steps: leg.steps.length
        });
      } else {
        console.error('❌ Directions request failed due to ' + status);
      }
    });
  }, [showRouting, directionsService, directionsRenderer, map]);

  // Demo map with Kenya locations (fallback when Google Maps API is not available)
  const renderDemoMap = () => {
    // Use real Nairobi locations for demo
    const demoLocations = [
      NAIROBI_LOCATIONS.CBD,
      NAIROBI_LOCATIONS.WESTLANDS, 
      NAIROBI_LOCATIONS.KAREN,
      NAIROBI_LOCATIONS.KILIMANI,
      NAIROBI_LOCATIONS.UPPERHILL,
      NAIROBI_LOCATIONS.LAVINGTON,
      NAIROBI_LOCATIONS.SARIT_CENTER,
      NAIROBI_LOCATIONS.YAYA_CENTER
    ];

    return (
      <div className="relative w-full bg-gradient-to-br from-blue-100 via-green-50 to-blue-50 rounded-lg overflow-hidden border-2 border-blue-200" style={{ height: mapHeight }}>
        <div className="absolute inset-0 overflow-auto">
          <div className="text-center p-6">
            <div className="text-5xl mb-3">🗺️</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Interactive Map</h3>
            <p className="text-gray-600 mb-1">Car locations in Nairobi</p>
            <p className="text-xs text-blue-600 mb-6">Scrollable • Real locations • {cars.length} cars available</p>
            
            {/* Enhanced demo location pins with real places */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl mx-auto">
              {cars.map((car, index) => {
                const location = demoLocations[index % demoLocations.length];
                return (
                  <div 
                    key={car.id} 
                    className={`bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-md hover:shadow-xl transition-all cursor-pointer border border-blue-100 hover:border-blue-300 transform hover:scale-105 ${
                      selectedCar && selectedCar.id === car.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => {
                      if (onCarSelect) onCarSelect(car);
                      if (onLocationSelect) {
                        onLocationSelect({
                          id: car.id,
                          name: `${car.name || car.make} ${car.model || ''}`,
                          address: `${location.name}, Nairobi`,
                          lat: location.lat,
                          lng: location.lng,
                          area: location.area
                        });
                      }
                    }}
                  >
                    <div className="text-2xl mb-1">🚗</div>
                    <div className="font-semibold text-sm text-gray-800 mb-1">
                      {car.name || `${car.make} ${car.model}`}
                    </div>
                    <div className="text-xs text-gray-600 mb-1">
                      📍 {location.name}
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      {location.area}
                    </div>
                    <div className="text-sm text-blue-600 font-bold">
                      KSh {(car.price || car.price_per_day || 3000).toLocaleString()}/day
                    </div>
                    {car.available !== false && (
                      <div className="text-xs text-green-600 font-medium mt-1">
                        ✅ Available
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Popular Nairobi areas info */}
            <div className="mt-6 p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-blue-200">
              <h4 className="font-bold text-sm text-gray-800 mb-2">🏙️ Popular Areas Covered</h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div>🏢 CBD & Upper Hill</div>
                <div>🛍️ Westlands & Sarit</div>
                <div>🏘️ Karen & Lavington</div>
                <div>✈️ JKIA & Wilson Airport</div>
                <div>🎓 University Areas</div>
                <div>🦒 Tourist Attractions</div>
              </div>
            </div>

            {/* Location selection info */}
            {onLocationSelect && (
              <div className="mt-4 p-3 bg-blue-50/80 backdrop-blur-sm rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  📍 Click on car locations to select pickup point
                </p>
                {selectedLocation && (
                  <div className="mt-2 text-sm font-semibold text-blue-700">
                    Selected: {selectedLocation.name} • {selectedLocation.area}
                  </div>
                )}
              </div>
            )}

            {/* API key setup hint */}
            <div className="mt-4 p-3 bg-yellow-100/80 backdrop-blur-sm rounded-lg border border-yellow-200">
              <p className="text-xs text-yellow-800 font-medium">
                💡 Add Google Maps API key to .env for full interactive map with real Google Maps
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (!isLoaded) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`} style={{ height: mapHeight }}>
        <div className="text-center">
          <div className="animate-spin text-4xl mb-2">🗺️</div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  // Render Google Maps or demo
  return (
    <div className={`w-full ${className}`}>
      {isGoogleMapsLoaded ? (
        <div 
          ref={mapRef} 
          className="w-full rounded-lg shadow-md"
          style={{ height: mapHeight }}
        />
      ) : (
        renderDemoMap()
      )}
      
      {/* Map controls */}
      {isGoogleMapsLoaded && onLocationSelect && (
        <div className="mt-2 text-center">
          <p className="text-sm text-gray-600">
            📍 Click on the map to select a location
          </p>
        </div>
      )}
    </div>
  );
};

// Expose selectCar function globally for info window buttons (legacy support)
if (typeof window !== 'undefined') {
  window.selectCar = (carId) => {
    console.log('🚗 Car selected from map:', carId);
    // This will be handled by the onCarSelect prop
  };
}

export default GoogleMap;