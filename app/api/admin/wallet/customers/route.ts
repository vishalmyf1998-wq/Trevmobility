import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query') || ''
  const limit = parseInt(searchParams.get('limit') || '10')

  try {
    let queryBuilder = supabaseServer
      .from('b2c_customers')
      .select('*')
      .order('name')
      .limit(limit)

    if (query) {
      queryBuilder = queryBuilder.or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
    }

    const { data, error } = await queryBuilder

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Wallet customers error:', error)
    if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
      return NextResponse.json([])
    }
    return NextResponse.json({ error: error.message || 'Failed to fetch customers' }, { status: 500 })
  }
}
