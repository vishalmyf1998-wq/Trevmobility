'use client'

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Car, MapPin, User, Phone } from 'lucide-react'
import type { Car as CarType, Driver, CarLocation, Booking } from '@/lib/types'

export type FleetCarStatus =
  | 'dispatch'
  | 'arrived'
  | 'pickup'
  | 'ending_soon'
  | 'free'
  | 'no_gps'
  | 'maintenance'
  | 'other'

type CarRow = {
  carId: string
  registrationNumber: string
  categoryLabel?: string
  carStatus?: CarType['status']
  driver?: Pick<Driver, 'name' | 'phone' | 'id'> | null
  booking?: Pick<Booking, 'bookingNumber' | 'status' | 'customerName' | 'pickupDate' | 'pickupTime' | 'dropLocation'> | null
  color: string
  statusLabel: string
  statusKind: FleetCarStatus
  isGpsAlive: boolean
  location?: Pick<CarLocation, 'latitude' | 'longitude' | 'speed' | 'lastUpdated'> | null
}

function statusToBadgeVariant(kind: FleetCarStatus) {
  switch (kind) {
    case 'dispatch':
    case 'arrived':
    case 'pickup':
      return 'destructive'
    case 'ending_soon':
      // `Badge` variants here don't include `warning`; use `destructive` styling with custom classes below if needed.
      return 'destructive'
    case 'free':
      return 'default'
    case 'no_gps':
      return 'secondary'
    case 'maintenance':
      return 'secondary'
    default:
      return 'secondary'
  }
}


export default function FleetLiveSidebar({
  cars,
  carLocations,
  drivers,
  bookings,
  getCar,
  getDriver,
  onSelectCar,
  selectedCarId,
  computedRows,
}: {
  cars: CarType[]
  carLocations: CarLocation[]
  drivers: Driver[]
  bookings: Booking[]
  getCar: (id: string) => CarType | undefined
  getDriver: (id: string) => Driver | undefined
  onSelectCar: (carId: string) => void
  selectedCarId: string | null
  computedRows: CarRow[]
}) {
  const counts = useMemo(() => {
    const c: Record<string, number> = {
      red: 0,
      yellow: 0,
      green: 0,
      no_gps: 0,
    }
    computedRows.forEach((r) => {
      if (r.statusKind === 'no_gps') c.no_gps++
      else if (r.statusKind === 'free') c.green++
      else if (r.statusKind === 'ending_soon') c.yellow++
      else if (['dispatch', 'arrived', 'pickup'].includes(r.statusKind)) c.red++
    })
    return c
  }, [computedRows])

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="h-4 w-4 text-slate-700" /> Active / Dispatch
            </CardTitle>
            <CardDescription>{computedRows.length} cars • Live</CardDescription>
          </div>
        </div>

        {/* Simple legend */}
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500 mr-2" /> Dispatched/Arrived/Pickup
          </Badge>
          <Badge variant="outline" className="border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-yellow-500 mr-2" /> Ending in 20m
          </Badge>
          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 hover:bg-green-100">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-green-500 mr-2" /> Idle driver
          </Badge>
        </div>
      </CardHeader>


      <CardContent className="p-0">
        <div className="border-t border-slate-100" />
        <ScrollArea className="h-[calc(100vh-260px)]">
          <div className="p-3 space-y-2">
            {computedRows.map((row) => {
              const isSelected = selectedCarId === row.carId
              return (
                <button
                  key={row.carId}
                  type="button"
                  onClick={() => onSelectCar(row.carId)}
                  className={
                    'w-full text-left rounded-xl border px-3 py-2 transition-all ' +
                    (isSelected
                      ? 'border-blue-300 bg-blue-50/70'
                      : 'border-slate-100 bg-white hover:bg-slate-50')
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <span
                        className="mt-0.5 inline-flex h-3.5 w-3.5 rounded-full"
                        style={{ backgroundColor: row.color }}
                        aria-label={row.statusLabel}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800 text-sm">{row.registrationNumber}</p>
                          <Badge
                            variant={statusToBadgeVariant(row.statusKind)}
                            className="text-[10px] font-extrabold"
                          >
                            {row.statusLabel}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {row.booking?.bookingNumber ? (
                            <span>
                              {row.booking.bookingNumber} • {row.booking.customerName}
                            </span>
                          ) : (
                            <span>{row.driver?.name ? 'Chauffeur:' : '—'} {row.driver?.name || 'Unassigned'}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      {row.isGpsAlive ? (
                        <span className="text-[10px] text-slate-400">GPS OK</span>
                      ) : (
                        <span className="text-[10px] text-slate-400">No GPS</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-slate-600 space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-semibold">{row.driver?.name || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-semibold">{row.driver?.phone || '—'}</span>
                    </div>
                    {row.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        <span>Speed: {row.location.speed?.toFixed?.(0) ?? row.location.speed} km/h</span>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
            {computedRows.length === 0 && (
              <div className="p-4 text-center text-sm text-slate-500">No cars found.</div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

