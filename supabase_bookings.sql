-- Drop any existing broken bookings table to ensure a clean recreation
-- (Remove the next line if you need to preserve existing booking data)
drop table if exists bookings cascade;

-- Bookings table (must run AFTER b2c_customers.sql and airports.sql if you need FKs to those)
create table if not exists bookings (
  id uuid primary key,
  "bookingNumber" text not null unique,
  "b2cCustomerId" uuid references b2c_customers(id),
  "customerName" text not null,
  "customerPhone" text not null,
  "customerEmail" text,
  "customerAddress" text,
  "b2bClientId" uuid,
  "driverId" uuid,
  "carId" uuid,
  "cityId" uuid not null,
  "carCategoryId" uuid not null,
  "tripType" text not null check ("tripType" in ('airport_pickup','airport_drop','rental','city_ride','outstation')),
  "airportId" uuid references airports(id),
  "airportTerminalId" uuid references airport_terminals(id),
  "pickupLocation" text not null,
  "dropLocation" text not null,
  "pickupDate" text not null,
  "pickupTime" text not null,
  "returnDate" text,
  "estimatedKm" numeric not null default 0,
  "estimatedFare" numeric not null default 0,
  "actualKm" numeric,
  "actualFare" numeric,
  "extraCharges" numeric not null default 0,
  "peakHourCharge" numeric not null default 0,
  "nightCharge" numeric not null default 0,
  "waitingCharge" numeric not null default 0,
  "tollCharges" numeric not null default 0,
  "parkingCharges" numeric not null default 0,
  "miscCharges" numeric not null default 0,
  "totalFare" numeric not null default 0,
  "gstAmount" numeric not null default 0,
  "grandTotal" numeric not null default 0,
  "promoCodeId" uuid,
  "promoDiscount" numeric not null default 0,
  "status" text not null default 'pending' check ("status" in ('pending','confirmed','assigned','dispatched','arrived','picked_up','dropped','closed','cancelled')),
  "paymentStatus" text not null default 'pending' check ("paymentStatus" in ('pending','paid','partial')),
  "remarks" text,
  "tags" text[],
  "b2bEmployeeId" uuid,
  "eventLog" jsonb not null default '[]'::jsonb,
  "externalBookingId" text,
  "createdBy" text,
  "createdAt" timestamp with time zone not null default now()
);

create index if not exists bookings_b2c_customer_id_idx on bookings("b2cCustomerId");
create index if not exists bookings_b2b_client_id_idx on bookings("b2bClientId");
create index if not exists bookings_driver_id_idx on bookings("driverId");
create index if not exists bookings_car_id_idx on bookings("carId");
create index if not exists bookings_city_id_idx on bookings("cityId");
create index if not exists bookings_car_category_id_idx on bookings("carCategoryId");
create index if not exists bookings_airport_id_idx on bookings("airportId");
create index if not exists bookings_airport_terminal_id_idx on bookings("airportTerminalId");
create index if not exists bookings_trip_type_idx on bookings("tripType");
create index if not exists bookings_status_idx on bookings("status");
create index if not exists bookings_payment_status_idx on bookings("paymentStatus");
create index if not exists bookings_created_at_idx on bookings("createdAt");
create index if not exists bookings_booking_number_idx on bookings("bookingNumber");
