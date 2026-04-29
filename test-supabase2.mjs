import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

const sanitizeForSupabase = (obj) => {
  if (!obj) return obj;
  const sanitized = { ...obj };
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === undefined) {
      sanitized[key] = null;
    }
  });
  return sanitized;
}

async function test() {
  const id = "test-" + Date.now();
  const eventLog = {
    id: "uuid",
    event: "created",
    toStatus: "pending",
    performedBy: "Admin",
    performedAt: new Date().toISOString(),
    notes: "Booking created"
  };

  const formData = {
    b2cCustomerId: undefined,
    customerName: "Test Customer",
    customerPhone: "9876543210",
    customerEmail: "",
    customerAddress: "",
    b2bClientId: undefined,
    b2bEmployeeId: undefined,
    driverId: undefined,
    carId: undefined,
    cityId: "city_id_123", // Assuming valid or doesn't matter unless there is a FK constraint
    carCategoryId: "car_cat_123",
    tripType: "city_ride",
    airportId: undefined,
    airportTerminalId: undefined,
    pickupLocation: "Loc A",
    dropLocation: "Loc B",
    pickupDate: "2026-04-26",
    pickupTime: "10:00",
    returnDate: "",
    estimatedKm: 0,
    estimatedFare: 0,
    actualKm: 0,
    actualFare: 0,
    extraCharges: 0,
    peakHourCharge: 0,
    nightCharge: 0,
    waitingCharge: 0,
    tollCharges: 0,
    parkingCharges: 0,
    miscCharges: 0,
    totalFare: 0,
    gstAmount: 0,
    grandTotal: 0,
    promoDiscount: 0,
    status: "pending",
    paymentStatus: "pending",
    remarks: "",
    bookingNumber: "TEST-BK-003",
    eventLog: [eventLog],
    id,
    createdAt: new Date().toISOString(),
  };

  const payload = sanitizeForSupabase(formData);
  console.log("Payload:", payload);
  
  const { data, error } = await supabase.from('bookings').insert([payload]);
  if (error) {
    console.error("Insert Error:", error);
  } else {
    console.log("Insert Success");
  }
}
test();