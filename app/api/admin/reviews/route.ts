import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query') || ''
  const driverId = searchParams.get('driverId') || ''
  const carId = searchParams.get('carId') || ''
  const minRating = parseInt(searchParams.get('minRating') || '0')
  const limit = parseInt(searchParams.get('limit') || '50')

  try {
    let q = supabaseServer
      .from('trip_reviews')
      .select(`
        *,
        bookings (
          bookingNumber,
          customerName,
          customerPhone,
          tripType,
          status
        ),
        b2c_customers (
          name,
          phone
        ),
        drivers (
          name,
          phone,
          driverId
        ),
        cars (
          registrationNumber,
          make,
          model
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (query) q = q.ilike('comment', `%${query}%`)

    if (driverId) q = q.eq('driver_id', driverId)
    if (carId) q = q.eq('car_id', carId)
    if (minRating > 0) q = q.lte('driver_rating', minRating)

    const { data, error, count } = await q

    if (error) throw error

    return NextResponse.json({ 
      reviews: data || [], 
      count: count || 0 
    })
  } catch (error: any) {
    console.error('Reviews API error:', error)
    if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
      return NextResponse.json({ reviews: [], count: 0 })
    }
    return NextResponse.json({ error: error.message || 'Failed to fetch reviews' }, { status: 500 })
  }
}
