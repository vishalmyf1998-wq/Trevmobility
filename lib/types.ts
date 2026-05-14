// B2B Employee type
export interface B2BEmployee {
  id: string
  b2bClientId: string
  name: string
  phone: string
  officeEmail: string
  employeeId: string
  approverEmail: string
  costCentre: string
  entity: string
  status: 'pending_approval' | 'approved' | 'rejected' | 'suspended'
  approvedBy?: string
  approvedAt?: string
  canLogin: boolean
  createdAt: string
  address?: string
}

// Communication Template type
export interface CommunicationTemplate {
  id: string
  name: string
  type: 'sms' | 'email' | 'whatsapp' | 'push'
  targetAudience: 'customer' | 'driver' | 'both'
  event: 'booking_confirmed' | 'driver_assigned' | 'driver_arrived' | 'trip_started' | 'trip_completed' | 'invoice_generated' | 'payment_reminder' | 'custom'
  subject?: string
  content: string
  variables: string[]
  isActive: boolean
  createdAt: string
}

// Admin Role type
export interface AdminRole {
  id: string
  name: string
  description: string
  permissions: string[]
  isActive: boolean
  createdAt: string
}

// Admin User type
export interface AdminUser {
  id: string
  name: string
  email: string
  phone?: string
  roleId: string
  status: 'active' | 'inactive'
  lastLogin?: string
  createdAt: string
}

// Booking Tag type
export interface BookingTag {
  id: string
  name: string
  color?: string
  description?: string
}

// Cancellation Policy type
export interface CancellationPolicy {
  id: string
  name: string
  description: string
  tripType: string | 'all'
  rules: CancellationRule[]
  isActive: boolean
  createdAt: string
}

export interface CancellationRule {
  id: string
  beforeMinutes: number
  refundPercentage: number
  cancellationFee: number
}

// Hub type
export interface Hub {
  id: string
  name: string
  address?: string
  cityId: string
  latitude: number
  longitude: number
  contactPerson: string
  contactPhone: string
  isActive: boolean
  createdAt: string
}

// Promo Code type
export interface PromoCode {
  id: string
  code: string
  description: string
  discountType: 'percentage' | 'flat'
  discountValue: number
  maxDiscount?: number
  minOrderValue: number
  usageLimit: number
  usedCount: number
  validFrom: string
  validTo: string
  applicableTripTypes: ('airport_pickup' | 'airport_drop' | 'rental' | 'city_ride' | 'outstation')[]
  applicableCities: string[]
  isActive: boolean
  createdAt: string
}

// City Polygon type
export interface CityPolygon {
  id: string
  cityId: string
  name: string
  coordinates: { lat: number; lng: number }[]
  color: string
  isActive: boolean
  createdAt: string
}

// Car Location for live tracking
export interface CarLocation {
  carId: string
  latitude: number
  longitude: number
  heading: number
  speed: number
  lastUpdated: string
}

// Core entity types
export interface Driver {
  id: string
  driverId?: string
  name: string
  phone: string
  email: string
  licenseNumber: string
  licenseExpiry?: string
  address: string
  status: 'active' | 'inactive' | 'suspended'
  assignedCarId?: string
  hubId?: string
  createdAt: string
  joiningDate?: string
  monthlySalary?: number
  password?: string
}

export interface Car {
  id: string
  registrationNumber: string
  categoryId: string
  make: string
  model: string
  year: number
  color: string
  fuelType: 'petrol' | 'diesel' | 'cng' | 'electric' | 'hybrid'
  seatingCapacity?: number
  status: 'available' | 'on_trip' | 'maintenance' | 'inactive'
  assignedDriverId?: string
  hubId?: string
  createdAt: string
}

export interface CarCategory {
  id: string
  name: string
  description: string
  supportedModels?: string
  icon: string
  isActive: boolean
}

export interface City {
  id: string
  name: string
  state: string
  isActive: boolean
  boundaryType?: 'polygon' | 'latlong'
  coverageArea?: number
  latitude?: number
  longitude?: number
  polygons?: CityPolygon[]
  createdAt: string
}

export interface B2CCustomer {
  id: string
  customerCode: string
  name: string
  phone: string
  email?: string
  address?: string
  createdAt: string
  updatedAt?: string
  status?: 'active' | 'inactive' | 'blocked'
  walletBalance?: number
}

export interface AirportTerminal {
  id: string
  airportId: string
  name: string
  code: string
  isActive: boolean
  createdAt: string
}

