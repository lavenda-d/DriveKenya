/**
 * Location Tracking Service
 * Provides real-time GPS tracking for vehicles (like Uber/Bolt)
 * 
 * Usage:
 * const tracker = new LocationTracker(bookingId, apiService);
 * tracker.startTracking();
 * // ... later
 * tracker.stopTracking();
 */

class LocationTracker {
  constructor(bookingId, apiService) {
    this.bookingId = bookingId;
    this.api = apiService;
    this.watchId = null;
    this.updateInterval = 5000; // Update every 5 seconds
    this.lastUpdate = null;
    this.isTracking = false;
    this.onLocationUpdate = null; // Callback for location updates
    this.onError = null; // Callback for errors
  }

  /**
   * Start tracking user's location
   * Requests permission if not already granted
   */
  async startTracking() {
    if (this.isTracking) {
      console.warn('⚠️ Tracking already started');
      return;
    }

    if (!navigator.geolocation) {
      const error = 'Geolocation not supported by this browser';
      console.error('❌', error);
      this.handleError({ code: -1, message: error });
      return;
    }

    // Request permission first
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      console.log('📍 Location permission:', permission.state);
      
      if (permission.state === 'denied') {
        throw new Error('Location permission denied');
      }
    } catch (error) {
      console.warn('Could not check permission:', error);
    }

    const options = {
      enableHighAccuracy: true, // Use GPS for high accuracy
      timeout: 10000, // 10 seconds timeout
      maximumAge: 0 // Don't use cached locations
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handleLocationUpdate(position),
      (error) => this.handleError(error),
      options
    );

    this.isTracking = true;
    console.log('🎯 Location tracking started for booking:', this.bookingId);
  }

  /**
   * Stop tracking location
   */
  stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isTracking = false;
      console.log('🛑 Location tracking stopped');
    }
  }

  /**
   * Handle location update from GPS
   * @param {Position} position - Geolocation position object
   */
  async handleLocationUpdate(position) {
    const now = Date.now();
    
    // Throttle updates to avoid overwhelming the server
    if (this.lastUpdate && (now - this.lastUpdate) < this.updateInterval) {
      return;
    }

    const locationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      speed: this.metersPerSecondToKmh(position.coords.speed || 0),
      heading: position.coords.heading || 0, // Direction in degrees (0-360)
      accuracy: position.coords.accuracy, // Accuracy in meters
      timestamp: new Date(position.timestamp).toISOString()
    };

    console.log('📍 Location update:', {
      lat: locationData.latitude.toFixed(6),
      lng: locationData.longitude.toFixed(6),
      speed: `${locationData.speed.toFixed(1)} km/h`,
      accuracy: `${locationData.accuracy.toFixed(0)}m`
    });

    // Call custom callback if provided
    if (this.onLocationUpdate) {
      this.onLocationUpdate(locationData);
    }

    // Send to server
    try {
      const response = await this.api.post(
        `/tracking/${this.bookingId}/location`, 
        locationData
      );
      this.lastUpdate = now;
      
      if (response.success) {
        console.log('✅ Location sent to server');
      }
    } catch (error) {
      console.error('❌ Failed to send location to server:', error.message);
      // Don't stop tracking on network errors, just log them
    }
  }

  /**
   * Handle geolocation errors
   * @param {GeolocationPositionError} error
   */
  handleError(error) {
    let errorMessage = 'Unknown location error';
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location permission denied. Please enable location access.';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location unavailable. Make sure GPS is enabled.';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timeout. Please try again.';
        break;
      default:
        errorMessage = error.message || errorMessage;
    }

    console.error('❌ Location error:', errorMessage);
    
    // Call custom error callback if provided
    if (this.onError) {
      this.onError({ code: error.code, message: errorMessage });
    }
  }

  /**
   * Convert speed from m/s to km/h
   * @param {number} speedMps - Speed in meters per second
   * @returns {number} Speed in kilometers per hour
   */
  metersPerSecondToKmh(speedMps) {
    return speedMps * 3.6;
  }

  /**
   * Get current tracking status
   * @returns {boolean}
   */
  isActive() {
    return this.isTracking;
  }

  /**
   * Set callback for location updates
   * @param {Function} callback - Function to call on location update
   */
  setLocationUpdateCallback(callback) {
    this.onLocationUpdate = callback;
  }

  /**
   * Set callback for errors
   * @param {Function} callback - Function to call on error
   */
  setErrorCallback(callback) {
    this.onError = callback;
  }

  /**
   * Change update interval
   * @param {number} milliseconds - New interval in milliseconds
   */
  setUpdateInterval(milliseconds) {
    this.updateInterval = milliseconds;
    console.log(`⏱️ Update interval set to ${milliseconds}ms`);
  }

  /**
   * Get single location update (one-time, not continuous)
   * @returns {Promise<Object>} Location data
   */
  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            speed: this.metersPerSecondToKmh(position.coords.speed || 0),
            heading: position.coords.heading || 0,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp).toISOString()
          };
          resolve(locationData);
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }
}

export default LocationTracker;
