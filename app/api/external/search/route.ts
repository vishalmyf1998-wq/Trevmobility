import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    
    // Check API Key
    if (!process.env.EXTERNAL_API_KEY || authHeader !== `Bearer ${process.env.EXTERNAL_API_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized. Invalid or missing API key.' }, { status: 401 });
    }

    const body = await req.json();

    // Basic validation
    if (!body.orgId || !body.pickupLocation || !body.dropLocation || !body.cityId || !body.carCategoryId || !body.tripType) {
      return NextResponse.json({ 
        error: 'Missing required fields. Please ensure orgId, pickupLocation, dropLocation, cityId, carCategoryId, and tripType are provided.' 
      }, { status: 400 });
    }

    // In a real system, we would query the database to validate the orgId and find the associated B2BClient and FareGroup.
    // For this prototype, we will return a simulated estimated fare and km based on tripType and standard rates.

    // Simulated calculation based on distance
    const estimatedKm = Math.floor(Math.random() * 40) + 10; // Random km between 10 and 50
    let perKmRate = 15; // Simulated base rate

    if (body.carCategoryId === '2') { // Assuming '2' is a premium category like SUV
        perKmRate = 25;
    } else if (body.carCategoryId === '3') { // Assuming '3' is luxury
        perKmRate = 50;
    }

    let baseFare = 200;
    if (body.tripType === 'outstation') {
        baseFare = 1500; // higher base for outstation
    } else if (body.tripType === 'airport_drop' || body.tripType === 'airport_pickup') {
        baseFare = 500;
    }

    const estimatedFare = baseFare + (estimatedKm * perKmRate);

    // Provide a quote ID for the client to use when creating the booking
    const quoteId = `QUOTE-${Date.now().toString().slice(-6)}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    return NextResponse.json({
      success: true,
      quoteId,
      estimatedKm,
      estimatedFare,
      currency: 'INR',
      notes: 'This is an estimated fare based on standard rates. Final fare may vary based on actual distance and tolls.'
    }, { status: 200 });

  } catch (err: any) {
    console.error('External API Search Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
