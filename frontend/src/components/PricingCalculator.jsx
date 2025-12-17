import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  DollarSign, 
  Calendar, 
  MapPin, 
  Info, 
  Clock,
  TrendingUp,
  Shield,
  CheckCircle,
  Car
} from 'lucide-react';

const PricingCalculator = ({ carId, onPriceCalculated, onBookCar }) => {
  const [selectedCarId, setSelectedCarId] = useState(carId || '');
  const [availableCars, setAvailableCars] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const locations = [
    'Nairobi CBD',
    'Westlands',
    'Karen',
    'Kiambu',
    'Thika',
    'Machakos',
    'Nakuru',
    'Eldoret'
  ];

  // Fetch available cars
  useEffect(() => {
    fetchCars();
  }, []);

  const fetchCars = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/cars');
      const data = await response.json();
      if (data.success) {
        setAvailableCars(data.data?.cars || []);
      } else {
        console.error('Failed to fetch cars:', data);
      }
    } catch (error) {
      console.error('Failed to fetch cars:', error);
    }
  };

  // Calculate pricing when inputs change
  useEffect(() => {
    if (selectedCarId && startDate && endDate) {
      calculatePricing();
    }
  }, [selectedCarId, startDate, endDate, pickupLocation, dropoffLocation]);

  const calculatePricing = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('http://localhost:5000/api/pricing/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          carId: selectedCarId,
          startDate,
          endDate,
          pickupLocation: pickupLocation || null,
          dropoffLocation: dropoffLocation || null
        })
      });

      const data = await response.json();

      if (data.success) {
        setPricing(data.preview);
        if (onPriceCalculated) {
          onPriceCalculated(data.preview);
        }
      } else {
        setError(data.error || 'Failed to calculate pricing');
        setPricing(null);
      }
    } catch (error) {
      console.error('Pricing calculation error:', error);
      setError('Failed to calculate pricing');
      setPricing(null);
    } finally {
      setLoading(false);
    }
  };

  const handleBookNow = () => {
    if (!selectedCarId || !startDate || !endDate) {
      alert('Please select a car and dates to book');
      return;
    }

    const selectedCar = availableCars.find(car => car.id === parseInt(selectedCarId));
    if (!selectedCar) {
      alert('Selected car not found');
      return;
    }

    // Pass booking data to parent component (App.tsx)
    if (onBookCar) {
      onBookCar({
        car: selectedCar,
        startDate,
        endDate,
        pickupLocation,
        dropoffLocation,
        pricing
      });
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isWeekend = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const PriceBreakdownItem = ({ label, amount, description, highlight = false }) => (
    <div className={`flex justify-between items-center py-2 ${highlight ? 'border-t border-gray-200 font-semibold' : ''}`}>
      <div>
        <span className={`${highlight ? 'text-lg text-gray-900' : 'text-gray-600'}`}>
          {label}
        </span>
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
      </div>
      <span className={`${highlight ? 'text-lg text-gray-900' : 'text-gray-900'}`}>
        ${amount}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Calculator className="text-blue-600" size={24} />
            <h3 className="text-2xl font-semibold text-gray-900">Dynamic Pricing Calculator</h3>
          </div>
          
          <p className="text-gray-600 mb-6">
            📊 <strong>Smart Pricing Demo:</strong> See how our dynamic pricing works! Compare different dates, 
            locations, and cars to find the best deals. Perfect for planning your trip and understanding 
            our transparent pricing model with real-time adjustments for peak times, demand, and distance.
          </p>

          {/* Benefits Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-blue-900 mb-2">🎯 Why Use This Calculator?</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-800">
              <div>✅ Compare prices across different dates</div>
              <div>✅ See weekend vs weekday rates</div>
              <div>✅ Understand delivery fee calculations</div>
              <div>✅ Plan your budget with transparent pricing</div>
            </div>
          </div>

          {/* Car Selection */}
          <div className="mb-6">
            <label htmlFor="carSelect" className="block text-sm font-medium text-gray-700 mb-2">
              <Car size={16} className="inline mr-1" />
              Select a Car
            </label>
            <select
              id="carSelect"
              value={selectedCarId}
              onChange={(e) => setSelectedCarId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            >
              <option value="">Choose a car...</option>
              {availableCars.map((car) => (
                <option key={car.id} value={car.id}>
                  {car.make} {car.model} ({car.year}) - ${car.price_per_day}/day - {car.location}
                </option>
              ))}
            </select>
          </div>

          {/* Date Selection */}
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar size={16} className="inline mr-1" />
                  Pickup Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar size={16} className="inline mr-1" />
                  Return Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                />
              </div>
            </div>

            {/* Location Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pickupLocation" className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin size={16} className="inline mr-1" />
                  Pickup Location (Optional)
                </label>
                <select
                  id="pickupLocation"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  <option value="">Select location</option>
                  {locations.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="dropoffLocation" className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin size={16} className="inline mr-1" />
                  Dropoff Location (Optional)
                </label>
                <select
                  id="dropoffLocation"
                  value={dropoffLocation}
                  onChange={(e) => setDropoffLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  <option value="">Select location</option>
                  {locations.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <p className="text-blue-800 text-sm">Calculating pricing...</p>
              </div>
            </div>
          )}

          {/* Pricing Display */}
          {pricing && !loading && (
            <div className="space-y-4">
              {/* Duration Info */}
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">Rental Duration</span>
                  <span className="font-semibold text-gray-900">
                    {pricing.durationInDays} {pricing.durationInDays === 1 ? 'day' : 'days'}
                  </span>
                </div>
                {startDate && endDate && (
                  <div className="text-sm text-gray-500">
                    {formatDate(startDate)} → {formatDate(endDate)}
                    {(isWeekend(startDate) || isWeekend(endDate)) && (
                      <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                        Weekend rates apply
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="border border-gray-200 rounded-md p-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Price Breakdown</h4>
                
                <div className="space-y-1">
                  <PriceBreakdownItem
                    label="Base Rate"
                    amount={pricing.basePrice}
                    description={`${pricing.breakdown.basePricePerDay}/day × ${pricing.breakdown.totalDays} days`}
                  />
                  
                  <PriceBreakdownItem
                    label="Platform Fee"
                    amount={pricing.platformFee}
                    description={`${pricing.breakdown.platformFeeRate} of base rate`}
                  />
                  
                  <PriceBreakdownItem
                    label="Insurance Coverage"
                    amount={pricing.insuranceFee}
                    description={`${pricing.breakdown.insuranceFeeRate} of adjusted rate`}
                  />
                  
                  <PriceBreakdownItem
                    label="Total Price"
                    amount={pricing.totalPrice}
                    highlight={true}
                  />
                </div>
              </div>

              {/* Dynamic Pricing Indicators */}
              {(pricing.surcharge || pricing.savings) && (
                <div className="space-y-2">
                  {pricing.surcharge && (
                    <div className="bg-orange-50 p-3 rounded-md border border-orange-200">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="text-orange-600" size={16} />
                        <span className="text-sm font-medium text-orange-800">
                          Peak pricing in effect
                        </span>
                      </div>
                      <p className="text-xs text-orange-600 mt-1">
                        Higher rates due to increased demand or special events
                      </p>
                    </div>
                  )}
                  
                  {pricing.savings && (
                    <div className="bg-green-50 p-3 rounded-md border border-green-200">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="text-green-600" size={16} />
                        <span className="text-sm font-medium text-green-800">
                          Special discount applied
                        </span>
                      </div>
                      <p className="text-xs text-green-600 mt-1">
                        You're getting a great deal for these dates
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Included Features */}
              <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Shield className="text-blue-600" size={16} />
                  <span className="font-medium text-blue-800">What's Included</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
                  <div className="flex items-center space-x-1">
                    <CheckCircle size={12} />
                    <span>Full insurance coverage</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <CheckCircle size={12} />
                    <span>24/7 roadside assistance</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <CheckCircle size={12} />
                    <span>Customer support</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <CheckCircle size={12} />
                    <span>Flexible booking changes</span>
                  </div>
                </div>
              </div>

              {/* Distance Fee Notice */}
              {pickupLocation && dropoffLocation && pickupLocation !== dropoffLocation && (
                <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
                  <div className="flex items-center space-x-2">
                    <Info className="text-yellow-600" size={16} />
                    <span className="text-sm font-medium text-yellow-800">
                      Delivery Service
                    </span>
                  </div>
                  <p className="text-xs text-yellow-600 mt-1">
                    Additional fee may apply for different pickup/dropoff locations
                  </p>
                </div>
              )}

              {/* Pricing Multiplier Info */}
              {parseFloat(pricing.breakdown.multiplierApplied) !== 1.0 && (
                <div className="text-xs text-gray-500 text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <Clock size={12} />
                    <span>
                      Dynamic pricing multiplier: {pricing.breakdown.multiplierApplied}x
                    </span>
                  </div>
                </div>
              )}

              {/* Call to Action */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <button 
                  onClick={handleBookNow}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors font-semibold"
                >
                  Book Now for ${pricing.totalPrice}
                </button>
                <p className="text-xs text-gray-500 text-center mt-2">
                  Prices include all taxes and fees. Final price confirmed at checkout.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PricingCalculator;