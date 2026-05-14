// @ts-nocheck
'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { supabase } from '../supabaseClient'
import { sendInviteEmail } from './actions'
import {
  Driver, Car, CarCategory, City, B2CCustomer, Airport, AirportTerminal, FareGroup, B2BClient, B2BEntity, GSTConfig,
  Booking, DutySlip, Invoice, PeakHourConfig, NightChargeConfig,
  Hub, PromoCode, CityPolygon, CarLocation,
  B2BEmployee, B2BApprovalRule, CommunicationTemplate, AdminRole, AdminUser, BookingTag, CancellationPolicy, WalletTransaction,
  UserType
} from './types'

export interface DriverPayout {
  id: string
  payoutNumber: string
  driverId: string
  hub: string
  doj: string
  monthYear: string
  monthDays: number
  workedDays: number
  totalLeaves: number
  shiftPay: number
  extraHoursPay: number
  daPay: number
  carWashing: number
  attendanceBonus: number
  customerRatingBonus: number
  onTimeReportingBonus: number
  overSpeeding: number
  lateLoginEarlyCheckout: number
  carNotClean: number
  amenitiesMissing: number
  customerComplaints: number
  emergencyLeave: number
  rideMissed: number
  minorDents: number
  majorAccident: number
  cameraTyreDamage: number
  challan: number
  totalPenalty: number
  totalIncentive: number
  advanceMinus: number
  cashInHand: number
  arrear: number
  healthInsurance: number
  specialAllowance: number
  finalPayout: number
  status: 'pending' | 'paid'
  remarks?: string
  createdAt: string
}

export interface TicketComment {
  id: string
  text: string
  senderName: string
  isAdmin: boolean
  timestamp: string
}

export interface SupportTicket {
  id: string
  ticketNumber: string
  subject: string
  customerName: string
  type: string
  priority: string
  status: string
  description: string
  createdAt: string
  updatedAt: string
  comments?: TicketComment[]
}

// Default peak hour and night charge configs
export const defaultPeakHour: PeakHourConfig = {
  enabled: false,
  startTime: '08:00',
  endTime: '10:00',
  chargeType: 'percentage',
  chargeValue: 10
}

export const defaultNightCharge: NightChargeConfig = {
  enabled: false,
  startTime: '23:00',
  endTime: '05:00',
  chargeType: 'percentage',
  chargeValue: 15
}

// Initial sample data
const demoNow = new Date().toISOString()
const demoToday = new Date().toISOString().split('T')[0]
const demoTomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
const demoNextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
const demoNextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

const initialCarCategories: CarCategory[] = [
  { id: 'demo-cat-sedan', name: 'Sedan', description: 'Comfortable 4-seater for city and airport rides', supportedModels: 'Dzire, Amaze, Etios', icon: 'Car', isActive: true },
  { id: 'demo-cat-suv', name: 'SUV', description: 'Spacious 6-seater for family and corporate travel', supportedModels: 'Ertiga, Innova, Carens', icon: 'CarFront', isActive: true },
  { id: 'demo-cat-premium', name: 'Premium', description: 'Executive cars for VIP movement', supportedModels: 'City, Verna, Camry', icon: 'Gem', isActive: true },
]

const initialCities: City[] = [
  { id: 'demo-city-mumbai', name: 'Mumbai', state: 'Maharashtra', isActive: true, boundaryType: 'latlong', coverageArea: 95, latitude: 19.076, longitude: 72.8777, createdAt: demoNow },
  { id: 'demo-city-delhi', name: 'Delhi NCR', state: 'Delhi', isActive: true, boundaryType: 'latlong', coverageArea: 120, latitude: 28.6139, longitude: 77.209, createdAt: demoNow },
  { id: 'demo-city-bengaluru', name: 'Bengaluru', state: 'Karnataka', isActive: true, boundaryType: 'polygon', coverageArea: 110, latitude: 12.9716, longitude: 77.5946, createdAt: demoNow },
]

const initialAirports: Airport[] = [
  {
    id: 'demo-airport-bom',
    cityId: 'demo-city-mumbai',
    name: 'Chhatrapati Shivaji Maharaj International Airport',
    code: 'BOM',
    address: 'Terminal 2, Sahar, Mumbai',
    isActive: true,
    createdAt: demoNow,
    terminals: [
      { id: 'demo-terminal-bom-t1', airportId: 'demo-airport-bom', name: 'Terminal 1', code: 'T1', isActive: true, createdAt: demoNow },
      { id: 'demo-terminal-bom-t2', airportId: 'demo-airport-bom', name: 'Terminal 2', code: 'T2', isActive: true, createdAt: demoNow },
    ],
  },
  {
    id: 'demo-airport-del',
    cityId: 'demo-city-delhi',
    name: 'Indira Gandhi International Airport',
    code: 'DEL',
    address: 'Terminal 3, New Delhi',
    isActive: true,
    createdAt: demoNow,
    terminals: [
      { id: 'demo-terminal-del-t2', airportId: 'demo-airport-del', name: 'Terminal 2', code: 'T2', isActive: true, createdAt: demoNow },
      { id: 'demo-terminal-del-t3', airportId: 'demo-airport-del', name: 'Terminal 3', code: 'T3', isActive: true, createdAt: demoNow },
    ],
  },
]

const initialDrivers: Driver[] = [
  { id: 'demo-driver-1', driverId: 'DRV-001', name: 'Ramesh Yadav', phone: '9000000001', email: 'ramesh@trev.test', licenseNumber: 'MH12-2024-1001', licenseExpiry: demoNextMonth, address: 'Andheri East, Mumbai', status: 'active', assignedCarId: 'demo-car-1', hubId: 'demo-hub-mumbai-airport', joiningDate: demoToday, monthlySalary: 28500, password: 'test123', createdAt: demoNow },
  { id: 'demo-driver-2', driverId: 'DRV-002', name: 'Suresh Patil', phone: '9000000002', email: 'suresh@trev.test', licenseNumber: 'DL09-2023-2202', licenseExpiry: demoNextMonth, address: 'Dwarka, Delhi', status: 'active', assignedCarId: 'demo-car-2', hubId: 'demo-hub-delhi-ncr', joiningDate: demoToday, monthlySalary: 31000, password: 'test123', createdAt: demoNow },
  { id: 'demo-driver-3', driverId: 'DRV-003', name: 'Imran Shaikh', phone: '9000000003', email: 'imran@trev.test', licenseNumber: 'KA05-2022-3303', licenseExpiry: demoNextMonth, address: 'Hebbal, Bengaluru', status: 'inactive', assignedCarId: '', hubId: 'demo-hub-bengaluru', joiningDate: demoToday, monthlySalary: 29500, password: 'test123', createdAt: demoNow },
]

const initialCars: Car[] = [
  { id: 'demo-car-1', registrationNumber: 'MH 01 AB 1234', categoryId: 'demo-cat-sedan', make: 'Maruti Suzuki', model: 'Dzire', year: 2023, color: 'White', fuelType: 'cng', seatingCapacity: 4, status: 'on_trip', assignedDriverId: 'demo-driver-1', hubId: 'demo-hub-mumbai-airport', createdAt: demoNow },
  { id: 'demo-car-2', registrationNumber: 'DL 02 CD 5678', categoryId: 'demo-cat-suv', make: 'Toyota', model: 'Innova Crysta', year: 2022, color: 'Silver', fuelType: 'diesel', seatingCapacity: 6, status: 'available', assignedDriverId: 'demo-driver-2', hubId: 'demo-hub-delhi-ncr', createdAt: demoNow },
  { id: 'demo-car-3', registrationNumber: 'KA 03 EF 9012', categoryId: 'demo-cat-premium', make: 'Honda', model: 'City', year: 2024, color: 'Black', fuelType: 'petrol', seatingCapacity: 4, status: 'maintenance', assignedDriverId: '', hubId: 'demo-hub-bengaluru', createdAt: demoNow },
]

const initialFareGroups: FareGroup[] = [
  {
    id: 'demo-fare-b2c',
    name: 'Default B2C Fare',
    description: 'Testing fare group for direct customers',
    type: 'B2C',
    isDefault: true,
    airportFares: [
      { id: 'demo-airfare-1', cityId: 'demo-city-mumbai', airportId: 'demo-airport-bom', airportTerminalIds: ['demo-terminal-bom-t1', 'demo-terminal-bom-t2'], carCategoryId: 'demo-cat-sedan', type: 'both', calculationType: 'fixed', fixedFare: 999, peakHour: defaultPeakHour, nightCharge: defaultNightCharge, waitingChargePerMin: 3, freeWaitingMinutes: 20, baseFare: 250, minimumFare: 350 },
    ],
    rentalFares: [
      { id: 'demo-rental-1', cityId: 'demo-city-mumbai', carCategoryId: 'demo-cat-sedan', rentalType: 'with_capping', packageHours: 8, packageKm: 80, packageFare: 2400, extraKmRate: 18, extraHourRate: 250, freeWaitingMinutes: 15, kmCapping: 80, peakHour: defaultPeakHour, nightCharge: defaultNightCharge },
    ],
    cityRideFares: [
      { id: 'demo-cityfare-1', cityId: 'demo-city-mumbai', carCategoryId: 'demo-cat-sedan', calculationType: 'per_km', perKmRate: 18, peakHour: defaultPeakHour, nightCharge: defaultNightCharge, baseFare: 199, minimumFare: 299, perMinuteRate: 2, freeWaitingMinutes: 10 },
    ],
    outstationFares: [
      { id: 'demo-outstation-1', cityId: 'demo-city-mumbai', carCategoryId: 'demo-cat-sedan', outstationType: 'one_way', calculationType: 'per_km', baseFare: 1200, oneWayPerKmRate: 22, roundTripPerKmRate: 18, driverAllowancePerDay: 500, nightHaltCharge: 800, peakHour: defaultPeakHour, nightCharge: defaultNightCharge, minimumKmPerDay: 250, freeWaitingMinutes: 15 },
    ],
    createdAt: demoNow,
  },
  {
    id: 'demo-fare-b2b',
    name: 'Corporate Standard Fare',
    description: 'Testing fare group for corporate clients',
    type: 'B2B',
    isDefault: true,
    airportFares: [],
    rentalFares: [],
    cityRideFares: [
      { id: 'demo-cityfare-2', cityId: 'demo-city-delhi', carCategoryId: 'demo-cat-suv', calculationType: 'per_km', perKmRate: 24, peakHour: defaultPeakHour, nightCharge: defaultNightCharge, baseFare: 299, minimumFare: 499, perMinuteRate: 3, freeWaitingMinutes: 10 },
    ],
    outstationFares: [],
    createdAt: demoNow,
  },
]

const initialHubs: Hub[] = [
  { id: 'demo-hub-mumbai-airport', name: 'Mumbai Airport Hub', address: 'Near T2 Parking, Andheri East', cityId: 'demo-city-mumbai', latitude: 19.0896, longitude: 72.8656, contactPerson: 'Neha Sharma', contactPhone: '9100000001', isActive: true, createdAt: demoNow },
  { id: 'demo-hub-delhi-ncr', name: 'Delhi NCR Dispatch Hub', address: 'Aerocity, New Delhi', cityId: 'demo-city-delhi', latitude: 28.5562, longitude: 77.1, contactPerson: 'Vikram Singh', contactPhone: '9100000002', isActive: true, createdAt: demoNow },
  { id: 'demo-hub-bengaluru', name: 'Bengaluru North Hub', address: 'Hebbal Service Road, Bengaluru', cityId: 'demo-city-bengaluru', latitude: 13.0358, longitude: 77.597, contactPerson: 'Anita Rao', contactPhone: '9100000003', isActive: true, createdAt: demoNow },
]

const initialBookingTags: BookingTag[] = [
  { id: '1', name: 'VIP', color: '#FFD700', description: 'VIP Customer' },
  { id: '2', name: 'Corporate', color: '#4169E1', description: 'Corporate booking' },
  { id: '3', name: 'Airport Transfer', color: '#32CD32', description: 'Airport related' },
  { id: '4', name: 'Urgent', color: '#FF4500', description: 'Urgent requirement' },
]

const initialAdminRoles: AdminRole[] = [
  { id: 'a1111111-1111-4111-a111-111111111111', name: 'Super Admin', description: 'Full system access', permissions: ['all'], isActive: true, createdAt: new Date().toISOString() },
  { id: 'b2222222-2222-4222-b222-222222222222', name: 'Operations Manager', description: 'Manage bookings and fleet', permissions: ['bookings', 'drivers', 'cars', 'duty_slips'], isActive: true, createdAt: new Date().toISOString() },
  { id: 'c3333333-3333-4333-c333-333333333333', name: 'Accounts', description: 'Billing and invoices', permissions: ['invoices', 'payments', 'reports'], isActive: true, createdAt: new Date().toISOString() },
  { id: 'd4444444-4444-4444-d444-444444444444', name: 'Dispatcher', description: 'Dispatch and tracking', permissions: ['bookings', 'live_tracking', 'dispatch'], isActive: true, createdAt: new Date().toISOString() },
]

