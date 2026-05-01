-- Enable RLS on wallet tables
ALTER TABLE b2c_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- POLICY 1: Admins have full access (authenticated + admin_users table check)
CREATE POLICY "Admins full access to customers" ON b2c_customers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()::uuid 
      AND admin_users.status = 'active'
    )
  );

CREATE POLICY "Admins full access to wallet transactions" ON wallet_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()::uuid 
      AND admin_users.status = 'active'
    )
  );

-- POLICY 2: B2C Customers can view own wallet (phone/email link via session metadata)
-- Assumes customer logs in with phone/email stored in JWT metadata
CREATE POLICY "Customers view own wallet balance" ON b2c_customers
  FOR SELECT USING (
    auth.jwt() ->> 'sub_phone' = phone 
    OR auth.jwt() ->> 'sub_email' = email
  );

CREATE POLICY "Customers view own transactions" ON wallet_transactions
  FOR SELECT USING (
    customer_id = (
      SELECT id FROM b2c_customers 
      WHERE phone = auth.jwt() ->> 'sub_phone' 
      OR email = auth.jwt() ->> 'sub_email'
      LIMIT 1
    )
  );

-- POLICY 3: Prevent customer updates to balance (admin only)
CREATE POLICY "Customers cannot update wallet balance" ON b2c_customers
  FOR UPDATE USING (false)
  WITH CHECK (
    NOT (wallet_balance IS DISTINCT FROM NEW.wallet_balance) OR
    EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()::uuid)
  );

-- POLICY 4: Atomic transaction inserts only by admin (for now)
CREATE POLICY "Wallet transactions INSERT by admin only" ON wallet_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()::uuid 
      AND admin_users.status = 'active'
    )
  );

-- POLICY 5: No customer DELETE
REVOKE ALL ON b2c_customers, wallet_transactions FROM authenticated;
GRANT SELECT ON b2c_customers, wallet_transactions TO authenticated;
GRANT INSERT, UPDATE ON wallet_transactions TO authenticated;
GRANT UPDATE (wallet_balance) ON b2c_customers TO authenticated;

COMMENT ON POLICY "Admins full access to customers" ON b2c_customers IS 'Super admin full CRUD access';
