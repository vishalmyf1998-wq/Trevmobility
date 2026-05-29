import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdate() {
  const id = crypto.randomUUID();
  const mockBooking = {
      id,
      bookingNumber: 'TEST-' + Date.now(),
      customerName: 'Test',
      customerPhone: '123',
      cityId: crypto.randomUUID(),
      carCategoryId: crypto.randomUUID(),
      tripType: 'city_ride',
      pickupLocation: 'A',
      dropLocation: 'B',
      pickupDate: '2026-05-21',
      pickupTime: '10:00'
  }
  const { data: insData, error: insError } = await supabase.from('bookings').insert(mockBooking);
  if (insError) {
      console.log("Insert Error:", insError);
      return;
  }
  
  const { data, error } = await supabase.from('bookings').update({ tags: ['Test-Anon'] }).eq('id', id);
  console.log('Update result:', data);
  if (error) {
    console.error('Update error:', JSON.stringify(error, null, 2));
  }
}

testUpdate();