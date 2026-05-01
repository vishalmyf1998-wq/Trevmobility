-- Add wallet_balance column to existing b2c_customers table
-- Safe: idempotent, preserves data

ALTER TABLE b2c_customers 
ADD COLUMN IF NOT EXISTS wallet_balance numeric DEFAULT 0 CHECK (wallet_balance >= 0);

-- Add updatedAt trigger if not exists (for balance updates)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_b2c_customers_updated_at ON b2c_customers;
CREATE TRIGGER update_b2c_customers_updated_at
  BEFORE UPDATE ON b2c_customers
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Index for performance
CREATE INDEX IF NOT EXISTS b2c_customers_wallet_balance_idx ON b2c_customers(wallet_balance);

COMMENT ON COLUMN b2c_customers.wallet_balance IS 'Customer wallet balance in INR. Updated atomically with transactions.';
