import React, { useState, useEffect, useCallback, useRef } from 'react';

/**
 * M-Pesa Payment Component
 * Handles M-Pesa payments via IntaSend Inline Checkout Widget
 * This uses browser-based checkout to bypass server-side Cloudflare blocking
 */
const MpesaPayment = ({
  amount,
  rentalId,
  onSuccess,
  onError,
  onCancel,
  customerPhone = '',
  customerName = '',
  customerEmail = '',
}) => {
  const [phoneNumber, setPhoneNumber] = useState(customerPhone);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('idle'); // idle, initiated, processing, completed, failed
  const [invoiceId, setInvoiceId] = useState(null);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [checkoutParams, setCheckoutParams] = useState(null);
  const intasendRef = useRef(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  
  // IntaSend Publishable Key from environment or fetched from backend
  const INTASEND_PUBLISHABLE_KEY = import.meta.env.VITE_INTASEND_PUBLISHABLE_KEY;

  // Load IntaSend script
  useEffect(() => {
    const existingScript = document.getElementById('intasend-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'intasend-script';
      script.src = 'https://unpkg.com/intasend-inlinejs-sdk@3.0.4/build/intasend-inline.js';
      script.async = true;
      script.onload = () => {
        console.log('✅ IntaSend script loaded');
      };
      document.body.appendChild(script);
    }
  }, []);

  // Format phone number for display
  const formatPhoneDisplay = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length >= 9) {
      if (cleaned.startsWith('254')) {
        return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
      } else if (cleaned.startsWith('0')) {
        return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
      }
    }
    return phone;
  };

  // Validate phone number
  const isValidPhone = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    return (
      (cleaned.startsWith('0') && cleaned.length === 10) ||
      (cleaned.startsWith('254') && cleaned.length === 12) ||
      (cleaned.startsWith('7') && cleaned.length === 9) ||
      (cleaned.startsWith('1') && cleaned.length === 9)
    );
  };

  // Format phone to 254 format
  const formatPhoneTo254 = (phone) => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
      cleaned = '254' + cleaned;
    }
    return cleaned;
  };

  // Get auth token
  const getAuthToken = () => {
    return localStorage.getItem('driveKenya_token');
  };

  // Initialize IntaSend and trigger payment
  const initiateStkPush = async () => {
    if (!isValidPhone(phoneNumber)) {
      setError('Please enter a valid Kenyan phone number (e.g., 0712345678)');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setPaymentStatus('initiated');
    setStatusMessage('Initializing payment...');

    try {
      // First, get checkout params from backend
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/mpesa/stkpush`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          phoneNumber: formatPhoneTo254(phoneNumber),
          amount,
          rentalId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to initiate payment');
      }

      console.log('📦 Backend response:', data);

      // Check if we should use the checkout widget
      if (data.data?.useCheckoutWidget && data.data?.checkoutParams) {
        const params = data.data.checkoutParams;
        setCheckoutParams(params);
        setInvoiceId(data.data.invoiceId);
        
        // Initialize IntaSend inline checkout
        if (window.IntaSend) {
          console.log('🚀 Initializing IntaSend checkout with params:', params);
          
          const intasend = new window.IntaSend({
            publicAPIKey: params.publicKey,
            live: !params.isTest,
          });

          intasend
            .on('COMPLETE', (response) => {
              console.log('✅ IntaSend payment complete:', response);
              setPaymentStatus('completed');
              setStatusMessage(`Payment successful!`);
              setIsProcessing(false);
              onSuccess?.({
                invoiceId: data.data.invoiceId,
                mpesaReference: response.tracking_id || response.id,
                amount,
                response,
              });
            })
            .on('FAILED', (response) => {
              console.log('❌ IntaSend payment failed:', response);
              setPaymentStatus('failed');
              setError(response.reason || 'Payment failed. Please try again.');
              setIsProcessing(false);
              onError?.(response.reason || 'Payment failed');
            })
            .on('IN-PROGRESS', (response) => {
              console.log('⏳ IntaSend payment in progress:', response);
              setPaymentStatus('processing');
              setStatusMessage('Check your phone for the M-Pesa prompt...');
            })
            .on('CANCELLED', () => {
              console.log('🚫 IntaSend payment cancelled');
              setPaymentStatus('idle');
              setIsProcessing(false);
              onCancel?.();
            });

          // Trigger the checkout
          intasend.run({
            amount: params.amount,
            currency: params.currency || 'KES',
            email: params.email || customerEmail || '',
            first_name: params.firstName || customerName?.split(' ')[0] || '',
            last_name: params.lastName || customerName?.split(' ').slice(1).join(' ') || '',
            phone_number: params.phoneNumber,
            api_ref: params.apiRef,
            comment: params.comment,
            method: 'M-PESA', // Force M-Pesa
          });

          intasendRef.current = intasend;
        } else {
          throw new Error('IntaSend widget not loaded. Please refresh and try again.');
        }
      } else {
        // Legacy STK Push flow (if backend returns invoiceId directly)
        setInvoiceId(data.data.invoiceId);
        setPaymentStatus('processing');
        setStatusMessage('Check your phone for the M-Pesa prompt. Enter your PIN to complete payment.');
      }

    } catch (err) {
      console.error('STK Push error:', err);
      setError(err.message);
      setPaymentStatus('failed');
      setIsProcessing(false);
      onError?.(err.message);
    }
  };

  // Check payment status (for legacy flow only)
  const checkPaymentStatus = useCallback(async () => {
    // Not used with IntaSend widget - status comes from callbacks
  }, []);

  // Handle retry
  const handleRetry = () => {
    setPaymentStatus('idle');
    setError(null);
    setInvoiceId(null);
    setStatusMessage('');
    setCheckoutParams(null);
  };

  // Handle cancel
  const handleCancel = () => {
    setIsProcessing(false);
    setPaymentStatus('idle');
    setCheckoutParams(null);
    onCancel?.();
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-3xl">📱</span>
        </div>
        <h3 className="text-xl font-bold text-gray-900">M-Pesa Payment</h3>
        <p className="text-gray-500 text-sm mt-1">Pay securely with M-Pesa</p>
      </div>

      {/* Amount Display */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-green-800 font-medium">Amount to Pay:</span>
          <span className="text-2xl font-bold text-green-700">
            KES {amount?.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Status Display */}
      {paymentStatus !== 'idle' && paymentStatus !== 'failed' && (
        <div className={`mb-6 p-4 rounded-lg ${
          paymentStatus === 'completed' 
            ? 'bg-green-100 border border-green-300'
            : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-center space-x-3">
            {paymentStatus === 'completed' ? (
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white">✓</span>
              </div>
            ) : (
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            )}
            <div>
              <p className={`font-medium ${paymentStatus === 'completed' ? 'text-green-800' : 'text-blue-800'}`}>
                {paymentStatus === 'initiated' && 'Initiating Payment...'}
                {paymentStatus === 'processing' && 'Waiting for Payment...'}
                {paymentStatus === 'completed' && 'Payment Successful!'}
              </p>
              {statusMessage && (
                <p className={`text-sm mt-1 ${paymentStatus === 'completed' ? 'text-green-700' : 'text-blue-700'}`}>
                  {statusMessage}
                </p>
              )}
            </div>
          </div>
          
          {paymentStatus === 'processing' && (
            <div className="mt-4 text-sm text-blue-600">
              <p className="font-medium mb-2">💡 Instructions:</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-700">
                <li>Check your phone for the M-Pesa prompt</li>
                <li>Enter your M-Pesa PIN</li>
                <li>Wait for confirmation</li>
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <span className="text-red-500 text-xl">⚠️</span>
            <div>
              <p className="font-medium text-red-800">Payment Failed</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Phone Input (only show when idle or failed) */}
      {(paymentStatus === 'idle' || paymentStatus === 'failed') && (
        <>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              M-Pesa Phone Number
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                🇰🇪
              </span>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="0712 345 678"
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg ${
                  phoneNumber && !isValidPhone(phoneNumber) 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-gray-300'
                }`}
                disabled={isProcessing}
              />
            </div>
            {phoneNumber && !isValidPhone(phoneNumber) && (
              <p className="text-sm text-red-500 mt-1">
                Enter a valid phone number (e.g., 0712345678)
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Enter the M-Pesa registered phone number
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {paymentStatus === 'failed' ? (
              <>
                <button
                  onClick={handleRetry}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <span>🔄</span>
                  <span>Try Again</span>
                </button>
                <button
                  onClick={handleCancel}
                  className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={initiateStkPush}
                  disabled={!isValidPhone(phoneNumber) || isProcessing}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <span>📱</span>
                  <span>Pay with M-Pesa</span>
                </button>
                <button
                  onClick={handleCancel}
                  className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Choose Different Payment Method
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* Processing State - Cancel Button */}
      {(paymentStatus === 'processing' || paymentStatus === 'initiated') && (
        <button
          onClick={handleCancel}
          className="w-full mt-4 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-sm hover:bg-gray-200 transition-colors"
        >
          Cancel Payment
        </button>
      )}

      {/* Success State - Continue Button */}
      {paymentStatus === 'completed' && (
        <button
          onClick={() => onSuccess?.({ invoiceId, amount })}
          className="w-full mt-4 bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
        >
          <span>✓</span>
          <span>Continue</span>
        </button>
      )}

      {/* Security Notice */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
          <span>🔒</span>
          <span>Secured by IntaSend • M-Pesa</span>
        </div>
      </div>
    </div>
  );
};

export default MpesaPayment;
