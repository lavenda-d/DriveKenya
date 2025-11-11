import React, { useState } from 'react';

const PaymentSelector = ({ selectedPayment, onPaymentSelect, totalAmount, onNext, onPrev, isLoading }) => {
  const [termsAccepted, setTermsAccepted] = useState(false);

  const paymentMethods = [
    {
      id: 'cash',
      name: 'Cash Payment',
      description: 'Pay in cash when you collect the vehicle',
      icon: '💵',
      available: true,
      details: 'Payment will be collected at pickup location',
      subtitle: 'Safe & Secure'
    },
    {
      id: 'mpesa',
      name: 'M-Pesa Mobile Money',
      description: 'Pay instantly with M-Pesa mobile money',
      icon: '📱',
      available: true,
      details: 'Instant payment via Safaricom M-Pesa',
      subtitle: 'Quick & Convenient'
    },
    {
      id: 'card',
      name: 'Credit/Debit Card',
      description: 'Pay with Visa, Mastercard or other cards',
      icon: '💳',
      available: false,
      details: 'Coming soon - Secure card payments',
      subtitle: 'Coming Soon'
    },
    {
      id: 'bank',
      name: 'Bank Transfer',
      description: 'Direct bank transfer payment',
      icon: '🏦',
      available: false,
      details: 'Coming soon - Bank transfer option',
      subtitle: 'Coming Soon'
    }
  ];

  const handlePaymentSelect = (paymentId) => {
    const method = paymentMethods.find(m => m.id === paymentId);
    if (method && method.available) {
      onPaymentSelect(paymentId);
    }
  };

  const isNextEnabled = selectedPayment && termsAccepted;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center pb-4 border-b border-gray-200">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">💳 Select Payment Method</h3>
        <p className="text-gray-600">Choose how you'd like to pay for your rental</p>
      </div>

      {/* Payment Amount Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <span className="text-blue-800 font-medium">Total Amount:</span>
          <span className="text-2xl font-bold text-blue-900">KSH {totalAmount.toLocaleString()}</span>
        </div>
      </div>

      {/* Payment Methods Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {paymentMethods.map((method) => (
          <div
            key={method.id}
            onClick={() => handlePaymentSelect(method.id)}
            className={`
              relative border-2 rounded-lg p-4 cursor-pointer transition-all duration-200
              ${!method.available 
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' 
                : selectedPayment === method.id
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
              }
            `}
          >
            {/* Available Badge */}
            {method.available && (
              <div className="absolute top-2 right-2">
                {selectedPayment === method.id ? (
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                ) : (
                  <div className="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
                )}
              </div>
            )}

            {/* Coming Soon Badge */}
            {!method.available && (
              <div className="absolute top-2 right-2 bg-gray-400 text-white text-xs px-2 py-1 rounded-full">
                Soon
              </div>
            )}

            {/* Method Content */}
            <div className="pr-8">
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-2xl">{method.icon}</span>
                <div>
                  <h4 className={`font-semibold ${method.available ? 'text-gray-900' : 'text-gray-500'}`}>
                    {method.name}
                  </h4>
                  <p className={`text-xs ${method.available ? 'text-blue-600' : 'text-gray-400'}`}>
                    {method.subtitle}
                  </p>
                </div>
              </div>
              
              <p className={`text-sm mb-2 ${method.available ? 'text-gray-600' : 'text-gray-400'}`}>
                {method.description}
              </p>
              
              <p className={`text-xs ${method.available ? 'text-gray-500' : 'text-gray-400'}`}>
                {method.details}
              </p>
            </div>

            {/* Special features for available methods */}
            {method.available && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                {method.id === 'cash' && (
                  <div className="flex items-center space-x-2 text-green-600 text-xs">
                    <span>✓</span>
                    <span>No processing fees</span>
                  </div>
                )}
                {method.id === 'mpesa' && (
                  <div className="flex items-center space-x-2 text-green-600 text-xs">
                    <span>✓</span>
                    <span>Instant confirmation</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Selected Payment Details */}
      {selectedPayment && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-green-600">✓</span>
            <h4 className="font-semibold text-green-800">Payment Method Selected</h4>
          </div>
          
          {selectedPayment === 'cash' && (
            <div className="text-green-700 text-sm">
              <p className="mb-2">You've selected <strong>Cash Payment</strong></p>
              <ul className="space-y-1 text-xs">
                <li>• Payment will be collected when you pick up the vehicle</li>
                <li>• Please bring the exact amount: KSH {totalAmount.toLocaleString()}</li>
                <li>• Valid ID required for vehicle handover</li>
              </ul>
            </div>
          )}
          
          {selectedPayment === 'mpesa' && (
            <div className="text-green-700 text-sm">
              <p className="mb-2">You've selected <strong>M-Pesa Payment</strong></p>
              <ul className="space-y-1 text-xs">
                <li>• You'll receive M-Pesa payment instructions after confirmation</li>
                <li>• Amount: KSH {totalAmount.toLocaleString()}</li>
                <li>• Payment must be completed within 24 hours</li>
                <li>• Vehicle will be reserved after payment confirmation</li>
              </ul>
            </div>
          )}
        </div>
      )}

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
            I agree to the payment terms and confirm that I understand the selected payment method.
            {termsAccepted && <span className="ml-2">✅</span>}
          </span>
        </label>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <button
          onClick={onPrev}
          className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Previous
        </button>
        
        <button
          onClick={onNext}
          disabled={!isNextEnabled || isLoading}
          className={`
            px-6 py-2 rounded-lg transition-colors flex items-center space-x-2
            ${isNextEnabled 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <span>Continue to Review</span>
              <span>→</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PaymentSelector;