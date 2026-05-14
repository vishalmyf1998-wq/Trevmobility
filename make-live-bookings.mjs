import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createDemoBooking() {
  // 1. Get a random car
  const { data: cars, error: carError } = await supabase.from('cars').select('id, registrationNumber').limit(1);
  if (carError || !cars || cars.length === 0) {
    console.error("Error fetching cars (or no cars exist):", carError);
    return;
  }
  const car = cars[0];

  // 2. Get a random driver
  const { data: drivers, error: driverError } = await supabase.from('drivers').select('id, name').limit(1);
  if (driverError || !drivers || drivers.length === 0) {
    console.error("Error fetching drivers (or no drivers exist):", driverError);
    return;
  }
  const driver = drivers[0];

  // 3. Get a random city
  const { data: cities, error: cityError } = await supabase.from('cities').select('id').limit(1);
  const cityId = cities && cities.length > 0 ? cities[0].id : null;

  // 4. Get a car category
  const { data: categories, error: catError } = await supabase.from('car_categories').select('id').limit(1);
  const catId = categories && categories.length > 0 ? categories[0].id : null;

  // 5. Create demo bookings
  const demoBookings = [
    {
      id: "demo-live-1-" + Date.now(),
      bookingNumber: "DEMO-" + Math.floor(Math.random() * 10000),
      customerName: "Alice Demo",
      customerPhone: "555-0101",
      cityId: cityId,
      carCategoryId: catId,
      tripType: "city_ride",
      pickupLocation: "Airport Terminal 1",
      dropLocation: "Downtown Hotel",
      pickupDate: new Date().toISOString().split('T')[0],
      pickupTime: "10:00",
      status: "dispatched",
      carId: car.id,
      driverId: driver.id,
      totalFare: 1500,
      createdAt: new Date().toISOString()
    },
    {
      id: "demo-live-2-" + Date.now(),
      bookingNumber: "DEMO-" + Math.floor(Math.random() * 10000),
      customerName: "Bob Test",
      customerPhone: "555-0202",
      cityId: cityId,
      carCategoryId: catId,
      tripType: "outstation",
      pickupLocation: "South Station",
      dropLocation: "Tech Park",
      pickupDate: new Date().toISOString().split('T')[0],
      pickupTime: "11:30",
      status: "picked_up",
      carId: car.id,
      driverId: driver.id,
      totalFare: 2500,
      createdAt: new Date().toISOString()
    }
  ];

  console.log("Inserting demo bookings...");
  const { data, error } = await supabase.from('bookings').insert(demoBookings);
  
  if (error) {
    console.error("Failed to insert bookings:", error);
  } else {
    console.log("Successfully created demo bookings under live tracking!");
    console.log(demoBookings.map(b => b.bookingNumber));
  }
}

createDemoBooking();