DO $$ DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE tablename IN ('b2c_customers', 'wallet_transactions', 'referrals', 'support_tickets', 'trip_reviews', 'route_tolls', 'state_taxes', 'parking_fees', 'peak_hours', 'weather_triggers')
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Add wallet_balance column to existing b2c_customers table
-- Safe: idempotent, preserves data

ALTER TABLE b2c_customers 
ADD COLUMN IF NOT EXISTS wallet_balance numeric DEFAULT 0 CHECK (wallet_balance >= 0);

-- Add updatedAt trigger if not exists (for balance updates)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
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
-- Referrals table for Refer & Earn program
-- Links to wallet_transactions via reference_id + reference_type='referral_signup'

DROP TABLE IF EXISTS referrals CASCADE;
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES b2c_customers(id) ON DELETE CASCADE,
  referee_id uuid REFERENCES b2c_customers(id) ON DELETE SET NULL, -- NULL until signup
  referral_code text UNIQUE NOT NULL, -- Unique code for sharing e.g. USER123ABC
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'expired', 'cancelled')),
  reward_amount numeric NOT NULL DEFAULT 50 CHECK (reward_amount > 0), -- INR reward
  approved_at timestamp with time zone,
  referee_phone text, -- Phone used for signup (before referee_id known)
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS referrals_referee_idx ON referrals(referee_id);
CREATE INDEX IF NOT EXISTS referrals_code_idx ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS referrals_status_idx ON referrals(status);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_referrals()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER update_referrals_updated_at BEFORE UPDATE ON referrals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_referrals();

COMMENT ON TABLE referrals IS 'Refer & Earn tracking. On approve: auto-credit reward via RPC.';
COMMENT ON COLUMN referrals.referee_phone IS 'Phone from signup form (before customer created).';

-- View: Referral summary per customer
CREATE OR REPLACE VIEW customer_referral_summary AS
SELECT 
  c.id,
  c.customer_code,
  c.phone,
  COUNT(r.id) as total_referrals,
  COUNT(CASE WHEN r.status = 'approved' THEN 1 END)::int as approved_referrals,
  COUNT(CASE WHEN r.status = 'pending' THEN 1 END)::int as pending_referrals,
  COALESCE(SUM(CASE WHEN r.status = 'approved' THEN r.reward_amount ELSE 0 END), 0) as total_earned,
  MAX(r.created_at) as last_referral_at
FROM b2c_customers c
LEFT JOIN referrals r ON c.id = r.referrer_id
GROUP BY c.id, c.customer_code, c.phone;
-- Support Tickets System

DROP TABLE IF EXISTS support_tickets CASCADE;
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text UNIQUE NOT NULL, -- TKT-2024-001
  customer_type text NOT NULL CHECK (customer_type IN ('b2c', 'b2b')),
  b2c_customer_id uuid REFERENCES b2c_customers(id) ON DELETE SET NULL,
  b2b_client_id uuid REFERENCES b2b_clients(id) ON DELETE SET NULL,
  category text NOT NULL, -- 'lost_item', 'overcharge', 'driver_issue', 'car_condition', 'payment', 'other'
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  subject text NOT NULL,
  description text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'resolved', 'closed')),
  assigned_to uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  resolution_notes text,
  customer_reply text[],
  admin_notes text[],
  activity_log jsonb DEFAULT '[]'::jsonb,
  related_booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  screenshots text[], -- image URLs
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Indexes
CREATE INDEX support_tickets_status_idx ON support_tickets(status);
CREATE INDEX support_tickets_customer_idx ON support_tickets(b2c_customer_id, b2b_client_id);
CREATE INDEX support_tickets_category_idx ON support_tickets(category);
CREATE INDEX support_tickets_assigned_idx ON support_tickets(assigned_to);
CREATE INDEX support_tickets_priority_idx ON support_tickets(priority);
CREATE INDEX support_tickets_ticket_number_idx ON support_tickets(ticket_number);

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS activity_log jsonb DEFAULT '[]'::jsonb;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at_support()
RETURNS TRIGGER AS $$
BEGIN
 NEW.updated_at = now();
 RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER update_support_updated_at BEFORE UPDATE ON support_tickets
 FOR EACH ROW EXECUTE FUNCTION update_updated_at_support();

