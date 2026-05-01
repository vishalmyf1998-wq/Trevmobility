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
  condition text PRIMARY KEY, -- 'rain', 'heavy_rain', 'storm'
  multiplier numeric DEFAULT 1.3 CHECK (multiplier >= 1.0),
  enabled boolean DEFAULT true
);
-- Seed data
INSERT INTO weather_triggers (condition, multiplier) VALUES 
  ('light_rain', 1.1),
  ('moderate_rain', 1.3),
  ('heavy_rain', 1.5),
  ('storm', 2.0)
ON CONFLICT DO NOTHING;

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
