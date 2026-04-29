import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

async function test() {
  const customerId = "cust-" + Date.now();
  const bookingId = "book-" + Date.now();

  const customer = {
    id: customerId,
    customerCode: "CUST-TEST-FK",
    name: "Test",
    phone: "1231231231"
  };

  // Run upsert but don't await
  supabase.from('b2c_customers').upsert(customer).then(({ error }) => {
    if (error) console.log("Customer upsert error:", error);
    else console.log("Customer upsert success");
  });

  const booking = {
    id: bookingId,
    bookingNumber: "BK-" + Date.now(),
    b2cCustomerId: customerId,
    customerName: "Test Customer",
    customerPhone: "1231231231",
    cityId: "city_id_123",
    carCategoryId: "car_cat_123",
    tripType: "city_ride",
    pickupLocation: "Loc A",
    dropLocation: "Loc B",
    pickupDate: "2026-04-26",
    pickupTime: "10:00",
  };

  // Attempt booking insert immediately
  const { error } = await supabase.from('bookings').insert([booking]);
  if (error) {
    console.error("Booking insert error:", error);
  } else {
    console.log("Booking insert success");
  }
}
test();