// @ts-nocheck
'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useAdmin } from '@/lib/admin-context'
import { Booking, Car } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  source: 'available_now' | 'upcoming_free'
  status: 'open' | 'queued' | 'expired'
  generatedAt: string
  bookingId?: string
}

type FleetSignal = {
  car: Car
  areaLabel: string
  freeAt: Date
  source: AutoSlot['source']
  activeBooking?: Booking
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
    getCarCategory,
    getCity,
    getHub,
  } = useAdmin()

  const [rules, setRules] = useState<AutoSlotRule[]>([])
  const [slots, setSlots] = useState<AutoSlot[]>([])
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false)
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

        return {
          car,
          areaLabel: activeBooking.dropLocation || hub?.name || city?.name || 'Trip end area',
          freeAt,
          source: 'upcoming_free',
          activeBooking,
        }
      })
  }, [activeBookings, cars, dutySlips, getCity, getHub])

  const proposedSlots = useMemo(() => {
    const now = new Date()
    const candidates: AutoSlot[] = []

    activeRules.forEach((rule) => {
      fleetSignals.forEach((signal) => {
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
  }, [activeRules, fleetSignals, getHub])

  const openSlots = slots.filter((slot) => slot.status === 'open')
  const queuedSlots = slots.filter((slot) => slot.status === 'queued')
  const availableCars = fleetSignals.filter((signal) => signal.source === 'available_now').length
  const freeingSoon = fleetSignals.filter((signal) => signal.source === 'upcoming_free').length

  const openRuleDialog = (rule?: AutoSlotRule) => {
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
      })
    } else {
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
      })
    }

    setIsRuleDialogOpen(true)
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

    setIsRuleDialogOpen(false)
    setEditingRule(null)
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Auto Slot Configuration</h1>
          <p className="text-muted-foreground">Open booking slots automatically when cars are free or about to be free in an area</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleClearExpired}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Clear Expired
          </Button>
          <Button variant="outline" onClick={() => openRuleDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Rule
          </Button>
          <Button onClick={handleGenerateSlots}>
            <Sparkles className="mr-2 h-4 w-4" />
            Run Auto Slots
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Slots</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openSlots.length}</div>
            <p className="text-xs text-muted-foreground">ready for booking</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queued Slots</CardTitle>
            <Clock3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queuedSlots.length}</div>
            <p className="text-xs text-muted-foreground">waiting for open window</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cars Available</CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableCars}</div>
            <p className="text-xs text-muted-foreground">can open now</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Freeing Soon</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{freeingSoon}</div>
            <p className="text-xs text-muted-foreground">active rides tracked</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Auto Rules</CardTitle>
                <CardDescription>City, category, hub, buffer, and slot window rules</CardDescription>
              </div>
              <Badge variant="outline">{activeRules.length} active</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Timing</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No auto slot rules yet. Add a rule to start opening availability slots.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell>
                          <div className="font-medium">{rule.name}</div>
                          <div className="text-xs text-muted-foreground">{rule.maxSlotsPerCar} slot/car</div>
                        </TableCell>
                        <TableCell>
                          <div>{getCity(rule.cityId)?.name || 'Any city'}</div>
                          <div className="text-xs text-muted-foreground">{rule.hubId === ALL_VALUE ? 'All hubs' : getHub(rule.hubId)?.name}</div>
                        </TableCell>
                        <TableCell>{rule.carCategoryId === ALL_VALUE ? 'All categories' : getCarCategory(rule.carCategoryId)?.name}</TableCell>
                        <TableCell>
                          <div className="text-sm">{rule.openBeforeMinutes} min before free</div>
                          <div className="text-xs text-muted-foreground">{rule.bufferMinutes} min buffer, {rule.slotDurationMinutes} min slot</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch checked={rule.enabled} onCheckedChange={(checked) => handleToggleRule(rule.id, checked)} />
                            <span className="text-sm">{rule.enabled ? 'Enabled' : 'Disabled'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openRuleDialog(rule)}>
                            <Settings2 className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manual Availability Push</CardTitle>
            <CardDescription>Use this when dispatch gets a real-time call that a car will be free soon</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field>
              <FieldLabel>Car free at</FieldLabel>
              <Input type="datetime-local" value={manualFreeAt} onChange={(event) => setManualFreeAt(event.target.value)} />
            </Field>
            <Button className="w-full" onClick={handleManualOpen}>
              <Sparkles className="mr-2 h-4 w-4" />
              Open Slot From First Active Rule
            </Button>
            <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
              Auto run uses live cars and active bookings. Manual push is for operations team override when a driver confirms early availability.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Opened Slots</CardTitle>
          <CardDescription>Slots generated from current fleet availability and upcoming trip completion</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Slot</TableHead>
                  <TableHead>Car</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slots.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Run auto slots to generate availability.
                    </TableCell>
                  </TableRow>
                ) : (
                  slots.map((slot) => {
                    const car = cars.find((item) => item.id === slot.carId)
                    return (
                      <TableRow key={slot.id}>
                        <TableCell>
                          <div className="font-medium">{formatDateTime(slot.opensAt)} - {formatDateTime(slot.closesAt)}</div>
                          <div className="text-xs text-muted-foreground">Generated {formatDateTime(slot.generatedAt)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-sm">{car?.registrationNumber || slot.carId}</div>
                          <div className="text-xs text-muted-foreground">{car ? `${car.make} ${car.model}` : 'Car removed'}</div>
                        </TableCell>
                        <TableCell>{slot.areaLabel}</TableCell>
                        <TableCell>{getCarCategory(slot.carCategoryId)?.name || slot.carCategoryId || 'Category'}</TableCell>
                        <TableCell>{slot.source === 'available_now' ? 'Available now' : 'Upcoming free'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusClass(slot.status)}>
                            {slot.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Auto Slot Rule' : 'Add Auto Slot Rule'}</DialogTitle>
            <DialogDescription>
              Configure when slots should open based on car area, category, and expected free time.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitRule}>
            <div className="grid gap-4 py-4">
              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>Rule Name</FieldLabel>
                  <Input
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    placeholder="e.g., Mumbai Sedan Airport Slots"
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
                  <FieldLabel>Car Category</FieldLabel>
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
                  <FieldLabel>Hub / Area</FieldLabel>
                  <Select value={formData.hubId} onValueChange={(value) => setFormData({ ...formData, hubId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select hub" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>All hubs in city</SelectItem>
                      {hubs.filter((hub) => !formData.cityId || hub.cityId === formData.cityId).map((hub) => (
                        <SelectItem key={hub.id} value={hub.id}>
                          {hub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>

              <FieldGroup className="grid gap-4 md:grid-cols-4">
                <Field>
                  <FieldLabel>Open Before (min)</FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    value={formData.openBeforeMinutes}
                    onChange={(event) => setFormData({ ...formData, openBeforeMinutes: Number(event.target.value) || 0 })}
                  />
                </Field>
                <Field>
                  <FieldLabel>Buffer (min)</FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    value={formData.bufferMinutes}
                    onChange={(event) => setFormData({ ...formData, bufferMinutes: Number(event.target.value) || 0 })}
                  />
                </Field>
                <Field>
                  <FieldLabel>Slot Duration</FieldLabel>
                  <Input
                    type="number"
                    min={15}
                    value={formData.slotDurationMinutes}
                    onChange={(event) => setFormData({ ...formData, slotDurationMinutes: Number(event.target.value) || 60 })}
                  />
                </Field>
                <Field>
                  <FieldLabel>Slots / Car</FieldLabel>
                  <Input
                    type="number"
                    min={1}
                    max={6}
                    value={formData.maxSlotsPerCar}
                    onChange={(event) => setFormData({ ...formData, maxSlotsPerCar: Number(event.target.value) || 1 })}
                  />
                </Field>
              </FieldGroup>

              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">Enable this rule</div>
                  <div className="text-xs text-muted-foreground">Disabled rules do not open slots during auto run.</div>
                </div>
                <Switch checked={formData.enabled} onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRuleDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingRule ? 'Update Rule' : 'Create Rule'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
