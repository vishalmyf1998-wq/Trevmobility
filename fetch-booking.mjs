import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

async function check() {
  const { data, error } = await supabase.from('bookings').select('*').eq('bookingNumber', 'BK2604260004');
  console.log("Data:", data);
  console.log("Error:", error);
}
check();