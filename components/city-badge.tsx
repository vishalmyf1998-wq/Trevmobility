'use client'

import { MapPin } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  CITY_SCOPE_CONFIG,
  resolveFleetScope,
  type CityScope,
} from '@/lib/city-scope'
import { useAdmin } from '@/lib/admin-context'

type CityBadgeProps = {
  city?: CityScope | null
  cityId?: string | null
  operatingCity?: string | null
  pickupCity?: string | null
  hubId?: string | null
  hubs?: Array<{ id: string; cityId: string }>
  className?: string
}

export function CityBadge({
  city,
  cityId,
  operatingCity,
  pickupCity,
  hubId,
  hubs = [],
  className,
}: CityBadgeProps) {
  const adminContext = useAdmin()
  const dispatchCenters = adminContext?.dispatchCenters || []

  const resolved =
    city && city !== 'all'
      ? city
      : resolveFleetScope(
          { cityId, operatingCity, pickupCity, hubId },
          hubs,
        )

  if (!resolved) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600',
          className,
        )}
      >
        <MapPin className="h-3 w-3" />
        No_City
      </span>
    )
  }

  const matchedDc = dispatchCenters.find(dc => dc.id === resolved)
  const shortLabel = matchedDc ? matchedDc.shortLabel : ((CITY_SCOPE_CONFIG as any)[resolved]?.shortLabel || resolved)

  const isNcr = resolved === 'ncr'
  const isJpr = resolved === 'jpr'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold',
        isNcr
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : isJpr
          ? 'border-violet-200 bg-violet-50 text-violet-700'
          : 'border-blue-200 bg-blue-50 text-blue-700',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          isNcr ? 'bg-emerald-500' : isJpr ? 'bg-violet-500' : 'bg-blue-500',
        )}
      />
      {shortLabel}
    </span>
  )
}