export interface Airport {
  id: string
  cityId: string
  name: string
  code: string
  address: string
  isActive: boolean
  terminals: AirportTerminal[]
  createdAt: string
}

// Fare configuration types
export type FareCalculationType = 'fixed' | 'slab' | 'per_km'
export type ChargeType = 'flat' | 'percentage'
export type RentalType = 'with_capping' | 'without_capping'
export type OutstationType = 'one_way' | 'round_trip' | 'route_wise'

export interface SlabConfig {
  id: string
  fromKm: number
  toKm: number
  farePerKm: number
}

export interface PeakHourConfig {
  enabled: boolean
  startTime: string
  endTime: string
  chargeType: ChargeType
  chargeValue: number
}

export interface NightChargeConfig {
  enabled: boolean
  startTime: string
  endTime: string
  chargeType: ChargeType
  chargeValue: number
}

export interface UrgentBookingConfig {
  enabled: boolean
  timeWindowHours: number
  chargeType: ChargeType
  chargeValue: number
}

export interface PreBookingCharges {
  tollEnabled: boolean
  tollAmount: number
  parkingEnabled: boolean
  parkingAmount: number
  miscEnabled: boolean
  miscDescription: string
  miscAmount: number
}

export interface AirportFareConfig {
  id: string
  cityId: string
  airportId?: string
  airportTerminalId?: string
  airportTerminalIds?: string[]
  carCategoryId: string
  type: 'pickup' | 'drop' | 'both'
  calculationType: FareCalculationType
  fixedFare?: number
  perKmRate?: number
  slabs?: SlabConfig[]
  peakHour: PeakHourConfig | PeakHourConfig[]
  nightCharge: NightChargeConfig
  urgentBooking?: UrgentBookingConfig
  waitingChargePerMin: number
  freeWaitingMinutes: number
  baseFare: number
  minimumFare: number
  preBookingCharges?: PreBookingCharges
}

export interface RentalFareConfig {
  id: string
  cityId: string
  carCategoryId: string
  rentalType: RentalType
  packageHours: number
  packageKm?: number
  packageFare: number
  extraKmRate: number
  extraHourRate: number
  freeWaitingMinutes: number
  kmCapping?: number
  peakHour: PeakHourConfig | PeakHourConfig[]
  nightCharge: NightChargeConfig
  urgentBooking?: UrgentBookingConfig
  preBookingCharges?: PreBookingCharges
}

export interface CityRideFareConfig {
  id: string
  cityId: string
  carCategoryId: string
  calculationType: FareCalculationType
  fixedFare?: number
  perKmRate?: number
  slabs?: SlabConfig[]
  peakHour: PeakHourConfig | PeakHourConfig[]
  nightCharge: NightChargeConfig
  urgentBooking?: UrgentBookingConfig
  baseFare: number
  minimumFare: number
  perMinuteRate: number
  freeWaitingMinutes: number
  preBookingCharges?: PreBookingCharges
}

export interface RouteConfig {
  id: string
  fromCityId: string
  toCityId: string
  distanceKm: number
  fare: number
}

export interface OutstationFareConfig {
  id: string
  cityId: string
  carCategoryId: string
  outstationType: OutstationType
  calculationType?: FareCalculationType
  baseFare?: number
  slabs?: SlabConfig[]
  oneWayPerKmRate?: number
  roundTripPerKmRate?: number
  routes?: RouteConfig[]
  driverAllowancePerDay: number
  nightHaltCharge: number
  peakHour: PeakHourConfig | PeakHourConfig[]
  nightCharge: NightChargeConfig
  urgentBooking?: UrgentBookingConfig
  minimumKmPerDay: number
  freeWaitingMinutes: number
  preBookingCharges?: PreBookingCharges
}

// Fare Group
export interface FareGroup {
  id: string
  name: string
  description: string
  type: 'B2C' | 'B2B'
  isDefault: boolean
  airportFares: AirportFareConfig[]
  rentalFares: RentalFareConfig[]
  cityRideFares: CityRideFareConfig[]
  outstationFares: OutstationFareConfig[]
  createdAt: string
}

// B2B Entity (sub-entity under B2B Client)
export interface B2BEntity {
  id: string
  b2bClientId: string
  name: string
  code: string
  contactPerson: string
  email: string
  phone: string
  address: string
  isActive: boolean
  createdAt: string
}

