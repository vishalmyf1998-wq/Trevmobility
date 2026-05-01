import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || ''
  const category = searchParams.get('category') || ''
  const priority = searchParams.get('priority') || ''
  const limit = parseInt(searchParams.get('limit') || '20')

  try {
    let q = supabaseServer
      .from('open_support_tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) q.eq('status', status)
    if (category) q.eq('category', category)
    if (priority) q.eq('priority', priority)

    const { data, error, count } = await q

    if (error) throw error

    return NextResponse.json({ tickets: data, count: count || 0 })
  } catch (error: any) {
    if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
      return NextResponse.json({ tickets: [], count: 0 })
    }
    return NextResponse.json({ error: error.message || 'Failed to fetch tickets' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const { ticket_id, action, notes } = body // action: 'assign', 'resolve', 'close', 'note'

  try {
    if (action === 'assign') {
      const { error } = await supabaseServer
        .from('support_tickets')
        .update({ status: 'assigned', admin_notes: notes || [] })
        .eq('id', ticket_id)
      if (error) throw error
    } else if (action === 'resolve') {
      const { error } = await supabaseServer
        .from('support_tickets')
        .update({ status: 'resolved', resolution_notes: notes })
        .eq('id', ticket_id)
      if (error) throw error
    } else if (action === 'close') {
      const { error } = await supabaseServer
        .from('support_tickets')
        .update({ status: 'closed' })
        .eq('id', ticket_id)
      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