-- View: Open tickets dashboard
CREATE OR REPLACE VIEW open_support_tickets AS
SELECT 
  st.*,
  bc.phone as customer_phone,
  bc.name as customer_name,
  bc.customer_code,
  bc2.company_name as b2b_company
FROM support_tickets st
LEFT JOIN b2c_customers bc ON st.b2c_customer_id = bc.id
LEFT JOIN b2b_clients bc2 ON st.b2b_client_id = bc2.id
WHERE st.status != 'closed'
ORDER BY st.created_at DESC;

COMMENT ON TABLE support_tickets IS 'Customer support tickets workflow. Kanban: openâ†’assignedâ†’resolvedâ†’closed.';
COMMENT ON COLUMN support_tickets.ticket_number IS 'Auto-generated: TKT-YYYY-XXX sequential';
-- Surge Pricing configuration
-- Dynamic multipliers for peak, weather, zones

-- Surge Zones (extends city_polygons)
ALTER TABLE city_polygons ADD COLUMN IF NOT EXISTS surge_multiplier numeric DEFAULT 1.0 CHECK (surge_multiplier >= 1.0);
COMMENT ON COLUMN city_polygons.surge_multiplier IS 'Base zone multiplier (1.0 = normal, 1.5 = high demand)';

-- Peak Hours (per city/car_category)
CREATE TABLE IF NOT EXISTS peak_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES cities(id),
  car_category_id uuid REFERENCES car_categories(id),
  start_hour integer CHECK (start_hour BETWEEN 0 AND 23), -- 0-23
  end_hour integer CHECK (end_hour BETWEEN 0 AND 23),
  multiplier numeric DEFAULT 1.2 CHECK (multiplier >= 1.0),
  days text[] DEFAULT ARRAY['mon','tue','wed','thu','fri','sat','sun']::text[],
  created_at timestamp DEFAULT now()
);
CREATE INDEX peak_hours_city_idx ON peak_hours(city_id);

-- Weather Triggers (global)
CREATE TABLE IF NOT EXISTS weather_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  condition text UNIQUE NOT NULL, -- 'rain', 'heavy_rain', 'storm'
  multiplier numeric DEFAULT 1.3 CHECK (multiplier >= 1.0),
  enabled boolean DEFAULT true
);
-- Seed data
INSERT INTO weather_triggers (condition, multiplier) VALUES 
  ('light_rain', 1.1),
  ('moderate_rain', 1.3),
  ('heavy_rain', 1.5),
  ('storm', 2.0)
ON CONFLICT (condition) DO NOTHING;

-- Master Surge RPC: compute real-time multiplier
CREATE OR REPLACE FUNCTION get_surge_multiplier(
  p_city_id uuid,
  p_pickup_lat numeric,
  p_pickup_lng numeric,
  p_hour integer DEFAULT extract(hour from now()),
  p_weather_condition text DEFAULT 'clear'
)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  v_zone_mult numeric := 1.0;
  v_peak_mult numeric := 1.0;
  v_weather_mult numeric := 1.0;
  v_final_mult numeric;
BEGIN
  -- 1. Zone multiplier (point-in-polygon)
  SELECT surge_multiplier INTO v_zone_mult
  FROM city_polygons cp
  WHERE cp.city_id = p_city_id 
    AND ST_Contains(ST_GeomFromText('POLYGON((' || coordinates || '))', 4326), ST_Point(p_pickup_lng, p_pickup_lat))
  LIMIT 1;

  -- 2. Peak hour
  SELECT multiplier INTO v_peak_mult
  FROM peak_hours ph
  WHERE ph.city_id = p_city_id
    AND p_hour BETWEEN ph.start_hour AND ph.end_hour
    AND 'mon' = ANY(ph.days) -- Current day logic in app
  LIMIT 1;

  -- 3. Weather
  SELECT multiplier INTO v_weather_mult
  FROM weather_triggers wt
  WHERE wt.condition = p_weather_condition 
    AND wt.enabled = true;

  v_final_mult := GREATEST(v_zone_mult, v_peak_mult, v_weather_mult, 1.0);
  
  RETURN v_final_mult;
END;
$$;

-- Indexes
CREATE INDEX city_polygons_surge_idx ON city_polygons(city_id, surge_multiplier);

