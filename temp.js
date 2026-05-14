const fs = require('fs');
let code = fs.readFileSync('lib/types.ts', 'utf8');

// Replace peakHour
code = code.replace(/peakHour: PeakHourConfig/g, 'peakHour: PeakHourConfig | PeakHourConfig[]');

// Add new types
const additions = `
// Multi-Role Login System
export type UserType = 'trev-admin' | 'corporate-admin' | 'corporate-employee';

// Trip Extras for Tolls/Taxes/Parking
export interface RouteToll {
  id: string
  fromCityId: string
  toCityId: string
  carCategoryId: string
  tollAmount: number
  validFrom?: string
  validTo?: string
  notes?: string
  createdAt: string
}

export interface StateTax {
  id: string
  stateCode: string
  carCategoryId: string
  tripType: 'outstation' | 'rental' | 'city_ride'
  permitTax: number
  gstRate: number
  createdAt: string
}

export interface ParkingFee {
  id: string
  locationType: 'airport' | 'city_parking' | 'hub'
  airportId?: string
  cityId: string
  carCategoryId: string
  feeAmount: number
  durationHours: number
  maxDailyCap: number
  createdAt: string
}

export interface TripExtrasCalculation {
  toll: number
  permitTax: number
  parking: number
  gstRate: number
  totalExtras: number
  gstOnExtras: number
}
`;

code += additions;
fs.writeFileSync('lib/types.ts', code);
