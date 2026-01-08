import React, { useState, useRef, useEffect } from 'react';
import { MapPin, ChevronDown, Search, X, Navigation } from 'lucide-react';

/**
 * Simple Location Selector with Popular Nairobi Locations
 * Works without Google Places API - uses predefined locations + manual input
 */
const SimpleLocationSelector = ({
  onLocationSelect,
  placeholder = "Select or type a location...",
  defaultValue = "",
  label = null,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(defaultValue);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Popular locations in Nairobi with coordinates
  const popularLocations = [
    // CBD & Central
    { id: 1, name: "Nairobi CBD", area: "Central", lat: -1.2864, lng: 36.8172, address: "Nairobi Central Business District" },
    { id: 2, name: "KICC", area: "CBD", lat: -1.2873, lng: 36.8195, address: "Kenyatta International Convention Centre" },
    { id: 3, name: "Kencom", area: "CBD", lat: -1.2833, lng: 36.8219, address: "Kencom Bus Station, Nairobi" },
    { id: 4, name: "Railway Station", area: "CBD", lat: -1.2912, lng: 36.8261, address: "Nairobi Railway Station" },
    
    // Westlands & Surrounding
    { id: 5, name: "Westlands", area: "Westlands", lat: -1.2673, lng: 36.8110, address: "Westlands, Nairobi" },
    { id: 6, name: "Sarit Centre", area: "Westlands", lat: -1.2584, lng: 36.8034, address: "Sarit Centre, Westlands" },
    { id: 7, name: "The Mall Westlands", area: "Westlands", lat: -1.2614, lng: 36.8044, address: "The Mall, Westlands" },
    { id: 8, name: "Parklands", area: "Parklands", lat: -1.2612, lng: 36.8214, address: "Parklands, Nairobi" },
    
    // Kilimani & Hurlingham
    { id: 9, name: "Kilimani", area: "Kilimani", lat: -1.2893, lng: 36.7836, address: "Kilimani, Nairobi" },
    { id: 10, name: "Yaya Centre", area: "Kilimani", lat: -1.2918, lng: 36.7867, address: "Yaya Centre, Argwings Kodhek" },
    { id: 11, name: "Hurlingham", area: "Hurlingham", lat: -1.2932, lng: 36.7954, address: "Hurlingham, Nairobi" },
    { id: 12, name: "Junction Mall", area: "Kilimani", lat: -1.2995, lng: 36.7766, address: "The Junction Mall, Ngong Road" },
    
    // Karen & Langata
    { id: 13, name: "Karen", area: "Karen", lat: -1.3189, lng: 36.7127, address: "Karen, Nairobi" },
    { id: 14, name: "The Hub Karen", area: "Karen", lat: -1.3246, lng: 36.7151, address: "The Hub Karen, Dagoretti Road" },
    { id: 15, name: "Langata", area: "Langata", lat: -1.3419, lng: 36.7535, address: "Langata, Nairobi" },
    { id: 16, name: "Galleria Mall", area: "Langata", lat: -1.3389, lng: 36.7568, address: "Galleria Shopping Mall, Langata" },
    
    // Upper Hill & South
    { id: 17, name: "Upper Hill", area: "Upper Hill", lat: -1.2974, lng: 36.8165, address: "Upper Hill, Nairobi" },
    { id: 18, name: "Kenyatta Hospital", area: "Upper Hill", lat: -1.3015, lng: 36.8087, address: "Kenyatta National Hospital" },
    { id: 19, name: "South B", area: "South B", lat: -1.3074, lng: 36.8329, address: "South B, Nairobi" },
    { id: 20, name: "South C", area: "South C", lat: -1.3159, lng: 36.8215, address: "South C, Nairobi" },
    
    // Eastlands
    { id: 21, name: "Eastleigh", area: "Eastleigh", lat: -1.2724, lng: 36.8547, address: "Eastleigh, Nairobi" },
    { id: 22, name: "Buruburu", area: "Buruburu", lat: -1.2889, lng: 36.8776, address: "Buruburu, Nairobi" },
    { id: 23, name: "Donholm", area: "Donholm", lat: -1.2974, lng: 36.8876, address: "Donholm, Nairobi" },
    { id: 24, name: "Embakasi", area: "Embakasi", lat: -1.3226, lng: 36.8956, address: "Embakasi, Nairobi" },
    
    // JKIA & Airports
    { id: 25, name: "JKIA Airport", area: "Airport", lat: -1.3192, lng: 36.9278, address: "Jomo Kenyatta International Airport" },
    { id: 26, name: "Wilson Airport", area: "Airport", lat: -1.3214, lng: 36.8156, address: "Wilson Airport, Langata" },
    
    // North & Kasarani
    { id: 27, name: "Thika Road Mall", area: "Thika Road", lat: -1.2195, lng: 36.8893, address: "Thika Road Mall, Roysambu" },
    { id: 28, name: "Garden City", area: "Thika Road", lat: -1.2275, lng: 36.8814, address: "Garden City Mall, Thika Road" },
    { id: 29, name: "Kasarani", area: "Kasarani", lat: -1.2214, lng: 36.8976, address: "Kasarani, Nairobi" },
    { id: 30, name: "Roysambu", area: "Roysambu", lat: -1.2189, lng: 36.8759, address: "Roysambu, Nairobi" },
    
    // Gigiri & Runda
    { id: 31, name: "Gigiri", area: "Gigiri", lat: -1.2341, lng: 36.8041, address: "Gigiri, Nairobi" },
    { id: 32, name: "UN Complex", area: "Gigiri", lat: -1.2336, lng: 36.7976, address: "United Nations Complex, Gigiri" },
    { id: 33, name: "Village Market", area: "Gigiri", lat: -1.2297, lng: 36.8044, address: "Village Market, Limuru Road" },
    { id: 34, name: "Runda", area: "Runda", lat: -1.2178, lng: 36.8174, address: "Runda, Nairobi" },
    
    // Lavington & Kileleshwa
    { id: 35, name: "Lavington", area: "Lavington", lat: -1.2777, lng: 36.7714, address: "Lavington, Nairobi" },
    { id: 36, name: "Kileleshwa", area: "Kileleshwa", lat: -1.2756, lng: 36.7842, address: "Kileleshwa, Nairobi" },
    { id: 37, name: "Lavington Mall", area: "Lavington", lat: -1.2789, lng: 36.7689, address: "Lavington Mall, James Gichuru Road" },
    
    // Industrial Area
    { id: 38, name: "Industrial Area", area: "Industrial", lat: -1.3045, lng: 36.8534, address: "Industrial Area, Nairobi" },
    { id: 39, name: "Mombasa Road", area: "Mombasa Road", lat: -1.3156, lng: 36.8445, address: "Mombasa Road, Nairobi" },
    
    // Jomo Kenyatta Area
    { id: 40, name: "Jomo Kenyatta University", area: "JKUAT", lat: -1.0918, lng: 37.0114, address: "JKUAT, Juja" },
  ];

  // Group locations by area
  const groupedLocations = popularLocations.reduce((acc, loc) => {
    if (!acc[loc.area]) acc[loc.area] = [];
    acc[loc.area].push(loc);
    return acc;
  }, {});

  // Filter locations based on search
  const filteredLocations = searchQuery.length > 0
    ? popularLocations.filter(loc =>
        loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.address.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : popularLocations;

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle location selection
  const handleSelect = (location) => {
    setSelectedLocation(location);
    setSearchQuery(location.name);
    setIsOpen(false);
    onLocationSelect({
      lat: location.lat,
      lng: location.lng,
      name: location.name,
      address: location.address,
      id: location.id,
    });
  };

  // Handle manual input (custom location)
  const handleManualInput = () => {
    if (searchQuery.trim()) {
      const customLocation = {
        lat: -1.2864, // Default to Nairobi CBD
        lng: 36.8172,
        name: searchQuery,
        address: searchQuery + ", Nairobi, Kenya",
        id: `custom_${Date.now()}`,
      };
      setSelectedLocation(customLocation);
      setIsOpen(false);
      onLocationSelect(customLocation);
    }
  };

  // Handle clear
  const handleClear = () => {
    setSearchQuery('');
    setSelectedLocation(null);
    onLocationSelect(null);
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      {/* Input Field */}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleManualInput();
            }
          }}
          placeholder={placeholder}
          className="w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
        />
        
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {searchQuery && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {/* Custom location option */}
          {searchQuery.trim() && !filteredLocations.some(l => l.name.toLowerCase() === searchQuery.toLowerCase()) && (
            <button
              onClick={handleManualInput}
              className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center gap-3 border-b border-gray-100"
            >
              <Navigation className="w-5 h-5 text-blue-500" />
              <div>
                <div className="font-medium text-blue-700">Use "{searchQuery}"</div>
                <div className="text-xs text-gray-500">Enter custom location</div>
              </div>
            </button>
          )}

          {/* Filtered results */}
          {filteredLocations.length > 0 ? (
            searchQuery.length > 0 ? (
              // Show flat list when searching
              filteredLocations.map((location) => (
                <button
                  key={location.id}
                  onClick={() => handleSelect(location)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-b border-gray-50 last:border-0"
                >
                  <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">{location.name}</div>
                    <div className="text-xs text-gray-500 truncate">{location.address}</div>
                  </div>
                  <span className="ml-auto text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 flex-shrink-0">
                    {location.area}
                  </span>
                </button>
              ))
            ) : (
              // Show grouped list when not searching
              Object.entries(groupedLocations).map(([area, locations]) => (
                <div key={area}>
                  <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 sticky top-0">
                    {area}
                  </div>
                  {locations.map((location) => (
                    <button
                      key={location.id}
                      onClick={() => handleSelect(location)}
                      className="w-full px-4 py-2 text-left hover:bg-blue-50 flex items-center gap-3"
                    >
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-800">{location.name}</span>
                    </button>
                  ))}
                </div>
              ))
            )
          ) : (
            <div className="px-4 py-8 text-center text-gray-500">
              <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No locations found</p>
              <p className="text-xs mt-1">Press Enter to use custom location</p>
            </div>
          )}
        </div>
      )}
      
      {/* Help text */}
      <p className="mt-1 text-xs text-gray-500">
        Select from popular locations or type any address
      </p>
    </div>
  );
};

export default SimpleLocationSelector;
