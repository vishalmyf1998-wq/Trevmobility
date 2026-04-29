import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_DRIVER_ID = "drv_test_123";

async function runTest() {
  console.log("🚕 Driver Realtime Listener Started!");
  console.log(`Listening for bookings assigned to driver: ${TEST_DRIVER_ID}...\n`);

  // 1. Setup Supabase Realtime Listener for the Driver
  const channel = supabase.channel('custom-insert-channel')
    .on(
      'postgres_changes',
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'bookings',
        filter: `driverId=eq.${TEST_DRIVER_ID}` // Only listen to bookings assigned to this driver
      },
      (payload) => {
        console.log("🔔 [REALTIME ALERT] New Booking Received for Driver!");
        console.log("Booking Details:", payload.new);
        console.log("✅ Test successful! Exiting in 2 seconds...");
        setTimeout(() => process.exit(0), 2000);
      }
    )
    .subscribe((status) => {
      console.log(`Supabase Subscription Status: ${status}`);
    });

  // Wait a moment for subscription to be active
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log("\n📲 Customer App: Sending a new booking request to the API...");

  // 2. Call our newly created Next.js API to create a booking
  // NOTE: For this script, we will mock the API request logic using fetch if the server is running,
  // or we can just call Supabase directly to simulate what the API does.
  // Since the Next.js server might not be running during this test script, 
  // we will test by directly inserting via Supabase just to trigger the realtime event.
  // (In production, the customer calls the Next.js API, which does this insert).
  
  const mockBooking = {
    id: crypto.randomUUID(),
    bookingNumber: `BK-TEST-${Date.now().toString().slice(-4)}`,
    customerName: "Rahul Sharma",
    customerPhone: "9876543210",
    pickupLocation: "Mumbai Airport T2",
    dropLocation: "Andheri West",
    cityId: "city_mumbai_1",
    carCategoryId: "car_cat_sedan",
    tripType: "airport_pickup",
    driverId: TEST_DRIVER_ID, // Assigned to our test driver
    status: "assigned"
  };

  const { data, error } = await supabase.from('bookings').insert([mockBooking]);

  if (error) {
    console.error("❌ Failed to create booking:", error.message);
  } else {
    console.log("✅ Booking inserted successfully. Waiting for realtime trigger...");
  }
}

runTest();
