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

// Global registry to map city ID/name to dispatch center IDs
export const cityToDispatchCentersMap: Record<string, string[]> = {};

export function updateCityDispatchCenterMap(cities: Array<{ id: string; name: string; operatingCities?: string[]; operatingCity?: string | null }>) {
  // Clear the map first
  for (const key in cityToDispatchCentersMap) {
    delete cityToDispatchCentersMap[key];
  }
  // Fill the map
  cities.forEach(city => {
    const dcs: string[] = [];
    if (city.operatingCities && Array.isArray(city.operatingCities)) {
      dcs.push(...city.operatingCities);
    }
    if (city.operatingCity && !dcs.includes(city.operatingCity)) {
      dcs.push(city.operatingCity);
    }
    if (dcs.length > 0) {
      cityToDispatchCentersMap[city.id] = dcs;
      cityToDispatchCentersMap[city.name.toLowerCase()] = dcs;
    }
  });
}

export function resolveFleetScopes(
  entity: {
    operatingCity?: string | null
    operatingCities?: string[]
    pickupCity?: string | null
    cityId?: string | null
    hubId?: string | null
  },
  hubs: Array<{ id: string; cityId: string }> = []
): string[] {
  const dcs: string[] = [];

  // Priority 1: Explicit operatingCities / operatingCity set on the entity
  if (entity.operatingCities && Array.isArray(entity.operatingCities)) {
    entity.operatingCities.forEach(dc => {
      if (dc !== 'all' && !dcs.includes(dc)) dcs.push(dc);
    });
  }
  if (entity.operatingCity && entity.operatingCity !== 'all' && !dcs.includes(entity.operatingCity)) {
    dcs.push(entity.operatingCity);
  }
  if (dcs.length > 0) return dcs;

  // Priority 2: Look up using cityToDispatchCentersMap
  const lookupKey = entity.cityId || entity.pickupCity;
  if (lookupKey) {
    const mapped = cityToDispatchCentersMap[lookupKey] || cityToDispatchCentersMap[lookupKey.toLowerCase()];
    if (mapped) return mapped;
  }

  // Priority 3: Look up from hubId
  if (entity.hubId) {
    const hubCityId = hubs.find((hub) => hub.id === entity.hubId)?.cityId;
    if (hubCityId) {
      const mapped = cityToDispatchCentersMap[hubCityId] || cityToDispatchCentersMap[hubCityId.toLowerCase()];
      if (mapped) return mapped;
    }
  }

  // Priority 4: Infer from pickupCity or cityId as a fallback
  const explicitScope = cityIdToScope(entity.pickupCity || entity.cityId);
  if (explicitScope) return [explicitScope];
  
  const hubCityId = hubs.find((hub) => hub.id === entity.hubId)?.cityId
  const inferred = cityIdToScope(hubCityId) || 'other';
  return [inferred];
}

export function resolveFleetScope(
  entity: Parameters<typeof resolveFleetScopes>[0],
  hubs: Parameters<typeof resolveFleetScopes>[1] = []
): string {
  const scopes = resolveFleetScopes(entity, hubs);
  return scopes[0] || 'other';
}

export function matchesCityScope(
  selectedCity: string,
  entity: Parameters<typeof resolveFleetScopes>[0],
  hubs: Parameters<typeof resolveFleetScopes>[1] = [],
) {
  if (selectedCity === 'all') return true;
  const resolved = resolveFleetScopes(entity, hubs);
  return resolved.includes(selectedCity);
}