const initialGstConfig: GSTConfig = {
  id: '1',
  gstNumber: '',
  legalName: '',
  tradeName: '',
  address: '',
  state: '',
  stateCode: '',
  cgstRate: 2.5,
  sgstRate: 2.5,
  igstRate: 5,
  isActive: true
}

const initialDriverPayouts: DriverPayout[] = [
  { id: 'demo-payout-1', payoutNumber: 'PYT-2026-0001', driverId: 'demo-driver-1', hub: 'Mumbai Airport Hub', doj: demoToday, monthYear: 'May 2026', monthDays: 31, workedDays: 24, totalLeaves: 2, shiftPay: 24000, extraHoursPay: 1800, daPay: 1200, carWashing: 500, attendanceBonus: 1000, customerRatingBonus: 750, onTimeReportingBonus: 500, overSpeeding: 0, lateLoginEarlyCheckout: 250, carNotClean: 0, amenitiesMissing: 0, customerComplaints: 0, emergencyLeave: 0, rideMissed: 0, minorDents: 0, majorAccident: 0, cameraTyreDamage: 0, challan: 0, totalPenalty: 250, totalIncentive: 2250, advanceMinus: 2000, cashInHand: 500, arrear: 0, healthInsurance: 400, specialAllowance: 1000, finalPayout: 28350, status: 'pending', remarks: 'Demo payout for testing', createdAt: demoNow },
  { id: 'demo-payout-2', payoutNumber: 'PYT-2026-0002', driverId: 'demo-driver-2', hub: 'Delhi NCR Dispatch Hub', doj: demoToday, monthYear: 'May 2026', monthDays: 31, workedDays: 26, totalLeaves: 1, shiftPay: 26000, extraHoursPay: 2200, daPay: 1500, carWashing: 500, attendanceBonus: 1200, customerRatingBonus: 900, onTimeReportingBonus: 600, overSpeeding: 300, lateLoginEarlyCheckout: 0, carNotClean: 0, amenitiesMissing: 100, customerComplaints: 0, emergencyLeave: 0, rideMissed: 0, minorDents: 0, majorAccident: 0, cameraTyreDamage: 0, challan: 500, totalPenalty: 900, totalIncentive: 2700, advanceMinus: 1000, cashInHand: 0, arrear: 500, healthInsurance: 400, specialAllowance: 1200, finalPayout: 32300, status: 'paid', remarks: 'Paid demo payout', createdAt: demoNow },
]

const initialB2CCustomers: B2CCustomer[] = [
  { id: 'demo-b2c-1', customerCode: 'CUS-001', name: 'Priya Mehta', phone: '9800000001', email: 'priya@example.com', address: 'Bandra West, Mumbai', status: 'active', walletBalance: 1250, createdAt: demoNow, updatedAt: demoNow },
  { id: 'demo-b2c-2', customerCode: 'CUS-002', name: 'Arjun Kapoor', phone: '9800000002', email: 'arjun@example.com', address: 'Saket, Delhi', status: 'active', walletBalance: 300, createdAt: demoNow, updatedAt: demoNow },
  { id: 'demo-b2c-3', customerCode: 'CUS-003', name: 'Sneha Iyer', phone: '9800000003', email: 'sneha@example.com', address: 'Indiranagar, Bengaluru', status: 'blocked', walletBalance: 0, createdAt: demoNow, updatedAt: demoNow },
]

const initialB2BClients: B2BClient[] = [
  { id: 'demo-b2b-acme', companyName: 'Acme Technologies Pvt Ltd', contactPerson: 'Karan Malhotra', email: 'travel@acmetech.test', phone: '9700000001', gstNumber: '27ABCDE1234F1Z5', billingAddress: 'BKC, Mumbai', fareGroupId: 'demo-fare-b2b', creditLimit: 500000, creditDays: 30, currentBalance: 82450, status: 'active', isGSTEnabled: true, billingType: 'point_to_point', paymentTerms: '30', paymentModel: 'bill_to_company', entities: [{ id: 'demo-entity-acme-hq', b2bClientId: 'demo-b2b-acme', name: 'Acme Mumbai HQ', code: 'ACME-MUM', contactPerson: 'Karan Malhotra', email: 'hq@acmetech.test', phone: '9700000002', address: 'BKC, Mumbai', isActive: true, createdAt: demoNow }], createdAt: demoNow, industry: 'Technology' },
  { id: 'demo-b2b-zen', companyName: 'Zen Healthcare Ltd', contactPerson: 'Meera Nair', email: 'admin@zenhealth.test', phone: '9700000011', gstNumber: '07ABCDE9876F1Z8', billingAddress: 'Connaught Place, Delhi', fareGroupId: 'demo-fare-b2b', creditLimit: 300000, creditDays: 15, currentBalance: 36000, status: 'active', isGSTEnabled: true, billingType: 'garage_to_garage', paymentTerms: '15', paymentModel: 'partial_advance', advancePercentage: 20, entities: [], createdAt: demoNow, industry: 'Healthcare' },
]

const initialB2BEmployees: B2BEmployee[] = [
  { id: 'demo-emp-1', b2bClientId: 'demo-b2b-acme', name: 'Nitin Rao', phone: '9600000001', officeEmail: 'nitin.rao@acmetech.test', employeeId: 'ACME-101', approverEmail: 'travel@acmetech.test', costCentre: 'Sales', entity: 'Acme Mumbai HQ', status: 'approved', approvedBy: 'Karan Malhotra', approvedAt: demoNow, canLogin: true, createdAt: demoNow, address: 'Powai, Mumbai' },
  { id: 'demo-emp-2', b2bClientId: 'demo-b2b-acme', name: 'Asha Gupta', phone: '9600000002', officeEmail: 'asha.gupta@acmetech.test', employeeId: 'ACME-102', approverEmail: 'nitin.rao@acmetech.test', costCentre: 'Engineering', entity: 'Acme Mumbai HQ', status: 'pending_approval', canLogin: false, createdAt: demoNow, address: 'Thane, Mumbai' },
  { id: 'demo-emp-3', b2bClientId: 'demo-b2b-zen', name: 'Rohit Bansal', phone: '9600000003', officeEmail: 'rohit@zenhealth.test', employeeId: 'ZEN-201', approverEmail: 'admin@zenhealth.test', costCentre: 'Operations', entity: 'Delhi Office', status: 'approved', canLogin: true, createdAt: demoNow, address: 'Noida' },
]
const initialB2BApprovalRules: B2BApprovalRule[] = [
  { id: 'demo-approval-1', clientId: 'demo-b2b-acme', approverEmployeeId: 'demo-emp-1', maxApprovalAmount: 10000, name: 'Acme manager approval under 10K', isActive: true, createdAt: demoNow },
  { id: 'demo-approval-2', clientId: 'demo-b2b-zen', approverEmployeeId: 'demo-emp-3', maxApprovalAmount: 7500, name: 'Zen operations approval', isActive: true, createdAt: demoNow },
]

const initialBookings: Booking[] = [
  { id: 'demo-booking-1', bookingNumber: 'BK-TEST-001', b2cCustomerId: 'demo-b2c-1', customerName: 'Priya Mehta', customerPhone: '9800000001', customerEmail: 'priya@example.com', customerAddress: 'Bandra West, Mumbai', driverId: 'demo-driver-1', carId: 'demo-car-1', cityId: 'demo-city-mumbai', carCategoryId: 'demo-cat-sedan', tripType: 'airport_drop', airportId: 'demo-airport-bom', airportTerminalId: 'demo-terminal-bom-t2', pickupLocation: 'Bandra West', dropLocation: 'BOM Terminal 2', pickupDate: demoToday, pickupTime: '09:30', estimatedKm: 18, estimatedFare: 999, actualKm: 19, actualFare: 1040, extraCharges: 0, peakHourCharge: 50, nightCharge: 0, waitingCharge: 30, tollCharges: 85, parkingCharges: 0, miscCharges: 0, totalFare: 1205, gstAmount: 60, grandTotal: 1265, advancePaid: 500, promoCodeId: 'demo-promo-1', promoDiscount: 100, status: 'dispatched', paymentStatus: 'partial', remarks: 'Demo airport booking', tags: ['3'], eventLog: [], createdBy: 'Admin', createdAt: demoNow },
  { id: 'demo-booking-2', bookingNumber: 'BK-TEST-002', b2bClientId: 'demo-b2b-acme', b2bEmployeeId: 'demo-emp-1', customerName: 'Nitin Rao', customerPhone: '9600000001', customerEmail: 'nitin.rao@acmetech.test', customerAddress: 'Powai, Mumbai', cityId: 'demo-city-mumbai', carCategoryId: 'demo-cat-premium', tripType: 'city_ride', pickupLocation: 'Acme Mumbai HQ', dropLocation: 'Nariman Point', pickupDate: demoTomorrow, pickupTime: '14:00', estimatedKm: 24, estimatedFare: 1450, actualKm: 0, actualFare: 0, extraCharges: 0, peakHourCharge: 0, nightCharge: 0, waitingCharge: 0, tollCharges: 0, parkingCharges: 0, miscCharges: 0, totalFare: 1450, gstAmount: 72.5, grandTotal: 1522.5, advancePaid: 0, promoDiscount: 0, status: 'pending_edit_approval', paymentStatus: 'pending', remarks: 'Demo corporate edit approval', tags: ['2'], eventLog: [], pendingEdits: { pickupTime: '15:00' }, originalStatus: 'confirmed', createdBy: 'Corporate Admin', createdAt: demoNow, approvalStatus: 'pending' },
  { id: 'demo-booking-3', bookingNumber: 'BK-TEST-003', b2bClientId: 'demo-b2b-zen', b2bEmployeeId: 'demo-emp-3', customerName: 'Rohit Bansal', customerPhone: '9600000003', customerEmail: 'rohit@zenhealth.test', cityId: 'demo-city-delhi', carCategoryId: 'demo-cat-suv', tripType: 'rental', pickupLocation: 'Connaught Place', dropLocation: 'Delhi NCR Visits', pickupDate: demoNextWeek, pickupTime: '10:00', estimatedKm: 80, estimatedFare: 3200, actualKm: 82, actualFare: 3300, extraCharges: 100, peakHourCharge: 0, nightCharge: 0, waitingCharge: 100, tollCharges: 0, parkingCharges: 150, miscCharges: 0, totalFare: 3650, gstAmount: 182.5, grandTotal: 3832.5, advancePaid: 1000, promoDiscount: 0, status: 'closed', paymentStatus: 'paid', remarks: 'Closed rental demo booking', tags: ['2'], eventLog: [], createdBy: 'Corporate Employee', createdAt: demoNow, approvalStatus: 'approved' },
]
const initialWalletTransactions: WalletTransaction[] = [
  { id: 'demo-wallet-1', customerId: 'demo-b2c-1', amount: 1500, type: 'credit', description: 'Demo wallet top-up', referenceType: 'manual', createdAt: demoNow },
  { id: 'demo-wallet-2', customerId: 'demo-b2c-1', amount: 250, type: 'debit', description: 'Demo ride adjustment', referenceId: 'demo-booking-1', referenceType: 'booking', createdAt: demoNow },
  { id: 'demo-wallet-3', customerId: 'demo-b2c-2', amount: 300, type: 'credit', description: 'Referral bonus test credit', referenceType: 'referral', createdAt: demoNow },
]

const initialDutySlips: DutySlip[] = [
  { id: 'demo-duty-1', dutySlipNumber: 'DS-TEST-001', bookingId: 'demo-booking-1', driverId: 'demo-driver-1', carId: 'demo-car-1', startTime: `${demoToday}T09:20`, startKm: 45210, remarks: 'Active airport dispatch demo', status: 'active', createdAt: demoNow },
  { id: 'demo-duty-2', dutySlipNumber: 'DS-TEST-002', bookingId: 'demo-booking-3', driverId: 'demo-driver-2', carId: 'demo-car-2', startTime: `${demoToday}T10:00`, endTime: `${demoToday}T18:30`, startKm: 78200, endKm: 78282, totalKm: 82, totalHours: 8.5, remarks: 'Completed demo rental slip', status: 'completed', createdAt: demoNow },
]

const initialInvoices: Invoice[] = [
  { id: 'demo-invoice-1', invoiceNumber: 'INV-2026-0001', bookingId: 'demo-booking-3', dutySlipId: 'demo-duty-2', b2bClientId: 'demo-b2b-zen', clientType: 'b2b', customerName: 'Zen Healthcare Ltd', customerPhone: '9700000011', customerEmail: 'admin@zenhealth.test', customerAddress: 'Connaught Place, Delhi', customerGst: '07ABCDE9876F1Z8', invoiceDate: demoToday, dueDate: demoNextWeek, subtotal: 3650, gstRate: 5, gstAmount: 182.5, cgst: 91.25, sgst: 91.25, totalAmount: 3832.5, status: 'pending', paidAmount: 0, balanceAmount: 3832.5, createdAt: demoNow },
  { id: 'demo-invoice-2', invoiceNumber: 'INV-2026-0002', bookingId: 'demo-booking-1', dutySlipId: 'demo-duty-1', clientType: 'b2c', customerName: 'Priya Mehta', customerPhone: '9800000001', customerEmail: 'priya@example.com', customerAddress: 'Bandra West, Mumbai', invoiceDate: demoToday, dueDate: demoToday, subtotal: 1205, gstRate: 5, gstAmount: 60, cgst: 30, sgst: 30, totalAmount: 1265, status: 'paid', paidAmount: 1265, balanceAmount: 0, createdAt: demoNow },
]

