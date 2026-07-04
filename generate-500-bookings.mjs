import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Status arrays
const activeStatuses = ['dispatched', 'arrived', 'picked_up'];
const closedStatuses = ['dropped', 'closed', 'cancelled'];
const unassignedStatuses = ['pending', 'confirmed'];
const allStatuses = [...unassignedStatuses, 'assigned', ...activeStatuses, ...closedStatuses];
const tripTypes = ['airport_pickup','airport_drop','rental','city_ride','outstation'];
const tagsOptions = ['VIP', 'Urgent', 'Regular', 'Corporate', 'Night', 'Long Trip'];

function randomEl(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateDateAndTime(offsetMinutes) {
  const d = new Date(Date.now() + offsetMinutes * 60000);
  // local time parts
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return {
    date: `${yyyy}-${mm}-${dd}`,
    time: `${hh}:${min}`
  };
}

async function create500Bookings() {
  console.log("Fetching reference data...");
  const { data: cars } = await supabase.from('cars').select('id, registrationNumber');
  const { data: drivers } = await supabase.from('drivers').select('id, name');
  const { data: cities } = await supabase.from('cities').select('id');
  const { data: categories } = await supabase.from('car_categories').select('id');
  const { data: b2bClients } = await supabase.from('b2b_clients').select('id, companyName');
  const { data: b2cCustomers } = await supabase.from('b2c_customers').select('id, name, phone');

  if (!cities || cities.length === 0) {
    console.error("No cities found!");
    return;
  }
  if (!categories || categories.length === 0) {
    console.error("No car categories found!");
    return;
  }

  const bookings = [];
  const batchSize = 100;
  
  console.log("Generating bookings...");
  for (let i = 0; i < 500; i++) {
    const isB2B = Math.random() > 0.4; // 60% B2B
    let b2bClientId = null;
    let b2cCustomerId = null;
    let customerName = `Mock Customer ${i}`;
    let customerPhone = `98765${Math.floor(10000 + Math.random() * 90000)}`;

    if (isB2B && b2bClients && b2bClients.length > 0) {
      const client = randomEl(b2bClients);
      b2bClientId = client.id;
      customerName = `Employee of ${client.companyName}`;
    } else if (b2cCustomers && b2cCustomers.length > 0) {
      const cust = randomEl(b2cCustomers);
      b2cCustomerId = cust.id;
      customerName = cust.name;
      customerPhone = cust.phone || customerPhone;
    }

    const cityId = randomEl(cities).id;
    const catId = randomEl(categories).id;
    const tripType = randomEl(tripTypes);
    
    // Distribute statuses
    let status = 'pending';
    const randStat = Math.random();
    if (randStat < 0.2) status = 'pending';
    else if (randStat < 0.3) status = 'confirmed';
    else if (randStat < 0.4) status = 'assigned';
    else if (randStat < 0.5) status = 'dispatched';
    else if (randStat < 0.6) status = 'arrived';
    else if (randStat < 0.7) status = 'picked_up';
    else if (randStat < 0.8) status = 'dropped';
    else if (randStat < 0.9) status = 'closed';
    else status = 'cancelled';

    let driverId = null;
    let carId = null;
    
    // Assign driver/car if status implies it
    if (!unassignedStatuses.includes(status)) {
       if (drivers && drivers.length > 0) driverId = randomEl(drivers).id;
       if (cars && cars.length > 0) carId = randomEl(cars).id;
    }

    // Determine timing offset based on desired SLA states
    // We want a mix of red, yellow, green
    let offsetMins = 0;
    const delayRand = Math.random();
    if (status === 'picked_up') {
      if (delayRand < 0.3) offsetMins = -130; // Delayed Drop (Red/Indigo)
      else offsetMins = -30; // Normal active
    } else if (status === 'dispatched' || status === 'arrived') {
      if (delayRand < 0.4) offsetMins = -15; // Late Pickup (Red)
      else offsetMins = 15; // Normal
    } else if (status === 'assigned') {
      if (delayRand < 0.5) offsetMins = 20; // Late Dispatch (Fuchsia)
      else offsetMins = 120; // Normal
    } else if (status === 'pending' || status === 'confirmed') {
      if (delayRand < 0.3) offsetMins = 30; // Late Assignment (Rose)
      else if (delayRand < 0.5) offsetMins = -10; // Delayed general (Red)
      else offsetMins = 200; // Normal / Auto-allocable later
    } else {
      offsetMins = -1440; // Yesterday for closed
    }

    const { date: pickupDate, time: pickupTime } = generateDateAndTime(offsetMins);
    
    // Tags
    const tags = [];
    if (Math.random() > 0.5) tags.push(randomEl(tagsOptions));
    if (Math.random() > 0.8) tags.push(randomEl(tagsOptions));

    // Created at (For auto-allocation, it should be older than delay if pending)
    let createdAt = new Date().toISOString();
    if (status === 'pending') {
       createdAt = new Date(Date.now() - 60000).toISOString(); // 1 minute ago, auto-allocation usually has 10s delay
    }

    bookings.push({
      id: crypto.randomUUID(),
      bookingNumber: `BKG-${Math.floor(Date.now() / 1000)}-${i}`,
      b2cCustomerId,
      customerName,
      customerPhone,
      b2bClientId,
      driverId,
      carId,
      cityId,
      carCategoryId: catId,
      tripType,
      pickupLocation: `Random Location ${Math.floor(Math.random() * 100)}`,
      dropLocation: `Random Destination ${Math.floor(Math.random() * 100)}`,
      pickupDate,
      pickupTime,
      estimatedKm: Math.floor(10 + Math.random() * 50),
      estimatedFare: Math.floor(500 + Math.random() * 2000),
      totalFare: Math.floor(500 + Math.random() * 2000),
      status,
      tags: [...new Set(tags)], // unique tags
      createdAt
    });
  }

  console.log(`Inserting 500 bookings in batches...`);
  let successCount = 0;
  for (let i = 0; i < bookings.length; i += batchSize) {
    const batch = bookings.slice(i, i + batchSize);
    const { error } = await supabase.from('bookings').insert(batch);
    if (error) {
      console.error(`Error inserting batch ${i / batchSize}:`, error);
    } else {
      successCount += batch.length;
      console.log(`Inserted ${successCount} bookings...`);
    }
  }
  
  console.log(`Successfully generated ${successCount} bookings!`);
}

create500Bookings();
