import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

async function test() {
  const payload = {
    b2cCustomerId: 'kmz80dnwn',
    customerName: 'TGwh',
    customerPhone: '78744755',
    customerEmail: '',
    customerAddress: '',
    b2bClientId: null,
    b2bEmployeeId: null,
    driverId: null,
    carId: null,
    cityId: 'city-1',
    carCategoryId: 'cat-1',
    tripType: 'city_ride',
    airportId: null,
    airportTerminalId: null,
    pickupLocation: 'A',
    dropLocation: 'B',
    pickupDate: '2026-04-26',
    pickupTime: '10:00',
    returnDate: '',
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
    status: 'pending',
    paymentStatus: 'pending',
    remarks: '',
    bookingNumber: 'BK2604260005',
    eventLog: [
      {
        id: 'uuid-123',
        event: 'created',
        toStatus: 'pending',
        performedBy: 'Admin',
        performedAt: new Date().toISOString(),
        notes: 'Booking created'
      }
    ],
    id: 'test-bk-5',
    createdAt: new Date().toISOString()
  };

  const { data, error } = await supabase.from('bookings').insert([payload]);
  console.log('Insert Result:', { data, error });
}
test();