const initialPromoCodes: PromoCode[] = [
  { id: 'demo-promo-1', code: 'TEST100', description: 'Flat testing discount for B2C rides', discountType: 'flat', discountValue: 100, maxDiscount: 100, minOrderValue: 500, usageLimit: 100, usedCount: 7, validFrom: demoToday, validTo: demoNextMonth, applicableTripTypes: ['airport_drop', 'airport_pickup', 'city_ride'], applicableCities: ['demo-city-mumbai', 'demo-city-delhi'], isActive: true, createdAt: demoNow },
  { id: 'demo-promo-2', code: 'CORP10', description: '10% test promo for corporate rentals', discountType: 'percentage', discountValue: 10, maxDiscount: 500, minOrderValue: 1500, usageLimit: 50, usedCount: 12, validFrom: demoToday, validTo: demoNextMonth, applicableTripTypes: ['rental', 'outstation'], applicableCities: ['demo-city-mumbai', 'demo-city-delhi', 'demo-city-bengaluru'], isActive: true, createdAt: demoNow },
]

const initialCityPolygons: CityPolygon[] = [
  { id: 'demo-poly-mumbai-core', cityId: 'demo-city-mumbai', name: 'Mumbai Core Zone', color: '#39FF14', isActive: true, createdAt: demoNow, coordinates: [{ lat: 19.05, lng: 72.82 }, { lat: 19.12, lng: 72.84 }, { lat: 19.11, lng: 72.92 }, { lat: 19.04, lng: 72.9 }] },
  { id: 'demo-poly-blr-north', cityId: 'demo-city-bengaluru', name: 'Bengaluru North Zone', color: '#3B82F6', isActive: true, createdAt: demoNow, coordinates: [{ lat: 13.02, lng: 77.55 }, { lat: 13.08, lng: 77.58 }, { lat: 13.06, lng: 77.65 }, { lat: 13.0, lng: 77.62 }] },
]

const initialCarLocations: CarLocation[] = [
  { carId: 'demo-car-1', latitude: 19.088, longitude: 72.868, heading: 120, speed: 34, lastUpdated: demoNow },
  { carId: 'demo-car-2', latitude: 28.556, longitude: 77.1, heading: 270, speed: 0, lastUpdated: demoNow },
  { carId: 'demo-car-3', latitude: 13.0358, longitude: 77.597, heading: 45, speed: 0, lastUpdated: demoNow },
]

const initialCommunicationTemplates: CommunicationTemplate[] = [
  { id: 'demo-template-1', name: 'Booking Confirmed SMS', type: 'sms', targetAudience: 'customer', event: 'booking_confirmed', content: 'Hi {{customerName}}, your Trev booking {{bookingNumber}} is confirmed for {{pickupDate}} {{pickupTime}}.', variables: ['customerName', 'bookingNumber', 'pickupDate', 'pickupTime'], isActive: true, createdAt: demoNow },
  { id: 'demo-template-2', name: 'Driver Assigned Email', type: 'email', targetAudience: 'customer', event: 'driver_assigned', subject: 'Your driver is assigned', content: 'Driver {{driverName}} and car {{carNumber}} have been assigned to booking {{bookingNumber}}.', variables: ['driverName', 'carNumber', 'bookingNumber'], isActive: true, createdAt: demoNow },
]

const initialAdminUsers: AdminUser[] = [
  { id: 'e5555555-5555-4555-e555-555555555555', name: 'Trev Admin', email: 'vishal@trevcabs.com', roleId: 'a1111111-1111-4111-a111-111111111111', status: 'active', lastLogin: new Date().toISOString(), createdAt: new Date().toISOString() }
]

const initialCancellationPolicies: CancellationPolicy[] = [
  { id: 'demo-cancel-1', name: 'Standard B2C Cancellation', description: 'Default cancellation test policy', tripType: 'all', isActive: true, createdAt: demoNow, rules: [{ id: 'demo-cancel-rule-1', beforeMinutes: 120, refundPercentage: 100, cancellationFee: 0 }, { id: 'demo-cancel-rule-2', beforeMinutes: 30, refundPercentage: 50, cancellationFee: 100 }, { id: 'demo-cancel-rule-3', beforeMinutes: 0, refundPercentage: 0, cancellationFee: 250 }] },
  { id: 'demo-cancel-2', name: 'Airport Transfer Policy', description: 'Airport-specific testing policy', tripType: 'airport_drop', isActive: true, createdAt: demoNow, rules: [{ id: 'demo-cancel-rule-4', beforeMinutes: 180, refundPercentage: 100, cancellationFee: 0 }, { id: 'demo-cancel-rule-5', beforeMinutes: 60, refundPercentage: 70, cancellationFee: 150 }] },
]

const initialSupportTickets: SupportTicket[] = [
  { id: 'demo-ticket-1', ticketNumber: 'TK-TEST-001', subject: 'Invoice copy needed', customerName: 'Priya Mehta', type: 'billing', priority: 'medium', status: 'open', description: 'Customer needs invoice copy for airport drop booking.', createdAt: demoNow, updatedAt: demoNow, comments: [{ id: 'demo-comment-1', text: 'Shared with accounts team for verification.', senderName: 'Support Admin', isAdmin: true, timestamp: demoNow }] },
  { id: 'demo-ticket-2', ticketNumber: 'TK-TEST-002', subject: 'Driver reached late', customerName: 'Nitin Rao', type: 'service', priority: 'high', status: 'in_progress', description: 'Corporate employee reported driver delay for morning ride.', createdAt: demoNow, updatedAt: demoNow, comments: [] },
]

const loadState = <T,>(key: string, fallback: T): T => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(key)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (key === 'adminRoles' && parsed.length > 0 && parsed[0].id === '1') {
          localStorage.removeItem(key)
          return fallback
        }
        if (key === 'adminUsers' && parsed.length > 0 && (parsed[0].id === '1' || parsed[0].roleId === '1')) {
          localStorage.removeItem(key)
          return fallback
        }
        return Array.isArray(parsed) ? parsed.filter(Boolean) as unknown as T : (parsed || fallback)
      }
    } catch { /* ignore */ }
  }
  return fallback
}

const dummyClient: B2BClient = {
  id: 'dummy-corp-client',
  companyName: 'Dummy Corp',
  industry: 'Tech',
  contactPerson: 'John Doe',
  email: 'admin@dummycorp.com',
  phone: '9999999999',
  billingAddress: '123 Dummy St',
  gstNumber: '22AAAAA0000A1Z5',
  billingType: 'point_to_point',
  paymentTerms: 30,
  status: 'active',
  isGSTEnabled: true,
  createdAt: new Date().toISOString()
}

const dummyAdmin: B2BEmployee = {
  id: 'dummy-corp-admin',
  b2bClientId: 'dummy-corp-client',
  name: 'Corp Admin',
  phone: '9876543210',
  officeEmail: 'admin@dummycorp.com',
  employeeId: 'EMP-001',
  approverEmail: 'ceo@dummycorp.com',
  status: 'approved',
  canLogin: true,
  createdAt: new Date().toISOString(),
  // @ts-ignore
  isCorpAdmin: true
}

const dummyEmployee: B2BEmployee = {
  id: 'dummy-corp-emp',
  b2bClientId: 'dummy-corp-client',
  name: 'Corp Employee',
  phone: '9876543211',
  officeEmail: 'employee@dummycorp.com',
  employeeId: 'EMP-002',
  approverEmail: 'admin@dummycorp.com',
  status: 'approved',
  canLogin: true,
  createdAt: new Date().toISOString(),
  // @ts-ignore
  isCorpAdmin: false
}

const dummyBookings: Booking[] = [
  {
    id: 'dummy-bk-1',
    bookingNumber: 'BK' + Date.now().toString().slice(-6) + '1',
    b2bClientId: 'dummy-corp-client',
    b2bEmployeeId: 'dummy-corp-admin',
    customerName: 'Corp Admin',
    customerPhone: '9876543210',
    customerEmail: 'admin@dummycorp.com',
    customerAddress: '123 Dummy St',
    cityId: 'demo-city',
    carCategoryId: 'demo-cat',
    tripType: 'city_ride',
    pickupLocation: 'Dummy Corp HQ',
    dropLocation: 'Client Site A',
    pickupDate: new Date().toISOString().split('T')[0],
    pickupTime: '09:00',
    estimatedKm: 20,
    estimatedFare: 600,
    actualKm: 0,
    actualFare: 0,
    extraCharges: 0,
    peakHourCharge: 0,
    nightCharge: 0,
    waitingCharge: 0,
    tollCharges: 0,
    parkingCharges: 0,
    miscCharges: 0,
    totalFare: 600,
    gstAmount: 30,
    grandTotal: 630,
    advancePaid: 0,
    promoDiscount: 0,
    status: 'pending',
    paymentStatus: 'pending',
    remarks: 'Dummy booking created by Corp Admin',
    createdAt: new Date().toISOString(),
    createdBy: 'Admin',
    eventLog: []
  },
  {
    id: 'dummy-bk-2',
    bookingNumber: 'BK' + Date.now().toString().slice(-6) + '2',
    b2bClientId: 'dummy-corp-client',
    b2bEmployeeId: 'dummy-corp-emp',
    customerName: 'Corp Employee',
    customerPhone: '9876543211',
    customerEmail: 'employee@dummycorp.com',
    customerAddress: '123 Dummy St',
    cityId: 'demo-city',
    carCategoryId: 'demo-cat',
    tripType: 'airport_drop',
    pickupLocation: 'Dummy Corp HQ',
    dropLocation: 'Airport Terminal 2',
    pickupDate: new Date().toISOString().split('T')[0],
    pickupTime: '17:30',
    estimatedKm: 45,
    estimatedFare: 1500,
    actualKm: 0,
    actualFare: 0,
    extraCharges: 0,
    peakHourCharge: 0,
    nightCharge: 0,
    waitingCharge: 0,
    tollCharges: 0,
    parkingCharges: 0,
    miscCharges: 0,
    totalFare: 1500,
    gstAmount: 75,
    grandTotal: 1575,
    advancePaid: 0,
    promoDiscount: 0,
    status: 'confirmed',
    paymentStatus: 'pending',
    remarks: 'Dummy booking created by Corp Employee',
    createdAt: new Date().toISOString(),
    createdBy: 'Employee',
    eventLog: []
  }
]

interface AdminContextType {
  userType: UserType
  setUserType: (type: UserType) => void
  
  // Data
  drivers: Driver[]

  cars: Car[]
  carCategories: CarCategory[]
  cities: City[]
  b2cCustomers: B2CCustomer[]
  airports: Airport[]
  fareGroups: FareGroup[]
  b2bClients: B2BClient[]
  gstConfig: GSTConfig
  bookings: Booking[]
  walletTransactions: WalletTransaction[]
  dutySlips: DutySlip[]
  invoices: Invoice[]
  hubs: Hub[]
  promoCodes: PromoCode[]
  cityPolygons: CityPolygon[]
  carLocations: CarLocation[]
  b2bEmployees: B2BEmployee[]
  b2bApprovalRules: B2BApprovalRule[]
  communicationTemplates: CommunicationTemplate[]
  adminRoles: AdminRole[]
  adminUsers: AdminUser[]
  bookingTags: BookingTag[]
  cancellationPolicies: CancellationPolicy[]
  driverPayouts: DriverPayout[]
  supportTickets: SupportTicket[]
  
  // Actions - Drivers
  addDriver: (driver: Omit<Driver, 'id' | 'createdAt'>) => void
  updateDriver: (id: string, driver: Partial<Driver>) => void
  deleteDriver: (id: string) => void
  
  // Actions - Cars
  addCar: (car: Omit<Car, 'id' | 'createdAt'>) => void
  updateCar: (id: string, car: Partial<Car>) => void
  deleteCar: (id: string) => void
  
  // Actions - Driver-Car Mapping
  mapDriverToCar: (driverId: string, carId: string) => { success: boolean; error?: string }
  unmapDriverFromCar: (driverId: string) => void
  
  // Actions - Car Categories
  addCarCategory: (category: Omit<CarCategory, 'id'>) => void
  updateCarCategory: (id: string, category: Partial<CarCategory>) => void
  deleteCarCategory: (id: string) => void
  
