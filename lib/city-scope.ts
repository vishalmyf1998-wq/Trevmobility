export const CITY_SCOPES = ['all', 'ncr', 'jpr', 'other'] as const

export type CityScope = string

export const CITY_SCOPE_CONFIG = {
  all: { label: 'All Cities', shortLabel: 'All', cityId: null },
  ncr: { label: 'Delhi-NCR', shortLabel: 'NCR', cityId: 'demo-city-delhi' },
  jpr: { label: 'Jaipur', shortLabel: 'Jaipur', cityId: 'demo-city-jaipur' },
  other: { label: 'Other', shortLabel: 'Other', cityId: null },
} as const

export function isCityScope(value: unknown): value is CityScope {
  return typeof value === 'string'
}

export function cityIdToScope(cityId?: string | null): string | null {
  if (!cityId) return 'other';
  const normalized = cityId.toLowerCase();
  if (normalized.includes('delhi') || normalized.includes('gurgaon') || normalized.includes('noida') || normalized.includes('faridabad') || normalized.includes('ghaziabad')) return 'ncr';
  if (normalized.includes('jaipur')) return 'jpr';
  // Default fallback
  return 'other';
}

export function scopeToCityId(scope: string) {
  return (CITY_SCOPE_CONFIG as any)[scope]?.cityId || null;
}

// Global registry to map city ID/name to dispatch center ID
export const cityToDispatchCenterMap: Record<string, string> = {};

export function updateCityDispatchCenterMap(cities: Array<{ id: string; name: string; operatingCity?: string | null }>) {
  // Clear the map first
  for (const key in cityToDispatchCenterMap) {
    delete cityToDispatchCenterMap[key];
  }
  // Fill the map
  cities.forEach(city => {
    if (city.operatingCity) {
      cityToDispatchCenterMap[city.id] = city.operatingCity;
      cityToDispatchCenterMap[city.name.toLowerCase()] = city.operatingCity;
    }
  });
}

export function resolveFleetScope(
  entity: {
    operatingCity?: string | null
    pickupCity?: string | null
    cityId?: string | null
    hubId?: string | null
  },
  hubs: Array<{ id: string; cityId: string }> = []
): string {
  // Priority 1: Explicit operatingCity set on the entity (from Fleet Settings UI)
  if (entity.operatingCity && entity.operatingCity !== 'all') {
    return entity.operatingCity;
  }

  // Priority 2: Look up using cityToDispatchCenterMap
  const lookupKey = entity.cityId || entity.pickupCity;
  if (lookupKey) {
    const mapped = cityToDispatchCenterMap[lookupKey] || cityToDispatchCenterMap[lookupKey.toLowerCase()];
    if (mapped) return mapped;
  }

  // Priority 3: Look up from hubId
  if (entity.hubId) {
    const hubCityId = hubs.find((hub) => hub.id === entity.hubId)?.cityId;
    if (hubCityId) {
      const mapped = cityToDispatchCenterMap[hubCityId] || cityToDispatchCenterMap[hubCityId.toLowerCase()];
      if (mapped) return mapped;
    }
  }

  // Priority 4: Infer from pickupCity or cityId as a fallback
  const explicitScope = cityIdToScope(entity.pickupCity || entity.cityId);
  if (explicitScope) return explicitScope;
  
  const hubCityId = hubs.find((hub) => hub.id === entity.hubId)?.cityId
  return cityIdToScope(hubCityId) || 'other';
}

export function matchesCityScope(
  selectedCity: string,
  entity: Parameters<typeof resolveFleetScope>[0],
  hubs: Parameters<typeof resolveFleetScope>[1] = [],
) {
  return selectedCity === 'all' || resolveFleetScope(entity, hubs) === selectedCity
}