-- Grant
GRANT EXECUTE ON FUNCTION get_surge_multiplier(uuid,numeric,numeric,integer,text) TO authenticated;

COMMENT ON FUNCTION get_surge_multiplier IS 'Compute live fare multiplier. Usage: SELECT get_surge_multiplier(city_id, lat, lng, hour, weather);';
-- Tolls, State Taxes, Parking Configuration for Inter-city

CREATE TABLE IF NOT EXISTS route_tolls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_city_id uuid REFERENCES cities(id),
  to_city_id uuid REFERENCES cities(id),
  car_category_id uuid REFERENCES car_categories(id),
  toll_amount numeric NOT NULL DEFAULT 0,
  valid_from date,
  valid_to date,
  notes text, -- toll plaza details
  created_at timestamp DEFAULT now()
);

DROP TABLE IF EXISTS wallet_transactions CASCADE;
CREATE TABLE IF NOT EXISTS state_taxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code text NOT NULL, -- MH, KA, etc
  car_category_id uuid REFERENCES car_categories(id),
  trip_type text DEFAULT 'outstation' CHECK (trip_type IN ('outstation', 'rental', 'city_ride')),
  permit_tax numeric DEFAULT 0,
  gst_rate numeric DEFAULT 18, -- %
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS parking_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_type text CHECK (location_type IN ('airport', 'city_parking', 'hub')),
  airport_id uuid REFERENCES airports(id),
  city_id uuid REFERENCES cities(id),
  car_category_id uuid REFERENCES car_categories(id),
  fee_amount numeric DEFAULT 0,
  duration_hours numeric DEFAULT 1, -- per X hours
  max_daily_cap numeric DEFAULT 500,
  created_at timestamp DEFAULT now()
);

-- Indexes
CREATE INDEX route_tolls_cities_idx ON route_tolls(from_city_id, to_city_id);
CREATE INDEX state_taxes_car_category_idx ON state_taxes(car_category_id, state_code);
CREATE INDEX parking_fees_location_idx ON parking_fees(city_id, car_category_id);

