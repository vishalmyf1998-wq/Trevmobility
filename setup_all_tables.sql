-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables in reverse order of dependencies
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS duty_slips CASCADE;
DROP TABLE IF EXISTS booking_event_logs CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS communication_templates CASCADE;
DROP TABLE IF EXISTS gst_configs CASCADE;
DROP TABLE IF EXISTS car_locations CASCADE;
DROP TABLE IF EXISTS city_polygons CASCADE;
DROP TABLE IF EXISTS promo_codes CASCADE;
DROP TABLE IF EXISTS cancellation_policies CASCADE;
DROP TABLE IF EXISTS booking_tags CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS admin_roles CASCADE;
DROP TABLE IF EXISTS airport_terminals CASCADE;
DROP TABLE IF EXISTS airports CASCADE;
DROP TABLE IF EXISTS b2b_employees CASCADE;
DROP TABLE IF EXISTS b2b_entities CASCADE;
DROP TABLE IF EXISTS b2b_clients CASCADE;
DROP TABLE IF EXISTS fare_groups CASCADE;
DROP TABLE IF EXISTS b2c_customers CASCADE;

-- To safely drop drivers and cars (since they reference each other)
ALTER TABLE IF EXISTS cars DROP CONSTRAINT IF EXISTS fk_assigned_driver;
DROP TABLE IF EXISTS drivers CASCADE;
DROP TABLE IF EXISTS cars CASCADE;

DROP TABLE IF EXISTS car_categories CASCADE;
DROP TABLE IF EXISTS hubs CASCADE;
DROP TABLE IF EXISTS cities CASCADE;

-- 1. Cities
CREATE TABLE cities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Hubs
CREATE TABLE hubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city_id UUID REFERENCES cities(id),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  contact_person TEXT,
  contact_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Car Categories
CREATE TABLE car_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT true
);

-- 4. Cars
CREATE TABLE cars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_number TEXT NOT NULL UNIQUE,
  category_id UUID REFERENCES car_categories(id),
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  color TEXT,
  fuel_type TEXT CHECK (fuel_type IN ('petrol', 'diesel', 'cng', 'electric', 'hybrid')),
  seating_capacity INTEGER,
  status TEXT CHECK (status IN ('available', 'on_trip', 'maintenance', 'inactive')),
  assigned_driver_id UUID, -- Foreign key will be added after drivers table is created
  hub_id UUID REFERENCES hubs(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Drivers
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  license_number TEXT NOT NULL,
  license_expiry DATE NOT NULL,
  address TEXT,
  status TEXT CHECK (status IN ('active', 'inactive', 'suspended')),
  assigned_car_id UUID REFERENCES cars(id),
  hub_id UUID REFERENCES hubs(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add assigned_driver_id to cars now that drivers table exists
ALTER TABLE cars ADD CONSTRAINT fk_assigned_driver FOREIGN KEY (assigned_driver_id) REFERENCES drivers(id);

-- 6. B2C Customers
CREATE TABLE b2c_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_code TEXT UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Fare Groups
CREATE TABLE fare_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('B2C', 'B2B')),
  is_default BOOLEAN DEFAULT false,
  airport_fares JSONB DEFAULT '[]',
  rental_fares JSONB DEFAULT '[]',
  city_ride_fares JSONB DEFAULT '[]',
  outstation_fares JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. B2B Clients
CREATE TABLE b2b_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  gst_number TEXT,
  billing_address TEXT,
  fare_group_id UUID REFERENCES fare_groups(id),
  credit_limit DOUBLE PRECISION DEFAULT 0,
  credit_days INTEGER DEFAULT 0,
  current_balance DOUBLE PRECISION DEFAULT 0,
  status TEXT CHECK (status IN ('active', 'inactive', 'suspended')),
  is_gst_enabled BOOLEAN DEFAULT false,
  billing_type TEXT CHECK (billing_type IN ('garage_to_garage', 'point_to_point')),
  payment_model TEXT CHECK (payment_model IN ('bill_to_company', 'partial_advance', 'full_advance')),
  advance_percentage DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. B2B Entities
CREATE TABLE b2b_entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  b2b_client_id UUID REFERENCES b2b_clients(id),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. B2B Employees
CREATE TABLE b2b_employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  b2b_client_id UUID REFERENCES b2b_clients(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  office_email TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  approver_email TEXT,
  cost_centre TEXT,
  entity TEXT,
  status TEXT CHECK (status IN ('pending_approval', 'approved', 'rejected', 'suspended')),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  can_login BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Airports
CREATE TABLE airports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id UUID REFERENCES cities(id),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Airport Terminals
CREATE TABLE airport_terminals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airport_id UUID REFERENCES airports(id),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Admin Roles
CREATE TABLE admin_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Admin Users
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role_id UUID REFERENCES admin_roles(id),
  status TEXT CHECK (status IN ('active', 'inactive')),
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Booking Tags
CREATE TABLE booking_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  description TEXT
);

-- 16. Cancellation Policies
CREATE TABLE cancellation_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  trip_type TEXT CHECK (trip_type IN ('airport_pickup', 'airport_drop', 'rental', 'city_ride', 'outstation', 'all')),
  rules JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Promo Codes
CREATE TABLE promo_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'flat')),
  discount_value DOUBLE PRECISION NOT NULL,
  max_discount DOUBLE PRECISION,
  min_order_value DOUBLE PRECISION DEFAULT 0,
  usage_limit INTEGER DEFAULT 0,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ NOT NULL,
  applicable_trip_types JSONB DEFAULT '[]',
  applicable_cities JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. City Polygons
