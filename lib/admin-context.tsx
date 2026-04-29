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
  B2BEmployee, CommunicationTemplate, AdminRole, AdminUser, BookingTag, CancellationPolicy
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
const initialCarCategories: CarCategory[] = [
]

const initialCities: City[] = [
]

const initialAirports: Airport[] = []

const initialDrivers: Driver[] = []

const initialCars: Car[] = []

const initialFareGroups: FareGroup[] = []

const initialHubs: Hub[] = []

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

const initialDriverPayouts: DriverPayout[] = []

const initialB2CCustomers: B2CCustomer[] = []

const initialB2BClients: B2BClient[] = []

const initialB2BEmployees: B2BEmployee[] = []

const initialBookings: Booking[] = []

const initialDutySlips: DutySlip[] = []

const initialInvoices: Invoice[] = []

const initialPromoCodes: PromoCode[] = []

const initialCityPolygons: CityPolygon[] = []

const initialCarLocations: CarLocation[] = []

const initialCommunicationTemplates: CommunicationTemplate[] = []

const initialAdminUsers: AdminUser[] = [
  { id: 'e5555555-5555-4555-e555-555555555555', name: 'Trev Admin', email: 'vishal@trevcabs.com', roleId: 'a1111111-1111-4111-a111-111111111111', status: 'active', lastLoginAt: new Date().toISOString(), createdAt: new Date().toISOString() }
]

const initialCancellationPolicies: CancellationPolicy[] = []

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

