import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

async function test() {
  const id = "test-" + Date.now();
  console.log("Inserting...");
  const newBooking = {
    id,
    bookingNumber: "TEST-BK-001",
    customerName: "Test",
    customerPhone: "12345",
    cityId: "city-1",
    carCategoryId: "cat-1",
    tripType: "city_ride",
    pickupLocation: "A",
    dropLocation: "B",
    pickupDate: "2026-04-26",
    pickupTime: "10:00",
    tags: ["tag1", "tag2"]
  };
  const { data, error } = await supabase.from('bookings').insert([newBooking]);
  if (error) {
    console.error("Insert Error:", error);
    return;
  }
  console.log("Insert Success");
  
  console.log("Updating...");
  const { data: updateData, error: updateError } = await supabase.from('bookings').update({ tags: ["tag3"] }).eq('id', id);
  if (updateError) {
    console.error("Update Error:", updateError);
  } else {
    console.log("Update Success", updateData);
  }
  
  console.log("Fetching...");
  const { data: fetch, error: fetchErr } = await supabase.from('bookings').select('*').eq('id', id);
  console.log("Fetched tags:", fetch?.[0]?.tags);
}
test();