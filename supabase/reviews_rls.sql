-- RLS for trip_reviews

ALTER TABLE trip_reviews ENABLE ROW LEVEL SECURITY;

-- POLICY 1: Admins full access
CREATE POLICY "Admins full access to reviews" ON trip_reviews
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()::uuid)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()::uuid)
  );

-- POLICY 2: Customers view own reviews
CREATE POLICY "Customers view own reviews" ON trip_reviews
  FOR SELECT USING (customer_id = auth.uid()::uuid);

-- POLICY 3: Customer INSERT own review (post-trip)
CREATE POLICY "Customers insert own reviews" ON trip_reviews
  FOR INSERT WITH CHECK (customer_id = auth.uid()::uuid);

-- POLICY 4: No customer updates/deletes
CREATE POLICY "Reviews no customer updates" ON trip_reviews
  FOR UPDATE USING (false)
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()::uuid)
  );

CREATE POLICY "Reviews no customer deletes" ON trip_reviews
  FOR DELETE USING (false);

-- Permissions
REVOKE ALL ON trip_reviews FROM authenticated;
GRANT SELECT ON trip_reviews TO authenticated;
GRANT INSERT ON trip_reviews TO authenticated;

-- Views public for admin dashboards
GRANT SELECT ON driver_ratings_summary, car_ratings_summary TO authenticated;
