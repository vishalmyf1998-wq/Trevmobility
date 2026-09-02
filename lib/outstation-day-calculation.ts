import type {
  DriverAllowanceCalculationMethod,
  OutstationDayCalculationMethod,
  OutstationFareConfig,
} from '@/lib/types'

export type OutstationBillingInput = {
  pickupDate: string
  pickupTime?: string
  dropDate?: string
  dropTime?: string
  estimatedKm: number
  perKmRate: number
  minimumKmPerDay: number
  driverAllowanceAmount: number
  driverAllowanceMethod: DriverAllowanceCalculationMethod
  dayCalculationMethod: OutstationDayCalculationMethod
  graceEndTime?: string
  extraHourCharge?: number
}

export type OutstationDayCalculationResult = {
  chargeableDays: number
  extraHours: number
  overnightHalts: number
}

export type OutstationBillingResult = OutstationDayCalculationResult & {
  minimumChargeableKm: number
  billableKm: number
  distanceFare: number
  driverAllowance: number
  extraHourAmount: number
  totalFare: number
}

type DayCalculationStrategy = (pickupAt: Date, dropAt: Date, input: OutstationBillingInput) => OutstationDayCalculationResult

const MS_PER_DAY = 24 * 60 * 60 * 1000
const MS_PER_HOUR = 60 * 60 * 1000

const parseLocalDateTime = (date: string, time?: string) => {
  const safeTime = time || '00:00'
  return new Date(`${date}T${safeTime}`)
}

const startOfLocalDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

const calendarDayDiff = (from: Date, to: Date) => {
  const fromDay = startOfLocalDay(from).getTime()
  const toDay = startOfLocalDay(to).getTime()
  return Math.max(0, Math.round((toDay - fromDay) / MS_PER_DAY))
}

const timeToMinutes = (time?: string, fallback = '04:00') => {
  const [hours = '0', minutes = '0'] = (time || fallback).split(':')
  return (parseInt(hours, 10) || 0) * 60 + (parseInt(minutes, 10) || 0)
}

const minutesSinceMidnight = (date: Date) => date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60

const baseResult = (chargeableDays: number, extraHours: number, pickupAt: Date, dropAt: Date): OutstationDayCalculationResult => ({
  chargeableDays: Math.max(1, chargeableDays),
  extraHours: Math.max(0, extraHours),
  overnightHalts: calendarDayDiff(pickupAt, dropAt),
})

const strategies: Record<OutstationDayCalculationMethod, DayCalculationStrategy> = {
  calendar_day_night_grace: (pickupAt, dropAt, input) => {
    const dayDiff = calendarDayDiff(pickupAt, dropAt)
    if (dayDiff === 0) return baseResult(1, 0, pickupAt, dropAt)

    const graceMinutes = timeToMinutes(input.graceEndTime)
    const dropMinutes = minutesSinceMidnight(dropAt)

    if (dropMinutes <= graceMinutes) {
      return baseResult(dayDiff, dropMinutes / 60, pickupAt, dropAt)
    }

    return baseResult(dayDiff + 1, 0, pickupAt, dropAt)
  },
  rolling_24_hours: (pickupAt, dropAt) => {
    const durationMs = Math.max(0, dropAt.getTime() - pickupAt.getTime())
    return baseResult(Math.ceil(durationMs / MS_PER_DAY) || 1, 0, pickupAt, dropAt)
  },
  strict_calendar_day: (pickupAt, dropAt) => baseResult(calendarDayDiff(pickupAt, dropAt) + 1, 0, pickupAt, dropAt),
}

export function calculateOutstationDays(input: OutstationBillingInput): OutstationDayCalculationResult {
  const pickupAt = parseLocalDateTime(input.pickupDate, input.pickupTime)
  const dropAt = parseLocalDateTime(input.dropDate || input.pickupDate, input.dropTime || input.pickupTime)

  if (Number.isNaN(pickupAt.getTime()) || Number.isNaN(dropAt.getTime()) || dropAt < pickupAt) {
    return baseResult(1, 0, new Date(), new Date())
  }

  const strategy = strategies[input.dayCalculationMethod] || strategies.calendar_day_night_grace
  return strategy(pickupAt, dropAt, input)
}

export function calculateDriverAllowance(
  amount: number,
  method: DriverAllowanceCalculationMethod,
  days: OutstationDayCalculationResult,
) {
  if (method === 'fixed_per_trip') return amount
  if (method === 'per_overnight_halt') return amount * days.overnightHalts
  return amount * days.chargeableDays
}

export function calculateOutstationBilling(input: OutstationBillingInput): OutstationBillingResult {
  const days = calculateOutstationDays(input)
  const minimumChargeableKm = days.chargeableDays * input.minimumKmPerDay
  const billableKm = Math.max(input.estimatedKm, minimumChargeableKm)
  const distanceFare = billableKm * input.perKmRate
  const driverAllowance = calculateDriverAllowance(input.driverAllowanceAmount, input.driverAllowanceMethod, days)
  const extraHourAmount = days.extraHours * (input.extraHourCharge || 0)
  const totalFare = distanceFare + driverAllowance + extraHourAmount

  return {
    ...days,
    minimumChargeableKm,
    billableKm,
    distanceFare,
    driverAllowance,
    extraHourAmount,
    totalFare,
  }
}

export function buildOutstationBillingInput(
  fare: Partial<OutstationFareConfig>,
  input: Pick<OutstationBillingInput, 'pickupDate' | 'pickupTime' | 'dropDate' | 'dropTime' | 'estimatedKm' | 'perKmRate'>,
): OutstationBillingInput {
  return {
    ...input,
    minimumKmPerDay: fare.minimumKmPerDay || 250,
    driverAllowanceAmount: fare.driverAllowancePerDay || 0,
    driverAllowanceMethod: fare.driverAllowanceCalculationMethod || 'per_chargeable_day',
    dayCalculationMethod: fare.dayCalculationMethod || 'calendar_day_night_grace',
    graceEndTime: fare.graceEndTime || '04:00',
    extraHourCharge: fare.extraHourCharge || 0,
  }
}