-- RPC: Calculate trip extras
CREATE OR REPLACE FUNCTION calculate_trip_extras(
  p_from_city_id uuid,
  p_to_city_id uuid,
  p_car_category_id uuid,
  p_trip_type text DEFAULT 'outstation'
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_toll numeric DEFAULT 0;
  v_permit_tax numeric DEFAULT 0;
  v_parking numeric DEFAULT 0;
  v_gst_rate numeric DEFAULT 18;
  v_from_state text;
  v_to_state text;
  v_total_extras numeric;
BEGIN
  -- Tolls
  SELECT toll_amount INTO v_toll FROM route_tolls 
  WHERE from_city_id = p_from_city_id AND to_city_id = p_to_city_id 
    AND car_category_id = p_car_category_id
  LIMIT 1;

  -- State permit tax (from state)
  SELECT permit_tax INTO v_permit_tax FROM state_taxes st
  JOIN cities c ON st.state_code = c.state
  WHERE c.id = p_from_city_id 
    AND st.car_category_id = p_car_category_id
    AND st.trip_type = p_trip_type
  LIMIT 1;

  -- GST from state
  SELECT gst_rate INTO v_gst_rate FROM state_taxes st
  JOIN cities c ON st.state_code = c.state
  WHERE c.id = p_from_city_id 
    AND st.car_category_id = p_car_category_id
  LIMIT 1;

  -- Parking (from city airport/city)
  SELECT fee_amount INTO v_parking FROM parking_fees 
  WHERE city_id = p_from_city_id AND car_category_id = p_car_category_id
    AND location_type IN ('airport', 'city_parking')
  ORDER BY fee_amount DESC LIMIT 1;

  v_total_extras := COALESCE(v_toll, 0) + COALESCE(v_permit_tax, 0) + COALESCE(v_parking, 0);

  RETURN json_build_object(
    'toll', COALESCE(v_toll, 0),
    'permit_tax', COALESCE(v_permit_tax, 0),
    'parking', COALESCE(v_parking, 0),
    'gst_rate', v_gst_rate,
    'total_extras', v_total_extras,
    'gst_on_extras', v_total_extras * v_gst_rate / 100
  );
END;
$$;

GRANT EXECUTE ON FUNCTION calculate_trip_extras(uuid,uuid,uuid,text) TO authenticated;

COMMENT ON FUNCTION calculate_trip_extras IS 'Calculate toll+tax+parking for route/car. Use in booking estimation.';

-- Trip Reviews & Ratings table
-- Customer feedback for drivers/cars post-trip

DROP TABLE IF EXISTS trip_reviews CASCADE;
CREATE TABLE IF NOT EXISTS trip_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES b2c_customers(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES drivers(id) ON DELETE SET NULL,
  car_id uuid REFERENCES cars(id) ON DELETE SET NULL,
  driver_rating integer CHECK (driver_rating BETWEEN 1 AND 5),
  car_rating integer CHECK (car_rating BETWEEN 1 AND 5),
  comment text,
  photos text[], -- JSON array of image URLs
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS trip_reviews_booking_idx ON trip_reviews(booking_id);
CREATE INDEX IF NOT EXISTS trip_reviews_driver_idx ON trip_reviews(driver_id);
CREATE INDEX IF NOT EXISTS trip_reviews_car_idx ON trip_reviews(car_id);
CREATE INDEX IF NOT EXISTS trip_reviews_customer_idx ON trip_reviews(customer_id);
CREATE INDEX IF NOT EXISTS trip_reviews_driver_rating_idx ON trip_reviews(driver_rating);
CREATE INDEX IF NOT EXISTS trip_reviews_car_rating_idx ON trip_reviews(car_rating);

-- Views for admin dashboard
CREATE OR REPLACE VIEW driver_ratings_summary AS
SELECT 
  d.id,
  d.driver_id as "driverId",
  d.name,
  d.phone,
  AVG(tr.driver_rating)::numeric(3,2) as avg_rating,
  COUNT(tr.id) as total_reviews,
  COUNT(CASE WHEN tr.driver_rating <= 3 THEN 1 END) as low_ratings,
  MAX(tr.created_at) as last_review
FROM drivers d
LEFT JOIN trip_reviews tr ON d.id = tr.driver_id
GROUP BY d.id, d.driver_id, d.name, d.phone;

CREATE OR REPLACE VIEW car_ratings_summary AS
SELECT 
  c.id,
  c.registration_number as "registrationNumber",
  c.make || ' ' || c.model as car_model,
  AVG(tr.car_rating)::numeric(3,2) as avg_rating,
  COUNT(tr.id) as total_reviews,
  COUNT(CASE WHEN tr.car_rating <= 3 THEN 1 END) as low_ratings,
  MAX(tr.created_at) as last_review
FROM cars c
LEFT JOIN trip_reviews tr ON c.id = tr.car_id
GROUP BY c.id, c.registration_number, c.make, c.model;

COMMENT ON TABLE trip_reviews IS 'Customer ratings for drivers/cars post-trip. Monitor quality.';
COMMENT ON COLUMN trip_reviews.driver_rating IS '1-5 stars for driver service.';
COMMENT ON COLUMN trip_reviews.car_rating IS '1-5 stars for vehicle condition/cleanliness.';
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
-- RLS for support tickets

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- POLICY 1: Admins full access
DROP POLICY IF EXISTS "Admins full support tickets" ON support_tickets;
CREATE POLICY "Admins full support tickets" ON support_tickets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()::uuid)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()::uuid)
  );

-- POLICY 2: B2C customer own tickets
DROP POLICY IF EXISTS "B2C own tickets" ON support_tickets;
CREATE POLICY "B2C own tickets" ON support_tickets
  FOR ALL USING (
    customer_type = 'b2c' AND b2c_customer_id = auth.uid()::uuid
  );

-- POLICY 3: B2B client own tickets  
DROP POLICY IF EXISTS "B2B own tickets" ON support_tickets;
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
-- RLS for surge pricing tables

-- Peak Hours (admin only)
ALTER TABLE peak_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access peak_hours" ON peak_hours FOR ALL 
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()::uuid))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()::uuid));

-- Weather Triggers (admin only)
ALTER TABLE weather_triggers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access weather_triggers" ON weather_triggers FOR ALL 
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()::uuid))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()::uuid));

-- City Polygons surge column readable
GRANT SELECT (surge_multiplier) ON city_polygons TO authenticated;

