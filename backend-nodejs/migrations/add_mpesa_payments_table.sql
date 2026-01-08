-- Migration: Add M-Pesa payments table
-- For storing M-Pesa payment records via IntaSend

-- M-Pesa Payments Table
CREATE TABLE IF NOT EXISTS mpesa_payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    rental_id INTEGER REFERENCES rentals(id) ON DELETE SET NULL,
    invoice_id VARCHAR(255) UNIQUE NOT NULL,
    checkout_request_id VARCHAR(255),
    phone_number VARCHAR(20) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'KES',
    status VARCHAR(50) DEFAULT 'pending',
    mpesa_reference VARCHAR(100),
    failed_reason TEXT,
    webhook_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add M-Pesa columns to rentals table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'rentals' AND column_name = 'mpesa_checkout_id') THEN
        ALTER TABLE rentals ADD COLUMN mpesa_checkout_id VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'rentals' AND column_name = 'mpesa_reference') THEN
        ALTER TABLE rentals ADD COLUMN mpesa_reference VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'rentals' AND column_name = 'payment_method') THEN
        ALTER TABLE rentals ADD COLUMN payment_method VARCHAR(50) DEFAULT 'cash';
    END IF;
END $$;

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_mpesa_payments_user_id ON mpesa_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_payments_rental_id ON mpesa_payments(rental_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_payments_invoice_id ON mpesa_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_payments_status ON mpesa_payments(status);
CREATE INDEX IF NOT EXISTS idx_rentals_mpesa_checkout_id ON rentals(mpesa_checkout_id);

-- Comment for documentation
COMMENT ON TABLE mpesa_payments IS 'M-Pesa payment records via IntaSend API';
COMMENT ON COLUMN mpesa_payments.invoice_id IS 'IntaSend invoice/payment ID';
COMMENT ON COLUMN mpesa_payments.checkout_request_id IS 'M-Pesa STK Push checkout request ID';
COMMENT ON COLUMN mpesa_payments.mpesa_reference IS 'M-Pesa transaction receipt number';
