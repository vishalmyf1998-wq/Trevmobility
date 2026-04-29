import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin client to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Basic validation
    if (!body.bookingId || !body.driverId || !body.carId) {
      return NextResponse.json({ 
        error: 'Missing required fields. Please ensure bookingId, driverId, and carId are provided.' 
      }, { status: 400 });
    }

    // Fetch existing booking
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', body.bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }

    const now = new Date().toISOString();

    const isReassign = body.isReassign === true;
    const eventName = isReassign ? 'reassigned' : 'assigned';
    let notes = isReassign ? `Reassigned to Driver ${body.driverId} and Car ${body.carId}` : `Driver ${body.driverId} and Car ${body.carId} assigned`;
    if (body.reason) {
      notes += `. Reason: ${body.reason}`;
    }

    const newEvent = {
      id: crypto.randomUUID(),
      event: eventName,
      fromStatus: booking.status,
      toStatus: 'assigned', // Status is usually assigned even if reassigned
      performedBy: body.performedBy || 'Admin',
      performedAt: now,
      notes
    };

    // Update event log
    const updatedEventLog = Array.isArray(booking.eventLog) 
      ? [...booking.eventLog, newEvent] 
      : [newEvent];

    const updatePayload: any = {
      status: 'assigned',
      driverId: body.driverId,
      carId: body.carId,
      eventLog: updatedEventLog
    };

    const { data: updatedBooking, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update(updatePayload)
      .eq('id', body.bookingId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Trigger Webhook if partnerWebhookUrl is present
    if (booking.partnerWebhookUrl) {
      try {
        // Fetch Driver and Car details to send to partner
        const { data: driver } = await supabaseAdmin.from('drivers').select('name, phone, licenseNumber').eq('id', body.driverId).single();
        const { data: car } = await supabaseAdmin.from('cars').select('registrationNumber, make, model, color').eq('id', body.carId).single();

        const webhookPayload = {
          event: 'booking.assigned',
          bookingId: booking.id,
          partnerBookingId: booking.partnerBookingId,
          bookingNumber: booking.bookingNumber,
          status: 'assigned',
          timestamp: now,
          driver: driver || { id: body.driverId },
          car: car || { id: body.carId }
        };

        // Fire and forget (don't await so we don't hold up the response)
        fetch(booking.partnerWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload)
        }).catch(err => console.error('Failed to send webhook to partner:', err));

      } catch (webhookErr) {
        console.error('Error preparing webhook payload:', webhookErr);
      }
    }

    return NextResponse.json({ success: true, booking: updatedBooking }, { status: 200 });
  } catch (err: any) {
    console.error('Admin API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
