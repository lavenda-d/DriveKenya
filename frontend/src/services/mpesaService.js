/**
 * M-Pesa Payment Service
 * Frontend API service for M-Pesa payments via IntaSend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api` 
  : 'http://localhost:5000/api';

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('driveKenya_token');
};

// Helper for API requests
const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `HTTP error! status: ${response.status}`);
  }

  return data;
};

/**
 * M-Pesa Payment Service
 */
export const mpesaService = {
  /**
   * Check if M-Pesa is enabled/configured
   */
  async checkConfig() {
    try {
      const response = await apiRequest('/mpesa/config', { method: 'GET' });
      return response.data;
    } catch (error) {
      console.error('M-Pesa config check failed:', error);
      return { isEnabled: false, isTestMode: false };
    }
  },

  /**
   * Initiate M-Pesa STK Push payment
   * @param {Object} params
   * @param {string} params.phoneNumber - Customer phone number
   * @param {number} params.amount - Amount in KES
   * @param {number} params.rentalId - Optional rental ID
   */
  async initiateStkPush({ phoneNumber, amount, rentalId }) {
    return apiRequest('/mpesa/stkpush', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, amount, rentalId }),
    });
  },

  /**
   * Check payment status
   * @param {string} invoiceId - The invoice/checkout ID
   */
  async checkStatus(invoiceId) {
    return apiRequest(`/mpesa/status/${invoiceId}`, { method: 'GET' });
  },

  /**
   * Get payment history
   * @param {Object} params - Query params (limit, offset)
   */
  async getPaymentHistory(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/mpesa/payments${query ? `?${query}` : ''}`, { method: 'GET' });
  },

  /**
   * Poll for payment status with timeout
   * @param {string} invoiceId - The invoice/checkout ID
   * @param {Object} options - Polling options
   */
  async pollStatus(invoiceId, options = {}) {
    const {
      maxAttempts = 40,
      intervalMs = 3000,
      onStatusUpdate = () => {},
    } = options;

    return new Promise((resolve, reject) => {
      let attempts = 0;

      const poll = async () => {
        try {
          attempts++;
          const result = await this.checkStatus(invoiceId);
          const { state, mpesaReference, failedReason } = result.data;

          onStatusUpdate({ state, mpesaReference, attempts });

          if (state === 'completed') {
            resolve({ success: true, mpesaReference, state });
          } else if (state === 'failed' || state === 'cancelled') {
            reject(new Error(failedReason || 'Payment failed'));
          } else if (attempts >= maxAttempts) {
            reject(new Error('Payment timeout - please check your M-Pesa messages'));
          } else {
            // Continue polling
            setTimeout(poll, intervalMs);
          }
        } catch (error) {
          if (attempts >= maxAttempts) {
            reject(error);
          } else {
            // Retry on network errors
            setTimeout(poll, intervalMs);
          }
        }
      };

      poll();
    });
  },

  /**
   * Format phone number for display
   * @param {string} phone - Phone number
   */
  formatPhoneDisplay(phone) {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10 && cleaned.startsWith('0')) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith('254')) {
      return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
    }
    return phone;
  },

  /**
   * Validate Kenyan phone number
   * @param {string} phone - Phone number to validate
   */
  isValidKenyanPhone(phone) {
    if (!phone) return false;
    const cleaned = phone.replace(/\D/g, '');
    return (
      (cleaned.startsWith('0') && (cleaned.startsWith('07') || cleaned.startsWith('01')) && cleaned.length === 10) ||
      (cleaned.startsWith('254') && cleaned.length === 12) ||
      ((cleaned.startsWith('7') || cleaned.startsWith('1')) && cleaned.length === 9)
    );
  },

  /**
   * Normalize phone to 254 format
   * @param {string} phone - Phone number
   */
  normalizePhone(phone) {
    if (!phone) return '';
    let cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
      cleaned = '254' + cleaned;
    }
    
    return cleaned;
  },
};

export default mpesaService;
