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

