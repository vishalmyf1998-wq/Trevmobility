import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

async function check() {
  const { data: b2c, error: e1 } = await supabase.from('b2c_customers').select('*');
  console.log("Customers in DB:", b2c?.length, "Error:", e1);
  const { data: book, error: e2 } = await supabase.from('bookings').select('id, bookingNumber, b2cCustomerId');
  console.log("Bookings in DB:", book?.length, "Error:", e2);
  
  if (b2c && b2c.length > 0) {
    console.log("Latest Customer:", b2c[b2c.length - 1]);
  }
}
check();