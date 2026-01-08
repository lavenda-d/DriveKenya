import React, { useState, useEffect } from 'react';
import LocationPicker from './LocationPicker';
import SimpleLocationSelector from './SimpleLocationSelector';
import GoogleMapEnhanced from './GoogleMapEnhanced';
import PaymentSelector from './PaymentSelector';

const BookingFlow = ({ selectedCar, onBookingComplete, onClose }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [bookingData, setBookingData] = useState({
    pickupLocation: null,
    dropoffLocation: null,
    pickupDate: '',
    pickupTime: '',
    returnDate: '',
    returnTime: '',
    rentalType: 'daily', // 'hourly' or 'daily'
    driverRequired: false,
    additionalRequests: '',
    paymentMethod: '', // Added payment method
    customerInfo: {
      name: '',
      phone: '',
      email: '',
      idNumber: ''
    },
    recurrence: {
      enabled: false,
      count: 4
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [pricingBreakdown, setPricingBreakdown] = useState(null);
  const [distance, setDistance] = useState(0);

  // Calculate hourly rate from daily rate (slightly higher for flexibility premium)
  const calculateHourlyRate = (dailyRate) => {
    // Hourly = (Daily * 1.25) / 24, so 24 hours = 25% more than daily
    return Math.ceil((dailyRate * 1.25) / 24);
  };

  // Get rates from car
  const dailyRate = selectedCar?.price_per_day || selectedCar?.pricePerDay || 280;
  const hourlyRate = selectedCar?.price_per_hour || calculateHourlyRate(dailyRate);
  const overtimePenalty = selectedCar?.overtime_penalty_percent || 10;

  // Calculate estimated cost based on distance and rental duration
  useEffect(() => {
    if (bookingData.pickupLocation && bookingData.dropoffLocation && bookingData.pickupDate && bookingData.returnDate) {
      calculateEstimate();
    }
  }, [bookingData.pickupLocation, bookingData.dropoffLocation, bookingData.pickupDate, bookingData.returnDate, bookingData.pickupTime, bookingData.returnTime, bookingData.rentalType, bookingData.driverRequired]);

  const calculateEstimate = () => {
    const pickupDateTime = new Date(`${bookingData.pickupDate}T${bookingData.pickupTime || '09:00'}`);
    const returnDateTime = new Date(`${bookingData.returnDate}T${bookingData.returnTime || '18:00'}`);
    
    const diffMs = returnDateTime - pickupDateTime;
    const totalHours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
    const totalDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    // Simulate distance calculation
    const mockDistance = Math.random() * 20 + 5; // 5-25 km
    setDistance(mockDistance);

    let basePrice, duration, rate, unitLabel;

    if (bookingData.rentalType === 'hourly') {
      rate = hourlyRate;
      duration = totalHours;
      unitLabel = 'hour';
      basePrice = rate * duration;
    } else {
      rate = dailyRate;
      duration = totalDays;
      unitLabel = 'day';
      basePrice = rate * duration;
    }

    // Calculate fees
    const platformFee = Math.round(basePrice * 0.02);
    // const insuranceFee = Math.round(basePrice * 0.10); // DISABLED
    const insuranceFee = 0;
    
    // Driver fee if required
    let driverFee = 0;
    if (bookingData.driverRequired) {
      driverFee = bookingData.rentalType === 'hourly' 
        ? 100 * totalHours  // 100 KES per hour for driver
        : 2000 * totalDays; // 2000 KES per day for driver
    }

    // Delivery fee if pickup/dropoff are different
    let deliveryFee = 0;
    if (bookingData.pickupLocation?.id !== bookingData.dropoffLocation?.id) {
      deliveryFee = Math.floor(mockDistance * 50); // 50 KSH per km delivery
    }

    const total = basePrice + platformFee + driverFee + deliveryFee;

    // Store pricing breakdown for display
    setPricingBreakdown({
      rentalType: bookingData.rentalType,
      duration,
      unitLabel,
      rate,
      basePrice,
      platformFee,
      // insuranceFee, // DISABLED
      driverFee,
      deliveryFee,
      total,
      overtime: {
        penaltyPercent: overtimePenalty,
        perExtraUnit: Math.round(rate * (1 + overtimePenalty / 100))
      }
    });

    setEstimatedCost(total);
  };

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setBookingData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setBookingData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleLocationSelect = (type, location) => {
    setBookingData(prev => ({
      ...prev,
      [type]: location
    }));
    console.log(`📍 ${type} selected:`, location);
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const submitBooking = async () => {
    setIsLoading(true);

    try {
      // Simulate booking submission
      await new Promise(resolve => setTimeout(resolve, 2000));

      const booking = {
        id: Date.now(),
        carId: selectedCar.id,
        carName: selectedCar.name,
        ...bookingData,
        totalCost: estimatedCost,
        distance: distance,
        status: 'confirmed',
        bookingDate: new Date().toISOString(),
        bookingNumber: `BK${Date.now().toString().slice(-6)}`
      };

      console.log('✅ Booking submitted:', booking);

      if (onBookingComplete) {
        onBookingComplete(booking);
      }

    } catch (error) {
      console.error('❌ Booking failed:', error);
      alert('Booking failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const showTermsAndConditions = () => {
    alert(`TERMS AND CONDITIONS - DriveKenya Car Rental

1. RENTAL AGREEMENT
- Valid driver's license required
- Minimum age: 23 years
- Security deposit may be required

2. VEHICLE USAGE
- For personal use only
- No smoking in vehicles
- No pets unless pre-approved
- Maximum occupancy as specified

3. INSURANCE & LIABILITY
- Basic insurance included
- Driver responsible for damages
- Report accidents immediately

4. FUEL POLICY
- Return with same fuel level
- Fuel charges apply if not returned full

5. CANCELLATION
- 24-hour notice required
- Cancellation fees may apply

6. PAYMENT
- Payment due at booking confirmation
- Additional charges for late returns

By accepting, you agree to these terms and our privacy policy.`);
  };

  const isStepValid = (step) => {
    switch (step) {
      case 1:
        return bookingData.pickupLocation && bookingData.dropoffLocation &&
          bookingData.pickupDate && bookingData.returnDate;
      case 2:
        return bookingData.customerInfo.name && bookingData.customerInfo.phone &&
          bookingData.customerInfo.email;
      case 3:
        return bookingData.paymentMethod; // Payment method selection
      case 4:
        return termsAccepted; // Final confirmation
      default:
        return false;
    }
  };

  if (!selectedCar) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-lg font-semibold mb-4">No Car Selected</h3>
          <p className="text-gray-600 mb-4">Please select a car to start the booking process.</p>
          <button
            onClick={onClose}
            className="w-full bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-card border border-border rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-muted/20">
          <div className="flex items-center space-x-4">
            <img
              src={selectedCar.image}
              alt={selectedCar.name}
              className="w-16 h-12 object-cover rounded-lg border border-border"
            />
            <div>
              <h2 className="text-xl font-semibold text-foreground">Book {selectedCar.name}</h2>
              <div className="flex items-center space-x-3 text-muted-foreground text-sm">
                <span>💰 KES {dailyRate}/day</span>
                <span className="text-gray-400">|</span>
                <span>⏱️ KES {hourlyRate}/hour</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-2xl transition-colors"
          >
            ×
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${currentStep >= step
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
                  }`}>
                  {step}
                </div>
                <span className={`ml-2 text-sm transition-colors ${currentStep >= step ? 'text-primary font-medium' : 'text-muted-foreground'
                  }`}>
                  {step === 1 && 'Location & Dates'}
                  {step === 2 && 'Customer Info'}
                  {step === 3 && 'Payment'}
                  {step === 4 && 'Confirmation'}
                </span>
                {step < 4 && <div className="w-6 h-0.5 bg-border mx-2"></div>}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6">
          {/* Step 1: Location & Dates */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4">📍 Pickup & Dropoff Details</h3>

              {/* Location Pickers */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <SimpleLocationSelector
                    label="Pickup Location"
                    placeholder="Select pickup location..."
                    onLocationSelect={(location) => handleLocationSelect('pickupLocation', location)}
                    className="w-full"
                  />
                </div>

                <div>
                  <SimpleLocationSelector
                    label="Dropoff Location"
                    placeholder="Select dropoff location..."
                    onLocationSelect={(location) => handleLocationSelect('dropoffLocation', location)}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Rental Type Selector */}
              <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-xl p-5">
                <h4 className="font-semibold text-foreground mb-3 flex items-center">
                  ⏱️ Rental Type
                  <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Choose how to pay</span>
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Hourly Option */}
                  <button
                    type="button"
                    onClick={() => handleInputChange('rentalType', 'hourly')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      bookingData.rentalType === 'hourly'
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">⏰</span>
                      {bookingData.rentalType === 'hourly' && (
                        <span className="text-blue-500 text-lg">✓</span>
                      )}
                    </div>
                    <p className="font-bold text-lg text-foreground">Hourly</p>
                    <p className="text-primary font-semibold">KES {hourlyRate}/hour</p>
                    <p className="text-xs text-muted-foreground mt-1">Best for short trips</p>
                  </button>

                  {/* Daily Option */}
                  <button
                    type="button"
                    onClick={() => handleInputChange('rentalType', 'daily')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      bookingData.rentalType === 'daily'
                        ? 'border-green-500 bg-green-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-green-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">📅</span>
                      {bookingData.rentalType === 'daily' && (
                        <span className="text-green-500 text-lg">✓</span>
                      )}
                    </div>
                    <p className="font-bold text-lg text-foreground">Daily</p>
                    <p className="text-primary font-semibold">KES {dailyRate}/day</p>
                    <p className="text-xs text-muted-foreground mt-1">Better value for full days</p>
                  </button>
                </div>

                {/* Overtime Warning */}
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <span className="font-semibold">⚠️ Overtime Policy:</span> Late returns are charged at 
                    <span className="font-bold"> {overtimePenalty}% extra</span> per {bookingData.rentalType === 'hourly' ? 'hour' : 'day'}.
                    {bookingData.rentalType === 'hourly' 
                      ? ` (KES ${Math.round(hourlyRate * (1 + overtimePenalty / 100))}/extra hour)`
                      : ` (KES ${Math.round(dailyRate * (1 + overtimePenalty / 100))}/extra day)`
                    }
                  </p>
                </div>
              </div>

              {/* Interactive Map */}
              <div className="border border-border rounded-lg p-4 bg-muted/10">
                <h4 className="text-md font-medium text-foreground mb-3">🗺️ Select Location on Map</h4>
                <GoogleMapEnhanced
                  cars={selectedCar ? [selectedCar] : []}
                  onLocationSelect={(location) => {
                    // Auto-set as pickup location if not set, otherwise dropoff
                    const targetField = !bookingData.pickupLocation ? 'pickupLocation' : 'dropoffLocation';
                    handleLocationSelect(targetField, location);
                  }}
                  selectedCar={selectedCar}
                  mapHeight="300px"
                  className="rounded-lg overflow-hidden border border-border"
                />
                <div className="mt-2 text-xs text-muted-foreground text-center">
                  Click on the map to select {!bookingData.pickupLocation ? 'pickup' : 'dropoff'} location
                </div>
              </div>

              {/* Location Summary */}
              {(bookingData.pickupLocation || bookingData.dropoffLocation) && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">📋 Selected Locations</h4>
                  {bookingData.pickupLocation && (
                    <div className="text-sm text-blue-700 mb-1">
                      <span className="font-medium">Pickup:</span> {bookingData.pickupLocation.name || bookingData.pickupLocation.address}
                    </div>
                  )}
                  {bookingData.dropoffLocation && (
                    <div className="text-sm text-blue-700">
                      <span className="font-medium">Dropoff:</span> {bookingData.dropoffLocation.name || bookingData.dropoffLocation.address}
                    </div>
                  )}
                  {distance > 0 && (
                    <div className="text-sm text-blue-600 mt-2">
                      <span className="font-medium">Distance:</span> {distance.toFixed(1)} km
                    </div>
                  )}
                </div>
              )}

              {/* Date & Time Pickers */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-foreground">📅 Pickup Date & Time</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      value={bookingData.pickupDate}
                      onChange={(e) => handleInputChange('pickupDate', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 bg-input/50 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                    />
                    <input
                      type="time"
                      value={bookingData.pickupTime}
                      onChange={(e) => handleInputChange('pickupTime', e.target.value)}
                      className="w-full px-3 py-2 bg-input/50 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-foreground">📅 Return Date & Time</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      value={bookingData.returnDate}
                      onChange={(e) => handleInputChange('returnDate', e.target.value)}
                      min={bookingData.pickupDate || new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 bg-input/50 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                    />
                    <input
                      type="time"
                      value={bookingData.returnTime}
                      onChange={(e) => handleInputChange('returnTime', e.target.value)}
                      className="w-full px-3 py-2 bg-input/50 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Options */}
              <div className="space-y-4">
                <h4 className="font-medium text-foreground">🚗 Additional Options</h4>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={bookingData.driverRequired}
                    onChange={(e) => handleInputChange('driverRequired', e.target.checked)}
                    className="w-4 h-4 text-primary border-input rounded focus:ring-primary"
                  />
                  <span className="text-foreground">
                    Include professional driver 
                    {bookingData.rentalType === 'hourly' 
                      ? ' (+KES 100/hour)' 
                      : ' (+KES 2,000/day)'
                    }
                  </span>
                </label>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Additional Requests (Optional)
                  </label>
                  <textarea
                    value={bookingData.additionalRequests}
                    onChange={(e) => handleInputChange('additionalRequests', e.target.value)}
                    placeholder="Any special requests or requirements..."
                    rows={3}
                    className="w-full px-3 py-2 bg-input/50 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-muted-foreground"
                  />
                </div>

                {/* Recurrence Options */}
                <div className="border-t border-border pt-4">
                  <h4 className="font-medium text-foreground mb-2">🔁 Recurring Booking</h4>
                  <label className="flex items-center space-x-3 mb-2">
                    <input
                      type="checkbox"
                      checked={bookingData.recurrence?.enabled}
                      onChange={(e) => handleInputChange('recurrence', { ...bookingData.recurrence, enabled: e.target.checked })}
                      className="w-4 h-4 text-primary border-input rounded focus:ring-primary"
                    />
                    <span className="text-foreground">Repeat weekly</span>
                  </label>
                  {bookingData.recurrence?.enabled && (
                    <div className="flex items-center space-x-3">
                      <label className="text-sm text-foreground">Occurrences:</label>
                      <input
                        type="number"
                        min="1"
                        max="26"
                        value={bookingData.recurrence.count}
                        onChange={(e) => handleInputChange('recurrence', { ...bookingData.recurrence, count: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-24 px-3 py-2 bg-input/50 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                      />
                      <span className="text-xs text-muted-foreground">Weekly repeats on the pickup day</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing Breakdown */}
              {pricingBreakdown && (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-5">
                  <h4 className="font-semibold text-foreground mb-4 flex items-center">
                    💰 Price Estimate
                    <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      {pricingBreakdown.rentalType === 'hourly' ? '⏰ Hourly' : '📅 Daily'} Pricing
                    </span>
                  </h4>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {pricingBreakdown.duration} {pricingBreakdown.unitLabel}{pricingBreakdown.duration > 1 ? 's' : ''} × KES {pricingBreakdown.rate}
                      </span>
                      <span className="font-medium">KES {pricingBreakdown.basePrice.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between text-muted-foreground">
                      <span>Platform Fee (2%)</span>
                      <span>KES {pricingBreakdown.platformFee.toLocaleString()}</span>
                    </div>
                    
                    {/* Insurance disabled for now
                    <div className="flex justify-between text-muted-foreground">
                      <span>Insurance (10%)</span>
                      <span>KES {pricingBreakdown.insuranceFee.toLocaleString()}</span>
                    </div>
                    */}
                    
                    {pricingBreakdown.driverFee > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Driver Fee</span>
                        <span>KES {pricingBreakdown.driverFee.toLocaleString()}</span>
                      </div>
                    )}
                    
                    {pricingBreakdown.deliveryFee > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Delivery Fee ({distance.toFixed(1)} km)</span>
                        <span>KES {pricingBreakdown.deliveryFee.toLocaleString()}</span>
                      </div>
                    )}
                    
                    <div className="border-t border-green-300 pt-2 mt-2">
                      <div className="flex justify-between text-lg font-bold">
                        <span className="text-foreground">Total</span>
                        <span className="text-green-600">KES {pricingBreakdown.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Comparison Note */}
                  {pricingBreakdown.rentalType === 'hourly' && pricingBreakdown.duration >= 20 && (
                    <div className="mt-3 p-2 bg-blue-100 rounded-lg text-xs text-blue-800">
                      💡 <strong>Tip:</strong> For {pricingBreakdown.duration}+ hours, daily pricing may be more economical!
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Customer Information */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4">👤 Customer Information</h3>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={bookingData.customerInfo.name}
                    onChange={(e) => handleInputChange('customerInfo.name', e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-3 py-2 bg-input/50 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-muted-foreground"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={bookingData.customerInfo.phone}
                    onChange={(e) => handleInputChange('customerInfo.phone', e.target.value)}
                    placeholder="+254 700 000 000"
                    className="w-full px-3 py-2 bg-input/50 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-muted-foreground"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={bookingData.customerInfo.email}
                    onChange={(e) => handleInputChange('customerInfo.email', e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full px-3 py-2 bg-input/50 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-muted-foreground"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    ID/Passport Number
                  </label>
                  <input
                    type="text"
                    value={bookingData.customerInfo.idNumber}
                    onChange={(e) => handleInputChange('customerInfo.idNumber', e.target.value)}
                    placeholder="ID or Passport number"
                    className="w-full px-3 py-2 bg-input/50 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-muted-foreground"
                  />
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <span className="text-primary text-xl">ℹ️</span>
                  <div className="text-sm text-foreground">
                    <p className="font-medium mb-1">Important Information:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Valid driving license required for car pickup</li>
                      <li>ID/Passport will be verified during pickup</li>
                      <li>Security deposit may be required</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Payment */}
          {currentStep === 3 && (
            <PaymentSelector
              selectedPayment={bookingData.paymentMethod}
              onPaymentSelect={(method) => handleInputChange('paymentMethod', method)}
              totalAmount={estimatedCost}
              onNext={nextStep}
              onPrev={prevStep}
              isLoading={isLoading}
            />
          )}

          {/* Step 4: Confirmation */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4">✅ Booking Confirmation</h3>

              {/* Booking Summary */}
              <div className="bg-muted/30 border border-border rounded-lg p-6">
                <h4 className="font-semibold text-foreground mb-4">📋 Booking Summary</h4>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Car:</span>
                    <span className="font-medium text-foreground">{selectedCar.name}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rental Type:</span>
                    <span className="font-medium text-foreground">
                      {bookingData.rentalType === 'hourly' ? '⏰ Hourly' : '📅 Daily'}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pickup:</span>
                    <span className="font-medium text-foreground">
                      {bookingData.pickupLocation?.name || bookingData.pickupLocation?.address || 'Not selected'}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dropoff:</span>
                    <span className="font-medium text-foreground">
                      {bookingData.dropoffLocation?.name || bookingData.dropoffLocation?.address || 'Not selected'}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {bookingData.rentalType === 'hourly' ? 'Date & Time:' : 'Dates:'}
                    </span>
                    <span className="font-medium text-foreground">
                      {bookingData.pickupDate} {bookingData.pickupTime || ''} → {bookingData.returnDate} {bookingData.returnTime || ''}
                    </span>
                  </div>

                  {pricingBreakdown && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-medium text-foreground">
                        {pricingBreakdown.duration} {pricingBreakdown.unitLabel}{pricingBreakdown.duration > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}

                  {bookingData.driverRequired && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Driver:</span>
                      <span className="font-medium text-foreground">Included</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Method:</span>
                    <span className="font-medium text-foreground">
                      {bookingData.paymentMethod === 'cash' && '💵 Cash Payment'}
                      {bookingData.paymentMethod === 'mpesa' && '📱 M-Pesa'}
                      {!bookingData.paymentMethod && 'Not selected'}
                    </span>
                  </div>

                  {/* Pricing Breakdown */}
                  {pricingBreakdown && (
                    <div className="border-t border-border pt-3 mt-3 space-y-2 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Base ({pricingBreakdown.duration} × KES {pricingBreakdown.rate})</span>
                        <span>KES {pricingBreakdown.basePrice.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Platform Fee (2%)</span>
                        <span>KES {pricingBreakdown.platformFee.toLocaleString()}</span>
                      </div>
                      {/* Insurance disabled for now
                      <div className="flex justify-between text-muted-foreground">
                        <span>Insurance (10%)</span>
                        <span>KES {pricingBreakdown.insuranceFee.toLocaleString()}</span>
                      </div>
                      */}
                      {pricingBreakdown.driverFee > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Driver</span>
                          <span>KES {pricingBreakdown.driverFee.toLocaleString()}</span>
                        </div>
                      )}
                      {pricingBreakdown.deliveryFee > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Delivery</span>
                          <span>KES {pricingBreakdown.deliveryFee.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="border-t border-border pt-3 mt-3">
                    <div className="flex justify-between text-lg font-semibold">
                      <span className="text-foreground">Total Cost:</span>
                      <span className="text-primary">KES {estimatedCost.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ Late returns: +{overtimePenalty}% per extra {bookingData.rentalType === 'hourly' ? 'hour' : 'day'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="bg-muted/30 border border-border rounded-lg p-6">
                <h4 className="font-semibold text-foreground mb-4">👤 Customer Details</h4>

                <div className="space-y-2">
                  <div><span className="text-muted-foreground">Name:</span> <span className="font-medium text-foreground">{bookingData.customerInfo.name}</span></div>
                  <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium text-foreground">{bookingData.customerInfo.phone}</span></div>
                  <div><span className="text-muted-foreground">Email:</span> <span className="font-medium text-foreground">{bookingData.customerInfo.email}</span></div>
                  {bookingData.customerInfo.idNumber && (
                    <div><span className="text-muted-foreground">ID:</span> <span className="font-medium text-foreground">{bookingData.customerInfo.idNumber}</span></div>
                  )}
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className={`border rounded-lg p-4 ${termsAccepted ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                  />
                  <span className={`text-sm ${termsAccepted ? 'text-green-800' : 'text-yellow-800'}`}>
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={showTermsAndConditions}
                      className="underline cursor-pointer text-blue-600 hover:text-blue-800 font-medium"
                    >
                      terms and conditions
                    </button>
                    {' '}and confirm that all information provided is accurate.
                    {termsAccepted && <span className="ml-2">✅</span>}
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons - Hidden for payment step */}
        {currentStep !== 3 && (
          <div className="flex items-center justify-between p-6 border-t border-border bg-muted/20">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-6 py-2 text-muted-foreground border border-input rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-6 py-2 text-muted-foreground border border-input rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>

              {currentStep < 4 ? (
                <button
                  onClick={nextStep}
                  disabled={!isStepValid(currentStep)}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={submitBooking}
                  disabled={isLoading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>🎉</span>
                      <span>Confirm Booking</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingFlow;