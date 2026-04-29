// test-partner-api.mjs
// Run this using: node test-partner-api.mjs

const BASE_URL = 'http://localhost:3000';
const EXTERNAL_API_KEY = 'test_external_key_123'; // Make sure this is in your .env as EXTERNAL_API_KEY=test_external_key_123
const DRIVER_API_KEY = 'test_driver_key_123';   // Make sure this is in your .env as DRIVER_API_KEY=test_driver_key_123

async function testExternalBooking() {
  console.log('--- Testing 1: External Booking API (Auto-Accept) ---');
  const response = await fetch(`${BASE_URL}/api/external/booking`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${EXTERNAL_API_KEY}`
    },
    body: JSON.stringify({
      customerName: "Test Partner User",
      customerPhone: "9988776655",
      cityId: "1",
      carCategoryId: "1",
      tripType: "city_ride",
      pickupLocation: "Airport T2, Mumbai",
      dropLocation: "Bandra West, Mumbai",
      pickupDate: "2026-05-15",
      pickupTime: "10:00",
      partnerBookingId: "PARTNER-TEST-001",
      // partnerWebhookUrl: "https://webhook.site/your-webhook-id", // Add a webhook.site URL to test webhooks
      estimatedKm: 12,
      estimatedFare: 600,
      source: "Partner API Script"
    })
  });

  const data = await response.json();
  console.log('Status:', response.status);
  console.log('Response:', data);
  return data.booking?.id;
}

async function testDriverEvent(bookingId) {
  console.log('\n--- Testing 2: Driver Events API (Status Update) ---');
  const response = await fetch(`${BASE_URL}/api/driver/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DRIVER_API_KEY}`
    },
    body: JSON.stringify({
      bookingId: bookingId,
      driverId: "1", // Use a valid driver ID from your DB
      event: "arrived",
      notes: "Driver arrived at pickup location via API"
    })
  });

  const data = await response.json();
  console.log('Status:', response.status);
  console.log('Response:', data);
}

async function testFinalFare(bookingId) {
  console.log('\n--- Testing 3: Final Fare API ---');
  const response = await fetch(`${BASE_URL}/api/external/booking/fare`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${EXTERNAL_API_KEY}`
    },
    body: JSON.stringify({
      bookingId: bookingId,
      actualKm: 15.5,
      actualFare: 650,
      tollCharges: 100,
      parkingCharges: 50,
      totalFare: 800,
      grandTotal: 840
    })
  });

  const data = await response.json();
  console.log('Status:', response.status);
  console.log('Response:', data);
}

async function runTests() {
  try {
    const bookingId = await testExternalBooking();
    if (bookingId) {
      // Add a small delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      await testDriverEvent(bookingId);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      await testFinalFare(bookingId);
    } else {
      console.log('Booking creation failed, skipping subsequent tests.');
    }
  } catch (error) {
    console.error('Test failed:', error.message);
    console.log('Note: Ensure your Next.js dev server is running on http://localhost:3000');
  }
}

runTests();