  // Actions - Cities
  addCity: (city: Omit<City, 'id' | 'createdAt'>) => void
  updateCity: (id: string, city: Partial<City>) => void
  deleteCity: (id: string) => void

  // Actions - B2C Customers
  upsertB2CCustomer: (customer: Omit<B2CCustomer, 'id' | 'customerCode' | 'createdAt' | 'updatedAt'>) => Promise<B2CCustomer>
  updateB2CCustomer: (id: string, updates: Partial<B2CCustomer>) => Promise<void>
  addWalletTransaction: (transaction: Omit<WalletTransaction, 'id' | 'createdAt'>) => Promise<void>
  getB2CCustomer: (id: string) => B2CCustomer | undefined
  findB2CCustomer: (query: { name?: string; phone?: string; email?: string }) => B2CCustomer | undefined

  // Actions - Airports
  addAirport: (airport: Omit<Airport, 'id' | 'createdAt' | 'terminals'>) => void
  updateAirport: (id: string, airport: Partial<Omit<Airport, 'terminals'>>) => void
  deleteAirport: (id: string) => void
  addAirportTerminal: (airportId: string, terminal: Omit<AirportTerminal, 'id' | 'airportId' | 'createdAt'>) => void
  updateAirportTerminal: (airportId: string, terminalId: string, terminal: Partial<AirportTerminal>) => void
  deleteAirportTerminal: (airportId: string, terminalId: string) => void
  
  // Actions - Fare Groups
  addFareGroup: (fareGroup: Omit<FareGroup, 'id' | 'createdAt'>) => void
  updateFareGroup: (id: string, fareGroup: Partial<FareGroup>) => void
  deleteFareGroup: (id: string) => void
  
  // Actions - B2B Clients
  addB2BClient: (client: Omit<B2BClient, 'id' | 'createdAt'>) => void
  updateB2BClient: (id: string, client: Partial<B2BClient>) => void
  deleteB2BClient: (id: string) => void
  
  // Actions - B2B Entities
  addB2BEntity: (clientId: string, entity: Omit<B2BEntity, 'id' | 'createdAt' | 'b2bClientId'>) => void
  updateB2BEntity: (clientId: string, entityId: string, entity: Partial<B2BEntity>) => void
  deleteB2BEntity: (clientId: string, entityId: string) => void
  getB2BEntities: (clientId: string) => B2BEntity[]
  
  // Actions - GST Config
  updateGSTConfig: (config: Partial<GSTConfig>) => void
  
  // Actions - Bookings
  addBooking: (booking: Omit<Booking, 'id' | 'createdAt'>) => void
  updateBooking: (id: string, booking: Partial<Booking>) => void
  deleteBooking: (id: string) => void
  
  // Actions - Duty Slips
  addDutySlip: (dutySlip: Omit<DutySlip, 'id' | 'createdAt'>) => void
  updateDutySlip: (id: string, dutySlip: Partial<DutySlip>) => void
  
  // Actions - Invoices
  addInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt'>) => void
  updateInvoice: (id: string, invoice: Partial<Invoice>) => void
  
  // Actions - Hubs
  addHub: (hub: Omit<Hub, 'id' | 'createdAt'>) => void
  updateHub: (id: string, hub: Partial<Hub>) => void
  deleteHub: (id: string) => void
  
  // Actions - Promo Codes
  addPromoCode: (promo: Omit<PromoCode, 'id' | 'createdAt'>) => void
  updatePromoCode: (id: string, promo: Partial<PromoCode>) => void
  deletePromoCode: (id: string) => void
  
  // Actions - City Polygons
  addCityPolygon: (polygon: Omit<CityPolygon, 'id' | 'createdAt'>) => void
  updateCityPolygon: (id: string, polygon: Partial<CityPolygon>) => void
  deleteCityPolygon: (id: string) => void
  
  // Actions - Car Locations
  updateCarLocation: (carId: string, location: Omit<CarLocation, 'carId'>) => void
  
  // Actions - B2B Employees
  addB2BEmployee: (employee: Omit<B2BEmployee, 'id' | 'createdAt'>) => void
  updateB2BEmployee: (id: string, employee: Partial<B2BEmployee>) => void
  deleteB2BEmployee: (id: string) => void
  bulkAddB2BEmployees: (employees: Omit<B2BEmployee, 'id' | 'createdAt'>[]) => void
  
  // Actions - B2B Approval Rules
  addB2BApprovalRule: (rule: Omit<B2BApprovalRule, 'id' | 'createdAt'>) => void
  updateB2BApprovalRule: (id: string, rule: Partial<B2BApprovalRule>) => void
  deleteB2BApprovalRule: (id: string) => void
  getB2BApprovalRule: (id: string) => B2BApprovalRule | undefined
  
  // Actions - Communication Templates
  addCommunicationTemplate: (template: Omit<CommunicationTemplate, 'id' | 'createdAt'>) => void
  updateCommunicationTemplate: (id: string, template: Partial<CommunicationTemplate>) => void
  deleteCommunicationTemplate: (id: string) => void
  
  // Actions - Admin Roles
  addAdminRole: (role: Omit<AdminRole, 'id' | 'createdAt'>) => void
  updateAdminRole: (id: string, role: Partial<AdminRole>) => void
  deleteAdminRole: (id: string) => void
  
  // Actions - Admin Users
  addAdminUser: (user: Omit<AdminUser, 'id' | 'createdAt'>) => void
  updateAdminUser: (id: string, user: Partial<AdminUser>) => void
  deleteAdminUser: (id: string) => void
  
  // Actions - Booking Tags
  addBookingTag: (tag: Omit<BookingTag, 'id'>) => void
  updateBookingTag: (id: string, tag: Partial<BookingTag>) => void
  deleteBookingTag: (id: string) => void
  
  // Actions - Cancellation Policies
  addCancellationPolicy: (policy: Omit<CancellationPolicy, 'id' | 'createdAt'>) => void
  updateCancellationPolicy: (id: string, policy: Partial<CancellationPolicy>) => void
  deleteCancellationPolicy: (id: string) => void

  // Actions - Driver Payouts
  addDriverPayout: (payout: Omit<DriverPayout, 'id' | 'createdAt'>) => void
  updateDriverPayout: (id: string, payout: Partial<DriverPayout>) => void
  deleteDriverPayout: (id: string) => void
  
  // Actions - Support Tickets
  addSupportTicket: (ticket: Omit<SupportTicket, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt'>) => void
  updateSupportTicket: (id: string, ticket: Partial<SupportTicket>) => void
  deleteSupportTicket: (id: string) => void
  
  // Helpers
  getCarCategory: (id: string) => CarCategory | undefined
  getCity: (id: string) => City | undefined
  getAirport: (id: string) => Airport | undefined
  getAirportTerminal: (airportId: string, terminalId: string) => AirportTerminal | undefined
  getDriver: (id: string) => Driver | undefined
  getCar: (id: string) => Car | undefined
  getFareGroup: (id: string) => FareGroup | undefined
  getB2BClient: (id: string) => B2BClient | undefined
  getB2BEntity: (clientId: string, entityId: string) => B2BEntity | undefined
  getBooking: (id: string) => Booking | undefined
  getHub: (id: string) => Hub | undefined
  getPromoCode: (id: string) => PromoCode | undefined
  getPromoCodeByCode: (code: string) => PromoCode | undefined
  getB2BEmployee: (id: string) => B2BEmployee | undefined
  getAdminRole: (id: string) => AdminRole | undefined
  getBookingTag: (id: string) => BookingTag | undefined
  getCancellationPolicy: (id: string) => CancellationPolicy | undefined
  
  // Actions - Booking Edits Approval
  approveBookingEdit: (bookingId: string) => void
  rejectBookingEdit: (bookingId: string, reason: string) => void
  
  currentUser: any | null
  logout: () => Promise<void>
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

// Helper to convert undefined to null for Supabase
const sanitizeForSupabase = (obj: any) => {
  if (!obj) return obj;
  const sanitized = { ...obj };
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === undefined) {
      sanitized[key] = null;
    }
  });
  return sanitized;
}

