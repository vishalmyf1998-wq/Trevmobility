import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query') || ''
  const status = searchParams.get('status') || ''
  const limit = parseInt(searchParams.get('limit') || '20')

  try {
    let queryBuilder = supabaseServer
      .from('referrals')
      .select(`
        *,
        referrer:b2c_customers!referrer_id (*),
        referee:b2c_customers!referee_id (*)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (query) queryBuilder = queryBuilder.or(`referral_code.ilike.%${query}%,referee_phone.ilike.%${query}%`)

    if (status) {
      queryBuilder = queryBuilder.eq('status', status)
    }

    const { data, error, count } = await queryBuilder

    if (error) throw error

    return NextResponse.json({ 
      referrals: data || [], 
      count: count || 0 
    })
  } catch (error: any) {
    console.error('Admin referrals error:', error)
    if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
      return NextResponse.json({ referrals: [], count: 0 })
    }
    return NextResponse.json({ error: error.message || 'Failed to fetch referrals' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const { referral_id, action } = body // action: 'approve', 'cancel'

  if (!referral_id || !['approve', 'cancel'].includes(action)) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  try {
    let result
    if (action === 'approve') {
      result = await supabaseServer.rpc('credit_referral_reward', { p_referral_id: referral_id })
    } else {
      const { data, error } = await supabaseServer
        .from('referrals')
        .update({ status: 'cancelled' })
        .eq('id', referral_id)
        .select()
        .single()
      result = { data, error }
    }

    if (result.error) throw result.error

    return NextResponse.json(result.data || { success: true })
  } catch (error: any) {
    console.error('Admin referral action error:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
