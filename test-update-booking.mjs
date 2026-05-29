import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdate() {
  const { data: bookings, error: listError } = await supabase.from('bookings').select('id, tags').limit(1);
  if (listError) {
    console.error('List error:', listError);
    return;
  }
  if (!bookings || bookings.length === 0) {
    console.log('No bookings found to update');
    return;
  }

  const id = bookings[0].id;
  console.log('Trying to update ID:', id);
  const { data, error } = await supabase.from('bookings').update({ tags: ['Test'] }).eq('id', id);
  console.log('Update result:', data);
  if (error) {
    console.error('Update error:', JSON.stringify(error, null, 2));
  }
}

testUpdate();