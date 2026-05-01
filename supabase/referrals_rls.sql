-- RLS for referrals table (extends wallet security model)

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- POLICY 1: Admins full access
CREATE POLICY "Admins full access to referrals" ON referrals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()::uuid
    )
  );

-- POLICY 2: Customers as referrer - view own referrals
CREATE POLICY "Customers view own referrals as referrer" ON referrals
  FOR SELECT USING (
    referrer_id = (SELECT auth.uid()::uuid)  -- Assumes customer JWT has own id? Wait, typically phone/email
    -- TODO: Adjust based on auth method (phone/email metadata)
  );

-- POLICY 3: Customers as referee - view own referrals
CREATE POLICY "Customers view own referrals as referee" ON referrals
  FOR SELECT USING (
    referee_id = (SELECT auth.uid()::uuid)
  );

-- POLICY 4: Customers cannot INSERT/UPDATE/DELETE (admin only)
CREATE POLICY "Referrals INSERT/UPDATE by admin only" ON referrals
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()::uuid)
  );

CREATE POLICY "Referrals no customer updates" ON referrals
  FOR UPDATE USING (false)
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()::uuid)
  );

CREATE POLICY "Referrals no customer deletes" ON referrals
  FOR DELETE USING (false);

-- Permissions
REVOKE ALL ON referrals FROM authenticated;
GRANT SELECT ON referrals TO authenticated;
GRANT INSERT, UPDATE, DELETE ON referrals TO authenticated;  -- RLS restricts

-- Views inherit (public read for summary?)
GRANT SELECT ON customer_referral_summary TO authenticated;