CREATE TABLE city_polygons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id UUID REFERENCES cities(id),
  name TEXT NOT NULL,
  coordinates JSONB DEFAULT '[]',
  color TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. Car Locations
CREATE TABLE car_locations (
  car_id UUID REFERENCES cars(id) PRIMARY KEY,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  heading DOUBLE PRECISION DEFAULT 0,
  speed DOUBLE PRECISION DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 20. GST Configs
CREATE TABLE gst_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gst_number TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  trade_name TEXT,
  address TEXT,
  state TEXT NOT NULL,
  state_code TEXT NOT NULL,
  cgst_rate DOUBLE PRECISION DEFAULT 0,
  sgst_rate DOUBLE PRECISION DEFAULT 0,
  igst_rate DOUBLE PRECISION DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- 21. Communication Templates
CREATE TABLE communication_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('sms', 'email', 'whatsapp', 'push')),
  target_audience TEXT CHECK (target_audience IN ('customer', 'driver', 'both')),
  event TEXT CHECK (event IN ('booking_confirmed', 'driver_assigned', 'driver_arrived', 'trip_started', 'trip_completed', 'invoice_generated', 'payment_reminder', 'custom')),
  subject TEXT,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 22. Bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_number TEXT UNIQUE NOT NULL,
  b2c_customer_id UUID REFERENCES b2c_customers(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  customer_address TEXT,
  b2b_client_id UUID REFERENCES b2b_clients(id),
  driver_id UUID REFERENCES drivers(id),
  car_id UUID REFERENCES cars(id),
  city_id UUID REFERENCES cities(id),
  car_category_id UUID REFERENCES car_categories(id),
  trip_type TEXT CHECK (trip_type IN ('airport_pickup', 'airport_drop', 'rental', 'city_ride', 'outstation')),
  airport_id UUID REFERENCES airports(id),
  airport_terminal_id UUID REFERENCES airport_terminals(id),
  pickup_location TEXT NOT NULL,
  drop_location TEXT NOT NULL,
  pickup_date DATE NOT NULL,
  pickup_time TIME NOT NULL,
  return_date DATE,
  estimated_km DOUBLE PRECISION DEFAULT 0,
  estimated_fare DOUBLE PRECISION DEFAULT 0,
  actual_km DOUBLE PRECISION,
  actual_fare DOUBLE PRECISION,
  extra_charges DOUBLE PRECISION DEFAULT 0,
  peak_hour_charge DOUBLE PRECISION DEFAULT 0,
  night_charge DOUBLE PRECISION DEFAULT 0,
  waiting_charge DOUBLE PRECISION DEFAULT 0,
  toll_charges DOUBLE PRECISION DEFAULT 0,
  parking_charges DOUBLE PRECISION DEFAULT 0,
  misc_charges DOUBLE PRECISION DEFAULT 0,
  total_fare DOUBLE PRECISION DEFAULT 0,
  gst_amount DOUBLE PRECISION DEFAULT 0,
  grand_total DOUBLE PRECISION DEFAULT 0,
  advance_required DOUBLE PRECISION,
  advance_paid DOUBLE PRECISION,
  promo_code_id UUID REFERENCES promo_codes(id),
  promo_discount DOUBLE PRECISION DEFAULT 0,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'assigned', 'dispatched', 'arrived', 'picked_up', 'dropped', 'closed', 'cancelled')),
  payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'partial')),
  remarks TEXT,
  tags JSONB DEFAULT '[]',
  b2b_employee_id UUID REFERENCES b2b_employees(id),
  external_booking_id TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 23. Booking Event Logs
CREATE TABLE booking_event_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  event TEXT CHECK (event IN ('created', 'confirmed', 'assigned', 'reassigned', 'dispatched', 'arrived', 'picked_up', 'dropped', 'closed', 'cancelled', 'status_reverted')),
  from_status TEXT,
  to_status TEXT NOT NULL,
  performed_by TEXT,
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- 24. Duty Slips
CREATE TABLE duty_slips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  duty_slip_number TEXT UNIQUE NOT NULL,
  booking_id UUID REFERENCES bookings(id),
  driver_id UUID REFERENCES drivers(id),
  car_id UUID REFERENCES cars(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  start_km DOUBLE PRECISION NOT NULL,
  end_km DOUBLE PRECISION,
  total_km DOUBLE PRECISION,
  total_hours DOUBLE PRECISION,
  customer_signature TEXT,
  driver_signature TEXT,
  remarks TEXT,
  status TEXT CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 25. Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT UNIQUE NOT NULL,
  booking_id UUID REFERENCES bookings(id),
  duty_slip_id UUID REFERENCES duty_slips(id),
  b2b_client_id UUID REFERENCES b2b_clients(id),
  client_type TEXT CHECK (client_type IN ('b2c', 'b2b')),
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  customer_address TEXT,
  customer_gst TEXT,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  subtotal DOUBLE PRECISION NOT NULL,
  gst_rate DOUBLE PRECISION NOT NULL,
  gst_amount DOUBLE PRECISION NOT NULL,
  cgst DOUBLE PRECISION NOT NULL,
  sgst DOUBLE PRECISION NOT NULL,
  igst DOUBLE PRECISION DEFAULT 0,
  total_amount DOUBLE PRECISION NOT NULL,
  status TEXT CHECK (status IN ('pending', 'paid', 'cancelled', 'overdue')),
  paid_amount DOUBLE PRECISION DEFAULT 0,
  balance_amount DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);