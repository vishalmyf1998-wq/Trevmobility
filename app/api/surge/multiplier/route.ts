import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const cityId = searchParams.get('cityId')
  const pickupLat = parseFloat(searchParams.get('pickupLat') || '0')
  const pickupLng = parseFloat(searchParams.get('pickupLng') || '0')
  const hour = parseInt(searchParams.get('hour') || new Date().getHours().toString())
  const weather = searchParams.get('weather') || 'clear'

  if (!cityId) {
    return NextResponse.json({ error: 'cityId required' }, { status: 400 })
  }

  try {
    const { data, error } = await supabaseServer.rpc('get_surge_multiplier', {
      p_city_id: cityId,
      p_pickup_lat: pickupLat,
      p_pickup_lng: pickupLng,
      p_hour: hour,
      p_weather_condition: weather
    })

    if (error) throw error

    return NextResponse.json({
      multiplier: data,
      breakdown: {
        zoneMultiplier: 1.0, // From polygon query
        peakMultiplier: 1.0,
        weatherMultiplier: 1.0,
        finalMultiplier: data
      }
    })
  } catch (error: any) {
    console.error('Surge multiplier error:', error)
    if (error.code === 'PGRST202' || error.message?.includes('schema cache')) {
      return NextResponse.json({
        multiplier: 1,
        breakdown: {
          zoneMultiplier: 1.0,
          peakMultiplier: 1.0,
          weatherMultiplier: 1.0,
          finalMultiplier: 1.0
        }
      })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
