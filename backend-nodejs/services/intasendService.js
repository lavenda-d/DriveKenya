/**
 * IntaSend Payment Service
 * 
 * This service generates checkout parameters for the frontend
 * to use IntaSend's browser-based checkout widget.
 * 
 * The actual payment is initiated from the frontend browser,
 * which bypasses Cloudflare server-side blocking.
 */

class IntaSendService {
  constructor() {
    this.apiKey = process.env.INTASEND_API_KEY;
    this.publishableKey = process.env.INTASEND_PUBLISHABLE_KEY;
    this.isTestMode = process.env.INTASEND_TEST_MODE === 'true';
    
    console.log(`💳 IntaSend initialized in ${this.isTestMode ? 'SANDBOX' : 'PRODUCTION'} mode`);
    console.log(`💳 Publishable Key: ${this.publishableKey ? this.publishableKey.substring(0, 20) + '...' : 'NOT SET'}`);
  }

  /**
   * Format phone number to IntaSend format (254XXXXXXXXX)
   */
  formatPhoneNumber(phone) {
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    if (cleaned.startsWith('+254')) {
      cleaned = cleaned.substring(1);
    } else if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
      cleaned = '254' + cleaned;
    }
    
    if (cleaned.length !== 12) {
      throw new Error(`Invalid phone number format. Expected 12 digits, got ${cleaned.length}`);
    }
    
    return cleaned;
  }

  /**
   * Generate checkout parameters for frontend IntaSend widget
   * The frontend will use these to open the IntaSend checkout
   */
  async initiateMpesaPayment({ phoneNumber, amount, rentalId, email, firstName, lastName }) {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      console.log(`📱 Generating IntaSend checkout params:`);
      console.log(`   Phone: ${formattedPhone}`);
      console.log(`   Amount: KES ${amount}`);
      console.log(`   Rental ID: ${rentalId}`);

      const checkoutId = `checkout_${rentalId}_${Date.now()}`;
      
      // Return parameters for frontend to use with IntaSend inline widget
      return {
        success: true,
        useCheckoutWidget: true,
        invoiceId: checkoutId,
        checkoutRequestId: checkoutId,
        state: 'PENDING',
        message: 'Please complete payment using M-Pesa',
        checkoutParams: {
          publicKey: this.publishableKey,
          amount: Math.round(amount),
          currency: 'KES',
          email: email || '',
          firstName: firstName || '',
          lastName: lastName || '',
          phoneNumber: formattedPhone,
          apiRef: `rental_${rentalId}`,
          comment: `DriveKenya Car Rental - Booking #${rentalId}`,
          isTest: this.isTestMode,
        },
        data: {
          checkoutId,
          amount,
          phone: formattedPhone,
        },
      };

    } catch (error) {
      console.error('❌ Checkout params generation failed:', error);
      throw error;
    }
  }

  /**
   * Check payment status - for webhook/callback handling
   */
  async checkPaymentStatus(invoiceId) {
    // In checkout widget flow, status comes from callbacks
    return {
      success: true,
      invoiceId: invoiceId,
      state: 'pending',
      message: 'Status should be checked via webhook callbacks',
    };
  }

  /**
   * Process webhook callback from IntaSend
   */
  async processWebhook(payload) {
    console.log('📨 Processing IntaSend webhook:', JSON.stringify(payload, null, 2));

    const stateMapping = {
      'PENDING': 'pending',
      'PROCESSING': 'processing', 
      'COMPLETE': 'completed',
      'COMPLETED': 'completed',
      'FAILED': 'failed',
      'CANCELLED': 'cancelled',
    };

    return {
      success: true,
      invoiceId: payload.invoice_id || payload.tracking_id || payload.id,
      state: stateMapping[payload.state?.toUpperCase()] || 'pending',
      rawState: payload.state,
      mpesaReference: payload.mpesa_reference,
      amount: payload.value || payload.amount,
      apiRef: payload.api_ref,
      data: payload,
    };
  }

  isConfigured() {
    return !!(this.apiKey && this.publishableKey);
  }

  getConfigStatus() {
    return {
      isConfigured: this.isConfigured(),
      isTestMode: this.isTestMode,
      hasApiKey: !!this.apiKey,
      hasPublishableKey: !!this.publishableKey,
      publishableKey: this.publishableKey, // Frontend needs this
    };
  }
}

export const intasendService = new IntaSendService();
export default intasendService;
