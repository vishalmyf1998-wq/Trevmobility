import { MapPin } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  CITY_SCOPE_CONFIG,
  resolveFleetScope,
  type CityScope,
} from '@/lib/city-scope'

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
        Unassigned
      </span>
    )
  }

  const isNcr = resolved === 'ncr'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold',
        isNcr
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-violet-200 bg-violet-50 text-violet-700',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          isNcr ? 'bg-emerald-500' : 'bg-violet-500',
        )}
      />
      {CITY_SCOPE_CONFIG[resolved].shortLabel}
    </span>
  )
}
