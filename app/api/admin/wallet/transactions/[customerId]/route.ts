import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const { searchParams } = new URL(request.url)
  const { customerId } = await params
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  try {
    const { data, error, count } = await supabaseServer
      .from('wallet_transactions')
      .select(`
        *,
        b2c_customers!customer_id (
          name,
          phone,
          customerCode
        )
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return NextResponse.json({ 
      transactions: data || [], 
      count: count || 0 
    })
  } catch (error) {
    console.error('Wallet transactions error:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const { customerId } = await params
  const body = await request.json()

  // Server-side validation
  const { amount, type, description, referenceId, referenceType } = body
  if (!amount || !type || !description || !['credit', 'debit'].includes(type)) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  try {
    // Call atomic RPC (same as client)
    const { data, error } = await supabaseServer.rpc('add_wallet_transaction', {
      p_customer_id: customerId,
      p_amount: amount,
      p_type: type,
      p_description: description,
      p_reference_id: referenceId,
      p_reference_type: referenceType
    })

    if (error) throw error

    if (data.success) {
      return NextResponse.json(data)
    } else {
      return NextResponse.json({ error: 'Transaction failed' }, { status: 500 })
    }
  } catch (error: any) {
    console.error('POST wallet transaction error:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