// Universal Database Error Handler for all tables
const handleDbError = (error: any, contextMsg: string) => {
  console.error(contextMsg, error)
  const msg = error.message?.toLowerCase() || ''
  if (msg.includes('schema cache') || msg.includes('could not find')) {
    toast.error('Supabase Cache Error: Please go to Supabase -> Project Settings -> API -> Click "Reload Schema Cache"')
  } else {
    toast.error(`Database Error: ${error.message}`)
  }
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)

  const [drivers, setDrivers] = useState<Driver[]>(() => loadState('drivers', initialDrivers))
  const [cars, setCars] = useState<Car[]>(() => loadState('cars', initialCars))
  const [carCategories, setCarCategories] = useState<CarCategory[]>(() => loadState('carCategories', initialCarCategories))
  const [cities, setCities] = useState<City[]>(() => loadState('cities', initialCities))
  const [b2cCustomers, setB2CCustomers] = useState<B2CCustomer[]>(() => loadState('b2cCustomers', initialB2CCustomers))
  const [airports, setAirports] = useState<Airport[]>(() => loadState('airports', initialAirports))
  const [fareGroups, setFareGroups] = useState<FareGroup[]>(initialFareGroups)
  const [b2bClients, setB2BClients] = useState<B2BClient[]>(() => loadState('b2bClients', initialB2BClients))
  const [gstConfig, setGstConfig] = useState<GSTConfig>(initialGstConfig)
  const [bookings, setBookings] = useState<Booking[]>(() => loadState('bookings', initialBookings))
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>(() => loadState('walletTransactions', initialWalletTransactions))
  const [dutySlips, setDutySlips] = useState<DutySlip[]>(() => loadState('dutySlips', initialDutySlips))
  const [invoices, setInvoices] = useState<Invoice[]>(() => loadState('invoices', initialInvoices))
  const [hubs, setHubs] = useState<Hub[]>(() => loadState('hubs', initialHubs))
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>(() => loadState('promoCodes', initialPromoCodes))
  const [cityPolygons, setCityPolygons] = useState<CityPolygon[]>(() => loadState('cityPolygons', initialCityPolygons))
  const [carLocations, setCarLocations] = useState<CarLocation[]>(() => loadState('carLocations', initialCarLocations))
  const [b2bEmployees, setB2BEmployees] = useState<B2BEmployee[]>(() => loadState('b2bEmployees', initialB2BEmployees))
  const [b2bApprovalRules, setB2BApprovalRules] = useState<B2BApprovalRule[]>(() => loadState('b2bApprovalRules', initialB2BApprovalRules))
  const [communicationTemplates, setCommunicationTemplates] = useState<CommunicationTemplate[]>(() => loadState('communicationTemplates', initialCommunicationTemplates))
  const [adminRoles, setAdminRoles] = useState<AdminRole[]>(() => loadState('adminRoles', initialAdminRoles))
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(() => loadState('adminUsers', initialAdminUsers))
  const [bookingTags, setBookingTags] = useState<BookingTag[]>(() => loadState('bookingTags', initialBookingTags))
  const [cancellationPolicies, setCancellationPolicies] = useState<CancellationPolicy[]>(() => loadState('cancellationPolicies', initialCancellationPolicies))
  const [driverPayouts, setDriverPayouts] = useState<DriverPayout[]>(() => loadState('driverPayouts', initialDriverPayouts))
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(() => loadState('supportTickets', initialSupportTickets))

  // UserType state
  const loadUserType = (): UserType => {
    if (typeof window === 'undefined') return 'trev-admin' as UserType
    try {
      const saved = localStorage.getItem('userType')
      if (saved && ['trev-admin', 'corporate-admin', 'corporate-employee'].includes(saved)) {
        return saved as UserType
      }
    } catch {}
    return 'trev-admin' as UserType
  }

  const [userType, setUserTypeState] = useState<UserType>(loadUserType())

  const setUserType = useCallback((type: UserType) => {
    setUserTypeState(type)
    if (typeof window !== 'undefined') {
      localStorage.setItem('userType', type)
    }
  }, [])

  const generateCustomerCode = () => `B2C${Date.now().toString().slice(-6)}${Math.random().toString(36).substring(2, 5).toUpperCase()}`

  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  // Persist all state to localStorage
  // Clear old localStorage bookings to load new fields (one-time migration)
  useEffect(() => {
    const migrated = localStorage.getItem('bookings_migrated_v4')
    if (!migrated) {
      localStorage.removeItem('bookings')
      localStorage.setItem('bookings_migrated_v4', 'true')
      setBookings(initialBookings)
    }

    const catMigrated = localStorage.getItem('categories_cleared_v1')
    if (!catMigrated) {
      localStorage.removeItem('carCategories')
      localStorage.setItem('categories_cleared_v1', 'true')
      setCarCategories([])
    }

    const masterClear = localStorage.getItem('master_clear_v1')
    if (!masterClear) {
      const allKeys = Object.keys(localStorage)
      allKeys.forEach(key => {
        if (!key.includes('supabase') && key !== 'master_clear_v1') {
          localStorage.removeItem(key)
        }
      })
      localStorage.setItem('master_clear_v1', 'true')
      window.location.reload()
    }
  }, [])

  useEffect(() => { localStorage.setItem('bookings', JSON.stringify(bookings)) }, [bookings])
  useEffect(() => { localStorage.setItem('walletTransactions', JSON.stringify(walletTransactions)) }, [walletTransactions])
  useEffect(() => { localStorage.setItem('drivers', JSON.stringify(drivers)) }, [drivers])
  useEffect(() => { localStorage.setItem('cars', JSON.stringify(cars)) }, [cars])
  useEffect(() => { localStorage.setItem('carCategories', JSON.stringify(carCategories)) }, [carCategories])
  useEffect(() => { localStorage.setItem('cities', JSON.stringify(cities)) }, [cities])
  useEffect(() => { localStorage.setItem('airports', JSON.stringify(airports)) }, [airports])
  useEffect(() => { localStorage.setItem('gstConfig', JSON.stringify(gstConfig)) }, [gstConfig])
  useEffect(() => { localStorage.setItem('dutySlips', JSON.stringify(dutySlips)) }, [dutySlips])
  useEffect(() => { localStorage.setItem('invoices', JSON.stringify(invoices)) }, [invoices])
  useEffect(() => { localStorage.setItem('fareGroups', JSON.stringify(fareGroups)) }, [fareGroups])
  useEffect(() => { localStorage.setItem('promoCodes', JSON.stringify(promoCodes)) }, [promoCodes])
  useEffect(() => { localStorage.setItem('hubs', JSON.stringify(hubs)) }, [hubs])
  useEffect(() => { localStorage.setItem('cityPolygons', JSON.stringify(cityPolygons)) }, [cityPolygons])
  useEffect(() => { localStorage.setItem('b2bClients', JSON.stringify(b2bClients)) }, [b2bClients])
  useEffect(() => { localStorage.setItem('b2bEmployees', JSON.stringify(b2bEmployees)) }, [b2bEmployees])
  useEffect(() => { localStorage.setItem('b2bApprovalRules', JSON.stringify(b2bApprovalRules)) }, [b2bApprovalRules])
  useEffect(() => { localStorage.setItem('communicationTemplates', JSON.stringify(communicationTemplates)) }, [communicationTemplates])
  useEffect(() => { localStorage.setItem('adminRoles', JSON.stringify(adminRoles)) }, [adminRoles])
  useEffect(() => { localStorage.setItem('adminUsers', JSON.stringify(adminUsers)) }, [adminUsers])
  useEffect(() => { localStorage.setItem('bookingTags', JSON.stringify(bookingTags)) }, [bookingTags])
  useEffect(() => { localStorage.setItem('cancellationPolicies', JSON.stringify(cancellationPolicies)) }, [cancellationPolicies])
  useEffect(() => { localStorage.setItem('driverPayouts', JSON.stringify(driverPayouts)) }, [driverPayouts])
  useEffect(() => { localStorage.setItem('supportTickets', JSON.stringify(supportTickets)) }, [supportTickets])
  useEffect(() => { localStorage.setItem('b2cCustomers', JSON.stringify(b2cCustomers)) }, [b2cCustomers])

  // One-time testing seed for every sidebar module. This also upgrades browsers
  // that already have older empty localStorage arrays.
  useEffect(() => {
    const seedFlag = localStorage.getItem('dummy_sidebar_data_v1')
    if (seedFlag) return

    const mergeById = <T extends { id: string }>(current: T[], seed: T[]) => {
      const existingIds = new Set(current.map((item) => item.id))
      return [...current, ...seed.filter((item) => !existingIds.has(item.id))]
    }

    setCarCategories((prev) => mergeById(prev, initialCarCategories))
    setCities((prev) => mergeById(prev, initialCities))
    setAirports((prev) => mergeById(prev, initialAirports))
    setDrivers((prev) => mergeById(prev, initialDrivers))
    setCars((prev) => mergeById(prev, initialCars))
    setFareGroups((prev) => mergeById(prev, initialFareGroups))
    setHubs((prev) => mergeById(prev, initialHubs))
    setDriverPayouts((prev) => mergeById(prev, initialDriverPayouts))
    setB2CCustomers((prev) => mergeById(prev, initialB2CCustomers))
    setB2BClients((prev) => mergeById(prev, initialB2BClients))
    setB2BEmployees((prev) => mergeById(prev, initialB2BEmployees))
    setB2BApprovalRules((prev) => mergeById(prev, initialB2BApprovalRules))
    setBookings((prev) => mergeById(prev, initialBookings))
    setWalletTransactions((prev) => mergeById(prev, initialWalletTransactions))
    setDutySlips((prev) => mergeById(prev, initialDutySlips))
    setInvoices((prev) => mergeById(prev, initialInvoices))
    setPromoCodes((prev) => mergeById(prev, initialPromoCodes))
    setCityPolygons((prev) => mergeById(prev, initialCityPolygons))
    setCarLocations((prev) => {
      const existingCarIds = new Set(prev.map((item) => item.carId))
      return [...prev, ...initialCarLocations.filter((item) => !existingCarIds.has(item.carId))]
    })
    setCommunicationTemplates((prev) => mergeById(prev, initialCommunicationTemplates))
    setAdminRoles((prev) => mergeById(prev, initialAdminRoles))
    setAdminUsers((prev) => mergeById(prev, initialAdminUsers))
    setBookingTags((prev) => mergeById(prev, initialBookingTags))
    setCancellationPolicies((prev) => mergeById(prev, initialCancellationPolicies))
    setSupportTickets((prev) => mergeById(prev, initialSupportTickets))

    localStorage.setItem('dummy_sidebar_data_v1', 'true')
  }, [])

  // Inject Dummy Bookings
  useEffect(() => {
    const addedDummies = localStorage.getItem('dummy_b2b_bookings_v4')
    if (!addedDummies) {
      setB2BClients(prev => {
        if (!prev.some(c => c.id === 'dummy-corp-client')) return [...prev, dummyClient]
        return prev
      })
      setB2BEmployees(prev => {
        const newEmps = []
        if (!prev.some(e => e.id === 'dummy-corp-admin')) newEmps.push(dummyAdmin)
        if (!prev.some(e => e.id === 'dummy-corp-emp')) newEmps.push(dummyEmployee)
        return [...prev, ...newEmps]
      })
      setDrivers(prev => {
        if (!prev.some(d => d.id === 'live-drv-1')) {
          return [...prev, { id: 'live-drv-1', name: 'Raju Driver', phone: '9876543210', status: 'active', assignedCarId: 'live-car-1', email: 'raju@example.com', licenseNumber: 'MH0212345678', joiningDate: new Date().toISOString().split('T')[0], hubId: '', monthlySalary: 25000, password: '', createdAt: new Date().toISOString() }]
        }
        return prev
      })
      setCars(prev => {
        if (!prev.some(c => c.id === 'live-car-1')) {
          return [...prev, { id: 'live-car-1', registrationNumber: 'MH02AB1234', make: 'Toyota', model: 'Dzire', categoryId: '', status: 'available', assignedDriverId: 'live-drv-1', fuelType: 'CNG', year: 2021, hubId: '', createdAt: new Date().toISOString() }]
        }
        return prev
      })
      setCarLocations(prev => {
        if (!prev.some(l => l.carId === 'live-car-1')) {
          return [...prev, { carId: 'live-car-1', latitude: 19.0760, longitude: 72.8777, heading: 90, speed: 45, lastUpdated: new Date().toISOString() }]
        }
        return prev
      })
      setBookings(prev => {
        const newBks = []
        if (!prev.some(b => b.id === 'dummy-bk-1')) newBks.push(dummyBookings[0])
        if (!prev.some(b => b.id === 'dummy-bk-2')) newBks.push(dummyBookings[1])
        if (!prev.some(b => b.id === 'live-bk-1')) {
          newBks.push({
            id: 'live-bk-1', bookingNumber: 'BK-LIVE-' + Math.floor(1000 + Math.random() * 9000), customerName: 'Alice Live', customerPhone: '5550101',
            cityId: '', carCategoryId: '', tripType: 'city_ride', pickupLocation: 'Airport Terminal 1', dropLocation: 'Downtown Hotel',
            pickupDate: new Date().toISOString().split('T')[0], pickupTime: '10:00',
            status: 'dispatched', carId: 'live-car-1', driverId: 'live-drv-1', totalFare: 1500,
            estimatedKm: 20, estimatedFare: 1500, actualKm: 0, actualFare: 0, extraCharges: 0, peakHourCharge: 0, nightCharge: 0, waitingCharge: 0, tollCharges: 0, parkingCharges: 0, miscCharges: 0, gstAmount: 0, grandTotal: 1500, advancePaid: 0, promoDiscount: 0, paymentStatus: 'pending', createdBy: 'Admin',
            createdAt: new Date().toISOString(), eventLog: []
          })
        }
        if (!prev.some(b => b.id === 'live-bk-2')) {
          newBks.push({
            id: 'live-bk-2', bookingNumber: 'BK-LIVE-' + Math.floor(1000 + Math.random() * 9000), customerName: 'Bob Live', customerPhone: '5550202',
            cityId: '', carCategoryId: '', tripType: 'outstation', pickupLocation: 'South Station', dropLocation: 'Tech Park',
            pickupDate: new Date().toISOString().split('T')[0], pickupTime: '11:30',
            status: 'picked_up', carId: 'live-car-2', driverId: 'live-drv-2', totalFare: 2500,
            estimatedKm: 40, estimatedFare: 2500, actualKm: 0, actualFare: 0, extraCharges: 0, peakHourCharge: 0, nightCharge: 0, waitingCharge: 0, tollCharges: 0, parkingCharges: 0, miscCharges: 0, gstAmount: 0, grandTotal: 2500, advancePaid: 0, promoDiscount: 0, paymentStatus: 'pending', createdBy: 'Admin',
            createdAt: new Date().toISOString(), eventLog: []
          })
        }
        return [...prev, ...newBks]
      })
      
      // Also add a second driver/car for the second booking
      setDrivers(prev => {
        if (!prev.some(d => d.id === 'live-drv-2')) {
          return [...prev, { id: 'live-drv-2', name: 'Suresh Driver', phone: '9876543211', status: 'active', assignedCarId: 'live-car-2', email: 'suresh@example.com', licenseNumber: 'MH0212345679', joiningDate: new Date().toISOString().split('T')[0], hubId: '', monthlySalary: 25000, password: '', createdAt: new Date().toISOString() }]
        }
        return prev
      })
      setCars(prev => {
        if (!prev.some(c => c.id === 'live-car-2')) {
          return [...prev, { id: 'live-car-2', registrationNumber: 'MH02AB5678', make: 'Honda', model: 'Amaze', categoryId: '', status: 'available', assignedDriverId: 'live-drv-2', fuelType: 'CNG', year: 2022, hubId: '', createdAt: new Date().toISOString() }]
        }
        return prev
      })
      setCarLocations(prev => {
        if (!prev.some(l => l.carId === 'live-car-2')) {
          return [...prev, { carId: 'live-car-2', latitude: 19.0850, longitude: 72.8850, heading: 120, speed: 30, lastUpdated: new Date().toISOString() }]
        }
        return prev
      })

      localStorage.setItem('dummy_b2b_bookings_v4', 'true')
    }
  }, [])

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userType') {
        if (e.newValue) {
          const newType = e.newValue as UserType
          if (['trev-admin', 'corporate-admin', 'corporate-employee'].includes(newType)) {
            setUserTypeState(newType)
          }
        }
      }
      if (e.key === 'bookings') {
        if (e.newValue) {
          try {
            setBookings(JSON.parse(e.newValue))
          } catch (err) {
            console.error('Failed to parse bookings from storage event:', err)
          }
        }
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [setUserTypeState, setBookings])

  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
      if (mounted) {
        setCurrentUser(data.session?.user ?? null)
        // Skip redirect entirely for demo purposes
        if (!data.session && pathname !== '/login' && !pathname?.startsWith('/auth/')) {
          // router.push('/login')
        }
      }
    } catch (err) {
        console.error('Supabase Auth Error:', err)
        // if (mounted && pathname !== '/login' && !pathname?.startsWith('/auth/')) router.push('/login')
      } finally {
        if (mounted) setIsLoadingAuth(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        setCurrentUser(session?.user ?? null)
        setIsLoadingAuth(false)
        // Skip redirect entirely for demo purposes
        if (!session && pathname !== '/login' && !pathname?.startsWith('/auth/')) {
          // router.push('/login')
        } else if (session && (pathname === '/login' || pathname?.startsWith('/auth/'))) {
          // Redirect based on userType or email hint
          const type = loadUserType()
          const redirectPath = type === 'trev-admin' ? '/trev-admin/dashboard' : 
                              type === 'corporate-admin' ? '/corporate-admin/dashboard' : 
                              '/employee/dashboard'
          router.push(redirectPath)
        }
      }
    })

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [pathname, router])

  const logout = async () => {
    await supabase.auth.signOut()
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userType')
    }
    router.push('/login')
  }

  useEffect(() => {
    let cancelled = false
    const fetchBookings = async () => {
      const { data, error } = await supabase.from('bookings').select('*')
      if (cancelled) return
      if (error) {
        console.warn('Bookings table might not exist yet or failed to fetch:', error.message || error)
      } else if (data && data.length > 0) {
        // Merge Supabase data with local state instead of overwriting
        // so bookings added while the fetch was in-flight don't vanish
        setBookings(prev => {
          if (prev.length === 0) return data as Booking[]
          const existingIds = new Set(prev.map(b => b.id))
          const newOnes = (data as Booking[]).filter(b => !existingIds.has(b.id))
          return [...prev, ...newOnes]
        })
      }
    }
    // Only fetch from Supabase if localStorage is empty
    let savedCount = 0
    try {
      const saved = localStorage.getItem('bookings')
      if (saved) savedCount = JSON.parse(saved).length
    } catch { /* ignore */ }
    if (savedCount === 0) {
      fetchBookings()
    }
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    const fetchB2CCustomers = async () => {
      const { data, error } = await supabase.from('b2c_customers').select('*')
      if (cancelled) return
      if (error) {
        console.warn('B2C customers table might not exist yet or failed to fetch:', error.message || error)
      } else if (data && data.length > 0) {
        setB2CCustomers(prev => {
          if (prev.length === 0) return data as B2CCustomer[]
          const existingIds = new Set(prev.map(c => c.id))
          const newOnes = (data as B2CCustomer[]).filter(c => !existingIds.has(c.id))
          return [...prev, ...newOnes]
        })
      }
    }
    let savedCount = 0
    try { const saved = localStorage.getItem('b2cCustomers'); if (saved) savedCount = JSON.parse(saved).length } catch { /* ignore */ }
    if (savedCount === 0) fetchB2CCustomers()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    const fetchDriverPayouts = async () => {
      try {
        const { data, error } = await supabase.from('driver_payouts').select('*')
        if (cancelled) return
        if (error) {
          console.warn('Driver payouts table might not exist yet or failed to fetch:', error.message || error)
        } else if (data && data.length > 0) {
          setDriverPayouts(prev => {
            if (prev.length === 0) return data as DriverPayout[]
            const existingIds = new Set(prev.map(p => p.id))
            const newOnes = (data as DriverPayout[]).filter(p => !existingIds.has(p.id))
            return [...prev, ...newOnes]
          })
        }
      } catch (err) {
        console.error('Unexpected error fetching payouts:', err)
      }
    }

    fetchDriverPayouts()
    return () => { cancelled = true }
  }, [])
  
  useEffect(() => {
    let cancelled = false
    const fetchSupportTickets = async () => {
      try {
        const { data, error } = await supabase.from('support_tickets').select('*')
        if (cancelled) return
        if (error) {
          console.warn('Support tickets table might not exist yet or failed to fetch:', error.message || error)
        } else if (data && data.length > 0) {
          setSupportTickets(prev => {
            if (prev.length === 0) return data as SupportTicket[]
            const existingIds = new Set(prev.map(t => t.id))
            const newOnes = (data as SupportTicket[]).filter(t => !existingIds.has(t.id))
            return [...prev, ...newOnes]
          })
        }
      } catch (err) {}
    }
    fetchSupportTickets()
    return () => { cancelled = true }
  }, [])

  // Driver actions
  const addDriver = useCallback((driver: Omit<Driver, 'id' | 'createdAt'>) => {
    setDrivers(prev => [...prev, { ...driver, id: generateId(), createdAt: new Date().toISOString() }])
  }, [])
  
  const updateDriver = useCallback((id: string, driver: Partial<Driver>) => {
    setDrivers(prev => prev.map(d => d.id === id ? { ...d, ...driver } : d))
  }, [])
  
  const deleteDriver = useCallback((id: string) => {
    setDrivers(prev => prev.filter(d => d.id !== id))
  }, [])
  
  // Car actions
  const addCar = useCallback((car: Omit<Car, 'id' | 'createdAt'>) => {
    setCars(prev => [...prev, { ...car, id: generateId(), createdAt: new Date().toISOString() }])
  }, [])
  
  const updateCar = useCallback((id: string, car: Partial<Car>) => {
    setCars(prev => prev.map(c => c.id === id ? { ...c, ...car } : c))
  }, [])
  
  const deleteCar = useCallback((id: string) => {
    setCars(prev => prev.filter(c => c.id !== id))
  }, [])
  
  // Driver-Car Mapping actions
  const mapDriverToCar = useCallback((driverId: string, carId: string): { success: boolean; error?: string } => {
    const driver = drivers.find(d => d.id === driverId)
    const car = cars.find(c => c.id === carId)
    
    if (!driver || !car) {
      return { success: false, error: 'Driver or car not found' }
    }
    
    // Check if driver is already mapped to another car
    if (driver.assignedCarId && driver.assignedCarId !== carId) {
      const existingCar = cars.find(c => c.id === driver.assignedCarId)
      return { success: false, error: `Driver is already mapped to ${existingCar?.registrationNumber || 'another car'}. Please unmap first.` }
    }
    
    // Check if car is already mapped to another driver
    if (car.assignedDriverId && car.assignedDriverId !== driverId) {
      const existingDriver = drivers.find(d => d.id === car.assignedDriverId)
      return { success: false, error: `Car is already mapped to ${existingDriver?.name || 'another driver'}. Please unmap first.` }
    }
    
    // Perform the mapping
    setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, assignedCarId: carId } : d))
    setCars(prev => prev.map(c => c.id === carId ? { ...c, assignedDriverId: driverId } : c))
    
    return { success: true }
  }, [drivers, cars])
  
  const unmapDriverFromCar = useCallback((driverId: string) => {
    const driver = drivers.find(d => d.id === driverId)
    if (driver?.assignedCarId) {
      const carId = driver.assignedCarId
      setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, assignedCarId: undefined } : d))
      setCars(prev => prev.map(c => c.id === carId ? { ...c, assignedDriverId: undefined } : c))
    }
  }, [drivers])
  
  // Car Category actions
  const addCarCategory = useCallback((category: Omit<CarCategory, 'id'>) => {
    setCarCategories(prev => [...prev, { ...category, id: generateId() }])
  }, [])
  
  const updateCarCategory = useCallback((id: string, category: Partial<CarCategory>) => {
    setCarCategories(prev => prev.map(c => c.id === id ? { ...c, ...category } : c))
  }, [])
  
  const deleteCarCategory = useCallback((id: string) => {
    setCarCategories(prev => prev.filter(c => c.id !== id))
  }, [])
  
  // City actions
  const addCity = useCallback((city: Omit<City, 'id' | 'createdAt'>) => {
    setCities(prev => [...prev, { ...city, id: generateId(), createdAt: new Date().toISOString() }])
  }, [])
  
  const updateCity = useCallback((id: string, city: Partial<City>) => {
    setCities(prev => prev.map(c => c.id === id ? { ...c, ...city } : c))
  }, [])
  
  const deleteCity = useCallback((id: string) => {
    setCities(prev => prev.filter(c => c.id !== id))
  }, [])

  const findB2CCustomer = useCallback((query: { name?: string; phone?: string; email?: string }) => {
    const phone = query.phone?.trim().toLowerCase()
    const email = query.email?.trim().toLowerCase()
    const name = query.name?.trim().toLowerCase()

    return b2cCustomers.find(customer =>
      (phone && customer.phone.toLowerCase() === phone) ||
      (email && customer.email?.toLowerCase() === email) ||
      (name && customer.name.toLowerCase() === name)
    )
  }, [b2cCustomers])

