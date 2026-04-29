import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin client to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    
    // Check API Key
    if (!process.env.EXTERNAL_API_KEY || authHeader !== `Bearer ${process.env.EXTERNAL_API_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized. Invalid or missing API key.' }, { status: 401 });
    }

    const body = await req.json();

    // Validate fields
    if (!body.bookingId) {
      return NextResponse.json({ error: 'Missing required field: bookingId' }, { status: 400 });
    }
    if (body.totalFare === undefined) {
       return NextResponse.json({ error: 'Missing required field: totalFare' }, { status: 400 });
    }

    // Fetch existing booking
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('id, status, eventLog')
      .eq('id', body.bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }

    const now = new Date().toISOString();

    const newEvent = {
      id: crypto.randomUUID(),
      event: 'fare_updated',
      fromStatus: booking.status,
      toStatus: booking.status, // Fare update doesn't necessarily close the ride, but it could. We leave status as is.
      performedBy: 'External Partner',
      performedAt: now,
      notes: `Final fare received from partner: ₹${body.totalFare}`
    };

    // Update event log
    const updatedEventLog = Array.isArray(booking.eventLog) 
      ? [...booking.eventLog, newEvent] 
      : [newEvent];

    const updatePayload: any = {
      eventLog: updatedEventLog,
      totalFare: body.totalFare
    };

    if (body.actualKm !== undefined) updatePayload.actualKm = body.actualKm;
    if (body.actualFare !== undefined) updatePayload.actualFare = body.actualFare; // base fare before taxes/tolls
    if (body.tollCharges !== undefined) updatePayload.tollCharges = body.tollCharges;
    if (body.parkingCharges !== undefined) updatePayload.parkingCharges = body.parkingCharges;
    if (body.extraCharges !== undefined) updatePayload.extraCharges = body.extraCharges;
    if (body.grandTotal !== undefined) updatePayload.grandTotal = body.grandTotal;

    const { data: updatedBooking, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update(updatePayload)
      .eq('id', body.bookingId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, booking: updatedBooking }, { status: 200 });
  } catch (err: any) {
    console.error('External Fare API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
