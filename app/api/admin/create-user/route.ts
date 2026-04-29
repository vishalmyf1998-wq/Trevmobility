import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // Dhyan rakhein: Yahan ANON key nahi, SERVICE_ROLE_KEY use karni hai
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Ise .env file mein daalein
  );

  try {
    const { org_id, email, password } = await request.json();

    if (!org_id) {
      return NextResponse.json({ error: "Org ID is required" }, { status: 400 });
    }

    // 1. Fetch webhook URL from Supabase b2b_clients table
    const { data: clientData, error: dbError } = await supabaseAdmin
      .from('b2b_clients')
      .select('webhook_url')
      .eq('org_id', org_id)
      .single();

    if (dbError || !clientData) {
      return NextResponse.json({ error: "Invalid Org ID ya Webhook URL nahi mila" }, { status: 404 });
    }

    // 2. Admin API se user create karna (with password)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // true karne se user ko email verification nahi karni padegi
    });

    if (error) throw error;

    // 3. Webhook par data bhej dein
    const payload = {
      event: "USER_CREATED",
      org_id: org_id,
      user_id: data.user.id,
      email: data.user.email
    };

    const webhookResponse = await fetch(clientData.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!webhookResponse.ok) {
      console.error("Webhook call failed:", await webhookResponse.text());
    }

    return NextResponse.json({ success: true, user: data.user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
