import express from 'express';
import Stripe from 'stripe';
import { query } from '../config/database.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create payment intent for rental
router.post('/create-payment-intent', async (req, res, next) => {
  try {
    const { rentalId } = req.body;

    if (!rentalId) {
      return res.status(400).json({
        success: false,
        message: 'Rental ID is required'
      });
    }

    // Get rental details
    const rentalResult = await query(`
      SELECT r.*, c.make, c.model 
      FROM rentals r
      JOIN cars c ON r.car_id = c.id
      WHERE r.id = $1 AND r.renter_id = $2
    `, [rentalId, req.user.id]);

    if (rentalResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rental not found'
      });
    }

    const rental = rentalResult.rows[0];

    if (rental.payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Rental is already paid'
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parseFloat(rental.total_amount) * 100), // Convert to cents
      currency: 'kes',
      metadata: {
        rentalId: rental.id,
        carMake: rental.make,
        carModel: rental.model,
        userId: req.user.id
      },
      description: `Car rental: ${rental.make} ${rental.model}`,
    });

    // Update rental with payment intent
    await query(`
      UPDATE rentals SET 
        stripe_session_id = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [paymentIntent.id, rentalId]);

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      }
    });

  } catch (error) {
    next(error);
  }
});

// Confirm payment
router.post('/confirm-payment', async (req, res, next) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment intent ID is required'
      });
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // Update rental payment status
      await query(`
        UPDATE rentals SET 
          payment_status = 'paid',
          status = 'confirmed',
          updated_at = CURRENT_TIMESTAMP
        WHERE stripe_session_id = $1
      `, [paymentIntentId]);

      res.json({
        success: true,
        message: 'Payment confirmed successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment not completed',
        data: { status: paymentIntent.status }
      });
    }

  } catch (error) {
    next(error);
  }
});

// Webhook endpoint for Stripe
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;

      // Update rental status
      await query(`
        UPDATE rentals SET 
          payment_status = 'paid',
          status = 'confirmed',
          updated_at = CURRENT_TIMESTAMP
        WHERE stripe_session_id = $1
      `, [paymentIntent.id]);

      console.log('Payment succeeded:', paymentIntent.id);
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;

      // Update rental status
      await query(`
        UPDATE rentals SET 
          payment_status = 'failed',
          updated_at = CURRENT_TIMESTAMP
        WHERE stripe_session_id = $1
      `, [failedPayment.id]);

      console.log('Payment failed:', failedPayment.id);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

export default router;