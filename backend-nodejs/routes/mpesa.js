/**
 * M-Pesa Payment Routes via IntaSend
 * Handles all M-Pesa payment operations for car rentals
 */

import express from 'express';
import { query } from '../config/database.js';
import { intasendService } from '../services/intasendService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/mpesa/stkpush
 * Initiate M-Pesa STK Push payment
 */
router.post('/stkpush', authenticateToken, async (req, res, next) => {
  try {
    const { phoneNumber, amount, rentalId } = req.body;
    const userId = req.user.id;

    // Validation
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    // Check if IntaSend is configured
    if (!intasendService.isConfigured()) {
      console.error('IntaSend config status:', intasendService.getConfigStatus());
      return res.status(503).json({
        success: false,
        message: 'M-Pesa payment service is not configured. Please contact support.'
      });
    }

    // Get user details for the payment
    const userResult = await query(`
      SELECT first_name, last_name, email, phone 
      FROM users WHERE id = ?
    `, [userId]);
    
    const user = userResult.rows[0] || {};

    // Initiate STK Push / Get checkout params
    console.log('📱 Initiating M-Pesa payment for user:', userId, 'Amount:', amount);
    
    const stkResult = await intasendService.initiateMpesaPayment({
      phoneNumber,
      amount: Math.round(amount),
      rentalId: rentalId || `booking_${Date.now()}`,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
    });

    // Only store payment record if using checkout widget (will be confirmed via callback)
    // Don't save to DB yet - wait for payment confirmation via webhook/callback
    console.log('📋 Payment initiated - waiting for confirmation via callback');

    res.json({
      success: true,
      message: stkResult.message,
      data: {
        invoiceId: stkResult.invoiceId,
        checkoutRequestId: stkResult.checkoutRequestId,
        state: stkResult.state,
        useCheckoutWidget: stkResult.useCheckoutWidget,
        checkoutParams: stkResult.checkoutParams,
        instructions: [
          '1. Check your phone for the M-Pesa prompt',
          '2. Enter your M-Pesa PIN to complete payment',
          '3. Wait for confirmation (usually within 30 seconds)',
        ]
      }
    });

  } catch (error) {
    console.error('❌ STK Push Error:', error);
    
    let message = 'Failed to initiate M-Pesa payment';
    const errorMsg = error?.message || String(error) || '';
    
    if (errorMsg.includes('phone')) {
      message = 'Invalid phone number format. Please use format: 07XXXXXXXX';
    } else if (errorMsg.includes('amount')) {
      message = 'Invalid payment amount';
    } else if (errorMsg.includes('401') || errorMsg.includes('403') || errorMsg.includes('Cloudflare')) {
      message = 'Payment service temporarily unavailable. Please try again or use another payment method.';
    }

    res.status(500).json({
      success: false,
      message,
      error: process.env.NODE_ENV === 'development' ? errorMsg : undefined
    });
  }
});

/**
 * GET /api/mpesa/status/:invoiceId
 * Check payment status
 */
router.get('/status/:invoiceId', authenticateToken, async (req, res, next) => {
  try {
    const { invoiceId } = req.params;

    // Check with IntaSend for latest status
    const statusResult = await intasendService.checkPaymentStatus(invoiceId);

    // Try to update local record
    try {
      await query(`
        UPDATE mpesa_payments SET
          status = ?,
          mpesa_reference = ?,
          failed_reason = ?
        WHERE invoice_id = ?
      `, [
        statusResult.state,
        statusResult.mpesaReference || null,
        statusResult.failedReason || null,
        invoiceId
      ]);
    } catch (dbError) {
      console.warn('⚠️ Could not update payment in DB:', dbError.message);
    }

    res.json({
      success: true,
      data: {
        invoiceId: statusResult.invoiceId,
        state: statusResult.state,
        rawState: statusResult.rawState,
        mpesaReference: statusResult.mpesaReference,
        amount: statusResult.amount,
        failedReason: statusResult.failedReason,
      }
    });

  } catch (error) {
    console.error('❌ Status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check payment status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/mpesa/webhook
 * IntaSend webhook callback endpoint
 */
router.post('/webhook', express.json(), async (req, res) => {
  try {
    const signature = req.headers['x-intasend-signature'];
    const payload = req.body;

    console.log('📨 Received IntaSend webhook:', JSON.stringify(payload, null, 2));

    // Process the webhook
    const result = await intasendService.processWebhook(payload, signature);

    if (!result.success) {
      return res.status(400).json({ success: false, message: 'Invalid webhook' });
    }

    const { invoiceId, state, mpesaReference } = result;

    // Update payment record
    try {
      await query(`
        UPDATE mpesa_payments SET
          status = ?,
          mpesa_reference = ?,
          webhook_data = ?
        WHERE invoice_id = ?
      `, [state, mpesaReference || null, JSON.stringify(payload), invoiceId]);
    } catch (dbError) {
      console.warn('⚠️ Could not update payment from webhook:', dbError.message);
    }

    // Acknowledge receipt
    res.json({ success: true, message: 'Webhook processed' });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.json({ success: false, message: error.message });
  }
});

/**
 * GET /api/mpesa/payments
 * Get user's M-Pesa payment history
 */
router.get('/payments', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    const result = await query(`
      SELECT * FROM mpesa_payments 
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, parseInt(limit), parseInt(offset)]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('❌ Payment history error:', error);
    res.json({
      success: true,
      data: [] // Return empty array on error
    });
  }
});

/**
 * GET /api/mpesa/config
 * Get M-Pesa configuration status (for frontend)
 */
router.get('/config', (req, res) => {
  const config = intasendService.getConfigStatus();
  
  res.json({
    success: true,
    data: {
      isEnabled: config.isConfigured,
      isTestMode: config.isTestMode,
    }
  });
});

export default router;
