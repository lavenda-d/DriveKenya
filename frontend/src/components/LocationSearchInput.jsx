import React, { useRef, useEffect, useState } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';

/**
 * Location Search Input with Google Places Autocomplete
 * Allows searching ANY location in Kenya (not just predefined ones)
 */
const LocationSearchInput = ({ 
  onLocationSelect, 
  placeholder = "Search any location in Kenya...",
  defaultValue = "",
  className = "",
  country = "ke", // Kenya by default
  label = null
}) => {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const [isPlacesReady, setIsPlacesReady] = useState(false);

  // Check if Google Places API is ready
  useEffect(() => {
    const checkPlacesAPI = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        setIsPlacesReady(true);
        return true;
      }
      return false;
    };

    // Check immediately
    if (checkPlacesAPI()) return;

    // If not ready, check every 100ms for up to 5 seconds
    let attempts = 0;
    const maxAttempts = 50;
    const interval = setInterval(() => {
      attempts++;
      if (checkPlacesAPI() || attempts >= maxAttempts) {
        clearInterval(interval);
        if (attempts >= maxAttempts) {
          console.error('Google Places API failed to load');
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isPlacesReady || !inputRef.current || autocompleteRef.current) return;

    try {
      // Initialize autocomplete with Kenya bias
      const options = {
        componentRestrictions: { country }, // Restrict to specified country
        fields: ['address_components', 'geometry', 'name', 'formatted_address', 'place_id'],
        types: ['establishment', 'geocode', 'locality', 'sublocality'], // Allow all types
      };

      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        options
      );

      console.log('✅ Places Autocomplete initialized');

      // Listen for place selection
      const placeChangedListener = autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace();
        
        if (!place.geometry || !place.geometry.location) {
          console.warn('No geometry for selected place');
          setIsLoading(false);
          return;
        }

        const locationData = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          name: place.name || '',
          address: place.formatted_address || '',
          placeId: place.place_id || ''
        };

        console.log('📍 Location selected:', locationData);
        setValue(place.formatted_address || place.name);
        onLocationSelect(locationData);
        setIsLoading(false);
      });

      return () => {
        if (placeChangedListener) {
          window.google.maps.event.removeListener(placeChangedListener);
        }
      };
    } catch (error) {
      console.error('Error initializing Google Places Autocomplete:', error);
      setIsLoading(false);
    }
  }, [onLocationSelect, country, isPlacesReady]);

  const handleClear = () => {
    setValue('');
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.focus();
    }
    onLocationSelect(null);
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={isPlacesReady ? placeholder : "Loading search..."}
          disabled={!isPlacesReady}
          className="w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-wait"
          onFocus={() => setIsLoading(true)}
          onBlur={() => setTimeout(() => setIsLoading(false), 200)}
        />
        
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              title="Clear"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
          {isLoading && (
            <Loader2 className="text-blue-500 w-5 h-5 animate-spin" />
          )}
        </div>
      </div>
      
      <p className="mt-1 text-xs text-gray-500">
        Type to search estates, streets, buildings, or landmarks
      </p>
    </div>
  );
};

export default LocationSearchInput;
