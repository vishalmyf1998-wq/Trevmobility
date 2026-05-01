import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function GET(request: NextRequest) {
  // TODO: Get customer_id from session
  const customerId = request.nextUrl.searchParams.get('customerId') || 'demo'

  try {
    const { data, error } = await supabaseServer
      .from('support_tickets')
      .select('*')
      .eq('b2c_customer_id', customerId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    if (
      error.code === 'PGRST205' ||
      error.message?.includes('schema cache') ||
      error.message?.includes('does not exist')
    ) {
      return NextResponse.json([])
    }
    return NextResponse.json({ error: error.message || 'Failed to fetch your tickets' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  // TODO: customerId from session
  const customerId = body.customerId || 'demo'

  const { category, subject, description, relatedBookingId, screenshots } = body

  try {
    const ticketNumber = `TKT-${new Date().getFullYear()}-${Math.floor(Math.random()*1000).toString().padStart(3,'0')}`

    const { data, error } = await supabaseServer
      .from('support_tickets')
      .insert({
        customer_type: 'b2c',
        b2c_customer_id: customerId,
        ticket_number: ticketNumber,
        category,
        subject,
        description,
        related_booking_id: relatedBookingId,
        screenshots: screenshots || []
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, ticket: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
