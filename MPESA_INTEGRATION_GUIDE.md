# 📱 M-Pesa Integration Guide (IntaSend)

This guide explains how to set up M-Pesa payments for DriveKenya using IntaSend.

## 🌟 Why IntaSend?

- **No business registration required** to start accepting payments
- **Sandbox mode** for development and testing
- **Quick approval** (24-48 hours for production)
- **Low fees** (~3% per transaction)
- **Kenya-focused** with excellent M-Pesa support

---

## 🚀 Quick Start

### Step 1: Create IntaSend Account

1. Go to [IntaSend](https://intasend.com) and click "Get Started"
2. Sign up with:
   - Email address
   - Phone number (Kenyan)
   - National ID (for verification)
3. Verify your email

### Step 2: Get API Keys

1. Log in to your [IntaSend Dashboard](https://payment.intasend.com)
2. Go to **Settings** → **API Keys**
3. Copy your keys:
   - **API Key** (secret key - keep private!)
   - **Publishable Key** (public key)

### Step 3: Configure Environment

Add these to your `.env` file in the backend:

```env
# IntaSend M-Pesa Configuration
INTASEND_API_KEY=ISSecretKey_your_secret_key_here
INTASEND_PUBLISHABLE_KEY=ISPubKey_your_publishable_key_here
INTASEND_TEST_MODE=true
```

### Step 4: Run Database Migration

The M-Pesa payments table will be created automatically, or run:

```sql
-- Run this in your PostgreSQL database
\i backend-nodejs/migrations/add_mpesa_payments_table.sql
```

### Step 5: Test the Integration

1. Start your backend server
2. Go to the booking flow
3. Select M-Pesa payment
4. Enter test phone number: `254708374149` (IntaSend test number)
5. In sandbox mode, payments auto-complete

---

## 📁 Project Structure

```
backend-nodejs/
├── services/
│   └── intasendService.js      # IntaSend API wrapper
├── routes/
│   └── mpesa.js                # M-Pesa payment routes
└── migrations/
    └── add_mpesa_payments_table.sql

frontend/src/
├── components/
│   ├── MpesaPayment.jsx        # M-Pesa payment UI
│   └── PaymentSelector.jsx     # Updated payment selector
└── services/
    └── mpesaService.js         # Frontend M-Pesa API service
```

---

## 🔌 API Endpoints

### Initiate STK Push
```http
POST /api/mpesa/stkpush
Authorization: Bearer <token>

{
  "phoneNumber": "0712345678",
  "amount": 5000,
  "rentalId": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "STK Push sent to your phone. Please enter your M-Pesa PIN.",
  "data": {
    "invoiceId": "INV123456",
    "checkoutRequestId": "ws_CO_123456",
    "state": "PENDING"
  }
}
```

### Check Payment Status
```http
GET /api/mpesa/status/:invoiceId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "invoiceId": "INV123456",
    "state": "completed",
    "mpesaReference": "QK12ABC345",
    "amount": 5000
  }
}
```

### Webhook (for IntaSend callbacks)
```http
POST /api/mpesa/webhook
```

---

## 🧪 Testing in Sandbox Mode

### Test Phone Numbers
Use these numbers in sandbox mode:
- `254708374149` - Successful payment
- Any Kenyan format: `0712345678`, `+254712345678`

### Test Flow
1. STK Push is sent (simulated)
2. Payment auto-completes in ~5 seconds
3. Status changes to `completed`

### Switch to Production
1. Complete IntaSend verification
2. Change `.env`:
   ```env
   INTASEND_TEST_MODE=false
   ```
3. Use production API keys

---

## 🔔 Webhook Setup

For production, set up webhooks in IntaSend dashboard:

1. Go to **Settings** → **Webhooks**
2. Add webhook URL: `https://your-domain.com/api/mpesa/webhook`
3. Select events: `payment.completed`, `payment.failed`
4. Copy webhook secret to `.env`:
   ```env
   INTASEND_WEBHOOK_SECRET=your_webhook_secret
   ```

---

## 💰 Payment Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Customer  │     │  DriveKenya │     │  IntaSend   │
│   (Phone)   │     │   Backend   │     │   (M-Pesa)  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │  1. Select M-Pesa │                   │
       │──────────────────>│                   │
       │                   │  2. STK Push      │
       │                   │──────────────────>│
       │                   │                   │
       │  3. M-Pesa Prompt │<──────────────────│
       │<──────────────────│                   │
       │                   │                   │
       │  4. Enter PIN     │                   │
       │──────────────────>│──────────────────>│
       │                   │                   │
       │                   │  5. Webhook/Poll  │
       │                   │<──────────────────│
       │                   │                   │
       │  6. Confirmation  │                   │
       │<──────────────────│                   │
       │                   │                   │
```

---

## 🛠️ Troubleshooting

### "M-Pesa payment service is not configured"
- Check that `INTASEND_API_KEY` and `INTASEND_PUBLISHABLE_KEY` are set
- Restart the backend server

### "Invalid phone number format"
- Use Kenyan format: `0712345678` or `254712345678`
- Ensure phone is M-Pesa registered

### STK Push not received
- Check phone has M-Pesa activated
- Ensure phone number is correct
- In sandbox, payments auto-complete (no actual STK sent)

### Payment stuck in "processing"
- Maximum polling time is 2 minutes
- Check IntaSend dashboard for status
- Verify webhook is configured correctly

---

## 📊 IntaSend Dashboard

Monitor payments at: https://payment.intasend.com

- **Transactions**: View all payments
- **Analytics**: Payment statistics
- **Payouts**: Withdraw to M-Pesa/Bank
- **Settings**: API keys, webhooks

---

## 🔒 Security Notes

1. **Never expose** `INTASEND_API_KEY` in frontend code
2. **Validate** all amounts on the backend
3. **Verify** webhook signatures in production
4. **Use HTTPS** for webhook endpoints
5. **Log** all payment attempts for auditing

---

## 📞 Support

- **IntaSend Support**: support@intasend.com
- **IntaSend Docs**: https://developers.intasend.com
- **M-Pesa Issues**: Contact Safaricom

---

## ✅ Checklist

- [ ] Created IntaSend account
- [ ] Got API keys
- [ ] Added keys to `.env`
- [ ] Ran database migration
- [ ] Tested in sandbox mode
- [ ] Configured webhook (production)
- [ ] Completed IntaSend verification (production)
- [ ] Switched to production mode