const upsertB2CCustomer = useCallback(async (customer: Omit<B2CCustomer, 'id' | 'customerCode' | 'createdAt' | 'updatedAt'>) => {
    const existing =
      b2cCustomers.find(c => customer.phone && c.phone.toLowerCase() === customer.phone.toLowerCase()) ||
      b2cCustomers.find(c => customer.email && c.email?.toLowerCase() === customer.email.toLowerCase()) ||
      b2cCustomers.find(c => customer.name && c.name.toLowerCase() === customer.name.toLowerCase())

    const now = new Date().toISOString()
    const savedCustomer: B2CCustomer = existing
      ? {
          ...existing,
          ...customer,
          email: customer.email || existing.email,
          address: customer.address || existing.address,
          walletBalance: existing.walletBalance ?? 0,
          status: customer.status || existing.status || 'active',
          updatedAt: now,
        }
      : {
          ...customer,
          id: generateId(),
          customerCode: generateCustomerCode(),
          walletBalance: 0,
          status: customer.status || 'active',
          createdAt: now,
          updatedAt: now,
        }

    setB2CCustomers(prev =>
      existing
        ? prev.map(c => c.id === savedCustomer.id ? savedCustomer : c)
        : [...prev, savedCustomer]
    )

    const { error } = await supabase.from('b2c_customers').upsert(savedCustomer)
    if (error) {
      handleDbError(error, 'Error saving B2C customer to Supabase:')
    }

    return savedCustomer
  }, [b2cCustomers])

  const updateB2CCustomer = useCallback(async (id: string, updates: Partial<B2CCustomer>) => {
    const existing = b2cCustomers.find(c => c.id === id);
    if (!existing) return;
    
    const savedCustomer = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    setB2CCustomers(prev => prev.map(c => c.id === id ? savedCustomer : c));
    
    const { error } = await supabase.from('b2c_customers').update(savedCustomer).eq('id', id);
    if (error) {
      handleDbError(error, 'Error updating B2C customer in Supabase:');
    }
  }, [b2cCustomers]);

  const addWalletTransaction = useCallback(async (transaction: Omit<WalletTransaction, 'id' | 'createdAt'> & { referenceId?: string; referenceType?: string }) => {
    try {
      const { data, error } = await supabase.rpc('add_wallet_transaction', {
        p_customer_id: transaction.customerId,
        p_amount: transaction.amount,
        p_type: transaction.type,
        p_description: transaction.description,
        p_reference_id: transaction.referenceId,
        p_reference_type: transaction.referenceType
      });

      if (error) throw error;

      if (data.success) {
        // Refresh local state
        const { data: customer } = await supabase
          .from('b2c_customers')
          .select('id, walletBalance')
          .eq('id', transaction.customerId)
          .single();

        if (customer) {
          setB2CCustomers(prev => prev.map(c => 
            c.id === customer.id ? { ...c, walletBalance: customer.walletBalance! } : c
          ));
        }

        // Refresh transactions
        const { data: transactions } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('customer_id', transaction.customerId)
          .order('created_at', { ascending: false });

        if (transactions) {
          setWalletTransactions(prev => {
            const existingIds = new Set(prev.map(t => t.id));
            const newOnes = transactions.filter((t: any) => !existingIds.has(t.id));
            return [...prev.filter(t => t.customerId !== transaction.customerId), ...transactions] as WalletTransaction[];
          });
        }

        toast.success(`Wallet ${transaction.type === 'credit' ? 'credited' : 'debited'}: ₹${transaction.amount.toLocaleString()}`);
      }
    } catch (error: any) {
      handleDbError(error, 'Wallet transaction failed:');
    }
  }, []);

  // Airport actions
  const addAirport = useCallback((airport: Omit<Airport, 'id' | 'createdAt' | 'terminals'>) => {
    setAirports(prev => [...prev, { ...airport, id: generateId(), terminals: [], createdAt: new Date().toISOString() }])
  }, [])

  const updateAirport = useCallback((id: string, airport: Partial<Omit<Airport, 'terminals'>>) => {
    setAirports(prev => prev.map(a => a.id === id ? { ...a, ...airport } : a))
  }, [])

  const deleteAirport = useCallback((id: string) => {
    setAirports(prev => prev.filter(a => a.id !== id))
  }, [])

  const addAirportTerminal = useCallback((airportId: string, terminal: Omit<AirportTerminal, 'id' | 'airportId' | 'createdAt'>) => {
    setAirports(prev => prev.map(airport => {
      if (airport.id !== airportId) return airport
      return {
        ...airport,
        terminals: [
          ...airport.terminals,
          { ...terminal, id: generateId(), airportId, createdAt: new Date().toISOString() },
        ],
      }
    }))
  }, [])

  const updateAirportTerminal = useCallback((airportId: string, terminalId: string, terminal: Partial<AirportTerminal>) => {
    setAirports(prev => prev.map(airport => {
      if (airport.id !== airportId) return airport
      return {
        ...airport,
        terminals: airport.terminals.map(t => t.id === terminalId ? { ...t, ...terminal } : t),
      }
    }))
  }, [])

  const deleteAirportTerminal = useCallback((airportId: string, terminalId: string) => {
    setAirports(prev => prev.map(airport => {
      if (airport.id !== airportId) return airport
      return {
        ...airport,
        terminals: airport.terminals.filter(t => t.id !== terminalId),
      }
    }))
  }, [])
  
  // Fare Group actions
  const addFareGroup = useCallback((fareGroup: Omit<FareGroup, 'id' | 'createdAt'>) => {
    setFareGroups(prev => [...prev, { ...fareGroup, id: generateId(), createdAt: new Date().toISOString() }])
  }, [])
  
  const updateFareGroup = useCallback((id: string, fareGroup: Partial<FareGroup>) => {
    setFareGroups(prev => prev.map(fg => fg.id === id ? { ...fg, ...fareGroup } : fg))
  }, [])
  
  const deleteFareGroup = useCallback((id: string) => {
    setFareGroups(prev => prev.filter(fg => fg.id !== id))
  }, [])
  
  // B2B Client actions
  const addB2BClient = useCallback((client: Omit<B2BClient, 'id' | 'createdAt'>) => {
    setB2BClients(prev => [...prev, { ...client, id: generateId(), createdAt: new Date().toISOString() }])
  }, [])
  
  const updateB2BClient = useCallback((id: string, client: Partial<B2BClient>) => {
    setB2BClients(prev => prev.map(c => c.id === id ? { ...c, ...client } : c))
  }, [])
  
  const deleteB2BClient = useCallback((id: string) => {
    setB2BClients(prev => prev.filter(c => c.id !== id))
  }, [])
  
  // B2B Entity actions
  const addB2BEntity = useCallback((clientId: string, entity: Omit<B2BEntity, 'id' | 'createdAt' | 'b2bClientId'>) => {
    setB2BClients(prev => prev.map(client => {
      if (client.id === clientId) {
        const newEntity: B2BEntity = {
          ...entity,
          id: generateId(),
          b2bClientId: clientId,
          createdAt: new Date().toISOString()
        }
        return {
          ...client,
          entities: [...(client.entities || []), newEntity]
        }
      }
      return client
    }))
  }, [])
  
  const updateB2BEntity = useCallback((clientId: string, entityId: string, entity: Partial<B2BEntity>) => {
    setB2BClients(prev => prev.map(client => {
      if (client.id === clientId) {
        return {
          ...client,
          entities: (client.entities || []).map(e => e.id === entityId ? { ...e, ...entity } : e)
        }
      }
      return client
    }))
  }, [])
  
  const deleteB2BEntity = useCallback((clientId: string, entityId: string) => {
    setB2BClients(prev => prev.map(client => {
      if (client.id === clientId) {
        return {
          ...client,
          entities: (client.entities || []).filter(e => e.id !== entityId)
        }
      }
      return client
    }))
  }, [])
  
  const getB2BEntities = useCallback((clientId: string) => {
    const client = b2bClients.find(c => c.id === clientId)
    return client?.entities || []
  }, [b2bClients])
  
  // GST Config actions
  const updateGSTConfig = useCallback((config: Partial<GSTConfig>) => {
    setGstConfig(prev => ({ ...prev, ...config }))
  }, [])
  
  // Booking actions
  const addBooking = useCallback(async (booking: Omit<Booking, 'id' | 'createdAt' | 'eventLog'> & { eventLog: BookingEventLog[] }) => {
    const newBooking = { ...booking, id: generateId(), createdAt: new Date().toISOString() };
    setBookings(prev => [...prev, newBooking as Booking]);

    const payload = sanitizeForSupabase(newBooking);
    const { error } = await supabase.from('bookings').insert([payload]);
    if (error) {
      handleDbError(error, 'Error adding booking to Supabase:');
    }
  }, []);

  const updateBooking = useCallback(async (id: string, updates: Partial<Booking>) => {
    const isB2BUser = userType === 'corporate-admin' || userType === 'corporate-employee';
    const originalBooking = bookings.find(b => b.id === id);

    if (!originalBooking) {
      console.error(`updateBooking failed: booking with id ${id} not found.`);
      return;
    }

    const updateKeys = Object.keys(updates);
    const isContentEdit = updateKeys.some(k => !['status', 'eventLog', 'driverId', 'carId', 'tags', 'pendingEdits', 'originalStatus'].includes(k));

    // If a B2B user is editing a booking, put it into a pending state for approval.
    if (isB2BUser && isContentEdit && originalBooking.status !== 'pending_edit_approval') {
        const { eventLog, ...actualEdits } = updates;
        
        const editRequestEvent: BookingEventLog = {
            id: crypto.randomUUID(),
            event: 'edit_requested' as any,
            fromStatus: originalBooking.status,
            toStatus: 'pending_edit_approval',
            performedBy: currentUser?.email || 'B2B User',
            performedAt: new Date().toISOString(),
            notes: 'Booking edit submitted for approval'
        };
        const newEventLog = [...(originalBooking.eventLog || []), editRequestEvent];

        const updatedBookingWithPendingState = {
            ...originalBooking,
            pendingEdits: actualEdits, // Store the proposed changes
            originalStatus: originalBooking.status, // Save the status before this edit
            status: 'pending_edit_approval' as const, // Set a new status
            eventLog: newEventLog
        };

        const payload = {
            pendingEdits: actualEdits,
            originalStatus: originalBooking.status,
            status: 'pending_edit_approval',
            eventLog: newEventLog
        };
        
        const { error } = await supabase.from('bookings').update(sanitizeForSupabase(payload)).eq('id', id);

        if (error) {
            handleDbError(error, 'Error submitting booking edit for approval:');
        } else {
            setBookings(prev => prev.map(b => b.id === id ? updatedBookingWithPendingState as Booking : b));
            toast.info("Booking edit has been submitted for approval.");
        }
    } else {
        // For Trev Admins or for simple status changes, update directly.
        const payload = sanitizeForSupabase(updates)
        const { error } = await supabase.from('bookings').update(payload).eq('id', id)
        if (error) {
          handleDbError(error, 'Error updating booking in Supabase:')
        } else {
          setBookings(prev => prev.map(b => b.id === id ? { ...b, ...updates } as Booking : b))
        }
    }
  }, [userType, bookings])

  const approveBookingEdit = useCallback(async (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking || !booking.pendingEdits) return;

    const eventLogEntry: BookingEventLog = {
        id: crypto.randomUUID(),
        event: 'edit_approved' as any,
        fromStatus: 'pending_edit_approval',
        toStatus: booking.originalStatus || 'confirmed',
        performedBy: currentUser?.email || 'Admin',
        performedAt: new Date().toISOString(),
        notes: 'Booking edit approved'
    };

    const approvedUpdates: Partial<Booking> = {
        ...booking.pendingEdits,
        status: booking.originalStatus || 'confirmed',
        pendingEdits: undefined,
        originalStatus: undefined,
        eventLog: [...(booking.eventLog || []), eventLogEntry]
    };
    
    await updateBooking(bookingId, approvedUpdates);
    toast.success(`Booking ${booking.bookingNumber} edit approved.`);
  }, [bookings, updateBooking]);

  const rejectBookingEdit = useCallback(async (bookingId: string, reason: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking || !booking.pendingEdits) return;

    const rejectedUpdates: Partial<Booking> = {
        status: booking.originalStatus || 'confirmed',
        pendingEdits: undefined,
        originalStatus: undefined,
    };

    const eventLog: BookingEventLog = {
        id: crypto.randomUUID(),
        event: 'rejected' as any,
        fromStatus: 'pending_edit_approval',
        toStatus: booking.originalStatus || 'confirmed',
        performedBy: currentUser?.email || 'Admin',
        performedAt: new Date().toISOString(),
        notes: `Edit request rejected. Reason: ${reason}`
    };

    rejectedUpdates.eventLog = [...(booking.eventLog || []), eventLog];

    await updateBooking(bookingId, rejectedUpdates);
    toast.warning(`Booking ${booking.bookingNumber} edit rejected.`);
  }, [bookings, updateBooking, currentUser]);

  const deleteBooking = useCallback(async (id: string) => {
    setBookings(prev => prev.filter(b => b.id !== id))

    const { error } = await supabase.from('bookings').delete().eq('id', id)
    if (error) {
      handleDbError(error, 'Error deleting booking from Supabase:')
    }
  }, [])  
  // Duty Slip actions
  const addDutySlip = useCallback((dutySlip: Omit<DutySlip, 'id' | 'createdAt'>) => {
    setDutySlips(prev => [...prev, { ...dutySlip, id: generateId(), createdAt: new Date().toISOString() }])
  }, [])
  
  const updateDutySlip = useCallback((id: string, dutySlip: Partial<DutySlip>) => {
    setDutySlips(prev => prev.map(ds => ds.id === id ? { ...ds, ...dutySlip } : ds))
  }, [])
  
  // Invoice actions
  const addInvoice = useCallback((invoice: Omit<Invoice, 'id' | 'createdAt'>) => {
    setInvoices(prev => [...prev, { ...invoice, id: generateId(), createdAt: new Date().toISOString() }])
  }, [])
  
  const updateInvoice = useCallback((id: string, invoice: Partial<Invoice>) => {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, ...invoice } : inv))
  }, [])
  
  // Hub actions
  const addHub = useCallback((hub: Omit<Hub, 'id' | 'createdAt'>) => {
    setHubs(prev => [...prev, { ...hub, id: generateId(), createdAt: new Date().toISOString() }])
  }, [])
  
  const updateHub = useCallback((id: string, hub: Partial<Hub>) => {
    setHubs(prev => prev.map(h => h.id === id ? { ...h, ...hub } : h))
  }, [])
  
  const deleteHub = useCallback((id: string) => {
    setHubs(prev => prev.filter(h => h.id !== id))
  }, [])
  
  // Promo Code actions
  const addPromoCode = useCallback((promo: Omit<PromoCode, 'id' | 'createdAt'>) => {
    setPromoCodes(prev => [...prev, { ...promo, id: generateId(), createdAt: new Date().toISOString() }])
  }, [])
  
  const updatePromoCode = useCallback((id: string, promo: Partial<PromoCode>) => {
    setPromoCodes(prev => prev.map(p => p.id === id ? { ...p, ...promo } : p))
  }, [])
  
  const deletePromoCode = useCallback((id: string) => {
    setPromoCodes(prev => prev.filter(p => p.id !== id))
  }, [])
  
  // City Polygon actions
  const addCityPolygon = useCallback((polygon: Omit<CityPolygon, 'id' | 'createdAt'>) => {
    setCityPolygons(prev => [...prev, { ...polygon, id: generateId(), createdAt: new Date().toISOString() }])
  }, [])
  
  const updateCityPolygon = useCallback((id: string, polygon: Partial<CityPolygon>) => {
    setCityPolygons(prev => prev.map(p => p.id === id ? { ...p, ...polygon } : p))
  }, [])
  
  const deleteCityPolygon = useCallback((id: string) => {
    setCityPolygons(prev => prev.filter(p => p.id !== id))
  }, [])
  
  // Car Location actions
  const updateCarLocation = useCallback((carId: string, location: Omit<CarLocation, 'carId'>) => {
    setCarLocations(prev => {
      const existing = prev.findIndex(l => l.carId === carId)
      if (existing >= 0) {
        return prev.map(l => l.carId === carId ? { ...l, ...location, carId } : l)
      }
      return [...prev, { ...location, carId }]
    })
  }, [])
  
  // B2B Employee actions
  const addB2BEmployee = useCallback((employee: Omit<B2BEmployee, 'id' | 'createdAt'>) => {
    setB2BEmployees(prev => [...prev, { ...employee, id: generateId(), createdAt: new Date().toISOString() }])
  }, [])
  
  const updateB2BEmployee = useCallback((id: string, employee: Partial<B2BEmployee>) => {
    setB2BEmployees(prev => prev.map(e => e.id === id ? { ...e, ...employee } : e))
  }, [])
  
  const deleteB2BEmployee = useCallback((id: string) => {
    setB2BEmployees(prev => prev.filter(e => e.id !== id))
  }, [])
  
  const bulkAddB2BEmployees = useCallback((employees: Omit<B2BEmployee, 'id' | 'createdAt'>[]) => {
    const newEmployees = employees.map(e => ({ ...e, id: generateId(), createdAt: new Date().toISOString() }))
    setB2BEmployees(prev => [...prev, ...newEmployees])
  }, [])

  // B2B Approval Rule actions
  const addB2BApprovalRule = useCallback((rule: Omit<B2BApprovalRule, 'id' | 'createdAt'>) => {
    setB2BApprovalRules(prev => [...prev, { ...rule, id: generateId(), createdAt: new Date().toISOString() }])
  }, [])

  const updateB2BApprovalRule = useCallback((id: string, rule: Partial<B2BApprovalRule>) => {
    setB2BApprovalRules(prev => prev.map(r => r.id === id ? { ...r, ...rule } : r))
  }, [])

  const deleteB2BApprovalRule = useCallback((id: string) => {
    setB2BApprovalRules(prev => prev.filter(r => r.id !== id))
  }, [])
  
  // Communication Template actions
  const addCommunicationTemplate = useCallback((template: Omit<CommunicationTemplate, 'id' | 'createdAt'>) => {
    setCommunicationTemplates(prev => [...prev, { ...template, id: generateId(), createdAt: new Date().toISOString() }])
  }, [])
  
  const updateCommunicationTemplate = useCallback((id: string, template: Partial<CommunicationTemplate>) => {
    setCommunicationTemplates(prev => prev.map(t => t.id === id ? { ...t, ...template } : t))
  }, [])
  
  const deleteCommunicationTemplate = useCallback((id: string) => {
    setCommunicationTemplates(prev => prev.filter(t => t.id !== id))
  }, [])
  
  // Admin Role actions
  const addAdminRole = useCallback(async (role: Omit<AdminRole, 'id' | 'createdAt'>) => {
    const newRole = { ...role, id: generateId(), createdAt: new Date().toISOString() }
    setAdminRoles(prev => [...prev, newRole])

    const { createdAt, ...payloadData } = newRole
    const payload = sanitizeForSupabase(payloadData)
    const { error } = await supabase.from('admin_roles').insert([payload])
    if (error) {
      handleDbError(error, 'Error adding admin role:')
    }
  }, [])
  
  const updateAdminRole = useCallback(async (id: string, role: Partial<AdminRole>) => {
    setAdminRoles(prev => prev.map(r => r.id === id ? { ...r, ...role } : r))

    const payload = sanitizeForSupabase(role)
    const { error } = await supabase.from('admin_roles').update(payload).eq('id', id)
    if (error) {
      handleDbError(error, 'Error updating admin role:')
    }
  }, [])
  
  const deleteAdminRole = useCallback(async (id: string) => {
    setAdminRoles(prev => prev.filter(r => r.id !== id))

    const { error } = await supabase.from('admin_roles').delete().eq('id', id)
    if (error) {
      handleDbError(error, 'Error deleting admin role:')
    }
  }, [])
  
  // Admin User actions
  const addAdminUser = useCallback(async (user: Omit<AdminUser, 'id' | 'createdAt'>) => {
    const newUser = { ...user, id: generateId(), createdAt: new Date().toISOString() }
    setAdminUsers(prev => [...prev, newUser])
    
    try {
      // 1. Save to Supabase DB
      const { createdAt, ...payloadData } = newUser
      const payload = sanitizeForSupabase(payloadData)
      const { error: dbError } = await supabase.from('admin_users').insert([payload])
      if (dbError) {
        const msg = dbError.message?.toLowerCase() || ''
        if (msg.includes('schema cache') || msg.includes('could not find')) {
          throw new Error('Supabase Cache Error: Please go to Supabase -> Project Settings -> API -> Click "Reload Schema Cache"')
        }
        throw new Error(`Database Error: ${dbError.message}`)
      }

      // 2. Direct Server Action call for Auth Invite
      const res = await sendInviteEmail(user.email, user.name)
      if (!res.success) throw new Error(res.error || 'Failed to send invite')
      
      toast.success(`User added and invite email sent to ${user.email}!`)
    } catch (err: any) {
      console.error('Admin User creation error:', err)
      toast.error(err.message)
    }
  }, [])
  
  const updateAdminUser = useCallback(async (id: string, user: Partial<AdminUser>) => {
    setAdminUsers(prev => prev.map(u => u.id === id ? { ...u, ...user } : u))

    const payload = sanitizeForSupabase(user)
    const { error } = await supabase.from('admin_users').update(payload).eq('id', id)
    if (error) {
      handleDbError(error, 'Error updating admin user:')
    }
  }, [])
  
  const deleteAdminUser = useCallback(async (id: string) => {
    setAdminUsers(prev => prev.filter(u => u.id !== id))

    const { error } = await supabase.from('admin_users').delete().eq('id', id)
    if (error) {
      handleDbError(error, 'Error deleting admin user:')
    }
  }, [])
  
  // Booking Tag actions
  const addBookingTag = useCallback((tag: Omit<BookingTag, 'id'>) => {
    setBookingTags(prev => [...prev, { ...tag, id: generateId() }])
  }, [])
  
  const updateBookingTag = useCallback((id: string, tag: Partial<BookingTag>) => {
    setBookingTags(prev => prev.map(t => t.id === id ? { ...t, ...tag } : t))
  }, [])
  
  const deleteBookingTag = useCallback((id: string) => {
    setBookingTags(prev => prev.filter(t => t.id !== id))
  }, [])
  
  // Cancellation Policy actions
  const addCancellationPolicy = useCallback((policy: Omit<CancellationPolicy, 'id' | 'createdAt'>) => {
    setCancellationPolicies(prev => [...prev, { ...policy, id: generateId(), createdAt: new Date().toISOString() }])
  }, [])
  
  const updateCancellationPolicy = useCallback((id: string, policy: Partial<CancellationPolicy>) => {
    setCancellationPolicies(prev => prev.map(p => p.id === id ? { ...p, ...policy } : p))
  }, [])
  
  const deleteCancellationPolicy = useCallback((id: string) => {
    setCancellationPolicies(prev => prev.filter(p => p.id !== id))
  }, [])
  
  // Driver Payout actions
  const addDriverPayout = useCallback(async (payout: Omit<DriverPayout, 'id' | 'createdAt'>) => {
    const newPayout = { ...payout, id: generateId(), createdAt: new Date().toISOString() }
    setDriverPayouts(prev => [...prev, newPayout as DriverPayout])

    const payload = sanitizeForSupabase(newPayout)
    const { error } = await supabase.from('driver_payouts').insert([payload])
    if (error) {
      handleDbError(error, 'Error adding driver payout to Supabase:')
    }
  }, [])
  
  const updateDriverPayout = useCallback(async (id: string, payout: Partial<DriverPayout>) => {
    setDriverPayouts(prev => prev.map(p => p.id === id ? { ...p, ...payout } as DriverPayout : p))

    const payload = sanitizeForSupabase(payout)
    const { error } = await supabase.from('driver_payouts').update(payload).eq('id', id)
    if (error) {
      handleDbError(error, 'Error updating driver payout in Supabase:')
    }
  }, [])
  
  const deleteDriverPayout = useCallback(async (id: string) => {
    setDriverPayouts(prev => prev.filter(p => p.id !== id))

    const { error } = await supabase.from('driver_payouts').delete().eq('id', id)
    if (error) {
      handleDbError(error, 'Error deleting driver payout from Supabase:')
    }
  }, [])

  // Support Ticket actions
  const addSupportTicket = useCallback(async (ticket: Omit<SupportTicket, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt'>) => {
    const newTicket = { 
      ...ticket, 
      id: generateId(), 
      ticketNumber: `TK${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    setSupportTickets(prev => [...prev, newTicket as SupportTicket])

    const payload = sanitizeForSupabase(newTicket)
    const { error } = await supabase.from('support_tickets').insert([payload])
    if (error) handleDbError(error, 'Error adding support ticket to Supabase:')
  }, [])
  
  const updateSupportTicket = useCallback(async (id: string, ticket: Partial<SupportTicket>) => {
    const updated = { ...ticket, updatedAt: new Date().toISOString() }
    setSupportTickets(prev => prev.map(t => t.id === id ? { ...t, ...updated } as SupportTicket : t))

    const payload = sanitizeForSupabase(updated)
    const { error } = await supabase.from('support_tickets').update(payload).eq('id', id)
    if (error) handleDbError(error, 'Error updating support ticket in Supabase:')
  }, [])
  
  const deleteSupportTicket = useCallback(async (id: string) => {
    setSupportTickets(prev => prev.filter(t => t.id !== id))

    const { error } = await supabase.from('support_tickets').delete().eq('id', id)
    if (error) handleDbError(error, 'Error deleting support ticket from Supabase:')
  }, [])

  // Helper functions
  const getCarCategory = useCallback((id: string) => carCategories.find(c => c.id === id), [carCategories])
  const getCity = useCallback((id: string) => cities.find(c => c.id === id), [cities])
  const getB2CCustomer = useCallback((id: string) => b2cCustomers.find(c => c.id === id), [b2cCustomers])
  const getAirport = useCallback((id: string) => airports.find(a => a.id === id), [airports])
  const getAirportTerminal = useCallback((airportId: string, terminalId: string) => {
    const airport = airports.find(a => a.id === airportId)
    return airport?.terminals.find(t => t.id === terminalId)
  }, [airports])
  const getDriver = useCallback((id: string) => drivers.find(d => d.id === id), [drivers])
  const getCar = useCallback((id: string) => cars.find(c => c.id === id), [cars])
  const getFareGroup = useCallback((id: string) => fareGroups.find(fg => fg.id === id), [fareGroups])
  const getB2BClient = useCallback((id: string) => b2bClients.find(c => c.id === id), [b2bClients])
  const getB2BEntity = useCallback((clientId: string, entityId: string) => {
    const client = b2bClients.find(c => c.id === clientId)
    return client?.entities?.find(e => e.id === entityId)
  }, [b2bClients])
  const getBooking = useCallback((id: string) => bookings.find(b => b.id === id), [bookings])
  const getHub = useCallback((id: string) => hubs.find(h => h.id === id), [hubs])
  const getPromoCode = useCallback((id: string) => promoCodes.find(p => p.id === id), [promoCodes])
  const getPromoCodeByCode = useCallback((code: string) => promoCodes.find(p => p.code.toLowerCase() === code.toLowerCase()), [promoCodes])
  const getB2BEmployee = useCallback((id: string) => b2bEmployees.find(e => e.id === id), [b2bEmployees])
  const getB2BApprovalRule = useCallback((id: string) => b2bApprovalRules.find(r => r.id === id), [b2bApprovalRules])
  const getAdminRole = useCallback((id: string) => adminRoles.find(r => r.id === id), [adminRoles])
  const getBookingTag = useCallback((id: string) => bookingTags.find(t => t.id === id), [bookingTags])
  const getCancellationPolicy = useCallback((id: string) => cancellationPolicies.find(p => p.id === id), [cancellationPolicies])

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center space-y-4">
        <div className="h-12 w-12 border-4 border-[#39FF14] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[#39FF14] font-medium tracking-widest text-sm">LOADING TREV ADMIN...</p>
      </div>
    )
  }

  return (
    <AdminContext.Provider value={{
      drivers, cars, carCategories, cities, b2cCustomers, airports, fareGroups, b2bClients, gstConfig, bookings, walletTransactions, dutySlips, invoices,
      hubs, promoCodes, cityPolygons, carLocations, driverPayouts, supportTickets,
      b2bEmployees, b2bApprovalRules, communicationTemplates, adminRoles, adminUsers, bookingTags, cancellationPolicies,
      addDriver, updateDriver, deleteDriver,
      addCar, updateCar, deleteCar,
      mapDriverToCar, unmapDriverFromCar,
      addCarCategory, updateCarCategory, deleteCarCategory,
      addCity, updateCity, deleteCity,
      upsertB2CCustomer, updateB2CCustomer, addWalletTransaction,
      addAirport, updateAirport, deleteAirport, addAirportTerminal, updateAirportTerminal, deleteAirportTerminal,
      addFareGroup, updateFareGroup, deleteFareGroup,
      addB2BClient, updateB2BClient, deleteB2BClient,
      addB2BEntity, updateB2BEntity, deleteB2BEntity, getB2BEntities,
      updateGSTConfig,
      addBooking, updateBooking, deleteBooking,
      approveBookingEdit, rejectBookingEdit,
      addDutySlip, updateDutySlip,
      addInvoice, updateInvoice,
      addHub, updateHub, deleteHub,
      addPromoCode, updatePromoCode, deletePromoCode,
      addCityPolygon, updateCityPolygon, deleteCityPolygon,
      updateCarLocation,
      addB2BEmployee, updateB2BEmployee, deleteB2BEmployee, bulkAddB2BEmployees,
      addB2BApprovalRule, updateB2BApprovalRule, deleteB2BApprovalRule,
      addCommunicationTemplate, updateCommunicationTemplate, deleteCommunicationTemplate,
      addAdminRole, updateAdminRole, deleteAdminRole,
      addAdminUser, updateAdminUser, deleteAdminUser,
      addBookingTag, updateBookingTag, deleteBookingTag,
      addCancellationPolicy, updateCancellationPolicy, deleteCancellationPolicy,
      addDriverPayout, updateDriverPayout, deleteDriverPayout,
      addSupportTicket, updateSupportTicket, deleteSupportTicket,
      getCarCategory, getCity, getB2CCustomer, findB2CCustomer, getAirport, getAirportTerminal, getDriver, getCar, getFareGroup, getB2BClient, getB2BEntity, getBooking,
      getHub, getPromoCode, getPromoCodeByCode, getB2BEmployee, getB2BApprovalRule, getAdminRole, getBookingTag,
      getCancellationPolicy,
      userType, setUserType,
      currentUser, logout
    }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  const context = useContext(AdminContext)
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider')
  }
  return context
}

export function useUserType() {
  const context = useContext(AdminContext)
  if (!context) {
    throw new Error('useUserType must be used within an AdminProvider')
  }
  return {
    userType: context.userType,
    setUserType: context.setUserType
  }
}
