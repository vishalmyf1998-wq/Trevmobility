import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { to, type } = await request.json();

    if (!to) {
      return NextResponse.json({ error: "Missing 'to' phone number" }, { status: 400 });
    }

    const exotelSid = process.env.EXOTEL_SID;
    const exotelToken = process.env.EXOTEL_TOKEN;
    // Common subdomains: api.exotel.com (Global) or api.in.exotel.com (Mumbai)
    const exotelSubdomain = process.env.EXOTEL_SUBDOMAIN || "api.exotel.com";
    const exotelCallerId = process.env.EXOTEL_CALLER_ID; // The Exotel Virtual Number (ExoPhone)
    const adminPhone = process.env.ADMIN_PHONE_NUMBER; // The admin's number who initiates the call

    if (!exotelSid || !exotelToken || !exotelCallerId || !adminPhone) {
      return NextResponse.json(
        { error: "Exotel credentials or admin phone not configured in environment variables" }, 
        { status: 500 }
      );
    }

    // Exotel Connect Call API
    const url = `https://${exotelSubdomain}/v1/Accounts/${exotelSid}/Calls/connect.json`;

    const formData = new URLSearchParams();
    formData.append('From', adminPhone); // First leg of the call goes to admin
    formData.append('To', to); // Second leg goes to the driver/customer
    formData.append('CallerId', exotelCallerId); // The Exotel VN shown to both parties

    const authHeader = `Basic ${Buffer.from(`${exotelSid}:${exotelToken}`).toString('base64')}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': authHeader,
        'Accept': 'application/json'
      },
      body: formData.toString()
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Exotel API Error:", data);
      return NextResponse.json({ error: "Failed to initiate call via Exotel", details: data }, { status: response.status });
    }

    return NextResponse.json({ success: true, message: "Call initiated successfully", data });

  } catch (error: any) {
    console.error("Exotel call exception:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
