import React, { useState, useEffect } from 'react';
import GoogleMap from './GoogleMap';
import LocationPicker from './LocationPicker';
import { routePlanningService, RouteUtils } from '../services/routePlanningService';

const MapLocationPicker = ({ 
  onLocationSelect, 
  initialLocation = null,
  showRoute = false,
  routeDestination = null,
  className = ""
}) => {
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [showMap, setShowMap] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // Calculate route when both locations are available
  useEffect(() => {
    if (showRoute && selectedLocation && routeDestination) {
      calculateRoute();
    }
  }, [selectedLocation, routeDestination, showRoute]);

  const calculateRoute = async () => {
    setIsLoadingRoute(true);
    try {
      const route = await routePlanningService.calculateRoute(
        selectedLocation,
        routeDestination
      );
      setRouteData(route);
      console.log('🗺️ Route calculated:', route);
    } catch (error) {
      console.error('❌ Route calculation failed:', error);
    } finally {
      setIsLoadingRoute(false);
    }
  };

  const handleLocationPickerSelect = (location) => {
    setSelectedLocation(location);
    if (onLocationSelect) {
      onLocationSelect(location);
    }
  };

  const handleMapLocationSelect = (location) => {
    const mapLocation = {
      id: 'map-selected',
      name: location.name || 'Selected Location',
      area: 'Map Selection',
      coordinates: location.coordinates,
      address: location.address || `${location.coordinates.lat.toFixed(4)}, ${location.coordinates.lng.toFixed(4)}`
    };
    
    setSelectedLocation(mapLocation);
    if (onLocationSelect) {
      onLocationSelect(mapLocation);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Location Picker Input */}
      <div>
        <LocationPicker
          onLocationSelect={handleLocationPickerSelect}
          initialValue={selectedLocation?.name || ''}
          placeholder="Search for a location..."
          className="w-full"
        />
      </div>

      {/* Toggle Map View */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowMap(!showMap)}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
        >
          <span className="text-lg">{showMap ? '📍' : '🗺️'}</span>
          <span className="text-sm font-medium">
            {showMap ? 'Hide Map' : 'Show on Map'}
          </span>
        </button>

        {selectedLocation && routeDestination && (
          <button
            onClick={calculateRoute}
            disabled={isLoadingRoute}
            className="flex items-center space-x-2 text-green-600 hover:text-green-800 transition-colors disabled:opacity-50"
          >
            {isLoadingRoute ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
            ) : (
              <span className="text-lg">🛣️</span>
            )}
            <span className="text-sm font-medium">Calculate Route</span>
          </button>
        )}
      </div>

      {/* Map View */}
      {showMap && (
        <div className="border border-gray-300 rounded-lg overflow-hidden">
          <GoogleMap
            onLocationSelect={handleMapLocationSelect}
            selectedLocation={selectedLocation}
            routeDestination={routeDestination}
            showRoute={showRoute && routeData}
            routeData={routeData}
            height="300px"
            className="w-full"
          />
        </div>
      )}

      {/* Route Information */}
      {routeData && routeData.success && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-blue-600 text-lg">🛣️</span>
            <h4 className="font-semibold text-blue-900">Route Information</h4>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-600">Distance:</span>
              <span className="font-medium ml-2">{routeData.distance.text}</span>
            </div>
            <div>
              <span className="text-blue-600">Duration:</span>
              <span className="font-medium ml-2">{routeData.duration.text}</span>
            </div>
          </div>

          {routeData.distance.value > 0 && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="text-sm text-blue-700">
                <span className="font-medium">Estimated delivery cost:</span>
                <span className="ml-2 text-blue-900 font-semibold">
                  KSH {RouteUtils.estimateDeliveryCost(routeData.distance.value / 1000)}
                </span>
              </div>
            </div>
          )}

          {routeData.warnings && routeData.warnings.length > 0 && (
            <div className="mt-2 text-xs text-blue-600">
              {routeData.warnings.map((warning, index) => (
                <div key={index}>⚠️ {warning}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected Location Display */}
      {selectedLocation && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <span className="text-green-600 text-lg">📍</span>
            <div className="flex-1">
              <div className="font-semibold text-green-900">{selectedLocation.name}</div>
              <div className="text-sm text-green-600">{selectedLocation.area || selectedLocation.address}</div>
              {selectedLocation.coordinates && (
                <div className="text-xs text-green-500 mt-1">
                  Coordinates: {selectedLocation.coordinates.lat.toFixed(4)}, {selectedLocation.coordinates.lng.toFixed(4)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapLocationPicker;