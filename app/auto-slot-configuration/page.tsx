// @ts-nocheck
'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useAdmin } from '@/lib/admin-context'
import { Booking, Car, ChargeType } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CalendarClock, CheckCircle2, Clock3, MapPin, Plus, RefreshCw, Settings2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

type AutoSlotRule = {
  id: string
  name: string
  cityId: string
  carCategoryId: string
  hubId: string
  enabled: boolean
  openBeforeMinutes: number
  bufferMinutes: number
  slotDurationMinutes: number
  maxSlotsPerCar: number
  isOutstationRule?: boolean
}

type AutoSlot = {
  id: string
  ruleId: string
  carId: string
  cityId: string
  hubId?: string
  carCategoryId: string
  areaLabel: string
  opensAt: string
  closesAt: string
  source: 'available_now' | 'upcoming_free' | 'outstation_return'
  status: 'open' | 'queued' | 'expired'
  generatedAt: string
  bookingId?: string
  isOutstationReturn?: boolean
  returnFromCity?: string
  returnDiscount?: {
    enabled: boolean
    type: ChargeType
    value: number
    maxDiscount?: number
  }
}

type FleetSignal = {
  car: Car
  areaLabel: string
  freeAt: Date
  source: AutoSlot['source']
  activeBooking?: Booking
  isOutstationReturn?: boolean
  returnFromCity?: string
}

const RULES_KEY = 'autoSlotRules'
const SLOTS_KEY = 'autoOpenedSlots'
const ALL_VALUE = '__all__'

