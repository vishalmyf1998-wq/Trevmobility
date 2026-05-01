import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  // TODO: Get from session in full auth
  const customerId = searchParams.get('customerId') || 'demo-id'

  try {
    const { data, error } = await supabaseServer
      .from('referrals')
      .select(`
        *,
        referee:b2c_customers!referee_id (
          name,
          phone,
          customerCode
        )
      `)
      .or(`referrer_id.eq.${customerId},referee_id.eq.${customerId}`)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('B2C referrals GET error:', error)
    if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
      return NextResponse.json([])
    }
    return NextResponse.json({ error: error.message || 'Failed to fetch referrals' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const customerId = body.customerId || 'demo-id'

  const { referee_phone } = body

  if (!customerId || !referee_phone) {
    return NextResponse.json({ error: 'customerId and referee_phone required' }, { status: 400 })
  }

  // Generate unique referral_code
  const referral_code = `REF${customerId.slice(-4)}${Math.random().toString(36).slice(-6).toUpperCase()}`

  try {
    const { data, error } = await supabaseServer
      .from('referrals')
      .insert({
        referrer_id: customerId,
        referral_code,
        referee_phone,
        status: 'pending',
        reward_amount: 50
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('POST referral error:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
