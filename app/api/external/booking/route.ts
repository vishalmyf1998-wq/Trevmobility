import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin client to bypass RLS for server-side logic
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    
    // Check API Key
    // In .env, you should define EXTERNAL_API_KEY
    if (!process.env.EXTERNAL_API_KEY || authHeader !== `Bearer ${process.env.EXTERNAL_API_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized. Invalid or missing API key.' }, { status: 401 });
    }

    const body = await req.json();

    // Basic validation
    if (!body.orgId || !body.customerName || !body.customerPhone || !body.pickupLocation || !body.dropLocation || !body.cityId || !body.carCategoryId || !body.tripType || !body.pickupDate || !body.pickupTime) {
      return NextResponse.json({ 
        error: 'Missing required fields. Please ensure orgId, customerName, customerPhone, pickupLocation, dropLocation, cityId, carCategoryId, tripType, pickupDate, and pickupTime are provided.' 
      }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const bookingNumber = `B2C${Date.now().toString().slice(-6)}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    const now = new Date().toISOString();
    
    // Construct the booking payload
    const newBooking = {
      id,
      bookingNumber,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      customerEmail: body.customerEmail || null,
      customerAddress: body.customerAddress || null,
      cityId: body.cityId,
      carCategoryId: body.carCategoryId,
      tripType: body.tripType,
      pickupLocation: body.pickupLocation,
      dropLocation: body.dropLocation,
      pickupDate: body.pickupDate,
      pickupTime: body.pickupTime,
      estimatedKm: body.estimatedKm || 0,
      estimatedFare: body.estimatedFare || 0,
      status: 'confirmed', // Auto-accepting the booking
      paymentStatus: 'pending',
      partnerBookingId: body.partnerBookingId || null,
      partnerOrgId: body.orgId,
      partnerWebhookUrl: body.partnerWebhookUrl || null,
      createdAt: now,
      eventLog: [
        {
          id: crypto.randomUUID(),
          event: 'confirmed',
          toStatus: 'confirmed',
          performedBy: body.source || 'External API',
          performedAt: now,
          notes: body.notes || 'Booking auto-accepted via External API'
        }
      ]
    };

    // Insert into Supabase
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .insert([newBooking])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }

    return NextResponse.json({ success: true, booking: data }, { status: 201 });
  } catch (err: any) {
    console.error('External API Booking Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