const toDateTimeLocalValue = (date: Date) => {
  const pad = (value: number) => value.toString().padStart(2, '0')

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + `T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const formatDateTime = (value: string | Date) =>
  new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

const getTripDurationMinutes = (booking?: Booking) => {
  if (!booking) return 0

  if (booking.tripType === 'rental') return 8 * 60
  if (booking.tripType === 'outstation') return 24 * 60
  if (booking.tripType === 'airport_pickup' || booking.tripType === 'airport_drop') return 2 * 60

  const kmDuration = Math.max(60, (booking.estimatedKm || 12) * 4)
  return Math.min(4 * 60, kmDuration)
}

const parsePickupDate = (booking: Booking) => {
  const pickupDate = booking.pickupDate || new Date().toISOString().slice(0, 10)
  const pickupTime = booking.pickupTime || '00:00'
  const date = new Date(`${pickupDate}T${pickupTime}`)

  return Number.isNaN(date.getTime()) ? new Date() : date
}

const getSlotStatus = (opensAt: Date, closesAt: Date, now: Date): AutoSlot['status'] => {
  if (closesAt < now) return 'expired'
  if (opensAt <= now) return 'open'
  return 'queued'
}

const getStatusClass = (status: AutoSlot['status']) => {
  switch (status) {
    case 'open':
      return 'border-emerald-200 bg-emerald-500/10 text-emerald-700'
    case 'queued':
      return 'border-amber-200 bg-amber-500/10 text-amber-700'
    case 'expired':
      return 'border-muted bg-muted text-muted-foreground'
    default:
      return 'border-muted bg-muted text-muted-foreground'
  }
}

export default function AutoSlotConfigurationPage() {
  const {
    bookings,
    cars,
    carCategories,
    cities,
    dutySlips,
    hubs,
    fareGroups,
    getCarCategory,
    getCity,
    getHub,
  } = useAdmin()

  const [rules, setRules] = useState<AutoSlotRule[]>([])
  const [slots, setSlots] = useState<AutoSlot[]>([])
  const [editingRule, setEditingRule] = useState<AutoSlotRule | null>(null)
  const [formData, setFormData] = useState<Omit<AutoSlotRule, 'id'>>({
    name: '',
    cityId: '',
    carCategoryId: ALL_VALUE,
    hubId: ALL_VALUE,
    enabled: true,
    openBeforeMinutes: 60,
    bufferMinutes: 20,
    slotDurationMinutes: 60,
    maxSlotsPerCar: 2,
    isOutstationRule: false,
  })
  const [manualFreeAt, setManualFreeAt] = useState(toDateTimeLocalValue(new Date(Date.now() + 45 * 60 * 1000)))

  useEffect(() => {
    try {
      const savedRules = localStorage.getItem(RULES_KEY)
      const savedSlots = localStorage.getItem(SLOTS_KEY)

      if (savedRules) setRules(JSON.parse(savedRules))
      if (savedSlots) setSlots(JSON.parse(savedSlots))
    } catch {
      setRules([])
      setSlots([])
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(RULES_KEY, JSON.stringify(rules))
  }, [rules])

  useEffect(() => {
    localStorage.setItem(SLOTS_KEY, JSON.stringify(slots))
  }, [slots])

  const activeRules = useMemo(() => rules.filter((rule) => rule.enabled), [rules])
  const activeBookings = useMemo(
    () => bookings.filter((booking) => ['assigned', 'dispatched', 'arrived', 'picked_up'].includes(booking.status)),
    [bookings]
  )

  const fleetSignals = useMemo<FleetSignal[]>(() => {
    const now = new Date()

    return cars
      .filter((car) => car.status !== 'maintenance' && car.status !== 'inactive')
      .map((car) => {
        const activeBooking = activeBookings.find((booking) => booking.carId === car.id)
        const activeDutySlip = activeBooking
          ? dutySlips.find((slip) => slip.bookingId === activeBooking.id && slip.status === 'active')
          : undefined
        const hub = car.hubId ? getHub(car.hubId) : undefined
        const city = hub?.cityId ? getCity(hub.cityId) : undefined

        if (!activeBooking || car.status === 'available') {
          return {
            car,
            areaLabel: hub?.name || city?.name || 'Current area',
            freeAt: now,
            source: 'available_now',
          }
        }

        const tripStart = activeDutySlip?.startTime
          ? new Date(activeDutySlip.startTime)
          : parsePickupDate(activeBooking)
        const freeAt = new Date(tripStart.getTime() + getTripDurationMinutes(activeBooking) * 60 * 1000)

        const isOutstationReturn = activeBooking.tripType === 'outstation' && ['one_way', 'route_wise'].includes(activeBooking.outstationType)

        return {
          car,
          areaLabel: activeBooking.dropLocation || hub?.name || city?.name || 'Trip end area',
          freeAt,
          source: isOutstationReturn ? 'outstation_return' : 'upcoming_free',
          activeBooking,
          isOutstationReturn,
          returnFromCity: isOutstationReturn ? (activeBooking.dropLocation || 'Destination') : undefined
        }
      })
  }, [activeBookings, cars, dutySlips, getCity, getHub])

  const proposedSlots = useMemo(() => {
    const now = new Date()
    const candidates: AutoSlot[] = []

    fleetSignals.forEach((signal) => {
      if (signal.isOutstationReturn && signal.activeBooking) {
        // Handle outstation returns using Fare Groups configuration
        const booking = signal.activeBooking;
        let applicableFareConfig = null;
        for (const fg of fareGroups) {
           const fare = fg.outstationFares.find(f => 
             f.cityId === booking.cityId && 
             f.carCategoryId === booking.carCategoryId && 
             f.outstationType === booking.outstationType &&
             f.autoSlotReturn?.enabled
           );
           if (fare) {
             applicableFareConfig = fare;
             break;
           }
        }

        if (applicableFareConfig && applicableFareConfig.autoSlotReturn?.enabled) {
          const bufferMinutes = applicableFareConfig.autoSlotReturn.bufferMinutes;
          // For outstation returns, slot duration and openBefore are fixed or inherited from generic logic. 
          // We'll use 60 mins slot and 120 mins openBefore for outstation returns by default if not specified.
          const slotDurationMinutes = 60;
          const openBeforeMinutes = 120;
          
          const openWindowStart = new Date(signal.freeAt.getTime() - openBeforeMinutes * 60 * 1000)
          const bufferedStart = new Date(signal.freeAt.getTime() + bufferMinutes * 60 * 1000)
          const openStart = bufferedStart < now ? now : bufferedStart

          if (openWindowStart > now) {
            candidates.push({
              id: `outstation-return:${signal.car.id}:${openStart.toISOString()}`,
              ruleId: 'fare-config-return',
              carId: signal.car.id,
              cityId: booking.cityId,
              hubId: signal.car.hubId,
              carCategoryId: signal.car.categoryId,
              areaLabel: signal.areaLabel,
              opensAt: openStart.toISOString(),
              closesAt: new Date(openStart.getTime() + slotDurationMinutes * 60 * 1000).toISOString(),
              source: signal.source,
              status: 'queued',
              generatedAt: now.toISOString(),
              bookingId: signal.activeBooking?.id,
              isOutstationReturn: signal.isOutstationReturn,
              returnFromCity: signal.returnFromCity,
              returnDiscount: applicableFareConfig.autoSlotReturn?.discountEnabled ? {
                enabled: true,
                type: applicableFareConfig.autoSlotReturn.discountType || 'percentage',
                value: applicableFareConfig.autoSlotReturn.discountValue || 0,
                maxDiscount: applicableFareConfig.autoSlotReturn.maxDiscount || 0,
              } : undefined,
            })
          } else {
            const closesAt = new Date(openStart.getTime() + slotDurationMinutes * 60 * 1000);
            candidates.push({
              id: `outstation-return:${signal.car.id}:${openStart.toISOString()}`,
              ruleId: 'fare-config-return',
              carId: signal.car.id,
              cityId: booking.cityId,
              hubId: signal.car.hubId,
              carCategoryId: signal.car.categoryId,
              areaLabel: signal.areaLabel,
              opensAt: openStart.toISOString(),
              closesAt: closesAt.toISOString(),
              source: signal.source,
              status: getSlotStatus(openStart, closesAt, now),
              generatedAt: now.toISOString(),
              bookingId: signal.activeBooking?.id,
              isOutstationReturn: signal.isOutstationReturn,
              returnFromCity: signal.returnFromCity,
              returnDiscount: applicableFareConfig.autoSlotReturn?.discountEnabled ? {
                enabled: true,
                type: applicableFareConfig.autoSlotReturn.discountType || 'percentage',
                value: applicableFareConfig.autoSlotReturn.discountValue || 0,
                maxDiscount: applicableFareConfig.autoSlotReturn.maxDiscount || 0,
              } : undefined,
            })
          }
        }
        return; // Skip processing outstation returns with standard rules
      }

      // Handle standard rules
      activeRules.forEach((rule) => {
        if (rule.cityId && signal.car.hubId) {
          const hub = getHub(signal.car.hubId)
          if (hub?.cityId !== rule.cityId) return
        }

        if (rule.carCategoryId !== ALL_VALUE && signal.car.categoryId !== rule.carCategoryId) return
        if (rule.hubId !== ALL_VALUE && signal.car.hubId !== rule.hubId) return

        const openWindowStart = new Date(signal.freeAt.getTime() - rule.openBeforeMinutes * 60 * 1000)
        const bufferedStart = new Date(signal.freeAt.getTime() + rule.bufferMinutes * 60 * 1000)
        const openStart = signal.source === 'available_now' || bufferedStart < now ? now : bufferedStart

        if (signal.source === 'upcoming_free' && openWindowStart > now) {
          candidates.push({
            id: `${rule.id}:${signal.car.id}:${openStart.toISOString()}`,
            ruleId: rule.id,
            carId: signal.car.id,
            cityId: rule.cityId,
            hubId: signal.car.hubId,
            carCategoryId: signal.car.categoryId,
            areaLabel: signal.areaLabel,
            opensAt: openStart.toISOString(),
            closesAt: new Date(openStart.getTime() + rule.slotDurationMinutes * 60 * 1000).toISOString(),
            source: signal.source,
            status: 'queued',
            generatedAt: now.toISOString(),
            bookingId: signal.activeBooking?.id,
          })
          return
        }

        for (let index = 0; index < rule.maxSlotsPerCar; index += 1) {
          const opensAt = new Date(openStart.getTime() + index * rule.slotDurationMinutes * 60 * 1000)
          const closesAt = new Date(opensAt.getTime() + rule.slotDurationMinutes * 60 * 1000)

          candidates.push({
            id: `${rule.id}:${signal.car.id}:${opensAt.toISOString()}`,
            ruleId: rule.id,
            carId: signal.car.id,
            cityId: rule.cityId,
            hubId: signal.car.hubId,
            carCategoryId: signal.car.categoryId,
            areaLabel: signal.areaLabel,
            opensAt: opensAt.toISOString(),
            closesAt: closesAt.toISOString(),
            source: signal.source,
            status: getSlotStatus(opensAt, closesAt, now),
            generatedAt: now.toISOString(),
            bookingId: signal.activeBooking?.id,
          })
        }
      })
    })

    return candidates
  }, [activeRules, fleetSignals, getHub, fareGroups])

  const openSlots = slots.filter((slot) => slot.status === 'open')
  const queuedSlots = slots.filter((slot) => slot.status === 'queued')
  const expiredSlots = slots.filter((slot) => slot.status === 'expired')
  const recentSlots = slots.slice(0, 8)
  const availableCars = fleetSignals.filter((signal) => signal.source === 'available_now').length
  const freeingSoon = fleetSignals.filter((signal) => signal.source === 'upcoming_free').length
  const outstationReturns = fleetSignals.filter((signal) => signal.source === 'outstation_return').length
  const nextOpenSlot = queuedSlots
    .slice()
    .sort((first, second) => new Date(first.opensAt).getTime() - new Date(second.opensAt).getTime())[0]

  const resetRuleForm = () => {
    setEditingRule(null)
    setFormData({
      name: '',
      cityId: cities[0]?.id || '',
      carCategoryId: ALL_VALUE,
      hubId: ALL_VALUE,
      enabled: true,
      openBeforeMinutes: 60,
      bufferMinutes: 20,
      slotDurationMinutes: 60,
      maxSlotsPerCar: 2,
      isOutstationRule: false,
    })
  }

  const editRule = (rule?: AutoSlotRule) => {
    if (rule) {
      setEditingRule(rule)
      setFormData({
        name: rule.name,
        cityId: rule.cityId,
        carCategoryId: rule.carCategoryId,
        hubId: rule.hubId,
        enabled: rule.enabled,
        openBeforeMinutes: rule.openBeforeMinutes,
        bufferMinutes: rule.bufferMinutes,
        slotDurationMinutes: rule.slotDurationMinutes,
        maxSlotsPerCar: rule.maxSlotsPerCar,
        isOutstationRule: rule.isOutstationRule || false,
      })
      return
    }

    resetRuleForm()
  }

  const handleSubmitRule = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!formData.name.trim() || !formData.cityId) {
      toast.error('Rule name and city are required')
      return
    }

    if (editingRule) {
      setRules((current) =>
        current.map((rule) =>
          rule.id === editingRule.id ? { ...rule, ...formData, name: formData.name.trim() } : rule
        )
      )
      toast.success('Auto slot rule updated')
    } else {
      setRules((current) => [
        {
          id: `slot-rule-${Date.now()}`,
          ...formData,
          name: formData.name.trim(),
        },
        ...current,
      ])
      toast.success('Auto slot rule created')
    }

    setEditingRule(null)
    resetRuleForm()
  }

  const handleToggleRule = (ruleId: string, enabled: boolean) => {
    setRules((current) => current.map((rule) => (rule.id === ruleId ? { ...rule, enabled } : rule)))
  }

  const handleGenerateSlots = () => {
    if (activeRules.length === 0) {
      toast.error('Create or enable at least one auto slot rule first')
      return
    }

    const existingIds = new Set(slots.map((slot) => slot.id))
    const freshSlots = proposedSlots.filter((slot) => !existingIds.has(slot.id))

    if (freshSlots.length === 0) {
      toast.info('No new slots to open right now')
      return
    }

    setSlots((current) => [...freshSlots, ...current].slice(0, 200))
    toast.success(`${freshSlots.filter((slot) => slot.status === 'open').length} slots opened, ${freshSlots.filter((slot) => slot.status === 'queued').length} queued`)
  }

  const handleManualOpen = () => {
    const rule = activeRules[0]
    const car = cars.find((item) => item.status !== 'maintenance' && item.status !== 'inactive')

    if (!rule || !car) {
      toast.error('Need at least one active rule and one usable car')
      return
    }

    const opensAt = new Date(manualFreeAt)
    if (Number.isNaN(opensAt.getTime())) {
      toast.error('Please select a valid free time')
      return
    }

    const closesAt = new Date(opensAt.getTime() + rule.slotDurationMinutes * 60 * 1000)
    const slot: AutoSlot = {
      id: `manual:${rule.id}:${car.id}:${opensAt.toISOString()}`,
      ruleId: rule.id,
      carId: car.id,
      cityId: rule.cityId,
      hubId: car.hubId,
      carCategoryId: car.categoryId,
      areaLabel: getHub(car.hubId || '')?.name || getCity(rule.cityId)?.name || 'Manual area',
      opensAt: opensAt.toISOString(),
      closesAt: closesAt.toISOString(),
      source: 'upcoming_free',
      status: getSlotStatus(opensAt, closesAt, new Date()),
      generatedAt: new Date().toISOString(),
    }

    setSlots((current) => [slot, ...current.filter((item) => item.id !== slot.id)])
    toast.success('Manual availability slot opened')
  }

  const handleClearExpired = () => {
    setSlots((current) => current.filter((slot) => slot.status !== 'expired'))
    toast.success('Expired slots cleared')
  }

  const getSourceLabel = (slot: AutoSlot) => {
    if (slot.isOutstationReturn) return 'Outstation return'
    if (slot.source === 'available_now') return 'Available now'
    if (slot.source === 'upcoming_free') return 'Freeing soon'
    return 'Manual'
  }

  const getReturnDiscountLabel = (slot: AutoSlot) => {
    if (!slot.returnDiscount?.enabled || !slot.returnDiscount.value) return null
    const value = slot.returnDiscount.type === 'flat'
      ? `Rs. ${slot.returnDiscount.value}`
      : `${slot.returnDiscount.value}%`
    const cap = slot.returnDiscount.maxDiscount ? ` up to Rs. ${slot.returnDiscount.maxDiscount}` : ''
    return `${value} return discount${cap}`
  }

  return (
    <div className="flex flex-col gap-5 pl-16 sm:pl-0">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Auto Slots</h1>
          <p className="text-sm text-muted-foreground">Simple slot opening for available cars, soon-free cars, and return trips.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleGenerateSlots}>
            <Sparkles className="mr-2 h-4 w-4" />
            Run Now
          </Button>
          <Button variant="ghost" onClick={handleClearExpired}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Clear Expired
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Open slots', value: openSlots.length, note: `${queuedSlots.length} queued`, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Active rules', value: activeRules.length, note: `${rules.length} total`, icon: Settings2, color: 'text-blue-600' },
          { label: 'Cars ready', value: availableCars, note: `${freeingSoon} freeing soon`, icon: CalendarClock, color: 'text-slate-600' },
          { label: 'Return trips', value: outstationReturns, note: `${expiredSlots.length} expired`, icon: MapPin, color: 'text-indigo-600' },
        ].map((item) => {
          const Icon = item.icon
          return (
            <div key={item.label} className="rounded-lg border bg-background p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{item.label}</span>
                <Icon className={`h-4 w-4 ${item.color}`} />
              </div>
              <div className="mt-2 text-3xl font-semibold">{item.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{item.note}</div>
            </div>
          )
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Rule Setup</CardTitle>
                <CardDescription>{editingRule ? `Editing ${editingRule.name}` : 'Create one rule and run slots from it.'}</CardDescription>
              </div>
              {editingRule ? (
                <Button type="button" variant="outline" size="sm" onClick={resetRuleForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Rule
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitRule} className="space-y-5">
              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>Rule name</FieldLabel>
                  <Input
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    placeholder="Mumbai Sedan Slots"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>City</FieldLabel>
                  <Select value={formData.cityId || undefined} onValueChange={(value) => setFormData({ ...formData, cityId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.filter((city) => city.isActive).map((city) => (
                        <SelectItem key={city.id} value={city.id}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>

              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>Car category</FieldLabel>
                  <Select value={formData.carCategoryId} onValueChange={(value) => setFormData({ ...formData, carCategoryId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>All categories</SelectItem>
                      {carCategories.filter((category) => category.isActive).map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Hub / area</FieldLabel>
                  <Select value={formData.hubId} onValueChange={(value) => setFormData({ ...formData, hubId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select hub" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>All hubs</SelectItem>
                      {hubs.filter((hub) => !formData.cityId || hub.cityId === formData.cityId).map((hub) => (
                        <SelectItem key={hub.id} value={hub.id}>
                          {hub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>

              <FieldGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Field>
                  <FieldLabel>Open before</FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    value={formData.openBeforeMinutes}
                    onChange={(event) => setFormData({ ...formData, openBeforeMinutes: Number(event.target.value) || 0 })}
                  />
                </Field>
                <Field>
                  <FieldLabel>Buffer min</FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    value={formData.bufferMinutes}
                    onChange={(event) => setFormData({ ...formData, bufferMinutes: Number(event.target.value) || 0 })}
                  />
                </Field>
                <Field>
                  <FieldLabel>Slot min</FieldLabel>
                  <Input
                    type="number"
                    min={15}
                    value={formData.slotDurationMinutes}
                    onChange={(event) => setFormData({ ...formData, slotDurationMinutes: Number(event.target.value) || 60 })}
                  />
                </Field>
                <Field>
                  <FieldLabel>Slots / car</FieldLabel>
                  <Input
                    type="number"
                    min={1}
                    max={6}
                    value={formData.maxSlotsPerCar}
                    onChange={(event) => setFormData({ ...formData, maxSlotsPerCar: Number(event.target.value) || 1 })}
                  />
                </Field>
              </FieldGroup>

              <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-medium">Rule status</div>
                  <div className="text-xs text-muted-foreground">{formData.enabled ? 'Active rules are used in Run Now.' : 'Off rules are saved but skipped.'}</div>
                </div>
                <Switch checked={formData.enabled} onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })} />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="submit">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {editingRule ? 'Update Rule' : 'Save Rule'}
                </Button>
                <Button type="button" variant="outline" onClick={resetRuleForm}>
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Run Panel</CardTitle>
              <CardDescription>Generate availability from current fleet signals.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full" onClick={handleGenerateSlots}>
                <Sparkles className="mr-2 h-4 w-4" />
                Run Auto Slots
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">New candidates</div>
                  <div className="mt-1 text-2xl font-semibold">{proposedSlots.length}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Next slot</div>
                  <div className="mt-1 text-sm font-medium">{nextOpenSlot ? formatDateTime(nextOpenSlot.opensAt) : 'None'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manual Slot</CardTitle>
              <CardDescription>Open one slot from the first active rule.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field>
                <FieldLabel>Car free at</FieldLabel>
                <Input type="datetime-local" value={manualFreeAt} onChange={(event) => setManualFreeAt(event.target.value)} />
              </Field>
              <Button className="w-full" variant="outline" onClick={handleManualOpen}>
                <Clock3 className="mr-2 h-4 w-4" />
                Open Manual Slot
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Saved Rules</CardTitle>
            <CardDescription>{rules.length} rules configured</CardDescription>
          </CardHeader>
          <CardContent>
            {rules.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No rules saved.
              </div>
            ) : (
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div key={rule.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{rule.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {getCity(rule.cityId)?.name || 'Any city'} - {rule.hubId === ALL_VALUE ? 'All hubs' : getHub(rule.hubId)?.name} - {rule.carCategoryId === ALL_VALUE ? 'All categories' : getCarCategory(rule.carCategoryId)?.name}
                        </div>
                      </div>
                      <Badge variant="outline" className={rule.enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-muted bg-muted text-muted-foreground'}>
                        {rule.enabled ? 'On' : 'Off'}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="text-xs text-muted-foreground">
                        {rule.bufferMinutes} min buffer - {rule.maxSlotsPerCar} / car
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => editRule(rule)}>
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest Slots</CardTitle>
            <CardDescription>Recent generated availability</CardDescription>
          </CardHeader>
          <CardContent>
            {recentSlots.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No slots generated.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {recentSlots.map((slot) => {
                  const car = cars.find((item) => item.id === slot.carId)
                  return (
                    <div key={slot.id} className="rounded-lg border bg-background p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">{formatDateTime(slot.opensAt)}</div>
                          <div className="text-xs text-muted-foreground">to {formatDateTime(slot.closesAt)}</div>
                        </div>
                        <Badge variant="outline" className={getStatusClass(slot.status)}>
                          {slot.status}
                        </Badge>
                      </div>
                      <div className="mt-3 grid gap-1 text-sm">
                        <div>{car?.registrationNumber || slot.carId}</div>
                        <div className="text-muted-foreground">{slot.isOutstationReturn ? slot.returnFromCity : slot.areaLabel}</div>
                        <div className="text-muted-foreground">{getCarCategory(slot.carCategoryId)?.name || slot.carCategoryId || 'Category'}</div>
                      </div>
                      <div className="mt-3 text-xs text-muted-foreground">{getSourceLabel(slot)}</div>
                      {getReturnDiscountLabel(slot) ? (
                        <div className="mt-2 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                          {getReturnDiscountLabel(slot)}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
