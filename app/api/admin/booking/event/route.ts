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
    if (!body.bookingId || !body.event) {
      return NextResponse.json({ 
        error: 'Missing required fields. Please ensure bookingId and event are provided.' 
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

    const validStatuses = ['pending', 'confirmed', 'assigned', 'dispatched', 'arrived', 'picked_up', 'dropped', 'closed', 'cancelled'];
    
    // Map event to a new status if it matches
    const newStatus = validStatuses.includes(body.event) ? body.event : booking.status;
    const now = new Date().toISOString();

    const newEvent = {
      id: crypto.randomUUID(),
      event: body.event,
      fromStatus: booking.status,
      toStatus: newStatus,
      performedBy: body.performedBy || 'Admin',
      performedAt: now,
      notes: body.notes || `Admin reported event: ${body.event}`
    };

    // Update event log
    const updatedEventLog = Array.isArray(booking.eventLog) 
      ? [...booking.eventLog, newEvent] 
      : [newEvent];

    const updatePayload: any = {
      status: newStatus,
      eventLog: updatedEventLog
    };

    if (body.actualKm !== undefined) updatePayload.actualKm = body.actualKm;
    if (body.actualFare !== undefined) updatePayload.actualFare = body.actualFare;
    if (body.tollCharges !== undefined) updatePayload.tollCharges = body.tollCharges;
    if (body.parkingCharges !== undefined) updatePayload.parkingCharges = body.parkingCharges;
    if (body.miscCharges !== undefined) updatePayload.miscCharges = body.miscCharges;
    if (body.waitingCharge !== undefined) updatePayload.waitingCharge = body.waitingCharge;
    if (body.totalFare !== undefined) updatePayload.totalFare = body.totalFare;
    if (body.gstAmount !== undefined) updatePayload.gstAmount = body.gstAmount;
    if (body.grandTotal !== undefined) updatePayload.grandTotal = body.grandTotal;
    if (body.remarks !== undefined) updatePayload.remarks = body.remarks;

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
      const webhookPayload = {
        event: `booking.${body.event}`,
        bookingId: booking.id,
        partnerBookingId: booking.partnerBookingId,
        bookingNumber: booking.bookingNumber,
        status: newStatus,
        timestamp: now,
        notes: body.notes
      };

      // Fire and forget webhook
      fetch(booking.partnerWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
      }).catch(err => console.error('Failed to send webhook to partner:', err));
    }

    return NextResponse.json({ success: true, booking: updatedBooking }, { status: 200 });
  } catch (err: any) {
    console.error('Admin API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
