import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

// Define allowed tables to prevent arbitrary table access
const ALLOWED_TABLES = [
  'cities', 'hubs', 'car_categories', 'cars', 'drivers', 'b2c_customers',
  'fare_groups', 'b2b_clients', 'b2b_entities', 'b2b_employees', 'airports',
  'airport_terminals', 'admin_roles', 'admin_users', 'booking_tags',
  'cancellation_policies', 'promo_codes', 'city_polygons', 'car_locations',
  'gst_configs', 'communication_templates', 'bookings', 'booking_event_logs',
  'duty_slips', 'invoices', 'b2b_approval_rules'
];

export async function GET(request: Request, { params }: { params: Promise<{ table: string }> }) {
  const resolvedParams = await params;
  const table = resolvedParams.table;
  
  if (!ALLOWED_TABLES.includes(table)) {
    return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  try {
    let query: any = supabase.from(table).select('*');
    
    if (id) {
      query = query.eq('id', id).single();
    } else {
      // Basic pagination (optional)
      const limit = searchParams.get('limit');
      if (limit) query = query.limit(parseInt(limit));
    }

    const { data, error } = await query;

    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ table: string }> }) {
  const resolvedParams = await params;
  const table = resolvedParams.table;
  
  if (!ALLOWED_TABLES.includes(table)) {
    return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { data, error } = await supabase.from(table).insert(body).select();

    if (error) throw error;
    
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ table: string }> }) {
  const resolvedParams = await params;
  const table = resolvedParams.table;
  
  if (!ALLOWED_TABLES.includes(table)) {
    return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID is required for update' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { data, error } = await supabase.from(table).update(body).eq('id', id).select();

    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ table: string }> }) {
  const resolvedParams = await params;
  const table = resolvedParams.table;
  
  if (!ALLOWED_TABLES.includes(table)) {
    return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID is required for deletion' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase.from(table).delete().eq('id', id).select();

    if (error) throw error;
    
    return NextResponse.json({ message: 'Deleted successfully', data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
