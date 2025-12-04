import React, { useState, useEffect } from 'react';
import LocationPicker from './LocationPicker';
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
  const [distance, setDistance] = useState(0);

  // Calculate estimated cost based on distance and rental duration
  useEffect(() => {
    if (bookingData.pickupLocation && bookingData.dropoffLocation && bookingData.pickupDate && bookingData.returnDate) {
      calculateEstimate();
    }
  }, [bookingData.pickupLocation, bookingData.dropoffLocation, bookingData.pickupDate, bookingData.returnDate]);

  const calculateEstimate = () => {
    // Demo calculation - in real app, this would use Google Maps Distance Matrix API
    const baseRate = selectedCar?.pricePerDay || 3000;
    const pickupDate = new Date(bookingData.pickupDate);
    const returnDate = new Date(bookingData.returnDate);
    const days = Math.ceil((returnDate - pickupDate) / (1000 * 60 * 60 * 24));
    
    // Simulate distance calculation
    const mockDistance = Math.random() * 20 + 5; // 5-25 km
    setDistance(mockDistance);
    
    // Calculate total cost
    let total = baseRate * days;
    if (bookingData.driverRequired) {
      total += 2000 * days; // Driver fee per day
    }
    
    // Add delivery fee if pickup/dropoff are different
    if (bookingData.pickupLocation?.id !== bookingData.dropoffLocation?.id) {
      total += Math.floor(mockDistance * 50); // 50 KSH per km delivery
    }
    
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <img
              src={selectedCar.image}
              alt={selectedCar.name}
              className="w-16 h-12 object-cover rounded-lg"
            />
            <div>
              <h2 className="text-xl font-semibold">Book {selectedCar.name}</h2>
              <p className="text-gray-500">KSH {selectedCar.pricePerDay}/day</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step}
                </div>
                <span className={`ml-2 text-sm ${
                  currentStep >= step ? 'text-blue-600 font-medium' : 'text-gray-500'
                }`}>
                  {step === 1 && 'Location & Dates'}
                  {step === 2 && 'Customer Info'}
                  {step === 3 && 'Payment'}
                  {step === 4 && 'Confirmation'}
                </span>
                {step < 4 && <div className="w-6 h-0.5 bg-gray-200 mx-2"></div>}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pickup Location
                  </label>
                  <LocationPicker
                    placeholder="Where do you want to pick up the car?"
                    onLocationSelect={(location) => handleLocationSelect('pickupLocation', location)}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dropoff Location
                  </label>
                  <LocationPicker
                    placeholder="Where will you return the car?"
                    onLocationSelect={(location) => handleLocationSelect('dropoffLocation', location)}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Interactive Map */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="text-md font-medium text-gray-700 mb-3">🗺️ Select Location on Map</h4>
                <GoogleMapEnhanced
                  cars={selectedCar ? [selectedCar] : []}
                  onLocationSelect={(location) => {
                    // Auto-set as pickup location if not set, otherwise dropoff
                    const targetField = !bookingData.pickupLocation ? 'pickupLocation' : 'dropoffLocation';
                    handleLocationSelect(targetField, location);
                  }}
                  selectedCar={selectedCar}
                  mapHeight="300px"
                  className="rounded-lg overflow-hidden"
                />
                <div className="mt-2 text-xs text-gray-500 text-center">
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
                  <h4 className="font-medium text-gray-900">📅 Pickup Date & Time</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      value={bookingData.pickupDate}
                      onChange={(e) => handleInputChange('pickupDate', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                    <input
                      type="time"
                      value={bookingData.pickupTime}
                      onChange={(e) => handleInputChange('pickupTime', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">📅 Return Date & Time</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      value={bookingData.returnDate}
                      onChange={(e) => handleInputChange('returnDate', e.target.value)}
                      min={bookingData.pickupDate || new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                    <input
                      type="time"
                      value={bookingData.returnTime}
                      onChange={(e) => handleInputChange('returnTime', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Options */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">🚗 Additional Options</h4>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={bookingData.driverRequired}
                    onChange={(e) => handleInputChange('driverRequired', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Include professional driver (+KSH 2,000/day)</span>
                </label>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Requests (Optional)
                  </label>
                  <textarea
                    value={bookingData.additionalRequests}
                    onChange={(e) => handleInputChange('additionalRequests', e.target.value)}
                    placeholder="Any special requests or requirements..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  />
                </div>

                {/* Recurrence Options */}
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-2">🔁 Recurring Booking</h4>
                  <label className="flex items-center space-x-3 mb-2">
                    <input
                      type="checkbox"
                      checked={bookingData.recurrence?.enabled}
                      onChange={(e) => handleInputChange('recurrence', { ...bookingData.recurrence, enabled: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-700">Repeat weekly</span>
                  </label>
                  {bookingData.recurrence?.enabled && (
                    <div className="flex items-center space-x-3">
                      <label className="text-sm text-gray-700">Occurrences:</label>
                      <input
                        type="number"
                        min="1"
                        max="26"
                        value={bookingData.recurrence.count}
                        onChange={(e) => handleInputChange('recurrence', { ...bookingData.recurrence, count: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                      <span className="text-xs text-gray-500">Weekly repeats on the pickup day</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Customer Information */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4">👤 Customer Information</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={bookingData.customerInfo.name}
                    onChange={(e) => handleInputChange('customerInfo.name', e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={bookingData.customerInfo.phone}
                    onChange={(e) => handleInputChange('customerInfo.phone', e.target.value)}
                    placeholder="+254 700 000 000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={bookingData.customerInfo.email}
                    onChange={(e) => handleInputChange('customerInfo.email', e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ID/Passport Number
                  </label>
                  <input
                    type="text"
                    value={bookingData.customerInfo.idNumber}
                    onChange={(e) => handleInputChange('customerInfo.idNumber', e.target.value)}
                    placeholder="ID or Passport number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <span className="text-blue-600 text-xl">ℹ️</span>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Important Information:</p>
                    <ul className="list-disc list-inside space-y-1">
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
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">📋 Booking Summary</h4>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Car:</span>
                    <span className="font-medium text-gray-900">{selectedCar.name}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pickup:</span>
                    <span className="font-medium text-gray-900">
                      {bookingData.pickupLocation?.name || bookingData.pickupLocation?.address || 'Not selected'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Dropoff:</span>
                    <span className="font-medium text-gray-900">
                      {bookingData.dropoffLocation?.name || bookingData.dropoffLocation?.address || 'Not selected'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Dates:</span>
                    <span className="font-medium text-gray-900">
                      {bookingData.pickupDate} to {bookingData.returnDate}
                    </span>
                  </div>
                  
                  {bookingData.driverRequired && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Driver:</span>
                      <span className="font-medium text-gray-900">Included</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Method:</span>
                    <span className="font-medium text-gray-900">
                      {bookingData.paymentMethod === 'cash' && '💵 Cash Payment'}
                      {bookingData.paymentMethod === 'mpesa' && '📱 M-Pesa'}
                      {!bookingData.paymentMethod && 'Not selected'}
                    </span>
                  </div>
                  
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between text-lg font-semibold">
                      <span className="text-gray-900">Total Cost:</span>
                      <span className="text-blue-600">KSH {estimatedCost.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">👤 Customer Details</h4>
                
                <div className="space-y-2">
                  <div><span className="text-gray-600">Name:</span> <span className="font-medium text-gray-900">{bookingData.customerInfo.name}</span></div>
                  <div><span className="text-gray-600">Phone:</span> <span className="font-medium text-gray-900">{bookingData.customerInfo.phone}</span></div>
                  <div><span className="text-gray-600">Email:</span> <span className="font-medium text-gray-900">{bookingData.customerInfo.email}</span></div>
                  {bookingData.customerInfo.idNumber && (
                    <div><span className="text-gray-600">ID:</span> <span className="font-medium text-gray-900">{bookingData.customerInfo.idNumber}</span></div>
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
          <div className="flex items-center justify-between p-6 border-t border-gray-200">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              
              {currentStep < 4 ? (
                <button
                  onClick={nextStep}
                  disabled={!isStepValid(currentStep)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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