import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'tolls' // tolls|taxes|parking

  try {
    let table = 'route_tolls'
    let select = `
      *,
      cities_from:cities!from_city_id (
        name,
        state
      ),
      cities_to:cities!to_city_id (
        name,
        state
      ),
      car_categories (
        name
      )
    `

    if (type === 'taxes') {
      table = 'state_taxes'
      select = `
        *,
        car_categories (
          name
        )
      `
    } else if (type === 'parking') {
      table = 'parking_fees'
      select = `
        *,
        cities (
          name,
          state
        ),
        airports (
          name,
          code
        ),
        car_categories (
          name
        )
      `
    }

    const { data, error } = await supabaseServer
      .from(table)
      .select(select)

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Extras GET error:', error)
    if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
      return NextResponse.json([])
    }
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const { table, ...insertData } = body

  try {
    const { data, error } = await supabaseServer
      .from(table)
      .insert(insertData)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const table = searchParams.get('table')

  if (!id || !table) return NextResponse.json({ error: 'ID and table required' }, { status: 400 })

  try {
    const { error } = await supabaseServer.from(table as string).delete().eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
