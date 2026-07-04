import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

import { isCityScope } from '@/lib/city-scope'

function getRequestClient(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) return null

  const authorization = request.headers.get('authorization')
  return createClient(url, key, {
    global: authorization ? { headers: { Authorization: authorization } } : undefined,
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// GET /api/bookings?city=all|ncr|jpr&status=confirmed&page=1&pageSize=50
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const city = searchParams.get('city') || 'all'
  const status = searchParams.get('status')
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 50))

  if (!isCityScope(city)) {
    return NextResponse.json(
      { success: false, error: 'city must be one of: all, ncr, jpr' },
      { status: 400 },
    )
  }

  const supabase = getRequestClient(request)
  if (!supabase) {
    return NextResponse.json(
      { success: false, error: 'Database configuration is missing' },
      { status: 503 },
    )
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('bookings')
    .select('*', { count: 'exact' })
    .order('pickup_date', { ascending: true })
    .order('pickup_time', { ascending: true })
    .range(from, to)

  if (city !== 'all') query = query.eq('operating_city', city)
  if (status) query = query.eq('status', status)

  const { data, error, count } = await query

  if (error) {
    console.error('[GET /api/bookings]', error.message)
    return NextResponse.json(
      { success: false, error: 'Unable to fetch bookings' },
      { status: 500 },
    )
  }

  return NextResponse.json({
    success: true,
    data,
    pagination: { page, pageSize, total: count || 0 },
    filters: { city, status },
  })
}

export async function POST(request: Request) {
  const supabase = getRequestClient(request)
  if (!supabase) {
    return NextResponse.json(
      { success: false, error: 'Database configuration is missing' },
      { status: 503 },
    )
  }

  try {
    const body = await request.json()
    const operatingCity = body.operating_city || body.pickup_city
    if (!isCityScope(operatingCity) || operatingCity === 'all') {
      return NextResponse.json(
        { success: false, error: 'A valid pickup_city or operating_city is required' },
        { status: 400 },
      )
    }

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        ...body,
        pickup_city: body.pickup_city || operatingCity,
        operating_city: operatingCity,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/bookings]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create booking' },
      { status: 500 },
    )
  }
}
