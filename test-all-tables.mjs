import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Key in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAllTables() {
  console.log("Starting DB insertion tests...");
  const results = {};
  let successCount = 0;
  let failCount = 0;

  try {
    // 1. Cities
    console.log("Testing cities...");
    const { data: city, error: e1 } = await supabase.from('cities').insert([
      { name: 'Test City', state: 'Test State' }
    ]).select().single();
    if (e1) throw e1;
    results.cities = "Success";
    successCount++;

    // 2. Hubs
    console.log("Testing hubs...");
    const { data: hub, error: e2 } = await supabase.from('hubs').insert([
      { name: 'Test Hub', address: 'Test Address', city_id: city.id }
    ]).select().single();
    if (e2) throw e2;
    results.hubs = "Success";
    successCount++;

    // 3. Car Categories
    console.log("Testing car_categories...");
    const { data: carCategory, error: e3 } = await supabase.from('car_categories').insert([
      { name: 'SUV', description: 'SUV Class', icon: 'suv-icon' }
    ]).select().single();
    if (e3) throw e3;
    results.car_categories = "Success";
    successCount++;

    // 4. Cars
    console.log("Testing cars...");
    const { data: car, error: e4 } = await supabase.from('cars').insert([
      { registration_number: 'TEST-1234', category_id: carCategory.id, make: 'Toyota', model: 'Innova', fuel_type: 'diesel' }
    ]).select().single();
    if (e4) throw e4;
    results.cars = "Success";
    successCount++;

    // 5. Drivers
    console.log("Testing drivers...");
    const { data: driver, error: e5 } = await supabase.from('drivers').insert([
      { driver_id: 'DRV-001', name: 'John Doe', phone: '1234567890', license_number: 'LIC123', license_expiry: '2030-01-01', hub_id: hub.id }
    ]).select().single();
    if (e5) throw e5;
    results.drivers = "Success";
    successCount++;

    // 6. B2C Customers
    console.log("Testing b2c_customers...");
    const { data: b2c, error: e6 } = await supabase.from('b2c_customers').insert([
      { customer_code: 'CUST-001', name: 'Test Customer', phone: '9876543210' }
    ]).select().single();
    if (e6) throw e6;
    results.b2c_customers = "Success";
    successCount++;

    // 7. Fare Groups
    console.log("Testing fare_groups...");
    const { data: fareGroup, error: e7 } = await supabase.from('fare_groups').insert([
      { name: 'Default B2C', type: 'B2C' }
    ]).select().single();
    if (e7) throw e7;
    results.fare_groups = "Success";
    successCount++;

    // 8. B2B Clients
    console.log("Testing b2b_clients...");
    const { data: b2bClient, error: e8 } = await supabase.from('b2b_clients').insert([
      { company_name: 'Test Corp', contact_person: 'Jane Doe', email: 'jane@test.com', phone: '1112223334', fare_group_id: fareGroup.id }
    ]).select().single();
    if (e8) throw e8;
    results.b2b_clients = "Success";
    successCount++;

    // 9. B2B Entities
    console.log("Testing b2b_entities...");
    const { data: b2bEntity, error: e9 } = await supabase.from('b2b_entities').insert([
      { b2b_client_id: b2bClient.id, name: 'HQ', code: 'HQ01' }
    ]).select().single();
    if (e9) throw e9;
    results.b2b_entities = "Success";
    successCount++;

    // 10. B2B Employees
    console.log("Testing b2b_employees...");
    const { data: b2bEmployee, error: e10 } = await supabase.from('b2b_employees').insert([
      { b2b_client_id: b2bClient.id, name: 'Emp 1', phone: '5556667777', office_email: 'emp1@test.com', employee_id: 'E001' }
    ]).select().single();
    if (e10) throw e10;
    results.b2b_employees = "Success";
    successCount++;

    // 11. Airports
    console.log("Testing airports...");
    const { data: airport, error: e11 } = await supabase.from('airports').insert([
      { city_id: city.id, name: 'Test Airport', code: 'TST' }
    ]).select().single();
    if (e11) throw e11;
    results.airports = "Success";
    successCount++;

    // 12. Airport Terminals
    console.log("Testing airport_terminals...");
    const { data: terminal, error: e12 } = await supabase.from('airport_terminals').insert([
      { airport_id: airport.id, name: 'Terminal 1', code: 'T1' }
    ]).select().single();
    if (e12) throw e12;
    results.airport_terminals = "Success";
    successCount++;

    // 13. Admin Roles
    console.log("Testing admin_roles...");
    const { data: role, error: e13 } = await supabase.from('admin_roles').insert([
      { name: 'Super Admin' }
    ]).select().single();
    if (e13) throw e13;
    results.admin_roles = "Success";
    successCount++;

    // 14. Admin Users
    console.log("Testing admin_users...");
    const { data: adminUser, error: e14 } = await supabase.from('admin_users').insert([
      { name: 'Admin', email: 'admin@test.com', role_id: role.id }
    ]).select().single();
    if (e14) throw e14;
    results.admin_users = "Success";
    successCount++;

    // 15. Booking Tags
    console.log("Testing booking_tags...");
    const { data: tag, error: e15 } = await supabase.from('booking_tags').insert([
      { name: 'VIP', color: '#FF0000' }
    ]).select().single();
    if (e15) throw e15;
    results.booking_tags = "Success";
    successCount++;

    // 16. Cancellation Policies
    console.log("Testing cancellation_policies...");
    const { data: policy, error: e16 } = await supabase.from('cancellation_policies').insert([
      { name: 'Standard', trip_type: 'all' }
    ]).select().single();
    if (e16) throw e16;
    results.cancellation_policies = "Success";
    successCount++;

    // 17. Promo Codes
    console.log("Testing promo_codes...");
    const { data: promo, error: e17 } = await supabase.from('promo_codes').insert([
      { code: 'PROMO10', discount_type: 'percentage', discount_value: 10, valid_from: new Date().toISOString(), valid_to: new Date(Date.now() + 86400000).toISOString() }
    ]).select().single();
    if (e17) throw e17;
    results.promo_codes = "Success";
    successCount++;

    // 18. City Polygons
    console.log("Testing city_polygons...");
    const { data: poly, error: e18 } = await supabase.from('city_polygons').insert([
      { city_id: city.id, name: 'Downtown Area' }
    ]).select().single();
    if (e18) throw e18;
    results.city_polygons = "Success";
    successCount++;

    // 19. Car Locations
    console.log("Testing car_locations...");
    const { data: carLoc, error: e19 } = await supabase.from('car_locations').insert([
      { car_id: car.id, latitude: 12.9716, longitude: 77.5946 }
    ]).select().single();
    if (e19) throw e19;
    results.car_locations = "Success";
    successCount++;

    // 20. GST Configs
    console.log("Testing gst_configs...");
    const { data: gst, error: e20 } = await supabase.from('gst_configs').insert([
      { gst_number: '29ABCDE1234F1Z5', legal_name: 'Test GST', state: 'Karnataka', state_code: '29' }
    ]).select().single();
    if (e20) throw e20;
    results.gst_configs = "Success";
    successCount++;

    // 21. Communication Templates
    console.log("Testing communication_templates...");
    const { data: comm, error: e21 } = await supabase.from('communication_templates').insert([
      { name: 'Welcome SMS', type: 'sms', target_audience: 'customer', event: 'custom', content: 'Welcome!' }
    ]).select().single();
    if (e21) throw e21;
    results.communication_templates = "Success";
    successCount++;

    // 22. Bookings
    console.log("Testing bookings...");
    const { data: booking, error: e22 } = await supabase.from('bookings').insert([
      { booking_number: 'BKG-001', b2c_customer_id: b2c.id, customer_name: b2c.name, customer_phone: b2c.phone, city_id: city.id, car_category_id: carCategory.id, pickup_location: 'Point A', drop_location: 'Point B', pickup_date: '2025-01-01', pickup_time: '10:00:00' }
    ]).select().single();
    if (e22) throw e22;
    results.bookings = "Success";
    successCount++;

    // 23. Booking Event Logs
    console.log("Testing booking_event_logs...");
    const { data: log, error: e23 } = await supabase.from('booking_event_logs').insert([
      { booking_id: booking.id, event: 'created', to_status: 'pending' }
    ]).select().single();
    if (e23) throw e23;
    results.booking_event_logs = "Success";
    successCount++;

    // 24. Duty Slips
    console.log("Testing duty_slips...");
    const { data: duty, error: e24 } = await supabase.from('duty_slips').insert([
      { duty_slip_number: 'DS-001', booking_id: booking.id, start_time: new Date().toISOString(), start_km: 100 }
    ]).select().single();
    if (e24) throw e24;
    results.duty_slips = "Success";
    successCount++;

    // 25. Invoices
    console.log("Testing invoices...");
    const { data: inv, error: e25 } = await supabase.from('invoices').insert([
      { invoice_number: 'INV-001', booking_id: booking.id, customer_name: b2c.name, invoice_date: '2025-01-01', due_date: '2025-01-05', subtotal: 1000, gst_rate: 5, gst_amount: 50, cgst: 25, sgst: 25, total_amount: 1050, balance_amount: 1050 }
    ]).select().single();
    if (e25) throw e25;
    results.invoices = "Success";
    successCount++;

  } catch (err) {
    console.error("\n❌ Error occurred during insertion:", err);
    failCount++;
  }

  console.log("\n=== Test Results ===");
  console.table(results);
  console.log(`\nSuccessfully inserted into ${successCount} tables.`);
  if (failCount > 0) {
    console.log("Some tables failed. Check the error above.");
  } else {
    console.log("All tables are working correctly!");
  }
}

testAllTables();