interface AdminContextType {
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
  dutySlips: DutySlip[]
  invoices: Invoice[]
  hubs: Hub[]
  promoCodes: PromoCode[]
  cityPolygons: CityPolygon[]
  carLocations: CarLocation[]
  b2bEmployees: B2BEmployee[]
  communicationTemplates: CommunicationTemplate[]
  adminRoles: AdminRole[]
  adminUsers: AdminUser[]
  bookingTags: BookingTag[]
  cancellationPolicies: CancellationPolicy[]
  driverPayouts: DriverPayout[]
  
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

  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers)
  const [cars, setCars] = useState<Car[]>(initialCars)
  const [carCategories, setCarCategories] = useState<CarCategory[]>(initialCarCategories)
  const [cities, setCities] = useState<City[]>(initialCities)
  const [b2cCustomers, setB2CCustomers] = useState<B2CCustomer[]>(() => loadState('b2cCustomers', initialB2CCustomers))
  const [airports, setAirports] = useState<Airport[]>(initialAirports)
  const [fareGroups, setFareGroups] = useState<FareGroup[]>(initialFareGroups)
  const [b2bClients, setB2BClients] = useState<B2BClient[]>(() => loadState('b2bClients', initialB2BClients))
  const [gstConfig, setGstConfig] = useState<GSTConfig>(initialGstConfig)
  const [bookings, setBookings] = useState<Booking[]>(() => loadState('bookings', initialBookings))
  const [dutySlips, setDutySlips] = useState<DutySlip[]>(() => loadState('dutySlips', initialDutySlips))
  const [invoices, setInvoices] = useState<Invoice[]>(() => loadState('invoices', initialInvoices))
  const [hubs, setHubs] = useState<Hub[]>(() => loadState('hubs', initialHubs))
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>(() => loadState('promoCodes', initialPromoCodes))
  const [cityPolygons, setCityPolygons] = useState<CityPolygon[]>(() => loadState('cityPolygons', initialCityPolygons))
  const [carLocations, setCarLocations] = useState<CarLocation[]>(() => loadState('carLocations', initialCarLocations))
  const [b2bEmployees, setB2BEmployees] = useState<B2BEmployee[]>(() => loadState('b2bEmployees', initialB2BEmployees))
  const [communicationTemplates, setCommunicationTemplates] = useState<CommunicationTemplate[]>(() => loadState('communicationTemplates', initialCommunicationTemplates))
  const [adminRoles, setAdminRoles] = useState<AdminRole[]>(() => loadState('adminRoles', initialAdminRoles))
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(() => loadState('adminUsers', initialAdminUsers))
  const [bookingTags, setBookingTags] = useState<BookingTag[]>(() => loadState('bookingTags', initialBookingTags))
  const [cancellationPolicies, setCancellationPolicies] = useState<CancellationPolicy[]>(() => loadState('cancellationPolicies', initialCancellationPolicies))
  const [driverPayouts, setDriverPayouts] = useState<DriverPayout[]>(() => loadState('driverPayouts', initialDriverPayouts))

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
  useEffect(() => { localStorage.setItem('communicationTemplates', JSON.stringify(communicationTemplates)) }, [communicationTemplates])
  useEffect(() => { localStorage.setItem('adminRoles', JSON.stringify(adminRoles)) }, [adminRoles])
  useEffect(() => { localStorage.setItem('adminUsers', JSON.stringify(adminUsers)) }, [adminUsers])
  useEffect(() => { localStorage.setItem('bookingTags', JSON.stringify(bookingTags)) }, [bookingTags])
  useEffect(() => { localStorage.setItem('cancellationPolicies', JSON.stringify(cancellationPolicies)) }, [cancellationPolicies])
  useEffect(() => { localStorage.setItem('driverPayouts', JSON.stringify(driverPayouts)) }, [driverPayouts])
  useEffect(() => { localStorage.setItem('b2cCustomers', JSON.stringify(b2cCustomers)) }, [b2cCustomers])

  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        if (mounted) {
          setCurrentUser(data.session?.user ?? null)
          if (!data.session && pathname !== '/login') {
            router.push('/login')
          }
        }
      } catch (err) {
        console.error('Supabase Auth Error:', err)
        if (mounted && pathname !== '/login') router.push('/login')
      } finally {
        if (mounted) setIsLoadingAuth(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        setCurrentUser(session?.user ?? null)
        setIsLoadingAuth(false)
        if (!session && pathname !== '/login') {
          router.push('/login')
        } else if (session && pathname === '/login') {
          router.push('/')
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
    router.push('/login')
  }

  useEffect(() => {
    let cancelled = false
    const fetchBookings = async () => {
      const { data, error } = await supabase.from('bookings').select('*')
      if (cancelled) return
      if (error) {
        console.error('Error fetching bookings from Supabase:', error)
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
        console.error('Error fetching B2C customers from Supabase:', error)
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
          console.error('Error fetching driver payouts from Supabase:', error)
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
          updatedAt: now,
        }
      : {
          ...customer,
          id: generateId(),
          customerCode: generateCustomerCode(),
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
  const addBooking = useCallback(async (booking: Omit<Booking, 'id' | 'createdAt'>) => {
    const newBooking = { ...booking, id: generateId(), createdAt: new Date().toISOString() }
    setBookings(prev => [...prev, newBooking as Booking])

    const payload = sanitizeForSupabase(newBooking)
    const { error } = await supabase.from('bookings').insert([payload])
    if (error) {
      handleDbError(error, 'Error adding booking to Supabase:')
    }
  }, [])

  const updateBooking = useCallback(async (id: string, booking: Partial<Booking>) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, ...booking } as Booking : b))

    const payload = sanitizeForSupabase(booking)
    const { error } = await supabase.from('bookings').update(payload).eq('id', id)
    if (error) {
      handleDbError(error, 'Error updating booking in Supabase:')
    }
  }, [])

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
      drivers, cars, carCategories, cities, b2cCustomers, airports, fareGroups, b2bClients, gstConfig, bookings, dutySlips, invoices,
      hubs, promoCodes, cityPolygons, carLocations, driverPayouts,
      b2bEmployees, communicationTemplates, adminRoles, adminUsers, bookingTags, cancellationPolicies,
      addDriver, updateDriver, deleteDriver,
      addCar, updateCar, deleteCar,
      mapDriverToCar, unmapDriverFromCar,
      addCarCategory, updateCarCategory, deleteCarCategory,
      addCity, updateCity, deleteCity,
      upsertB2CCustomer,
      addAirport, updateAirport, deleteAirport, addAirportTerminal, updateAirportTerminal, deleteAirportTerminal,
      addFareGroup, updateFareGroup, deleteFareGroup,
      addB2BClient, updateB2BClient, deleteB2BClient,
      addB2BEntity, updateB2BEntity, deleteB2BEntity, getB2BEntities,
      updateGSTConfig,
      addBooking, updateBooking, deleteBooking,
      addDutySlip, updateDutySlip,
      addInvoice, updateInvoice,
      addHub, updateHub, deleteHub,
      addPromoCode, updatePromoCode, deletePromoCode,
      addCityPolygon, updateCityPolygon, deleteCityPolygon,
      updateCarLocation,
      addB2BEmployee, updateB2BEmployee, deleteB2BEmployee, bulkAddB2BEmployees,
      addCommunicationTemplate, updateCommunicationTemplate, deleteCommunicationTemplate,
      addAdminRole, updateAdminRole, deleteAdminRole,
      addAdminUser, updateAdminUser, deleteAdminUser,
      addBookingTag, updateBookingTag, deleteBookingTag,
      addCancellationPolicy, updateCancellationPolicy, deleteCancellationPolicy,
      addDriverPayout, updateDriverPayout, deleteDriverPayout,
      getCarCategory, getCity, getB2CCustomer, findB2CCustomer, getAirport, getAirportTerminal, getDriver, getCar, getFareGroup, getB2BClient, getB2BEntity, getBooking,
      getHub, getPromoCode, getPromoCodeByCode, getB2BEmployee, getAdminRole, getBookingTag, getCancellationPolicy,
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
