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
