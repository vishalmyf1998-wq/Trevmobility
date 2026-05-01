// Previous types unchanged...

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

// Add to Booking interface if needed
// booking.tollCharges, parkingCharges already exist

