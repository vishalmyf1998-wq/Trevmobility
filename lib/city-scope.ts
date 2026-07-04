export const CITY_SCOPES = ['all', 'ncr', 'jpr'] as const

export type CityScope = (typeof CITY_SCOPES)[number]

export const CITY_SCOPE_CONFIG = {
  all: { label: 'All Cities', shortLabel: 'All', cityId: null },
  ncr: { label: 'Delhi-NCR', shortLabel: 'NCR', cityId: 'demo-city-delhi' },
  jpr: { label: 'Jaipur', shortLabel: 'Jaipur', cityId: 'demo-city-jaipur' },
} as const

export function isCityScope(value: unknown): value is CityScope {
  return typeof value === 'string' && CITY_SCOPES.includes(value as CityScope)
}

export function cityIdToScope(cityId?: string | null): Exclude<CityScope, 'all'> | null {
  if (!cityId) return null
  const normalized = cityId.toLowerCase()
  if (normalized === 'ncr' || normalized.includes('delhi')) return 'ncr'
  if (normalized === 'jpr' || normalized.includes('jaipur')) return 'jpr'
  return null
}

export function scopeToCityId(scope: Exclude<CityScope, 'all'>) {
  return CITY_SCOPE_CONFIG[scope].cityId
}

export function resolveFleetScope(
  entity: {
    operatingCity?: string | null
    pickupCity?: string | null
    cityId?: string | null
    hubId?: string | null
  },
  hubs: Array<{ id: string; cityId: string }> = [],
) {
  const explicitScope = cityIdToScope(
    entity.operatingCity || entity.pickupCity || entity.cityId,
  )
  if (explicitScope) return explicitScope

  const hubCityId = hubs.find((hub) => hub.id === entity.hubId)?.cityId
  return cityIdToScope(hubCityId)
}

export function matchesCityScope(
  selectedCity: CityScope,
  entity: Parameters<typeof resolveFleetScope>[0],
  hubs: Parameters<typeof resolveFleetScope>[1] = [],
) {
  return selectedCity === 'all' || resolveFleetScope(entity, hubs) === selectedCity
}
