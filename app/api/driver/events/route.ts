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
    
    // Check Driver API Key. In production, this might be a JWT token from driver login.
    // For now, we use a single DRIVER_API_KEY from .env
    if (!process.env.DRIVER_API_KEY || authHeader !== `Bearer ${process.env.DRIVER_API_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized. Invalid driver token.' }, { status: 401 });
    }

    const body = await req.json();

    // Basic validation
    if (!body.bookingId || !body.event || !body.driverId) {
      return NextResponse.json({ 
        error: 'Missing required fields. Please ensure bookingId, event, and driverId are provided.' 
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
      performedBy: `Driver ${body.driverId}`,
      performedAt: now,
      notes: body.notes || `Driver reported event: ${body.event}`
    };

    // Update event log
    const updatedEventLog = Array.isArray(booking.eventLog) 
      ? [...booking.eventLog, newEvent] 
      : [newEvent];

    const updatePayload: any = {
      status: newStatus,
      eventLog: updatedEventLog
    };

    // If driver is sending startKm or endKm, we can update duty slips here later,
    // or update actualKm on the booking.
    if (body.actualKm !== undefined) {
      updatePayload.actualKm = body.actualKm;
    }

    const { data: updatedBooking, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update(updatePayload)
      .eq('id', body.bookingId)
      .select()
      .single();

    if (updateError) {
      console.error('Supabase update error:', updateError);
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
    console.error('Driver API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
