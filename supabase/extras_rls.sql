-- RLS for trip extras config tables (admin + read for booking)

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
