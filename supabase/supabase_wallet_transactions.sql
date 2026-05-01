CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES b2c_customers(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  type text NOT NULL CHECK (type IN ('credit', 'debit')),
  description text NOT NULL,
  balance_after numeric NOT NULL CHECK (balance_after >= 0),
  reference_id uuid,  -- booking_id, promo_id, etc for traceability
  reference_type text, -- 'booking_refund', 'promo_cashback', 'manual_credit', etc
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS wallet_transactions_customer_id_idx ON wallet_transactions(customer_id);
CREATE INDEX IF NOT EXISTS wallet_transactions_created_at_idx ON wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS wallet_transactions_reference_idx ON wallet_transactions(reference_id, reference_type);

-- View for customer wallet summary
CREATE OR REPLACE VIEW customer_wallet_summary AS
SELECT 
  c.id,
  c.customer_code,
  c.name,
  c.phone,
  c.wallet_balance,
  COUNT(wt.id) as total_transactions,
  COALESCE(SUM(CASE WHEN wt.type = 'credit' THEN wt.amount ELSE 0 END), 0) as total_credits,
  COALESCE(SUM(CASE WHEN wt.type = 'debit' THEN wt.amount ELSE 0 END), 0) as total_debits,
  MAX(wt.created_at) as last_transaction_at
FROM b2c_customers c
LEFT JOIN wallet_transactions wt ON c.id = wt.customer_id
GROUP BY c.id, c.customer_code, c.name, c.phone, c.wallet_balance;

COMMENT ON TABLE wallet_transactions IS 'Customer wallet transaction log. balance_after ensures audit trail.';
COMMENT ON COLUMN wallet_transactions.balance_after IS 'Wallet balance immediately AFTER this transaction.';
