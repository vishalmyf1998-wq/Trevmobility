-- RLS for support tickets

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- POLICY 1: Admins full access
CREATE POLICY "Admins full support tickets" ON support_tickets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()::uuid)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()::uuid)
  );

-- POLICY 2: B2C customer own tickets
CREATE POLICY "B2C own tickets" ON support_tickets
  FOR ALL USING (
    customer_type = 'b2c' AND b2c_customer_id = auth.uid()::uuid
  );

-- POLICY 3: B2B client own tickets  
CREATE POLICY "B2B own tickets" ON support_tickets
  FOR ALL USING (
    customer_type = 'b2b' AND b2b_client_id = auth.uid()::uuid
  );

-- View readable
GRANT SELECT ON open_support_tickets TO authenticated;

-- Permissions
REVOKE ALL ON support_tickets FROM authenticated;
GRANT SELECT ON support_tickets TO authenticated;
GRANT INSERT ON support_tickets TO authenticated;
GRANT UPDATE ON support_tickets TO authenticated; -- RLS restricts to own/admin