-- Surge RPC public (read-only compute)
GRANT EXECUTE ON FUNCTION get_surge_multiplier(uuid,numeric,numeric,integer,text) TO public;

-- Permissions
REVOKE ALL ON peak_hours, weather_triggers FROM authenticated;
GRANT ALL ON peak_hours, weather_triggers TO authenticated; -- RLS protects
-- Enable RLS on wallet tables
ALTER TABLE b2c_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- POLICY 1: Admins have full access (authenticated + admin_users table check)
DROP POLICY IF EXISTS "Admins full access to customers" ON b2c_customers;
CREATE POLICY "Admins full access to customers" ON b2c_customers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()::uuid 
      AND admin_users.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Admins full access to wallet transactions" ON wallet_transactions;
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
DROP POLICY IF EXISTS "Customers view own wallet balance" ON b2c_customers;
CREATE POLICY "Customers view own wallet balance" ON b2c_customers
  FOR SELECT USING (
    auth.jwt() ->> 'sub_phone' = phone 
    OR auth.jwt() ->> 'sub_email' = email
  );

DROP POLICY IF EXISTS "Customers view own transactions" ON wallet_transactions;
CREATE POLICY "Customers view own transactions" ON wallet_transactions
  FOR SELECT USING (
    customer_id = (
      SELECT id FROM b2c_customers 
      WHERE phone = auth.jwt() ->> 'sub_phone' 
      OR email = auth.jwt() ->> 'sub_email'
      LIMIT 1
    )
  );

-- POLICY 4: Atomic transaction inserts only by admin (for now)
DROP POLICY IF EXISTS "Wallet transactions INSERT by admin only" ON wallet_transactions;
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

-- RLS for trip extras config tables (admin + read for booking)

ALTER TABLE route_tolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_taxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_fees ENABLE ROW LEVEL SECURITY;

-- POLICY: Admins full access
DROP POLICY IF EXISTS "Admins full trip extras config" ON route_tolls;
CREATE POLICY "Admins full trip extras config" ON route_tolls
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()::uuid))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()::uuid));

DROP POLICY IF EXISTS "Admins full state taxes" ON state_taxes;
CREATE POLICY "Admins full state taxes" ON state_taxes FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()::uuid)
) WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()::uuid));

DROP POLICY IF EXISTS "Admins full parking fees" ON parking_fees;
CREATE POLICY "Admins full parking fees" ON parking_fees FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()::uuid)
) WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()::uuid));

-- Public read for RPC (anonymous booking calc)
GRANT SELECT ON route_tolls, state_taxes, parking_fees TO anon, authenticated;

-- RPC execute
GRANT EXECUTE ON FUNCTION calculate_trip_extras TO anon, authenticated;
-- RLS for referrals table (extends wallet security model)

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- POLICY 1: Admins full access
DROP POLICY IF EXISTS "Admins full access to referrals" ON referrals;
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
DROP POLICY IF EXISTS "Customers view own referrals as referrer" ON referrals;
CREATE POLICY "Customers view own referrals as referrer" ON referrals
  FOR SELECT USING (
    referrer_id = (SELECT auth.uid()::uuid)  -- Assumes customer JWT has own id? Wait, typically phone/email
    -- TODO: Adjust based on auth method (phone/email metadata)
  );

-- POLICY 3: Customers as referee - view own referrals
DROP POLICY IF EXISTS "Customers view own referrals as referee" ON referrals;
CREATE POLICY "Customers view own referrals as referee" ON referrals
  FOR SELECT USING (
    referee_id = (SELECT auth.uid()::uuid)
  );

-- POLICY 4: Customers cannot INSERT/UPDATE/DELETE (admin only)
DROP POLICY IF EXISTS "Referrals INSERT/UPDATE by admin only" ON referrals;
CREATE POLICY "Referrals INSERT/UPDATE by admin only" ON referrals
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()::uuid)
  );

DROP POLICY IF EXISTS "Referrals no customer updates" ON referrals;
CREATE POLICY "Referrals no customer updates" ON referrals
  FOR UPDATE USING (false)
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()::uuid)
  );

DROP POLICY IF EXISTS "Referrals no customer deletes" ON referrals;
CREATE POLICY "Referrals no customer deletes" ON referrals
  FOR DELETE USING (false);

