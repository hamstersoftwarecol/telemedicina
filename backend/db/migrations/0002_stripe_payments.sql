-- Migration: 0002_stripe_payments.sql

-- Add Stripe fields to appointments
ALTER TABLE appointments ADD COLUMN stripe_session_id TEXT;
ALTER TABLE appointments ADD COLUMN stripe_payment_intent_id TEXT;
ALTER TABLE appointments ADD COLUMN payment_status TEXT DEFAULT 'unpaid'; -- unpaid, paid, refunded

-- Add Stripe fields to invoices (if they want to pay invoices later via Stripe)
ALTER TABLE invoices ADD COLUMN stripe_payment_intent_id TEXT;
