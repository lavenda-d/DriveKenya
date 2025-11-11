import React, { useState, useEffect } from 'react';

const LocationPicker = ({ 
  onLocationSelect, 
  placeholder = "Enter location...",
  initialValue = "",
  showCurrentLocation = true,
  className = ""
}) => {
  const [searchValue, setSearchValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  // Nairobi area suggestions for demo
  const nairobiLocations = [
    { id: 1, name: "JKIA (Jomo Kenyatta International Airport)", area: "Airport", coordinates: { lat: -1.3192, lng: 36.9278 } },
    { id: 2, name: "Westlands", area: "Business District", coordinates: { lat: -1.2676, lng: 36.8108 } },
    { id: 3, name: "Karen", area: "Residential", coordinates: { lat: -1.3197, lng: 36.6859 } },
    { id: 4, name: "Kilimani", area: "Residential", coordinates: { lat: -1.2905, lng: 36.7873 } },
    { id: 5, name: "CBD (Central Business District)", area: "City Center", coordinates: { lat: -1.2864, lng: 36.8172 } },
    { id: 6, name: "Kasarani", area: "Residential", coordinates: { lat: -1.2258, lng: 36.8906 } },
    { id: 7, name: "Embakasi", area: "Industrial", coordinates: { lat: -1.3031, lng: 36.8944 } },
    { id: 8, name: "Kileleshwa", area: "Residential", coordinates: { lat: -1.2736, lng: 36.7874 } },
    { id: 9, name: "Lavington", area: "Upmarket", coordinates: { lat: -1.2728, lng: 36.7693 } },
    { id: 10, name: "Nyayo Stadium", area: "Sports Complex", coordinates: { lat: -1.3139, lng: 36.8227 } },
    { id: 11, name: "University of Nairobi", area: "Educational", coordinates: { lat: -1.2794, lng: 36.8155 } },
    { id: 12, name: "Village Market", area: "Shopping", coordinates: { lat: -1.2324, lng: 36.8026 } },
    { id: 13, name: "Two Rivers Mall", area: "Shopping", coordinates: { lat: -1.2369, lng: 36.8344 } },
    { id: 14, name: "Sarit Centre", area: "Shopping", coordinates: { lat: -1.2672, lng: 36.8142 } },
    { id: 15, name: "Wilson Airport", area: "Airport", coordinates: { lat: -1.3218, lng: 36.8151 } }
  ];

  // Filter locations based on search input
  useEffect(() => {
    if (searchValue.length > 1) {
      setIsLoading(true);
      
      // Simulate API delay
      const timer = setTimeout(() => {
        const filtered = nairobiLocations.filter(location =>
          location.name.toLowerCase().includes(searchValue.toLowerCase()) ||
          location.area.toLowerCase().includes(searchValue.toLowerCase())
        );
        setSuggestions(filtered);
        setIsLoading(false);
      }, 300);

      return () => clearTimeout(timer);
    } else {
      setSuggestions([]);
    }
  }, [searchValue]);

  // Handle location selection
  const handleLocationSelect = (location) => {
    setSearchValue(location.name);
    setSelectedLocation(location);
    setSuggestions([]);
    
    if (onLocationSelect) {
      onLocationSelect({
        id: location.id,
        name: location.name,
        area: location.area,
        coordinates: location.coordinates,
        address: `${location.name}, ${location.area}, Nairobi`
      });
    }
    
    console.log('📍 Location selected:', location);
  };

  // Get current location
  const getCurrentLocation = () => {
    setIsLoading(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const currentLoc = {
            id: 'current',
            name: 'Current Location',
            area: 'GPS Location',
            coordinates: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
          };
          
          setSearchValue('Current Location');
          setSelectedLocation(currentLoc);
          setIsLoading(false);
          
          if (onLocationSelect) {
            onLocationSelect({
              ...currentLoc,
              address: `Current Location (${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)})`
            });
          }
          
          console.log('📍 Current location obtained:', currentLoc);
        },
        (error) => {
          console.error('❌ Error getting location:', error);
          setIsLoading(false);
          alert('Unable to get your current location. Please select manually.');
        }
      );
    } else {
      setIsLoading(false);
      alert('Geolocation is not supported by this browser.');
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 pl-12 pr-12 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-500"
        />
        
        {/* Search icon */}
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          <span className="text-gray-400 text-xl">🔍</span>
        </div>

        {/* Current location button */}
        {showCurrentLocation && (
          <button
            onClick={getCurrentLocation}
            disabled={isLoading}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
            title="Use current location"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            ) : (
              <span className="text-xl">📍</span>
            )}
          </button>
        )}
      </div>

      {/* Loading indicator */}
      {isLoading && suggestions.length === 0 && searchValue.length > 1 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-gray-600 text-sm">Searching locations...</span>
          </div>
        </div>
      )}

      {/* Suggestions dropdown */}
      {suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
          {suggestions.map((location) => (
            <div
              key={location.id}
              onClick={() => handleLocationSelect(location)}
              className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <span className="text-xl">📍</span>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{location.name}</div>
                  <div className="text-sm text-gray-500">{location.area}, Nairobi</div>
                </div>
                <span className="text-gray-400 text-sm">Select</span>
              </div>
            </div>
          ))}
          
          {/* Show popular locations if no specific search */}
          {searchValue.length < 3 && (
            <div className="p-3 bg-gray-50 border-t">
              <div className="text-xs text-gray-500 font-medium mb-2">POPULAR LOCATIONS</div>
              <div className="grid grid-cols-2 gap-2">
                {nairobiLocations.slice(0, 6).map((location) => (
                  <button
                    key={location.id}
                    onClick={() => handleLocationSelect(location)}
                    className="text-left p-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    {location.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected location display */}
      {selectedLocation && (
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-blue-600">✅</span>
            <div className="text-sm">
              <span className="font-semibold text-blue-900">{selectedLocation.name}</span>
              <span className="text-blue-600 ml-1">• {selectedLocation.area}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationPicker;