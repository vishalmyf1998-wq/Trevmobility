import { NextResponse } from 'next/server';

// Webhooks usually receive POST requests from third parties (e.g., Razorpay, Stripe)
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // TODO: Verify Webhook Signature (Security Check)
    // Example: const signature = request.headers.get('x-razorpay-signature');

    const event = payload.event;
    console.log(`[Webhook] Received Event: ${event}`);

    if (event === 'payment.captured') {
      // TODO: Invoice ya Booking ka status 'paid' update karein
      const paymentId = payload.payload.payment.entity.id;
      const invoiceId = payload.payload.payment.entity.notes.invoice_id;
      console.log(`Payment captured for Invoice ${invoiceId}: ${paymentId}`);
    }

    // Hamesha 200 OK return karein taaki third-party retries na bheje
    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}