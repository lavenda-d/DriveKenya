// Route Planning Service for DriveKenya
// Provides route calculation, distance estimation, and location-based services

class RoutePlanningService {
  constructor() {
    this.isGoogleMapsLoaded = false;
    this.directionsService = null;
    this.distanceMatrixService = null;
    this.geocoder = null;
    this.placesService = null;
  }

  // Initialize Google Maps services
  async initialize() {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps) {
        this.directionsService = new window.google.maps.DirectionsService();
        this.distanceMatrixService = new window.google.maps.DistanceMatrixService();
        this.geocoder = new window.google.maps.Geocoder();
        this.isGoogleMapsLoaded = true;
        console.log('✅ Google Maps services initialized');
        resolve(true);
      } else {
        console.log('🔄 Google Maps not loaded, using fallback methods');
        resolve(false);
      }
    });
  }

  // Calculate route between two locations
  async calculateRoute(origin, destination, travelMode = 'DRIVING') {
    try {
      if (this.isGoogleMapsLoaded && this.directionsService) {
        return await this.calculateGoogleRoute(origin, destination, travelMode);
      } else {
        return await this.calculateFallbackRoute(origin, destination);
      }
    } catch (error) {
      console.error('❌ Route calculation error:', error);
      return this.getDefaultRoute(origin, destination);
    }
  }

  // Google Maps route calculation
  async calculateGoogleRoute(origin, destination, travelMode) {
    return new Promise((resolve, reject) => {
      const request = {
        origin: origin,
        destination: destination,
        travelMode: window.google.maps.TravelMode[travelMode],
        unitSystem: window.google.maps.UnitSystem.METRIC,
        avoidHighways: false,
        avoidTolls: false
      };

      this.directionsService.route(request, (result, status) => {
        if (status === 'OK') {
          const route = result.routes[0];
          const leg = route.legs[0];
          
          resolve({
            success: true,
            distance: {
              text: leg.distance.text,
              value: leg.distance.value // meters
            },
            duration: {
              text: leg.duration.text,
              value: leg.duration.value // seconds
            },
            steps: leg.steps.map(step => ({
              instructions: step.instructions,
              distance: step.distance.text,
              duration: step.duration.text
            })),
            polyline: route.overview_polyline,
            bounds: route.bounds,
            warnings: route.warnings
          });
        } else {
          reject(new Error(`Route calculation failed: ${status}`));
        }
      });
    });
  }

  // Fallback route calculation using Haversine formula
  async calculateFallbackRoute(origin, destination) {
    const originCoords = this.extractCoordinates(origin);
    const destCoords = this.extractCoordinates(destination);
    
    if (!originCoords || !destCoords) {
      throw new Error('Invalid coordinates provided');
    }

    const distance = this.calculateHaversineDistance(
      originCoords.lat, originCoords.lng,
      destCoords.lat, destCoords.lng
    );

    const estimatedDuration = this.estimateDrivingTime(distance);

    return {
      success: true,
      distance: {
        text: `${distance.toFixed(1)} km`,
        value: distance * 1000 // Convert to meters
      },
      duration: {
        text: this.formatDuration(estimatedDuration),
        value: estimatedDuration // seconds
      },
      steps: [
        {
          instructions: `Drive from ${origin.name || 'origin'} to ${destination.name || 'destination'}`,
          distance: `${distance.toFixed(1)} km`,
          duration: this.formatDuration(estimatedDuration)
        }
      ],
      polyline: null,
      bounds: null,
      warnings: ['Route calculated using estimated distance'],
      fallback: true
    };
  }

  // Extract coordinates from location object
  extractCoordinates(location) {
    if (location.coordinates) {
      return location.coordinates;
    }
    if (location.lat && location.lng) {
      return { lat: location.lat, lng: location.lng };
    }
    if (location.latitude && location.longitude) {
      return { lat: location.latitude, lng: location.longitude };
    }
    return null;
  }

  // Calculate distance using Haversine formula
  calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.degreesToRadians(lat2 - lat1);
    const dLon = this.degreesToRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.degreesToRadians(lat1)) * Math.cos(this.degreesToRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
  }

  degreesToRadians(degrees) {
    return degrees * (Math.PI/180);
  }

  // Estimate driving time based on distance
  estimateDrivingTime(distanceKm) {
    // Average speed estimation for Nairobi traffic
    let avgSpeed; // km/h
    
    if (distanceKm < 5) {
      avgSpeed = 15; // City traffic
    } else if (distanceKm < 20) {
      avgSpeed = 25; // Mixed traffic
    } else {
      avgSpeed = 40; // Highway
    }
    
    return Math.round((distanceKm / avgSpeed) * 3600); // Convert hours to seconds
  }

  // Format duration in seconds to readable string
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  // Get default route when calculation fails
  getDefaultRoute(origin, destination) {
    return {
      success: false,
      distance: {
        text: 'Unknown',
        value: 0
      },
      duration: {
        text: 'Unknown',
        value: 0
      },
      steps: [],
      polyline: null,
      bounds: null,
      warnings: ['Route calculation unavailable'],
      error: 'Unable to calculate route'
    };
  }

  // Calculate delivery cost based on distance
  calculateDeliveryCost(distanceKm, baseRate = 50) {
    const minimumFee = 200; // Minimum delivery fee
    const calculatedFee = distanceKm * baseRate;
    return Math.max(minimumFee, Math.round(calculatedFee));
  }

  // Get estimated travel cost (fuel)
  estimateTravelCost(distanceKm, fuelEfficiency = 12) { // km per liter
    const fuelPrice = 150; // KSH per liter (approximate)
    const litersNeeded = distanceKm / fuelEfficiency;
    return Math.round(litersNeeded * fuelPrice);
  }

  // Validate location coordinates
  isValidLocation(location) {
    const coords = this.extractCoordinates(location);
    if (!coords) return false;
    
    // Check if coordinates are within Kenya bounds (approximately)
    const kenyaBounds = {
      north: 5.0,
      south: -5.0,
      east: 42.0,
      west: 33.5
    };
    
    return (
      coords.lat >= kenyaBounds.south &&
      coords.lat <= kenyaBounds.north &&
      coords.lng >= kenyaBounds.west &&
      coords.lng <= kenyaBounds.east
    );
  }

  // Get location suggestions based on query
  async getLocationSuggestions(query, bias = 'nairobi') {
    try {
      if (this.isGoogleMapsLoaded && this.placesService) {
        return await this.getGooglePlaceSuggestions(query, bias);
      } else {
        return this.getFallbackSuggestions(query);
      }
    } catch (error) {
      console.error('❌ Location suggestions error:', error);
      return this.getFallbackSuggestions(query);
    }
  }

  // Get fallback location suggestions
  getFallbackSuggestions(query) {
    const nairobiLocations = [
      { name: 'JKIA (Jomo Kenyatta International Airport)', area: 'Airport', coordinates: { lat: -1.3192, lng: 36.9278 } },
      { name: 'Westlands', area: 'Business District', coordinates: { lat: -1.2676, lng: 36.8108 } },
      { name: 'Karen', area: 'Residential', coordinates: { lat: -1.3197, lng: 36.6859 } },
      { name: 'Kilimani', area: 'Residential', coordinates: { lat: -1.2905, lng: 36.7873 } },
      { name: 'CBD (Central Business District)', area: 'City Center', coordinates: { lat: -1.2864, lng: 36.8172 } },
      { name: 'Kasarani', area: 'Residential', coordinates: { lat: -1.2258, lng: 36.8906 } },
      { name: 'Embakasi', area: 'Industrial', coordinates: { lat: -1.3031, lng: 36.8944 } },
      { name: 'Kileleshwa', area: 'Residential', coordinates: { lat: -1.2736, lng: 36.7874 } },
      { name: 'Lavington', area: 'Upmarket', coordinates: { lat: -1.2728, lng: 36.7693 } },
      { name: 'Nyayo Stadium', area: 'Sports Complex', coordinates: { lat: -1.3139, lng: 36.8227 } }
    ];

    return nairobiLocations.filter(location =>
      location.name.toLowerCase().includes(query.toLowerCase()) ||
      location.area.toLowerCase().includes(query.toLowerCase())
    ).map(location => ({
      id: location.name.toLowerCase().replace(/\s+/g, '-'),
      name: location.name,
      area: location.area,
      coordinates: location.coordinates,
      address: `${location.name}, ${location.area}, Nairobi`
    }));
  }

  // Calculate optimal pickup/dropoff points
  calculateOptimalPickupPoints(carLocation, customerLocation, maxDistance = 10) {
    // For now, return the car's location and customer's location
    // In a real implementation, this could suggest meeting points
    return [
      {
        type: 'car_location',
        name: 'Car Owner Location',
        coordinates: carLocation,
        distance: this.calculateHaversineDistance(
          carLocation.lat, carLocation.lng,
          customerLocation.lat, customerLocation.lng
        )
      },
      {
        type: 'customer_location',
        name: 'Your Location',
        coordinates: customerLocation,
        distance: 0
      }
    ];
  }
}

// Create and export singleton instance
export const routePlanningService = new RoutePlanningService();

// Utility functions for external use
export const RouteUtils = {
  formatDistance: (meters) => {
    if (meters < 1000) {
      return `${meters}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  },

  formatDuration: (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  },

  estimateDeliveryCost: (distanceKm) => {
    return routePlanningService.calculateDeliveryCost(distanceKm);
  },

  isNairobiLocation: (coordinates) => {
    // Check if coordinates are within greater Nairobi area
    const nairobiBounds = {
      north: -1.09,
      south: -1.45,
      east: 37.1,
      west: 36.6
    };
    
    return (
      coordinates.lat >= nairobiBounds.south &&
      coordinates.lat <= nairobiBounds.north &&
      coordinates.lng >= nairobiBounds.west &&
      coordinates.lng <= nairobiBounds.east
    );
  }
};

console.log('📍 Route Planning Service initialized');