-- Permissions
REVOKE ALL ON referrals FROM authenticated;
GRANT SELECT ON referrals TO authenticated;
GRANT INSERT, UPDATE, DELETE ON referrals TO authenticated;  -- RLS restricts

-- Views inherit (public read for summary?)
GRANT SELECT ON customer_referral_summary TO authenticated;
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
-- Atomic wallet transaction function (admin only)
CREATE OR REPLACE FUNCTION add_wallet_transaction(
  p_customer_id uuid,
  p_amount numeric,
  p_type text,
  p_description text,
  p_reference_id uuid DEFAULT null,
  p_reference_type text DEFAULT null
)
RETURNS json AS $$
DECLARE
  v_current_balance numeric;
  v_new_balance numeric;
  v_tx_id uuid;
BEGIN
  -- Get current balance
  SELECT wallet_balance INTO v_current_balance
  FROM b2c_customers WHERE id = p_customer_id;
  
  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'Customer not found: %', p_customer_id;
  END IF;
  
  -- Calculate new balance
  v_new_balance := v_current_balance + 
    CASE p_type WHEN 'credit' THEN p_amount ELSE -p_amount END;
  
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient balance. Current: %, Attempted: %', v_current_balance, v_new_balance;
  END IF;
  
  -- Insert transaction
  INSERT INTO wallet_transactions (
    customer_id, amount, type, description, 
    balance_after, reference_id, reference_type
  ) VALUES (
    p_customer_id, p_amount, p_type, p_description,
    v_new_balance, p_reference_id, p_reference_type
  ) RETURNING id INTO v_tx_id;
  
  -- Update customer balance
  UPDATE b2c_customers 
  SET wallet_balance = v_new_balance,
      updated_at = now()
  WHERE id = p_customer_id;
  
  -- Return transaction details
  RETURN json_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'previous_balance', v_current_balance,
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated (RLS handles admin check)
REVOKE ALL ON FUNCTION add_wallet_transaction(uuid,numeric,text,text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION add_wallet_transaction(uuid,numeric,text,text,uuid,text) TO authenticated;

COMMENT ON FUNCTION add_wallet_transaction IS 'Atomic: insert tx + update balance. Admin only via RLS.';
-- RPC: Approve referral + atomic wallet credit
-- Admin only, calls add_wallet_transaction

CREATE OR REPLACE FUNCTION credit_referral_reward(
  p_referral_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referral referrals;
  v_tx_result json;
BEGIN
  -- Fetch referral (locks row)
  SELECT * INTO v_referral FROM referrals WHERE id = p_referral_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Referral not found');
  END IF;
  
  IF v_referral.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Only pending referrals can be approved');
  END IF;
  
  IF v_referral.referee_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Referee not registered');
  END IF;
  
  -- Atomic credit to REFERER wallet
  SELECT add_wallet_transaction(
    v_referral.referrer_id, 
    v_referral.reward_amount, 
    'credit',
    'Referral reward: ' || v_referral.referee_phone || ' (' || v_referral.id::text || ')',
    v_referral.id,
    'referral_signup'
  ) INTO v_tx_result;
  
  IF (v_tx_result->>'success')::boolean THEN
    -- Update referral status
    UPDATE referrals 
    SET status = 'approved', approved_at = now()
    WHERE id = p_referral_id;
    
    RETURN json_build_object(
      'success', true,
      'message', 'Referral approved and reward credited',
      'reward_amount', v_referral.reward_amount,
      'new_balance', (v_tx_result->>'new_balance')::numeric
    );
  ELSE
    RETURN json_build_object('success', false, 'error', 'Wallet credit failed: ' || (v_tx_result->>'error'));
  END IF;
END;
$$;

-- Grant to authenticated (RLS will restrict to admins)
REVOKE ALL ON FUNCTION credit_referral_reward(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION credit_referral_reward(uuid) TO authenticated;

COMMENT ON FUNCTION credit_referral_reward IS 'Approve pending referral + credit referrer wallet atomically. Admin only via RLS.';

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
-- Atomic wallet transaction function (admin only)
CREATE OR REPLACE FUNCTION add_wallet_transaction(
  p_customer_id uuid,
  p_amount numeric,
  p_type text,
  p_description text,
  p_reference_id uuid DEFAULT null,
  p_reference_type text DEFAULT null
)
RETURNS json AS $$
DECLARE
  v_current_balance numeric;
  v_new_balance numeric;
  v_tx_id uuid;
BEGIN
  -- Get current balance
  SELECT wallet_balance INTO v_current_balance
  FROM b2c_customers WHERE id = p_customer_id;
  
  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'Customer not found: %', p_customer_id;
  END IF;
  
  -- Calculate new balance
  v_new_balance := v_current_balance + 
    CASE p_type WHEN 'credit' THEN p_amount ELSE -p_amount END;
  
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient balance. Current: %, Attempted: %', v_current_balance, v_new_balance;
  END IF;
  
  -- Insert transaction
  INSERT INTO wallet_transactions (
    customer_id, amount, type, description, 
    balance_after, reference_id, reference_type
  ) VALUES (
    p_customer_id, p_amount, p_type, p_description,
    v_new_balance, p_reference_id, p_reference_type
  ) RETURNING id INTO v_tx_id;
  
  -- Update customer balance
  UPDATE b2c_customers 
  SET wallet_balance = v_new_balance,
      updated_at = now()
  WHERE id = p_customer_id;
  
  -- Return transaction details
  RETURN json_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'previous_balance', v_current_balance,
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated (RLS handles admin check)
REVOKE ALL ON FUNCTION add_wallet_transaction(uuid,numeric,text,text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION add_wallet_transaction(uuid,numeric,text,text,uuid,text) TO authenticated;

COMMENT ON FUNCTION add_wallet_transaction IS 'Atomic: insert tx + update balance. Admin only via RLS.';
-- RPC: Approve referral + atomic wallet credit
-- Admin only, calls add_wallet_transaction

CREATE OR REPLACE FUNCTION credit_referral_reward(
  p_referral_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referral referrals;
  v_tx_result json;
BEGIN
  -- Fetch referral (locks row)
  SELECT * INTO v_referral FROM referrals WHERE id = p_referral_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Referral not found');
  END IF;
  
  IF v_referral.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Only pending referrals can be approved');
  END IF;
  
  IF v_referral.referee_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Referee not registered');
  END IF;
  
  -- Atomic credit to REFERER wallet
  SELECT add_wallet_transaction(
    v_referral.referrer_id, 
    v_referral.reward_amount, 
    'credit',
    'Referral reward: ' || v_referral.referee_phone || ' (' || v_referral.id::text || ')',
    v_referral.id,
    'referral_signup'
  ) INTO v_tx_result;
  
  IF (v_tx_result->>'success')::boolean THEN
    -- Update referral status
    UPDATE referrals 
    SET status = 'approved', approved_at = now()
    WHERE id = p_referral_id;
    
    RETURN json_build_object(
      'success', true,
      'message', 'Referral approved and reward credited',
      'reward_amount', v_referral.reward_amount,
      'new_balance', (v_tx_result->>'new_balance')::numeric
    );
  ELSE
    RETURN json_build_object('success', false, 'error', 'Wallet credit failed: ' || (v_tx_result->>'error'));
  END IF;
END;
$$;

-- Grant to authenticated (RLS will restrict to admins)
REVOKE ALL ON FUNCTION credit_referral_reward(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION credit_referral_reward(uuid) TO authenticated;

COMMENT ON FUNCTION credit_referral_reward IS 'Approve pending referral + credit referrer wallet atomically. Admin only via RLS.';
ALTER TABLE route_tolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_taxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_fees ENABLE ROW LEVEL SECURITY;

-- POLICY: Admins full access
CREATE POLICY "Admins full trip extras config" ON route_tolls
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()::uuid))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()::uuid));

CREATE POLICY "Admins full state taxes" ON state_taxes FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()::uuid)
) WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()::uuid));

CREATE POLICY "Admins full parking fees" ON parking_fees FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()::uuid)
) WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()::uuid));

-- Public read for RPC (anonymous booking calc)
GRANT SELECT ON route_tolls, state_taxes, parking_fees TO anon, authenticated;

-- RPC execute
GRANT EXECUTE ON FUNCTION calculate_trip_extras TO anon, authenticated;
-- RLS for referrals table (extends wallet security model)

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;