// B2B Client
export interface B2BClient {
  id: string
  companyName: string
  contactPerson: string
  email: string
  phone: string
  gstNumber: string
  billingAddress: string
  fareGroupId: string
  creditLimit: number
  creditDays: number
  currentBalance: number
  status: 'active' | 'inactive' | 'suspended'
  isGSTEnabled: boolean
  billingType: 'garage_to_garage' | 'point_to_point'
  paymentTerms?: string;
  paymentModel?: 'bill_to_company' | 'partial_advance' | 'full_advance'
  advancePercentage?: number
  entities?: B2BEntity[]
  createdAt: string
  webhookUrl?: string
  orgId?: string
  industry?: string
}

// GST Configuration
export interface GSTConfig {
  id: string
  gstNumber: string
  legalName: string
  tradeName: string
  address: string
  state: string
  stateCode: string
  cgstRate: number
  sgstRate: number
  igstRate: number
  isActive: boolean
}

// Event Log for bookings
export interface BookingEventLog {
  id: string
  event: 'created' | 'confirmed' | 'assigned' | 'reassigned' | 'dispatched' | 'arrived' | 'picked_up' | 'dropped' | 'closed' | 'cancelled' | 'status_reverted' | 'pending_edit_approval' | 'completed' | 'edit_approved' | 'rejected'
  fromStatus?: string
  toStatus: string
  performedBy: string
  performedAt: string
  notes?: string
}

// Booking & Invoice types
export interface Booking {
  id: string
  bookingNumber: string
  b2cCustomerId?: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  customerAddress?: string
  b2bClientId?: string
  driverId?: string
  carId?: string
  cityId: string
  carCategoryId: string
  tripType: 'airport_pickup' | 'airport_drop' | 'rental' | 'city_ride' | 'outstation'
  airportId?: string
  airportTerminalId?: string
  pickupLocation: string
  dropLocation: string
  pickupDate: string
  pickupTime: string
  returnDate?: string
  estimatedKm: number
  estimatedFare: number
  actualKm?: number
  actualFare?: number
  extraCharges: number
  peakHourCharge: number
  nightCharge: number
  waitingCharge: number
  tollCharges: number
  parkingCharges: number
  miscCharges: number
  totalFare: number
  gstAmount: number
  grandTotal: number
  advanceRequired?: number
  advancePaid?: number
  promoCodeId?: string
  promoDiscount: number
  status: 'pending' | 'confirmed' | 'assigned' | 'dispatched' | 'arrived' | 'picked_up' | 'dropped' | 'closed' | 'cancelled' | 'pending_edit_approval' | 'completed' | 'edit_approved' | 'rejected' | 'status_reverted' | 'created' | 'reassigned'
  paymentStatus: 'pending' | 'paid' | 'partial'
  remarks?: string
  tags?: string[]
  b2bEmployeeId?: string
  eventLog: BookingEventLog[]
  externalBookingId?: string
  createdBy?: string
  createdAt: string
  approvalStatus?: 'pending' | 'approved' | 'rejected'
  pendingEdits?: any
  originalStatus?: string
}

export interface DutySlip {
  id: string
  dutySlipNumber: string
  bookingId: string
  driverId: string
  carId: string
  startTime: string
  endTime?: string
  startKm: number
  endKm?: number
  totalKm?: number
  totalHours?: number
  customerSignature?: string
  driverSignature?: string
  remarks?: string
  status: 'active' | 'completed'
  createdAt: string
}

export interface Invoice {
  id: string
  invoiceNumber: string
  bookingId: string
  dutySlipId?: string
  b2bClientId?: string
  clientType: 'b2c' | 'b2b'
  customerName: string
  customerPhone?: string
  customerEmail?: string
  customerAddress?: string
  customerGst?: string
  invoiceDate: string
  dueDate: string
  subtotal: number
  gstRate: number
  gstAmount: number
  cgst: number
  sgst: number
  igst?: number
  totalAmount: number
  status: 'pending' | 'paid' | 'cancelled' | 'overdue'
  paidAmount: number
  balanceAmount: number
  createdAt: string
}

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

export interface WalletTransaction {
  id: string;
  customerId?: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  createdAt: string;
  referenceId?: string;
  referenceType?: string;
}

export interface B2BApprovalRule {
  id: string;
  clientId?: string;
  approverEmployeeId?: string;
  maxApprovalAmount?: number;
  name?: string;
  isActive: boolean;
  createdAt: string;
}
