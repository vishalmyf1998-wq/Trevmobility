import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'all' // 'peak', 'weather', 'zones'

  try {
    let data
    if (type === 'peak') {
      const { data: peakData, error } = await supabaseServer
        .from('peak_hours')
        .select(`
          *,
          cities (name),
          car_categories (name)
        `)
        .order('city_id')
      if (error) throw error
      data = peakData
    } else if (type === 'weather') {
      const { data: weatherData, error } = await supabaseServer.from('weather_triggers').select('*')
      if (error) throw error
      data = weatherData
    } else {
      // Zones via city_polygons
      const { data: zoneData, error } = await supabaseServer
        .from('city_polygons')
        .select('*, cities(name)')
        .gt('surge_multiplier', 1.0)
      if (error) throw error
      data = zoneData
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Surge config error:', error)
    if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
      return NextResponse.json([])
    }
    return NextResponse.json({ error: error.message || 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  try {
    let result
    if (body.table === 'peak_hours') {
      result = await supabaseServer.from('peak_hours').upsert(body.data)
    } else if (body.table === 'weather_triggers') {
      result = await supabaseServer.from('weather_triggers').upsert(body.data)
    }
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
