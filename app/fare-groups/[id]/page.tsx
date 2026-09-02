'use client'

import { useState, use, useEffect } from 'react'
import { useAdmin, defaultPeakHour, defaultNightCharge } from '@/lib/admin-context'
import { 
  AirportFareConfig, RailwayFareConfig, RentalFareConfig, CityRideFareConfig, OutstationFareConfig,
  FareCalculationType, SlabConfig, PeakHourConfig, NightChargeConfig, ChargeType, RentalType, OutstationType,
  RouteConfig, PreBookingCharges, DriverAllowanceCalculationMethod, OutstationDayCalculationMethod
} from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Plus, Pencil, Trash2, Plane, Train, Car, MapPin, Navigation, X, Settings, ChevronDown, ChevronRight, Zap, Clock, Tag, CalendarDays, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const defaultPreBookingCharges: PreBookingCharges = {
  tollEnabled: false,
  tollAmount: 0,
  parkingEnabled: false,
  parkingAmount: 0,
  miscEnabled: false,
  miscDescription: '',
  miscAmount: 0,
}

const defaultShortNoticeCharge = {
  enabled: false,
  withinHours: 2,
  chargeType: 'flat' as ChargeType,
  chargeValue: 0
}

const dayCalculationLabels: Record<OutstationDayCalculationMethod, string> = {
  calendar_day_night_grace: 'Calendar Day + Night Grace',
  rolling_24_hours: 'Rolling 24 Hours',
  strict_calendar_day: 'Strict Calendar Day',
}

const driverAllowanceLabels: Record<DriverAllowanceCalculationMethod, string> = {
  per_chargeable_day: 'Per Chargeable Day',
  per_overnight_halt: 'Per Overnight Halt',
  fixed_per_trip: 'Fixed Per Trip',
}

function FareGroupSettingsTab({ fareGroup, cities, categories, onUpdate }: { fareGroup: any, cities: any[], categories: any[], onUpdate: (data: any) => void }) {
  const [cityHours, setCityHours] = useState<Record<string, number>>(fareGroup.cityAdvanceHours || {})
  const [globalHours, setGlobalHours] = useState<number | ''>(fareGroup.minAdvanceBookingHours ?? '')

  const [filterCategoryId, setFilterCategoryId] = useState<string>('all')

  type PeakPeriod = {
    id: string
    value: number
    chargeType: ChargeType
    startTime: string
    endTime: string
    startDate: string
    endDate: string
  }

  type DiscountPeriod = {
    id: string
    value: number
    chargeType: ChargeType
    startTime: string
    endTime: string
    startDate: string
    endDate: string
  }

  type ServiceSetting = {
    peaks: PeakPeriod[]
    advanceHours: number | ''
    DISCOUNTS: DiscountPeriod[]
    bookingWindow: number | ''
    urgentBookingCharge: number | ''
    urgentWithinTime: number | ''
    urgentChargeType: ChargeType
  }

  type ServiceType = 'airport_pickup' | 'airport_drop' | 'railway' | 'rental' | 'city' | 'outstation'

  const defaultPeakPeriod: PeakPeriod = {
    id: '',
    value: 0,
    chargeType: 'percentage',
    startTime: '09:00',
    endTime: '18:00',
    startDate: '',
    endDate: '',
  }

  const defaultSetting: ServiceSetting = {
    peaks: [],
    advanceHours: '',
    DISCOUNTS: [],
    bookingWindow: '',
    urgentBookingCharge: '',
    urgentWithinTime: '',
    urgentChargeType: 'percentage',
  }

  const generatePeakId = () => Math.random().toString(36).substring(2, 9)
  const generateDiscountId = () => Math.random().toString(36).substring(2, 9)

  const [settingTab, setSettingTab] = useState<'daily_hustle' | 'universal' | 'summary' | 'history'>('daily_hustle')

  const [history, setHistory] = useState<{ time: Date; action: string; details: string }[]>([])

  const addHistory = (action: string, details: string) => {
    setHistory(prev => [{ time: new Date(), action, details }, ...prev].slice(0, 50))
  }

  const serviceTypes: { key: ServiceType; label: string; icon: any }[] = [
    { key: 'airport_pickup', label: 'Airport Pickup', icon: Plane },
    { key: 'airport_drop', label: 'Airport Drop', icon: Plane },
    { key: 'railway', label: 'Railway', icon: Train },
    { key: 'rental', label: 'Rental', icon: Car },
    { key: 'city', label: 'City Ride', icon: MapPin },
    { key: 'outstation', label: 'Outstation', icon: Navigation },
  ]

  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set())
  const [activeServiceTabs, setActiveServiceTabs] = useState<Record<string, ServiceType>>(
    Object.fromEntries(cities.map(city => [city.id, 'airport_pickup' as ServiceType]))
  )

  const toggleCityExpanded = (cityId: string) => {
    setExpandedCities(prev => {
      const next = new Set(prev)
      if (next.has(cityId)) {
        next.delete(cityId)
      } else {
        next.add(cityId)
      }
      return next
    })
  }

  const setActiveServiceTab = (cityId: string, serviceType: ServiceType) => {
    setActiveServiceTabs(prev => ({
      ...prev,
      [cityId]: serviceType
    }))
  }

  const [citySettings, setCitySettings] = useState<Record<string, Record<ServiceType, ServiceSetting>>>(
    Object.fromEntries(cities.map(city => [
      city.id,
      Object.fromEntries(serviceTypes.map(st => [st.key, { ...defaultSetting }])) as Record<ServiceType, ServiceSetting>
    ]))
  )

  const handleServiceSettingChange = (cityId: string, serviceType: ServiceType, field: string, value: any) => {
    setCitySettings(prev => ({
      ...prev,
      [cityId]: {
        ...prev[cityId],
        [serviceType]: {
          ...prev[cityId][serviceType],
          [field]: value
        }
      }
    }))
    const cityName = cities.find(c => c.id === cityId)?.name || cityId
    addHistory('Setting Updated', `${cityName} / ${serviceType}: ${field}`)
  }

  const handleApplyAll = () => {
    const updates: any = {}
    let updateCount = 0

    const applySetting = (fare: any, settings: ServiceSetting) => {
      if (!settings) return fare
      
      const hasChanges = (settings.peaks && settings.peaks.length > 0) || settings.advanceHours !== '' || (settings.DISCOUNTS && settings.DISCOUNTS.length > 0) || settings.bookingWindow !== '' || settings.urgentBookingCharge !== '' || settings.urgentWithinTime !== ''
      if (!hasChanges) return fare

      updateCount++
      const updated = { ...fare }
      
      if (settings.peaks && settings.peaks.length > 0) {
        updated.peakHours = settings.peaks.map(peak => ({
          enabled: true,
          chargeType: peak.chargeType,
          chargeValue: peak.value,
          startTime: peak.startTime,
          endTime: peak.endTime,
          startDate: peak.startDate || undefined,
          endDate: peak.endDate || undefined,
        }))
        updated.peakHour = {
          ...updated.peakHour,
          enabled: true,
          chargeType: settings.peaks[0].chargeType,
          chargeValue: settings.peaks[0].value,
          startTime: settings.peaks[0].startTime,
          endTime: settings.peaks[0].endTime,
          startDate: settings.peaks[0].startDate || undefined,
          endDate: settings.peaks[0].endDate || undefined,
        }
      }
      if (settings.advanceHours !== '') {
        updated.minAdvanceBookingHours = settings.advanceHours
      }
      if (settings.DISCOUNTS && settings.DISCOUNTS.length > 0 && updated.autoSlotReturn) {
        updated.autoSlotReturn = {
          ...updated.autoSlotReturn,
          discountEnabled: true,
          discountType: settings.DISCOUNTS[0].chargeType,
          discountValue: settings.DISCOUNTS[0].value
        }
      }
      if (settings.bookingWindow !== '') {
        updated.minAdvanceBookingHours = settings.bookingWindow
      }
      if (settings.urgentBookingCharge !== '') {
        updated.urgentBookingCharge = settings.urgentBookingCharge
      }
      if (settings.urgentWithinTime !== '') {
        updated.urgentWithinTime = settings.urgentWithinTime
      }
      if (settings.urgentChargeType) {
        updated.urgentChargeType = settings.urgentChargeType
      }
      return updated
    }

    const applyUpdates = (fares: any[], serviceType: ServiceType) => {
      if (!fares) return fares
      
      return fares.map((fare: any) => {
        if (filterCategoryId !== 'all' && fare.carCategoryId !== filterCategoryId) {
          return fare
        }
        
        const settings = citySettings[fare.cityId]?.[serviceType]
        return applySetting(fare, settings)
      })
    }

    updates.airportFares = (fareGroup.airportFares || []).map((fare: any) => {
      if (filterCategoryId !== 'all' && fare.carCategoryId !== filterCategoryId) return fare
      const settings = citySettings[fare.cityId]?.[fare.type === 'drop' ? 'airport_drop' : 'airport_pickup']
      return applySetting(fare, settings)
    })
    updates.railwayFares = applyUpdates(fareGroup.railwayFares || [], 'railway')
    updates.rentalFares = applyUpdates(fareGroup.rentalFares || [], 'rental')
    updates.cityRideFares = applyUpdates(fareGroup.cityRideFares || [], 'city')
    updates.outstationFares = applyUpdates(fareGroup.outstationFares || [], 'outstation')

    if (updateCount === 0) {
      toast.error('No changes to apply')
      return
    }

    onUpdate(updates)
    toast.success(`Updated ${updateCount} fare configuration(s)`)
    addHistory('Bulk Update', `Applied settings to ${updateCount} configuration(s)`)
  }

  const handleSave = () => {
    onUpdate({ cityAdvanceHours: cityHours, minAdvanceBookingHours: globalHours === '' ? 0 : globalHours })
    addHistory('Advance Booking Saved', 'Global and city-wise advance booking hours updated')
  }

  return (
    <div className="space-y-6">
      {false && (
      <Card>
        <CardHeader>
            <CardTitle>Advance Booking Rules</CardTitle>
            <CardDescription>Set global or city-wise minimum advance booking hours for this fare group. Specific fare configurations can override these.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <FieldGroup>
              <Field>
                <FieldLabel>Default Global Advance Booking (Hours)</FieldLabel>
                <Input type="number" placeholder="e.g. 2" value={globalHours} onChange={e => setGlobalHours(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)} className="w-64" />
              </Field>
            </FieldGroup>
            
            <div>
              <h3 className="text-sm font-medium mb-3">City-wise Overrides</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cities.map(city => (
                  <div key={city.id} className="flex items-center gap-3 bg-muted/50 p-3 rounded-lg border">
                    <span className="flex-1 text-sm font-medium">{city.name}</span>
                    <Input 
                      type="number" 
                      className="w-24 h-8" 
                      placeholder="Default"
                      value={cityHours[city.id] !== undefined ? cityHours[city.id] : ''} 
                      onChange={e => setCityHours(prev => { 
                        const val = e.target.value; 
                        const next = { ...prev };
                        if (val === '') delete next[city.id];
                        else next[city.id] = parseFloat(val) || 0;
                        return next;
                      })} 
                    />
                    <span className="text-xs text-muted-foreground">hrs</span>
                  </div>
                ))}
              </div>
            </div>
            
            <Button onClick={handleSave}>Save Settings</Button>
        </CardContent>
      </Card>
      )}

      <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-white">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-200">
                <Settings className="h-5 w-5 text-black" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">City & Service Settings</CardTitle>
                <CardDescription className="text-sm">Configure PEAK CHARGES, DISCOUNTS, and booking rules per city</CardDescription>
              </div>
            </div>
            <Button size="sm" variant="outline" className="rounded-full px-4" onClick={() => setExpandedCities(new Set(expandedCities.size === cities.length ? [] : cities.map(c => c.id)))}>
              {expandedCities.size === cities.length ? 'Collapse All' : 'Expand All'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-2xl border shadow-sm">
            <MapPin className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-600">Filter:</span>
            <div className="w-44">
              <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
                <SelectTrigger className="h-9 rounded-lg border-slate-200">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4">
            {cities.map((city) => {
              const cityServiceSettings = citySettings[city.id]
              if (!cityServiceSettings) return null
              const isExpanded = expandedCities.has(city.id)
              const activeService = activeServiceTabs[city.id] || 'airport_pickup'
              const activeSettings = cityServiceSettings[activeService]
              const serviceTypeInfo = serviceTypes.find(st => st.key === activeService)
              const totalPeaks = Object.values(cityServiceSettings).reduce((acc, s) => acc + (s.peaks?.length || 0), 0)
              const totalDISCOUNTS = Object.values(cityServiceSettings).reduce((acc, s) => acc + (s.DISCOUNTS?.length || 0), 0)

              return (
                <div key={city.id} className="rounded-2xl border-0 shadow-md bg-white overflow-hidden transition-all duration-300 hover:shadow-lg">
                  <button
                    type="button"
                    className={`w-full flex items-center justify-between px-5 py-4 transition-all duration-300 ${
                      isExpanded 
                        ? 'bg-gradient-to-r from-violet-50 to-purple-50' 
                        : 'bg-gradient-to-r from-slate-50 to-gray-50 hover:from-slate-100 hover:to-gray-100'
                    }`}
                    onClick={() => toggleCityExpanded(city.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg transition-all ${isExpanded ? 'bg-violet-100' : 'bg-slate-100'}`}>
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-violet-600" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                      </div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isExpanded ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-black' : 'bg-slate-200 text-slate-600'}`}>
                        {city.name.charAt(0)}
                      </div>
                      <span className="font-semibold text-base">{city.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {totalPeaks > 0 && (
                        <Badge className="bg-gradient-to-r from-gray-800 to-gray-900 text-black border-0 gap-1 h-7 px-2.5 rounded-full shadow-sm">
                          <Zap className="h-3 w-3" /> {totalPeaks} Peak{totalPeaks > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {totalDISCOUNTS > 0 && (
                        <Badge className="bg-gradient-to-r from-emerald-400 to-green-500 text-black border-0 gap-1 h-7 px-2.5 rounded-full shadow-sm">
                          <Tag className="h-3 w-3" /> {totalDISCOUNTS} Disc
                        </Badge>
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-100">
                      <div className="flex gap-2 p-3 bg-slate-50/50 overflow-x-auto">
                        {serviceTypes.map((serviceType) => {
                          const Icon = serviceType.icon
                          const isActive = activeService === serviceType.key
                          const hasSettings = cityServiceSettings[serviceType.key]?.peaks?.length > 0 || cityServiceSettings[serviceType.key]?.DISCOUNTS?.length > 0
                          return (
                            <button
                              key={serviceType.key}
                              type="button"
                              onClick={() => setActiveServiceTab(city.id, serviceType.key)}
                              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                                isActive
                                  ? 'bg-white shadow-md text-violet-700 ring-1 ring-violet-200'
                                  : 'hover:bg-white/60 text-slate-500'
                              }`}
                            >
                              <Icon className={`h-4 w-4 ${isActive ? 'text-violet-500' : ''}`} />
                              {serviceType.label}
                              {hasSettings && <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-200" />}
                            </button>
                          )
                        })}
                      </div>

                       {activeSettings && serviceTypeInfo && (
                            <Tabs value={settingTab} onValueChange={(v) => setSettingTab(v as 'daily_hustle' | 'universal' | 'summary' | 'history')}>
                              <TabsList>
                                <TabsTrigger value="summary">Summary</TabsTrigger>
                                <TabsTrigger value="daily_hustle">Daily Hustle Setting</TabsTrigger>
                                <TabsTrigger value="universal">Universal Setting</TabsTrigger>
                                <TabsTrigger value="history">History</TabsTrigger>
                              </TabsList>
                              <TabsContent value="summary">
                                <div className="rounded-lg border border-gray-200 bg-white p-6">
                                  <h3 className="text-sm font-semibold text-gray-800 mb-4">Settings Summary</h3>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="text-gray-500">Peak Charges</span>
                                      <p className="font-medium">
                                        {activeSettings.peaks?.length ? activeSettings.peaks.map(p => `${p.chargeType === 'percentage' ? p.value + '%' : 'Rs ' + p.value} (${p.startTime}-${p.endTime})`).join(', ') : 'Not configured'}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Discounts</span>
                                      <p className="font-medium">
                                        {activeSettings.DISCOUNTS?.length ? activeSettings.DISCOUNTS.map(d => `${d.chargeType === 'percentage' ? d.value + '%' : 'Rs ' + d.value} (${d.startTime || '--:--'}-${d.endTime || '--:--'})`).join(', ') : 'Not configured'}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Advance Payment</span>
                                      <p className="font-medium">{activeSettings.advanceHours ? `${activeSettings.advanceHours}%` : 'Not set'}</p>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Booking Window</span>
                                      <p className="font-medium">{activeSettings.bookingWindow ? `${activeSettings.bookingWindow} hrs` : 'Not set'}</p>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Urgent Booking</span>
                                      <p className="font-medium">
                                        {activeSettings.urgentBookingCharge ? `Within ${activeSettings.urgentWithinTime || '?'} hrs: ${activeSettings.urgentChargeType === 'percentage' ? activeSettings.urgentBookingCharge + '%' : 'Rs ' + activeSettings.urgentBookingCharge}` : 'Not configured'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </TabsContent>
                              <TabsContent value="daily_hustle">
                               <div className="space-y-4">
                                 <div className="rounded-lg border border-gray-200 bg-white p-4">
                                   <div className="flex items-center justify-between mb-3">
                                     <div className="flex items-center gap-2">
                                       <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                                         <Zap className="h-4 w-4 text-amber-600" />
                                       </div>
                                       <span className="font-semibold text-sm text-gray-800">Peak Charges</span>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-7 px-3 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-xs"
                                  onClick={() => {
                                    const newPeak: PeakPeriod = { ...defaultPeakPeriod, id: generatePeakId() }
                                    const currentPeaks = activeSettings.peaks || []
                                    handleServiceSettingChange(city.id, activeService, 'peaks', [...currentPeaks, newPeak])
                                  }}
                                >
                                  <Plus className="h-3 w-3 mr-1" /> Add Period
                                </Button>
                              </div>
                              {(!activeSettings.peaks || activeSettings.peaks.length === 0) ? (
                                <div className="text-center py-6 text-gray-400 text-sm">No peak periods configured</div>
                              ) : (
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                  {activeSettings.peaks.map((peak, index) => (
                                    <div key={peak.id} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">{index + 1}</span>
                                        <span className="text-xs font-medium text-gray-700 flex-1">Peak Period</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newPeaks = activeSettings.peaks.filter(p => p.id !== peak.id)
                                            handleServiceSettingChange(city.id, activeService, 'peaks', newPeaks)
                                          }}
                                          className="w-6 h-6 rounded-md bg-red-100 text-red-500 hover:bg-red-200 flex items-center justify-center"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                      <FieldGroup className="grid grid-cols-3 gap-3 mb-2">
                                        <Field>
                                          <FieldLabel>Charge Type</FieldLabel>
                                          <Select
                                            value={peak.chargeType}
                                            onValueChange={(value: ChargeType) => {
                                              const newPeaks = [...activeSettings.peaks]
                                              newPeaks[index] = { ...peak, chargeType: value }
                                              handleServiceSettingChange(city.id, activeService, 'peaks', newPeaks)
                                            }}
                                          >
                                            <SelectTrigger className="h-8 text-sm w-full">
                                              <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="percentage">Percentage (%)</SelectItem>
                                              <SelectItem value="flat">Flat (Rs)</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </Field>
                                        <Field>
                                          <FieldLabel>Value</FieldLabel>
                                          <Input
                                            type="number"
                                            value={peak.value}
                                            onChange={e => {
                                              const newPeaks = [...activeSettings.peaks]
                                              newPeaks[index] = { ...peak, value: parseFloat(e.target.value) || 0 }
                                              handleServiceSettingChange(city.id, activeService, 'peaks', newPeaks)
                                            }}
                                            placeholder="0"
                                            className="h-8 text-sm"
                                          />
                                        </Field>
                                        <Field>
                                          <FieldLabel>Start Time</FieldLabel>
                                          <Input
                                            type="time"
                                            value={peak.startTime}
                                            onChange={e => {
                                              const newPeaks = [...activeSettings.peaks]
                                              newPeaks[index] = { ...peak, startTime: e.target.value }
                                              handleServiceSettingChange(city.id, activeService, 'peaks', newPeaks)
                                            }}
                                            className="h-8 text-sm"
                                          />
                                        </Field>
                                      </FieldGroup>
                                      <FieldGroup className="grid grid-cols-3 gap-3">
                                        <Field>
                                          <FieldLabel>End Time</FieldLabel>
                                          <Input
                                            type="time"
                                            value={peak.endTime}
                                            onChange={e => {
                                              const newPeaks = [...activeSettings.peaks]
                                              newPeaks[index] = { ...peak, endTime: e.target.value }
                                              handleServiceSettingChange(city.id, activeService, 'peaks', newPeaks)
                                            }}
                                            className="h-8 text-sm"
                                          />
                                        </Field>
                                        <Field>
                                          <FieldLabel>Start Date</FieldLabel>
                                          <Input
                                            type="date"
                                            value={peak.startDate}
                                            onChange={e => {
                                              const newPeaks = [...activeSettings.peaks]
                                              newPeaks[index] = { ...peak, startDate: e.target.value }
                                              handleServiceSettingChange(city.id, activeService, 'peaks', newPeaks)
                                            }}
                                            className="h-8 text-sm"
                                          />
                                        </Field>
                                        <Field>
                                          <FieldLabel>End Date</FieldLabel>
                                          <Input
                                            type="date"
                                            value={peak.endDate}
                                            onChange={e => {
                                              const newPeaks = [...activeSettings.peaks]
                                              newPeaks[index] = { ...peak, endDate: e.target.value }
                                              handleServiceSettingChange(city.id, activeService, 'peaks', newPeaks)
                                            }}
                                            className="h-8 text-sm"
                                          />
                                        </Field>
                                      </FieldGroup>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="rounded-lg border border-gray-200 bg-white p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                    <Tag className="h-4 w-4 text-emerald-600" />
                                  </div>
                                  <span className="font-semibold text-sm text-gray-800">Discounts</span>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-7 px-3 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-xs"
                                  onClick={() => {
                                    const newDiscount: DiscountPeriod = { id: generateDiscountId(), value: 0, chargeType: 'percentage', startTime: '', endTime: '', startDate: '', endDate: '' }
                                    const currentDiscounts = activeSettings.DISCOUNTS || []
                                    handleServiceSettingChange(city.id, activeService, 'DISCOUNTS', [...currentDiscounts, newDiscount])
                                  }}
                                >
                                  <Plus className="h-3 w-3 mr-1" /> Add Period
                                </Button>
                              </div>
                              {(!activeSettings.DISCOUNTS || activeSettings.DISCOUNTS.length === 0) ? (
                                <div className="text-center py-6 text-gray-400 text-sm">No discounts configured</div>
                              ) : (
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                  {activeSettings.DISCOUNTS.map((discount, index) => (
                                    <div key={discount.id} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">{index + 1}</span>
                                        <span className="text-xs font-medium text-gray-700 flex-1">Discount Period</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newDiscounts = activeSettings.DISCOUNTS.filter(d => d.id !== discount.id)
                                            handleServiceSettingChange(city.id, activeService, 'DISCOUNTS', newDiscounts)
                                          }}
                                          className="w-6 h-6 rounded-md bg-red-100 text-red-500 hover:bg-red-200 flex items-center justify-center"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                      <FieldGroup className="grid grid-cols-3 gap-3 mb-2">
                                        <Field>
                                          <FieldLabel>Discount Type</FieldLabel>
                                          <Select
                                            value={discount.chargeType}
                                            onValueChange={(value: ChargeType) => {
                                              const newDiscounts = [...activeSettings.DISCOUNTS]
                                              newDiscounts[index] = { ...discount, chargeType: value }
                                              handleServiceSettingChange(city.id, activeService, 'DISCOUNTS', newDiscounts)
                                            }}
                                          >
                                            <SelectTrigger className="h-8 text-sm w-full">
                                              <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="percentage">Percentage (%)</SelectItem>
                                              <SelectItem value="flat">Flat (Rs)</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </Field>
                                        <Field>
                                          <FieldLabel>Value</FieldLabel>
                                          <Input
                                            type="number"
                                            value={discount.value}
                                            onChange={e => {
                                              const newDiscounts = [...activeSettings.DISCOUNTS]
                                              newDiscounts[index] = { ...discount, value: parseFloat(e.target.value) || 0 }
                                              handleServiceSettingChange(city.id, activeService, 'DISCOUNTS', newDiscounts)
                                            }}
                                            placeholder="0"
                                            className="h-8 text-sm"
                                          />
                                        </Field>
                                        <Field>
                                          <FieldLabel>Start Time</FieldLabel>
                                          <Input
                                            type="time"
                                            value={discount.startTime}
                                            onChange={e => {
                                              const newDiscounts = [...activeSettings.DISCOUNTS]
                                              newDiscounts[index] = { ...discount, startTime: e.target.value }
                                              handleServiceSettingChange(city.id, activeService, 'DISCOUNTS', newDiscounts)
                                            }}
                                            className="h-8 text-sm"
                                          />
                                        </Field>
                                      </FieldGroup>
                                      <FieldGroup className="grid grid-cols-3 gap-3">
                                        <Field>
                                          <FieldLabel>End Time</FieldLabel>
                                          <Input
                                            type="time"
                                            value={discount.endTime}
                                            onChange={e => {
                                              const newDiscounts = [...activeSettings.DISCOUNTS]
                                              newDiscounts[index] = { ...discount, endTime: e.target.value }
                                              handleServiceSettingChange(city.id, activeService, 'DISCOUNTS', newDiscounts)
                                            }}
                                            className="h-8 text-sm"
                                          />
                                        </Field>
                                        <Field>
                                          <FieldLabel>Start Date</FieldLabel>
                                          <Input
                                            type="date"
                                            value={discount.startDate}
                                            onChange={e => {
                                              const newDiscounts = [...activeSettings.DISCOUNTS]
                                              newDiscounts[index] = { ...discount, startDate: e.target.value }
                                              handleServiceSettingChange(city.id, activeService, 'DISCOUNTS', newDiscounts)
                                            }}
                                            className="h-8 text-sm"
                                          />
                                        </Field>
                                        <Field>
                                          <FieldLabel>End Date</FieldLabel>
                                          <Input
                                            type="date"
                                            value={discount.endDate}
                                            onChange={e => {
                                              const newDiscounts = [...activeSettings.DISCOUNTS]
                                              newDiscounts[index] = { ...discount, endDate: e.target.value }
                                              handleServiceSettingChange(city.id, activeService, 'DISCOUNTS', newDiscounts)
                                            }}
                                            className="h-8 text-sm"
                                          />
                                        </Field>
                                      </FieldGroup>
                                    </div>
                                  ))}
                                </div>
                              )}
                             </div>
                               </div>
                             </TabsContent>
                             <TabsContent value="universal">
                               <div className="space-y-4">
                             <div className="grid grid-cols-3 gap-4">
                              <div className="rounded-lg border border-gray-200 bg-white p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                    <Clock className="h-4 w-4 text-blue-600" />
                                  </div>
                                  <span className="font-semibold text-sm text-gray-800">Advance Payment</span>
                                </div>
                                <Field>
                                  <FieldLabel>Minimum Payment (%)</FieldLabel>
                                  <Input
                                    type="number"
                                    value={activeSettings.advanceHours}
                                    onChange={e => handleServiceSettingChange(city.id, activeService, 'advanceHours', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                    placeholder="e.g. 20"
                                    className="h-8 text-sm"
                                  />
                                </Field>
                              </div>

                              <div className="rounded-lg border border-gray-200 bg-white p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                                    <CalendarDays className="h-4 w-4 text-purple-600" />
                                  </div>
                                  <span className="font-semibold text-sm text-gray-800">Booking Window</span>
                                </div>
                                <Field>
                                  <FieldLabel>Window Hours</FieldLabel>
                                  <Input
                                    type="number"
                                    value={activeSettings.bookingWindow}
                                    onChange={e => handleServiceSettingChange(city.id, activeService, 'bookingWindow', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                    placeholder="e.g. 4"
                                    className="h-8 text-sm"
                                  />
                                </Field>
                              </div>

                              <div className="rounded-lg border border-gray-200 bg-white p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                                    <Zap className="h-4 w-4 text-red-600" />
                                  </div>
                                  <span className="font-semibold text-sm text-gray-800">Urgent Booking</span>
                                </div>
                                <div className="space-y-2">
                                  <Field>
                                    <FieldLabel>Within Time (Hours)</FieldLabel>
                                    <Input
                                      type="number"
                                      value={activeSettings.urgentWithinTime}
                                      onChange={e => handleServiceSettingChange(city.id, activeService, 'urgentWithinTime', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                      placeholder="Hours"
                                      className="h-8 text-sm"
                                    />
                                  </Field>
                                  <div className="grid grid-cols-2 gap-2">
                                    <Field>
                                      <FieldLabel>Type</FieldLabel>
                                      <Select
                                        value={activeSettings.urgentChargeType}
                                        onValueChange={(value: ChargeType) => handleServiceSettingChange(city.id, activeService, 'urgentChargeType', value)}
                                      >
                                        <SelectTrigger className="h-8 text-sm w-full">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="percentage">%</SelectItem>
                                          <SelectItem value="flat">Rs</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </Field>
                                    <Field>
                                      <FieldLabel>Amount</FieldLabel>
                                      <Input
                                        type="number"
                                        value={activeSettings.urgentBookingCharge}
                                        onChange={e => handleServiceSettingChange(city.id, activeService, 'urgentBookingCharge', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                        placeholder="Charge"
                                        className="h-8 text-sm"
                                      />
                                    </Field>
                                  </div>
                                </div>
                              </div>
                             </div>
                           </div>
                           </TabsContent>
                               <TabsContent value="history">
                                <div className="rounded-lg border border-gray-200 bg-white p-6">
                                  <h3 className="text-sm font-semibold text-gray-800 mb-4">Change History</h3>
                                  {history.length === 0 ? (
                                    <p className="text-sm text-gray-500">No changes recorded yet.</p>
                                  ) : (
                                    <div className="space-y-3">
                                      {history.map((h, i) => (
                                        <div key={i} className="flex items-start gap-3 text-sm border-b border-gray-100 pb-2 last:border-0">
                                          <div className="flex-1">
                                            <span className="font-medium text-gray-800">{h.action}</span>
                                            <p className="text-gray-600">{h.details}</p>
                                          </div>
                                          <span className="text-xs text-gray-400 whitespace-nowrap">{h.time.toLocaleTimeString()}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </TabsContent>
                        </Tabs>

                        )}

                    </div>
                  )}
                </div>
              )
            })}
          </div>

            <Button onClick={handleApplyAll} size="lg" className="rounded-full px-8 bg-gradient-to-r from-violet-600 to-purple-600 text-black border-0 shadow-lg shadow-violet-200 hover:shadow-xl hover:shadow-violet-300 transition-all">
              Apply All Changes
            </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default function FareConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { fareGroups, updateFareGroup, cities, airports, railwayStations, carCategories, getCity, getAirport, getAirportTerminal, getRailwayStation, getRailwayStationTerminal, getCarCategory } = useAdmin()
  
  const fareGroup = fareGroups.find(g => g.id === id)
  
  const [activeTab, setActiveTab] = useState('airport')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState<'airport' | 'railway' | 'rental' | 'city' | 'outstation'>('airport')
  const [editingFare, setEditingFare] = useState<AirportFareConfig | RailwayFareConfig | RentalFareConfig | CityRideFareConfig | OutstationFareConfig | null>(null)

  if (!fareGroup) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-muted-foreground">Fare group not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/fare-groups')}>
          Back to Fare Groups
        </Button>
      </div>
    )
  }

  const activeCities = cities.filter(c => c.isActive)
  const activeCategories = carCategories.filter(c => c.isActive)

  const handleAddFare = (type: 'airport' | 'railway' | 'rental' | 'city' | 'outstation') => {
    setDialogType(type)
    setEditingFare(null)
    setIsDialogOpen(true)
  }

  const handleEditFare = (fare: AirportFareConfig | RailwayFareConfig | RentalFareConfig | CityRideFareConfig | OutstationFareConfig, type: 'airport' | 'railway' | 'rental' | 'city' | 'outstation') => {
    setDialogType(type)
    setEditingFare(fare)
    setIsDialogOpen(true)
  }

  const handleDeleteFare = (fareId: string, type: 'airport' | 'railway' | 'rental' | 'city' | 'outstation') => {
    let updatedFares
    switch (type) {
      case 'airport':
        updatedFares = { airportFares: fareGroup.airportFares.filter(f => f.id !== fareId) }
        break
      case 'railway':
        updatedFares = { railwayFares: fareGroup.railwayFares?.filter(f => f.id !== fareId) || [] }
        break
      case 'rental':
        updatedFares = { rentalFares: fareGroup.rentalFares.filter(f => f.id !== fareId) }
        break
      case 'city':
        updatedFares = { cityRideFares: fareGroup.cityRideFares.filter(f => f.id !== fareId) }
        break
      case 'outstation':
        updatedFares = { outstationFares: fareGroup.outstationFares.filter(f => f.id !== fareId) }
        break
    }
    updateFareGroup(fareGroup.id, updatedFares)
    toast.success('Fare configuration deleted')
  }

  const handleSaveFare = (fare: AirportFareConfig | RailwayFareConfig | RentalFareConfig | CityRideFareConfig | OutstationFareConfig) => {
    let updatedFares
    
    switch (dialogType) {
      case 'airport':
        const airportFare = fare as AirportFareConfig
        if (editingFare) {
          updatedFares = { airportFares: fareGroup.airportFares.map(f => f.id === editingFare.id ? airportFare : f) }
        } else {
          updatedFares = { airportFares: [...fareGroup.airportFares, airportFare] }
        }
        break
      case 'railway':
        const railwayFare = fare as RailwayFareConfig
        if (editingFare) {
          updatedFares = { railwayFares: (fareGroup.railwayFares || []).map(f => f.id === editingFare.id ? railwayFare : f) }
        } else {
          updatedFares = { railwayFares: [...(fareGroup.railwayFares || []), railwayFare] }
        }
        break
      case 'rental':
        const rentalFare = fare as RentalFareConfig
        if (editingFare) {
          updatedFares = { rentalFares: fareGroup.rentalFares.map(f => f.id === editingFare.id ? rentalFare : f) }
        } else {
          updatedFares = { rentalFares: [...fareGroup.rentalFares, rentalFare] }
        }
        break
      case 'city':
        const cityFare = fare as CityRideFareConfig
        if (editingFare) {
          updatedFares = { cityRideFares: fareGroup.cityRideFares.map(f => f.id === editingFare.id ? cityFare : f) }
        } else {
          updatedFares = { cityRideFares: [...fareGroup.cityRideFares, cityFare] }
        }
        break
      case 'outstation':
        const outstationFare = fare as OutstationFareConfig
        if (editingFare) {
          updatedFares = { outstationFares: fareGroup.outstationFares.map(f => f.id === editingFare.id ? outstationFare : f) }
        } else {
          updatedFares = { outstationFares: [...fareGroup.outstationFares, outstationFare] }
        }
        break
    }
    
    updateFareGroup(fareGroup.id, updatedFares)
    toast.success(editingFare ? 'Fare configuration updated' : 'Fare configuration added')
    setIsDialogOpen(false)
    setEditingFare(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/fare-groups">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground">{fareGroup.name}</h1>
            <Badge variant={fareGroup.type === 'B2C' ? 'default' : 'secondary'}>{fareGroup.type}</Badge>
          </div>
          <p className="text-muted-foreground">{fareGroup.description || 'Configure fares for this group'}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-6 lg:max-w-5xl">
          <TabsTrigger value="airport" className="flex items-center gap-2">
            <Plane className="h-4 w-4" />
            Airport
          </TabsTrigger>
          <TabsTrigger value="railway" className="flex items-center gap-2">
            <Train className="h-4 w-4" />
            Railway
          </TabsTrigger>
          <TabsTrigger value="rental" className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            Rentals
          </TabsTrigger>
          <TabsTrigger value="city" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            City Ride
          </TabsTrigger>
          <TabsTrigger value="outstation" className="flex items-center gap-2">
            <Navigation className="h-4 w-4" />
            Outstation
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="airport" className="mt-6">
          <AirportFaresTab
            fares={fareGroup.airportFares}
            cities={activeCities}
            categories={activeCategories}
            getCity={getCity}
            getAirport={getAirport}
            getAirportTerminal={getAirportTerminal}
            getCarCategory={getCarCategory}
            onAdd={() => handleAddFare('airport')}
            onEdit={(fare) => handleEditFare(fare, 'airport')}
            onDelete={(id) => handleDeleteFare(id, 'airport')}
          />
        </TabsContent>

        <TabsContent value="railway" className="mt-6">
          <RailwayFaresTab
            fares={fareGroup.railwayFares || []}
            cities={activeCities}
            categories={activeCategories}
            getCity={getCity}
            getRailwayStation={getRailwayStation}
            getRailwayStationTerminal={getRailwayStationTerminal}
            getCarCategory={getCarCategory}
            onAdd={() => handleAddFare('railway')}
            onEdit={(fare) => handleEditFare(fare, 'railway')}
            onDelete={(id) => handleDeleteFare(id, 'railway')}
          />
        </TabsContent>

        <TabsContent value="rental" className="mt-6">
          <RentalFaresTab
            fares={fareGroup.rentalFares}
            cities={activeCities}
            categories={activeCategories}
            getCity={getCity}
            getCarCategory={getCarCategory}
            onAdd={() => handleAddFare('rental')}
            onEdit={(fare) => handleEditFare(fare, 'rental')}
            onDelete={(id) => handleDeleteFare(id, 'rental')}
          />
        </TabsContent>

        <TabsContent value="city" className="mt-6">
          <CityRideFaresTab
            fares={fareGroup.cityRideFares}
            cities={activeCities}
            categories={activeCategories}
            getCity={getCity}
            getCarCategory={getCarCategory}
            onAdd={() => handleAddFare('city')}
            onEdit={(fare) => handleEditFare(fare, 'city')}
            onDelete={(id) => handleDeleteFare(id, 'city')}
          />
        </TabsContent>

        <TabsContent value="outstation" className="mt-6">
          <OutstationFaresTab
            fares={fareGroup.outstationFares}
            cities={activeCities}
            categories={activeCategories}
            getCity={getCity}
            getCarCategory={getCarCategory}
            onAdd={() => handleAddFare('outstation')}
            onEdit={(fare) => handleEditFare(fare, 'outstation')}
            onDelete={(id) => handleDeleteFare(id, 'outstation')}
          />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <FareGroupSettingsTab fareGroup={fareGroup} cities={activeCities} categories={activeCategories} onUpdate={(updates) => updateFareGroup(fareGroup.id, updates)} />
        </TabsContent>
      </Tabs>

      {/* Fare Configuration Dialog */}
      <FareConfigDialog
        isOpen={isDialogOpen}
        onClose={() => { setIsDialogOpen(false); setEditingFare(null) }}
        type={dialogType}
        cities={activeCities}
        categories={activeCategories}
        airports={airports.filter(airport => airport.isActive)}
        railwayStations={railwayStations.filter(st => st.isActive)}
        editingFare={editingFare}
        onSave={handleSaveFare}
      />
    </div>
  )
}

// Airport Fares Tab Component
function AirportFaresTab({
  fares, cities, categories, getCity, getAirport, getAirportTerminal, getCarCategory, onAdd, onEdit, onDelete
}: {
  fares: AirportFareConfig[]
  cities: { id: string; name: string }[]
  categories: { id: string; name: string }[]
  getCity: (id: string) => { name: string } | undefined
  getAirport: (id: string) => { name: string; code: string } | undefined
  getAirportTerminal: (airportId: string, terminalId: string) => { name: string; code: string } | undefined
  getCarCategory: (id: string) => { name: string } | undefined
  onAdd: () => void
  onEdit: (fare: AirportFareConfig) => void
  onDelete: (id: string) => void
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Airport Pickup & Drop Fares</CardTitle>
            <CardDescription>Configure airport and terminal specific fares for pickup, drop, or both</CardDescription>
          </div>
          <Button onClick={onAdd} disabled={cities.length === 0 || categories.length === 0}>
            <Plus className="mr-2 h-4 w-4" />
            Add Airport Fare
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {cities.length === 0 || categories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Please add cities and car categories first
          </div>
        ) : fares.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No airport fares configured yet
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>City</TableHead>
                <TableHead>Airport / Terminal</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Calculation</TableHead>
                <TableHead>Base Fare</TableHead>
                <TableHead>Pre-Booking</TableHead>
                <TableHead>Peak/Night</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fares.map((fare) => (
                <TableRow key={fare.id}>
                  <TableCell>{getCity(fare.cityId)?.name || '-'}</TableCell>
                  <TableCell>
                    {fare.airportId ? (
                      <div>
                        <div className="font-medium">{getAirport(fare.airportId)?.code || '-'}</div>
                        <div className="text-xs text-muted-foreground">
                          {fare.airportTerminalIds?.length
                            ? fare.airportTerminalIds
                                .map((terminalId) => getAirportTerminal(fare.airportId!, terminalId)?.code || terminalId)
                                .join(', ')
                            : fare.airportTerminalId
                              ? getAirportTerminal(fare.airportId, fare.airportTerminalId)?.name || '-'
                              : 'All terminals'}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Any airport</span>
                    )}
                  </TableCell>
                  <TableCell>{getCarCategory(fare.carCategoryId)?.name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {fare.type === 'pickup' ? 'Pickup' : fare.type === 'drop' ? 'Drop' : 'Both'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{fare.calculationType}</Badge>
                  </TableCell>
                  <TableCell>
                    {fare.calculationType === 'fixed' && `Rs. ${fare.fixedFare}`}
                    {fare.calculationType === 'per_km' && `Rs. ${fare.perKmRate}/km`}
                    {fare.calculationType === 'slab' && `${fare.slabs?.length || 0} slabs`}
                  </TableCell>
                  <TableCell>
                    {fare.preBookingCharges && (fare.preBookingCharges.tollEnabled || fare.preBookingCharges.parkingEnabled || fare.preBookingCharges.miscEnabled) ? (
                      <span className="text-xs text-muted-foreground">
                        {[
                          fare.preBookingCharges.tollEnabled && `Toll: Rs.${fare.preBookingCharges.tollAmount}`,
                          fare.preBookingCharges.parkingEnabled && `Park: Rs.${fare.preBookingCharges.parkingAmount}`,
                          fare.preBookingCharges.miscEnabled && `Misc: Rs.${fare.preBookingCharges.miscAmount}`,
                        ].filter(Boolean).join(', ')}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      {fare.peakHour.enabled && (
                        <span className="text-xs">Peak: {fare.peakHour.chargeValue}{fare.peakHour.chargeType === 'percentage' ? '%' : ' Rs.'}</span>
                      )}
                      {fare.nightCharge.enabled && (
                        <span className="text-xs">Night: {fare.nightCharge.chargeValue}{fare.nightCharge.chargeType === 'percentage' ? '%' : ' Rs.'}</span>
                      )}
                      {(fare as any).shortNoticeCharge?.enabled && (
                        <span className="text-xs">Urgent: {(fare as any).shortNoticeCharge.chargeValue}{(fare as any).shortNoticeCharge.chargeType === 'percentage' ? '%' : ' Rs.'}</span>
                      )}
                      {!fare.peakHour.enabled && !fare.nightCharge.enabled && (
                        <span className="text-muted-foreground text-xs">Off</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(fare)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Fare</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this fare configuration?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(fare.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

// Railway Fares Tab Component
function RailwayFaresTab({
  fares, cities, categories, getCity, getRailwayStation, getRailwayStationTerminal, getCarCategory, onAdd, onEdit, onDelete
}: {
  fares: RailwayFareConfig[]
  cities: { id: string; name: string }[]
  categories: { id: string; name: string }[]
  getCity: (id: string) => { name: string } | undefined
  getRailwayStation: (id: string) => { name: string; code: string } | undefined
  getRailwayStationTerminal: (stationId: string, terminalId: string) => { name: string; code: string } | undefined
  getCarCategory: (id: string) => { name: string } | undefined
  onAdd: () => void
  onEdit: (fare: RailwayFareConfig) => void
  onDelete: (id: string) => void
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Railway Pickup & Drop Fares</CardTitle>
            <CardDescription>Configure railway station and terminal specific fares</CardDescription>
          </div>
          <Button onClick={onAdd} disabled={cities.length === 0 || categories.length === 0}>
            <Plus className="mr-2 h-4 w-4" />
            Add Railway Fare
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {cities.length === 0 || categories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Please add cities and car categories first
          </div>
        ) : fares.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No railway fares configured yet
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>City</TableHead>
                <TableHead>Station / Terminal</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Calculation</TableHead>
                <TableHead>Base Fare</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fares.map((fare) => (
                <TableRow key={fare.id}>
                  <TableCell>{getCity(fare.cityId)?.name || '-'}</TableCell>
                  <TableCell>
                    {fare.railwayStationId ? (
                      <div>
                        <div className="font-medium">{getRailwayStation(fare.railwayStationId)?.code || '-'}</div>
                        <div className="text-xs text-muted-foreground">
                          {fare.railwayStationTerminalIds?.length
                            ? fare.railwayStationTerminalIds
                                .map((terminalId) => getRailwayStationTerminal(fare.railwayStationId!, terminalId)?.code || terminalId)
                                .join(', ')
                            : fare.railwayStationTerminalId
                              ? getRailwayStationTerminal(fare.railwayStationId, fare.railwayStationTerminalId)?.name || '-'
                              : 'All terminals'}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Any station</span>
                    )}
                  </TableCell>
                  <TableCell>{getCarCategory(fare.carCategoryId)?.name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {fare.type === 'pickup' ? 'Pickup' : fare.type === 'drop' ? 'Drop' : 'Both'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{fare.calculationType}</Badge>
                  </TableCell>
                  <TableCell>
                    {fare.calculationType === 'fixed' && `Rs. ${fare.fixedFare}`}
                    {fare.calculationType === 'per_km' && `Rs. ${fare.perKmRate}/km`}
                    {fare.calculationType === 'slab' && `${fare.slabs?.length || 0} slabs`}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(fare)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(fare.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

// Rental Fares Tab Component
function RentalFaresTab({
  fares, cities, categories, getCity, getCarCategory, onAdd, onEdit, onDelete
}: {
  fares: RentalFareConfig[]
  cities: { id: string; name: string }[]
  categories: { id: string; name: string }[]
  getCity: (id: string) => { name: string } | undefined
  getCarCategory: (id: string) => { name: string } | undefined
  onAdd: () => void
  onEdit: (fare: RentalFareConfig) => void
  onDelete: (id: string) => void
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Rental Fares</CardTitle>
            <CardDescription>Configure hourly/km package fares with optional capping</CardDescription>
          </div>
          <Button onClick={onAdd} disabled={cities.length === 0 || categories.length === 0}>
            <Plus className="mr-2 h-4 w-4" />
            Add Rental Fare
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {cities.length === 0 || categories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Please add cities and car categories first
          </div>
        ) : fares.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No rental fares configured yet
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>City</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Package Fare</TableHead>
                <TableHead>Extra Rates</TableHead>
                <TableHead>KM Capping</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fares.map((fare) => (
                <TableRow key={fare.id}>
                  <TableCell>{getCity(fare.cityId)?.name || '-'}</TableCell>
                  <TableCell>{getCarCategory(fare.carCategoryId)?.name || '-'}</TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {fare.rentalType === 'with_capping'
                        ? `${fare.packageHours}h / ${fare.packageKm || 0}km`
                        : `${fare.packageHours}h`}
                    </span>
                  </TableCell>
                  <TableCell>Rs. {fare.packageFare}</TableCell>
                  <TableCell>
                    <span className="text-xs">Rs. {fare.extraKmRate}/km, Rs. {fare.extraHourRate}/hr</span>
                  </TableCell>
                  <TableCell>
                    {fare.rentalType === 'with_capping' ? (
                      <Badge variant="outline">{fare.kmCapping} km cap</Badge>
                    ) : (
                      <Badge variant="secondary">No cap</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(fare)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Fare</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this fare configuration?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(fare.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

// City Ride Fares Tab Component
function CityRideFaresTab({
  fares, cities, categories, getCity, getCarCategory, onAdd, onEdit, onDelete
}: {
  fares: CityRideFareConfig[]
  cities: { id: string; name: string }[]
  categories: { id: string; name: string }[]
  getCity: (id: string) => { name: string } | undefined
  getCarCategory: (id: string) => { name: string } | undefined
  onAdd: () => void
  onEdit: (fare: CityRideFareConfig) => void
  onDelete: (id: string) => void
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>City Ride Fares</CardTitle>
            <CardDescription>Configure fares for within-city rides</CardDescription>
          </div>
          <Button onClick={onAdd} disabled={cities.length === 0 || categories.length === 0}>
            <Plus className="mr-2 h-4 w-4" />
            Add City Ride Fare
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {cities.length === 0 || categories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Please add cities and car categories first
          </div>
        ) : fares.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No city ride fares configured yet
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>City</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Calculation</TableHead>
                <TableHead>Fare Details</TableHead>
                <TableHead>Per Min Rate</TableHead>
                <TableHead>Peak Hour</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fares.map((fare) => (
                <TableRow key={fare.id}>
                  <TableCell>{getCity(fare.cityId)?.name || '-'}</TableCell>
                  <TableCell>{getCarCategory(fare.carCategoryId)?.name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{fare.calculationType}</Badge>
                  </TableCell>
                  <TableCell>
                    {fare.calculationType === 'fixed' && `Rs. ${fare.fixedFare}`}
                    {fare.calculationType === 'per_km' && `Rs. ${fare.perKmRate}/km`}
                    {fare.calculationType === 'slab' && `${fare.slabs?.length || 0} slabs`}
                  </TableCell>
                  <TableCell>Rs. {fare.perMinuteRate}</TableCell>
                  <TableCell>
                    {fare.peakHour.enabled ? (
                      <span className="text-xs">{fare.peakHour.chargeValue}{fare.peakHour.chargeType === 'percentage' ? '%' : ' Rs.'}</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">Off</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(fare)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Fare</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this fare configuration?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(fare.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

// Outstation Fares Tab Component
function OutstationFaresTab({
  fares, cities, categories, getCity, getCarCategory, onAdd, onEdit, onDelete
}: {
  fares: OutstationFareConfig[]
  cities: { id: string; name: string }[]
  categories: { id: string; name: string }[]
  getCity: (id: string) => { name: string } | undefined
  getCarCategory: (id: string) => { name: string } | undefined
  onAdd: () => void
  onEdit: (fare: OutstationFareConfig) => void
  onDelete: (id: string) => void
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Outstation Fares</CardTitle>
            <CardDescription>Configure fares for inter-city travel (one-way, round trip, route-wise)</CardDescription>
          </div>
          <Button onClick={onAdd} disabled={cities.length === 0 || categories.length === 0}>
            <Plus className="mr-2 h-4 w-4" />
            Add Outstation Fare
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {cities.length === 0 || categories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Please add cities and car categories first
          </div>
        ) : fares.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No outstation fares configured yet
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>City</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Day Method</TableHead>
                <TableHead>Rates</TableHead>
                <TableHead>Driver Allowance</TableHead>
                <TableHead>Min KM/Day</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fares.map((fare) => (
                <TableRow key={fare.id}>
                  <TableCell>{getCity(fare.cityId)?.name || '-'}</TableCell>
                  <TableCell>{getCarCategory(fare.carCategoryId)?.name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{fare.outstationType.replace('_', ' ')}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{dayCalculationLabels[fare.dayCalculationMethod || 'calendar_day_night_grace']}</div>
                    {fare.dayCalculationMethod === 'calendar_day_night_grace' && (
                      <div className="text-xs text-muted-foreground">
                        Grace {fare.graceEndTime || '04:00'} / Rs. {fare.extraHourCharge || 0}/hr
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {fare.outstationType === 'one_way' && `${fare.slabs?.length || 0} slabs`}
                    {fare.outstationType === 'round_trip' && `Rs. ${fare.roundTripPerKmRate}/km`}
                    {fare.outstationType === 'route_wise' && `${fare.routes?.length || 0} routes`}
                  </TableCell>
                  <TableCell>
                    <div>Rs. {fare.driverAllowancePerDay}</div>
                    <div className="text-xs text-muted-foreground">
                      {driverAllowanceLabels[fare.driverAllowanceCalculationMethod || 'per_chargeable_day']}
                    </div>
                  </TableCell>
                  <TableCell>{fare.minimumKmPerDay} km</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(fare)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Fare</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this fare configuration?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(fare.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

// Fare Configuration Dialog
function FareConfigDialog({
  isOpen, onClose, type, cities, categories, airports, railwayStations, editingFare, onSave
}: {
  isOpen: boolean
  onClose: () => void
  type: 'airport' | 'railway' | 'rental' | 'city' | 'outstation'
  cities: { id: string; name: string }[]
  categories: { id: string; name: string }[]
  airports: { id: string; cityId: string; name: string; code: string; terminals: { id: string; name: string; code: string; isActive: boolean }[] }[]
  railwayStations: { id: string; cityId: string; name: string; code: string; terminals: { id: string; name: string; code: string; isActive: boolean }[] }[]
  editingFare: AirportFareConfig | RailwayFareConfig | RentalFareConfig | CityRideFareConfig | OutstationFareConfig | null
  onSave: (fare: AirportFareConfig | RailwayFareConfig | RentalFareConfig | CityRideFareConfig | OutstationFareConfig) => void
}) {
  const { cities: allCities, getCity } = useAdmin()
  const generateId = () => Math.random().toString(36).substring(2, 11)
  
  // Airport fare state
  const [airportForm, setAirportForm] = useState<Partial<AirportFareConfig>>({
    cityId: '',
    airportId: undefined,
    airportTerminalId: undefined,
    airportTerminalIds: [],
    carCategoryId: '',
    type: 'pickup',
    calculationType: 'fixed',
    fixedFare: 500,
    perKmRate: 15,
    baseFare: 50,
    minimumFare: 200,
    waitingChargePerMin: 2,
    freeWaitingMinutes: 0,
    peakHour: { ...defaultPeakHour },
    nightCharge: { ...defaultNightCharge },
    shortNoticeCharge: { ...defaultShortNoticeCharge },
    slabs: [],
    preBookingCharges: { ...defaultPreBookingCharges },
    minAdvanceBookingHours: undefined as number | undefined,
  })
  const airportOptions = airports.filter(airport => airport.cityId === airportForm.cityId)
  const selectedAirport = airports.find(airport => airport.id === airportForm.airportId)
  const terminalOptions = selectedAirport?.terminals.filter(terminal => terminal.isActive) || []

  // Railway fare state
  const [railwayForm, setRailwayForm] = useState<Partial<RailwayFareConfig>>({
    cityId: '',
    railwayStationId: undefined,
    railwayStationTerminalId: undefined,
    railwayStationTerminalIds: [],
    carCategoryId: '',
    type: 'pickup',
    calculationType: 'fixed',
    fixedFare: 300,
    perKmRate: 15,
    baseFare: 50,
    minimumFare: 150,
    waitingChargePerMin: 2,
    freeWaitingMinutes: 0,
    peakHour: { ...defaultPeakHour },
    nightCharge: { ...defaultNightCharge },
    shortNoticeCharge: { ...defaultShortNoticeCharge },
    slabs: [],
    preBookingCharges: { ...defaultPreBookingCharges },
  })
  const railwayOptions = railwayStations.filter(station => station.cityId === railwayForm.cityId)
  const selectedRailway = railwayStations.find(station => station.id === railwayForm.railwayStationId)
  const railwayTerminalOptions = selectedRailway?.terminals.filter(terminal => terminal.isActive) || []

  // Rental fare state
  const [rentalForm, setRentalForm] = useState<Partial<RentalFareConfig> & { minAdvanceBookingHours?: number }>({
    cityId: '',
    carCategoryId: '',
    rentalType: 'without_capping',
    packageHours: 4,
    packageKm: undefined,
    packageFare: 1500,
    extraKmRate: 15,
    extraHourRate: 150,
    freeWaitingMinutes: 0,
    kmCapping: 100,
    peakHour: { ...defaultPeakHour },
    nightCharge: { ...defaultNightCharge },
    shortNoticeCharge: { ...defaultShortNoticeCharge },
    preBookingCharges: { ...defaultPreBookingCharges },
    minAdvanceBookingHours: undefined,
  })

  // City ride fare state
  const [cityForm, setCityForm] = useState<Partial<CityRideFareConfig> & { minAdvanceBookingHours?: number }>({
    cityId: '',
    carCategoryId: '',
    calculationType: 'per_km',
    fixedFare: 500,
    perKmRate: 12,
    baseFare: 50,
    minimumFare: 100,
    perMinuteRate: 1,
    freeWaitingMinutes: 0,
    peakHour: { ...defaultPeakHour },
    nightCharge: { ...defaultNightCharge },
    shortNoticeCharge: { ...defaultShortNoticeCharge },
    slabs: [],
    preBookingCharges: { ...defaultPreBookingCharges },
    minAdvanceBookingHours: undefined,
  })

  // Outstation fare state
  const [outstationForm, setOutstationForm] = useState<Partial<OutstationFareConfig> & { minAdvanceBookingHours?: number }>({
    cityId: '',
    carCategoryId: '',
    outstationType: 'one_way',
    oneWayPerKmRate: 12,
    roundTripPerKmRate: 10,
    dayCalculationMethod: 'calendar_day_night_grace',
    graceEndTime: '04:00',
    extraHourCharge: 0,
    driverAllowanceCalculationMethod: 'per_chargeable_day',
    driverAllowancePerDay: 400,
    nightHaltCharge: 700,
    minimumKmPerDay: 250,
    freeWaitingMinutes: 0,
    peakHour: { ...defaultPeakHour },
    nightCharge: { ...defaultNightCharge },
    shortNoticeCharge: { ...defaultShortNoticeCharge },
    routes: [],
    slabs: [],
    preBookingCharges: { ...defaultPreBookingCharges },
    minAdvanceBookingHours: undefined,
  })

  // Reset forms when dialog opens with editing data
  useEffect(() => {
    if (isOpen) {
      if (editingFare) {
        switch (type) {
          case 'airport':
            setAirportForm({
              ...(editingFare as AirportFareConfig),
              airportTerminalIds:
                (editingFare as AirportFareConfig).airportTerminalIds ||
                ((editingFare as AirportFareConfig).airportTerminalId ? [(editingFare as AirportFareConfig).airportTerminalId!] : []),
              freeWaitingMinutes: (editingFare as AirportFareConfig).freeWaitingMinutes || 0,
              preBookingCharges: (editingFare as AirportFareConfig).preBookingCharges || { ...defaultPreBookingCharges },
              shortNoticeCharge: (editingFare as any).shortNoticeCharge || { ...defaultShortNoticeCharge },
              minAdvanceBookingHours: (editingFare as any).minAdvanceBookingHours,
            })
            break
          case 'railway':
            setRailwayForm({
              ...(editingFare as RailwayFareConfig),
              railwayStationTerminalIds:
                (editingFare as RailwayFareConfig).railwayStationTerminalIds ||
                ((editingFare as RailwayFareConfig).railwayStationTerminalId ? [(editingFare as RailwayFareConfig).railwayStationTerminalId!] : []),
              freeWaitingMinutes: (editingFare as RailwayFareConfig).freeWaitingMinutes || 0,
              preBookingCharges: (editingFare as RailwayFareConfig).preBookingCharges || { ...defaultPreBookingCharges },
              shortNoticeCharge: (editingFare as any).shortNoticeCharge || { ...defaultShortNoticeCharge },
              minAdvanceBookingHours: (editingFare as any).minAdvanceBookingHours,
            })
            break
          case 'rental':
            setRentalForm({
              ...(editingFare as RentalFareConfig),
              packageKm: (editingFare as RentalFareConfig).rentalType === 'with_capping' ? (editingFare as RentalFareConfig).packageKm : undefined,
              freeWaitingMinutes: (editingFare as RentalFareConfig).freeWaitingMinutes || 0,
              preBookingCharges: (editingFare as RentalFareConfig).preBookingCharges || { ...defaultPreBookingCharges },
              shortNoticeCharge: (editingFare as any).shortNoticeCharge || { ...defaultShortNoticeCharge },
              minAdvanceBookingHours: (editingFare as any).minAdvanceBookingHours,
            })
            break
          case 'city':
            setCityForm({
              ...(editingFare as CityRideFareConfig),
              freeWaitingMinutes: (editingFare as CityRideFareConfig).freeWaitingMinutes || 0,
              preBookingCharges: (editingFare as CityRideFareConfig).preBookingCharges || { ...defaultPreBookingCharges },
              shortNoticeCharge: (editingFare as any).shortNoticeCharge || { ...defaultShortNoticeCharge },
              minAdvanceBookingHours: (editingFare as any).minAdvanceBookingHours,
            })
            break
          case 'outstation':
            setOutstationForm({
              ...(editingFare as OutstationFareConfig),
              dayCalculationMethod: (editingFare as OutstationFareConfig).dayCalculationMethod || 'calendar_day_night_grace',
              graceEndTime: (editingFare as OutstationFareConfig).graceEndTime || '04:00',
              extraHourCharge: (editingFare as OutstationFareConfig).extraHourCharge || 0,
              driverAllowanceCalculationMethod: (editingFare as OutstationFareConfig).driverAllowanceCalculationMethod || 'per_chargeable_day',
              freeWaitingMinutes: (editingFare as OutstationFareConfig).freeWaitingMinutes || 0,
              preBookingCharges: (editingFare as OutstationFareConfig).preBookingCharges || { ...defaultPreBookingCharges },
              slabs: (editingFare as OutstationFareConfig).slabs || [],
              shortNoticeCharge: (editingFare as any).shortNoticeCharge || { ...defaultShortNoticeCharge },
              minAdvanceBookingHours: (editingFare as any).minAdvanceBookingHours,
              autoSlotReturn: (editingFare as OutstationFareConfig).autoSlotReturn || { enabled: false, bufferMinutes: 60, discountEnabled: false, discountType: 'percentage', discountValue: 15, maxDiscount: 0 },
            })
            break
        }
      } else {
        // Reset to defaults for new fare
        setAirportForm({
          cityId: '',
          airportId: undefined,
          airportTerminalId: undefined,
          airportTerminalIds: [],
          carCategoryId: '',
          type: 'pickup',
          calculationType: 'fixed',
          fixedFare: 500,
          perKmRate: 15,
          baseFare: 50,
          minimumFare: 200,
          waitingChargePerMin: 2,
          freeWaitingMinutes: 0,
          peakHour: { ...defaultPeakHour },
          nightCharge: { ...defaultNightCharge },
          shortNoticeCharge: { ...defaultShortNoticeCharge },
          slabs: [],
          preBookingCharges: { ...defaultPreBookingCharges },
          minAdvanceBookingHours: undefined,
        })
        setRailwayForm({
          cityId: '',
          railwayStationId: undefined,
          railwayStationTerminalId: undefined,
          railwayStationTerminalIds: [],
          carCategoryId: '',
          type: 'pickup',
          calculationType: 'fixed',
          fixedFare: 300,
          perKmRate: 15,
          baseFare: 50,
          minimumFare: 150,
          waitingChargePerMin: 2,
          freeWaitingMinutes: 0,
          peakHour: { ...defaultPeakHour },
          nightCharge: { ...defaultNightCharge },
          shortNoticeCharge: { ...defaultShortNoticeCharge },
          slabs: [],
          preBookingCharges: { ...defaultPreBookingCharges },
        })
        setRentalForm({
          cityId: '',
          carCategoryId: '',
          rentalType: 'without_capping',
          packageHours: 4,
          packageKm: undefined,
          packageFare: 1500,
          extraKmRate: 15,
          extraHourRate: 150,
          freeWaitingMinutes: 0,
          kmCapping: 100,
          peakHour: { ...defaultPeakHour },
          nightCharge: { ...defaultNightCharge },
          shortNoticeCharge: { ...defaultShortNoticeCharge },
          preBookingCharges: { ...defaultPreBookingCharges },
          minAdvanceBookingHours: undefined,
        })
        setCityForm({
          cityId: '',
          carCategoryId: '',
          calculationType: 'per_km',
          fixedFare: 500,
          perKmRate: 12,
          baseFare: 50,
          minimumFare: 100,
          perMinuteRate: 1,
          freeWaitingMinutes: 0,
          peakHour: { ...defaultPeakHour },
          nightCharge: { ...defaultNightCharge },
          shortNoticeCharge: { ...defaultShortNoticeCharge },
          slabs: [],
          preBookingCharges: { ...defaultPreBookingCharges },
          minAdvanceBookingHours: undefined,
        })
        setOutstationForm({
          cityId: '',
          carCategoryId: '',
          outstationType: 'one_way',
          oneWayPerKmRate: 12,
          roundTripPerKmRate: 10,
          dayCalculationMethod: 'calendar_day_night_grace',
          graceEndTime: '04:00',
          extraHourCharge: 0,
          driverAllowanceCalculationMethod: 'per_chargeable_day',
          driverAllowancePerDay: 400,
          nightHaltCharge: 700,
          minimumKmPerDay: 250,
          freeWaitingMinutes: 0,
          peakHour: { ...defaultPeakHour },
          nightCharge: { ...defaultNightCharge },
          shortNoticeCharge: { ...defaultShortNoticeCharge },
          routes: [],
          slabs: [],
          preBookingCharges: { ...defaultPreBookingCharges },
          minAdvanceBookingHours: undefined,
          autoSlotReturn: { enabled: false, bufferMinutes: 60, discountEnabled: false, discountType: 'percentage', discountValue: 15, maxDiscount: 0 },
        })
      }
    }
  }, [isOpen, editingFare, type])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    switch (type) {
      case 'airport':
        if (!airportForm.airportId || !airportForm.airportTerminalIds?.length) {
          toast.error('Please select airport and at least one terminal')
          return
        }
        onSave({
          ...airportForm,
          airportTerminalId: airportForm.airportTerminalIds[0],
          id: editingFare?.id || generateId(),
        } as AirportFareConfig)
        break
      case 'railway':
        if (!railwayForm.railwayStationId || !railwayForm.railwayStationTerminalIds?.length) {
          toast.error('Please select railway station and at least one terminal')
          return
        }
        onSave({
          ...railwayForm,
          railwayStationTerminalId: railwayForm.railwayStationTerminalIds[0],
          id: editingFare?.id || generateId(),
        } as RailwayFareConfig)
        break
      case 'rental':
        onSave({
          ...rentalForm,
          packageKm: rentalForm.rentalType === 'with_capping' ? rentalForm.packageKm : undefined,
          id: editingFare?.id || generateId(),
        } as RentalFareConfig)
        break
      case 'city':
        onSave({
          ...cityForm,
          id: editingFare?.id || generateId(),
        } as CityRideFareConfig)
        break
      case 'outstation':
        onSave({
          ...outstationForm,
          id: editingFare?.id || generateId(),
        } as OutstationFareConfig)
        break
    }
  }

  // Slab configuration helper
  const renderSlabConfig = (
    slabs: SlabConfig[],
    onChange: (slabs: SlabConfig[]) => void
  ) => (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-medium text-sm">Slab Configuration</p>
          <p className="text-xs text-muted-foreground">Define distance-based fare slabs</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const lastSlab = slabs[slabs.length - 1]
            const newSlab: SlabConfig = {
              id: generateId(),
              fromKm: lastSlab ? lastSlab.toKm : 0,
              toKm: lastSlab ? lastSlab.toKm + 5 : 5,
              farePerKm: 15,
            }
            onChange([...slabs, newSlab])
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Slab
        </Button>
      </div>
      {slabs.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-4">No slabs configured. Add a slab to define distance-based pricing.</p>
      ) : (
        <div className="space-y-3">
          {slabs.map((slab, index) => (
            <div key={slab.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex-1 grid grid-cols-3 gap-3">
                <Field>
                  <FieldLabel className="text-xs">From (KM)</FieldLabel>
                  <Input
                    type="number"
                    value={slab.fromKm}
                    onChange={(e) => {
                      const updated = [...slabs]
                      updated[index] = { ...slab, fromKm: parseFloat(e.target.value) }
                      onChange(updated)
                    }}
                  />
                </Field>
                <Field>
                  <FieldLabel className="text-xs">To (KM)</FieldLabel>
                  <Input
                    type="number"
                    value={slab.toKm}
                    onChange={(e) => {
                      const updated = [...slabs]
                      updated[index] = { ...slab, toKm: parseFloat(e.target.value) }
                      onChange(updated)
                    }}
                  />
                </Field>
                <Field>
                  <FieldLabel className="text-xs">Fare/KM (Rs.)</FieldLabel>
                  <Input
                    type="number"
                    value={slab.farePerKm}
                    onChange={(e) => {
                      const updated = [...slabs]
                      updated[index] = { ...slab, farePerKm: parseFloat(e.target.value) }
                      onChange(updated)
                    }}
                  />
                </Field>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => onChange(slabs.filter((_, i) => i !== index))}
              >
                <X className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // Route configuration helper
  const renderRouteConfig = (
    routes: RouteConfig[],
    onChange: (routes: RouteConfig[]) => void,
    originCityId: string
  ) => (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-medium text-sm">Route Configuration</p>
          <p className="text-xs text-muted-foreground">Define specific routes with fixed fares</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const newRoute: RouteConfig = {
              id: generateId(),
              fromCityId: originCityId,
              toCityId: '',
              distanceKm: 0,
              fare: 0,
            }
            onChange([...routes, newRoute])
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Route
        </Button>
      </div>
      {routes.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-4">No routes configured. Add routes to define city-to-city pricing.</p>
      ) : (
        <div className="space-y-3">
          {routes.map((route, index) => (
            <div key={route.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex-1 grid grid-cols-4 gap-3">
                <Field>
                  <FieldLabel className="text-xs">From City</FieldLabel>
                  <Input
                    value={getCity(route.fromCityId)?.name || 'Origin City'}
                    disabled
                    className="bg-muted"
                  />
                </Field>
                <Field>
                  <FieldLabel className="text-xs">To City</FieldLabel>
                  <Select
                    value={route.toCityId}
                    onValueChange={(value) => {
                      const updated = [...routes]
                      updated[index] = { ...route, toCityId: value }
                      onChange(updated)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCities.filter(c => c.isActive && c.id !== originCityId).map(city => (
                        <SelectItem key={city.id} value={city.id}>{city.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel className="text-xs">Distance (KM)</FieldLabel>
                  <Input
                    type="number"
                    value={route.distanceKm}
                    onChange={(e) => {
                      const updated = [...routes]
                      updated[index] = { ...route, distanceKm: parseFloat(e.target.value) }
                      onChange(updated)
                    }}
                  />
                </Field>
                <Field>
                  <FieldLabel className="text-xs">Fare (Rs.)</FieldLabel>
                  <Input
                    type="number"
                    value={route.fare}
                    onChange={(e) => {
                      const updated = [...routes]
                      updated[index] = { ...route, fare: parseFloat(e.target.value) }
                      onChange(updated)
                    }}
                  />
                </Field>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => onChange(routes.filter((_, i) => i !== index))}
              >
                <X className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // Auto Slot Return helper
  type AutoSlotReturnConfig = {
    enabled: boolean
    bufferMinutes: number
    discountEnabled?: boolean
    discountType?: ChargeType
    discountValue?: number
    maxDiscount?: number
  }

  const renderAutoSlotReturnConfig = (
    config: AutoSlotReturnConfig | undefined,
    onChange: (config: AutoSlotReturnConfig) => void
  ) => {
    const currentConfig = {
      enabled: false,
      bufferMinutes: 60,
      discountEnabled: false,
      discountType: 'percentage' as ChargeType,
      discountValue: 15,
      maxDiscount: 0,
      ...config,
    }
    return (
      <div className="rounded-lg border p-4 bg-blue-50/30">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-sm text-blue-900">Auto Slot for Return Trips</p>
            <p className="text-xs text-blue-700">Automatically open slots for cars returning from this outstation trip</p>
          </div>
          <Switch
            checked={currentConfig.enabled}
            onCheckedChange={(checked) => onChange({ ...currentConfig, enabled: checked })}
          />
        </div>
        {currentConfig.enabled && (
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium">Slot Open Buffer (min)</p>
                <p className="text-xs text-muted-foreground">Time after drop when the return slot opens</p>
              </div>
              <Input
                type="number"
                className="w-24"
                value={currentConfig.bufferMinutes}
                onChange={(e) => onChange({ ...currentConfig, bufferMinutes: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="rounded-lg border bg-white p-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Return Fare Discount</p>
                  <p className="text-xs text-muted-foreground">Lower fare for this generated return slot to improve booking chances</p>
                </div>
                <Switch
                  checked={!!currentConfig.discountEnabled}
                  onCheckedChange={(checked) => onChange({ ...currentConfig, discountEnabled: checked })}
                />
              </div>

              {currentConfig.discountEnabled && (
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <Field>
                    <FieldLabel>Discount Type</FieldLabel>
                    <Select
                      value={currentConfig.discountType || 'percentage'}
                      onValueChange={(value: ChargeType) => onChange({ ...currentConfig, discountType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="flat">Flat amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel>{currentConfig.discountType === 'flat' ? 'Amount (Rs.)' : 'Discount (%)'}</FieldLabel>
                    <Input
                      type="number"
                      min={0}
                      value={currentConfig.discountValue ?? 0}
                      onChange={(e) => onChange({ ...currentConfig, discountValue: parseFloat(e.target.value) || 0 })}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Max Discount (Rs.)</FieldLabel>
                    <Input
                      type="number"
                      min={0}
                      placeholder="No cap"
                      value={currentConfig.maxDiscount || ''}
                      onChange={(e) => onChange({ ...currentConfig, maxDiscount: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                    />
                  </Field>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Pre-booking charges helper
  const renderPreBookingCharges = (
    charges: PreBookingCharges,
    onChange: (charges: PreBookingCharges) => void
  ) => (
    <div className="rounded-lg border p-4">
      <div className="mb-4">
        <p className="font-medium text-sm">Pre-Booking Charges (Optional)</p>
        <p className="text-xs text-muted-foreground">Add toll, parking, or miscellaneous charges</p>
      </div>
      <div className="space-y-2">
        {/* Toll Charges */}
        <div className="flex items-center gap-4">
          <Switch
            checked={charges.tollEnabled}
            onCheckedChange={(checked) => onChange({ ...charges, tollEnabled: checked })}
          />
          <div className="flex-1">
            <p className="text-sm font-medium">Toll Charges</p>
          </div>
          {charges.tollEnabled && (
            <div className="w-32">
              <Input
                type="number"
                placeholder="Amount"
                value={charges.tollAmount || ''}
                onChange={(e) => onChange({ ...charges, tollAmount: parseFloat(e.target.value) || 0 })}
              />
            </div>
          )}
        </div>

        {/* Parking Charges */}
        <div className="flex items-center gap-4">
          <Switch
            checked={charges.parkingEnabled}
            onCheckedChange={(checked) => onChange({ ...charges, parkingEnabled: checked })}
          />
          <div className="flex-1">
            <p className="text-sm font-medium">Parking Charges</p>
          </div>
          {charges.parkingEnabled && (
            <div className="w-32">
              <Input
                type="number"
                placeholder="Amount"
                value={charges.parkingAmount || ''}
                onChange={(e) => onChange({ ...charges, parkingAmount: parseFloat(e.target.value) || 0 })}
              />
            </div>
          )}
        </div>

        {/* Misc Charges */}
        <div className="flex items-center gap-4">
          <Switch
            checked={charges.miscEnabled}
            onCheckedChange={(checked) => onChange({ ...charges, miscEnabled: checked })}
          />
          <div className="flex-1">
            <p className="text-sm font-medium">Miscellaneous Charges</p>
          </div>
          {charges.miscEnabled && (
            <div className="flex gap-2 w-64">
              <Input
                placeholder="Description"
                value={charges.miscDescription}
                onChange={(e) => onChange({ ...charges, miscDescription: e.target.value })}
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="Amount"
                value={charges.miscAmount || ''}
                onChange={(e) => onChange({ ...charges, miscAmount: parseFloat(e.target.value) || 0 })}
                className="w-24"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderPeakHourConfig = (
    config: PeakHourConfig,
    onChange: (config: PeakHourConfig) => void
  ) => (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-medium text-sm">Peak Hour Charges</p>
          <p className="text-xs text-muted-foreground">Extra charges during busy hours</p>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={(checked) => onChange({ ...config, enabled: checked })}
        />
      </div>
      {config.enabled && (
        <div className="grid gap-4">
          <FieldGroup className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Start Time</FieldLabel>
              <Input
                type="time"
                value={config.startTime}
                onChange={(e) => onChange({ ...config, startTime: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel>End Time</FieldLabel>
              <Input
                type="time"
                value={config.endTime}
                onChange={(e) => onChange({ ...config, endTime: e.target.value })}
              />
            </Field>
          </FieldGroup>
          <FieldGroup className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Charge Type</FieldLabel>
              <Select
                value={config.chargeType}
                onValueChange={(value: ChargeType) => onChange({ ...config, chargeType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat Amount</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Charge Value</FieldLabel>
              <Input
                type="number"
                value={config.chargeValue}
                onChange={(e) => onChange({ ...config, chargeValue: parseFloat(e.target.value) })}
              />
            </Field>
          </FieldGroup>
        </div>
      )}
    </div>
  )

  const renderNightChargeConfig = (
    config: NightChargeConfig,
    onChange: (config: NightChargeConfig) => void
  ) => (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-medium text-sm">Night Charges</p>
          <p className="text-xs text-muted-foreground">Extra charges during night hours</p>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={(checked) => onChange({ ...config, enabled: checked })}
        />
      </div>
      {config.enabled && (
        <div className="grid gap-4">
          <FieldGroup className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Start Time</FieldLabel>
              <Input
                type="time"
                value={config.startTime}
                onChange={(e) => onChange({ ...config, startTime: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel>End Time</FieldLabel>
              <Input
                type="time"
                value={config.endTime}
                onChange={(e) => onChange({ ...config, endTime: e.target.value })}
              />
            </Field>
          </FieldGroup>
          <FieldGroup className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Charge Type</FieldLabel>
              <Select
                value={config.chargeType}
                onValueChange={(value: ChargeType) => onChange({ ...config, chargeType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat Amount</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Charge Value</FieldLabel>
              <Input
                type="number"
                value={config.chargeValue}
                onChange={(e) => onChange({ ...config, chargeValue: parseFloat(e.target.value) })}
              />
            </Field>
          </FieldGroup>
        </div>
      )}
    </div>
  )

  const renderShortNoticeChargeConfig = (
    config: any,
    onChange: (config: any) => void
  ) => (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-medium text-sm">Urgent / Short-Notice Booking Charges</p>
          <p className="text-xs text-muted-foreground">Extra charges for last-minute bookings</p>
        </div>
        <Switch
          checked={config?.enabled || false}
          onCheckedChange={(checked) => onChange({ ...(config || defaultShortNoticeCharge), enabled: checked })}
        />
      </div>
      {config?.enabled && (
        <div className="grid gap-4">
          <FieldGroup className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Within Time (Hours)</FieldLabel>
              <Input
                type="number"
                value={config.withinHours || 2}
                onChange={(e) => onChange({ ...config, withinHours: parseFloat(e.target.value) || 0 })}
              />
            </Field>
            <Field>
              <FieldLabel>Charge Type</FieldLabel>
              <Select
                value={config.chargeType || 'flat'}
                onValueChange={(value: ChargeType) => onChange({ ...config, chargeType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat Amount</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
          <FieldGroup className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Charge Value</FieldLabel>
              <Input
                type="number"
                value={config.chargeValue || 0}
                onChange={(e) => onChange({ ...config, chargeValue: parseFloat(e.target.value) || 0 })}
              />
            </Field>
          </FieldGroup>
        </div>
      )}
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingFare ? 'Edit' : 'Add'} {type === 'airport' ? 'Airport' : type === 'railway' ? 'Railway' : type === 'rental' ? 'Rental' : type === 'city' ? 'City Ride' : 'Outstation'} Fare
          </DialogTitle>
          <DialogDescription>
            Configure fare settings for this service type
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Common city and category selection */}
            <FieldGroup className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>City</FieldLabel>
                <Select
                  value={type === 'airport' ? airportForm.cityId : type === 'railway' ? railwayForm.cityId : type === 'rental' ? rentalForm.cityId : type === 'city' ? cityForm.cityId : outstationForm.cityId}
                  onValueChange={(value) => {
                    switch (type) {
                      case 'airport': setAirportForm(f => ({ ...f, cityId: value, airportId: undefined, airportTerminalId: undefined })); break
                      case 'railway': setRailwayForm(f => ({ ...f, cityId: value, railwayStationId: undefined, railwayStationTerminalId: undefined })); break
                      case 'rental': setRentalForm(f => ({ ...f, cityId: value })); break
                      case 'city': setCityForm(f => ({ ...f, cityId: value })); break
                      case 'outstation': setOutstationForm(f => ({ ...f, cityId: value })); break
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map(city => (
                      <SelectItem key={city.id} value={city.id}>{city.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Car Category</FieldLabel>
                <Select
                  value={type === 'airport' ? airportForm.carCategoryId : type === 'railway' ? railwayForm.carCategoryId : type === 'rental' ? rentalForm.carCategoryId : type === 'city' ? cityForm.carCategoryId : outstationForm.carCategoryId}
                  onValueChange={(value) => {
                    switch (type) {
                      case 'airport': setAirportForm(f => ({ ...f, carCategoryId: value })); break
                      case 'railway': setRailwayForm(f => ({ ...f, carCategoryId: value })); break
                      case 'rental': setRentalForm(f => ({ ...f, carCategoryId: value })); break
                      case 'city': setCityForm(f => ({ ...f, carCategoryId: value })); break
                      case 'outstation': setOutstationForm(f => ({ ...f, carCategoryId: value })); break
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>

            {type === 'airport' && (
              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Airport</FieldLabel>
                  <Select
                    value={airportForm.airportId || ''}
                    onValueChange={(value) => setAirportForm(f => ({ ...f, airportId: value, airportTerminalId: undefined, airportTerminalIds: [] }))}
                    disabled={!airportForm.cityId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select airport" />
                    </SelectTrigger>
                    <SelectContent>
                      {airportOptions.map(airport => (
                        <SelectItem key={airport.id} value={airport.id}>
                          {airport.name} ({airport.code})
                        </SelectItem>
                      ))}
                      {airportForm.cityId && airportOptions.length === 0 && (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No active airports configured for this city
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Terminals</FieldLabel>
                  <div className="rounded-md border p-3">
                    {!airportForm.airportId ? (
                      <p className="text-sm text-muted-foreground">Select an airport first</p>
                    ) : terminalOptions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No active terminals configured for this airport</p>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {terminalOptions.map(terminal => {
                          const checked = airportForm.airportTerminalIds?.includes(terminal.id) || false
                          return (
                            <label key={terminal.id} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(isChecked) => {
                                  setAirportForm(f => {
                                    const current = f.airportTerminalIds || []
                                    const next = isChecked
                                      ? [...current, terminal.id]
                                      : current.filter(id => id !== terminal.id)
                                    return {
                                      ...f,
                                      airportTerminalIds: next,
                                      airportTerminalId: next[0],
                                    }
                                  })
                                }}
                              />
                              <span>{terminal.name} ({terminal.code})</span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </Field>
              </FieldGroup>
            )}

            {type === 'railway' && (
              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Railway Station</FieldLabel>
                  <Select
                    value={railwayForm.railwayStationId || ''}
                    onValueChange={(value) => setRailwayForm(f => ({ ...f, railwayStationId: value, railwayStationTerminalId: undefined, railwayStationTerminalIds: [] }))}
                    disabled={!railwayForm.cityId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select station" />
                    </SelectTrigger>
                    <SelectContent>
                      {railwayOptions.map(station => (
                        <SelectItem key={station.id} value={station.id}>
                          {station.name} ({station.code})
                        </SelectItem>
                      ))}
                      {railwayForm.cityId && railwayOptions.length === 0 && (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No active stations configured for this city
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Terminals / Entrances</FieldLabel>
                  <div className="rounded-md border p-3">
                    {!railwayForm.railwayStationId ? (
                      <p className="text-sm text-muted-foreground">Select a station first</p>
                    ) : railwayTerminalOptions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No active terminals configured for this station</p>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {railwayTerminalOptions.map(terminal => {
                          const checked = railwayForm.railwayStationTerminalIds?.includes(terminal.id) || false
                          return (
                            <label key={terminal.id} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(isChecked) => {
                                  setRailwayForm(f => {
                                    const current = f.railwayStationTerminalIds || []
                                    const next = isChecked ? [...current, terminal.id] : current.filter(id => id !== terminal.id)
                                    return { ...f, railwayStationTerminalIds: next, railwayStationTerminalId: next[0] }
                                  })
                                }}
                              />
                              <span>{terminal.name} ({terminal.code})</span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </Field>
              </FieldGroup>
            )}

            <Separator />

            {/* Type-specific fields */}
            {type === 'airport' && (
              <>
                <FieldGroup className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Transfer Type</FieldLabel>
                    <Select
                      value={airportForm.type}
                      onValueChange={(value: 'pickup' | 'drop' | 'both') => setAirportForm(f => ({ ...f, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pickup">Airport Pickup</SelectItem>
                        <SelectItem value="drop">Airport Drop</SelectItem>
                        <SelectItem value="both">Both (Pickup & Drop)</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel>Calculation Type</FieldLabel>
                    <Select
                      value={airportForm.calculationType}
                      onValueChange={(value: FareCalculationType) => setAirportForm(f => ({ ...f, calculationType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Fare</SelectItem>
                        <SelectItem value="per_km">Per KM</SelectItem>
                        <SelectItem value="slab">Slab-wise</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>

                {airportForm.calculationType === 'fixed' && (
                  <Field>
                    <FieldLabel>Fixed Fare (Rs.)</FieldLabel>
                    <Input
                      type="number"
                      value={airportForm.fixedFare}
                      onChange={(e) => setAirportForm(f => ({ ...f, fixedFare: parseFloat(e.target.value) }))}
                    />
                  </Field>
                )}

                {airportForm.calculationType === 'per_km' && (
                  <FieldGroup className="grid grid-cols-3 gap-4">
                    <Field>
                      <FieldLabel>Per KM Rate (Rs.)</FieldLabel>
                      <Input
                        type="number"
                        value={airportForm.perKmRate}
                        onChange={(e) => setAirportForm(f => ({ ...f, perKmRate: parseFloat(e.target.value) }))}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Base Fare (Rs.)</FieldLabel>
                      <Input
                        type="number"
                        value={airportForm.baseFare}
                        onChange={(e) => setAirportForm(f => ({ ...f, baseFare: parseFloat(e.target.value) }))}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Minimum Fare (Rs.)</FieldLabel>
                      <Input
                        type="number"
                        value={airportForm.minimumFare}
                        onChange={(e) => setAirportForm(f => ({ ...f, minimumFare: parseFloat(e.target.value) }))}
                      />
                    </Field>
                  </FieldGroup>
                )}

                {airportForm.calculationType === 'slab' && (
                  renderSlabConfig(airportForm.slabs || [], (slabs) => setAirportForm(f => ({ ...f, slabs })))
                )}

                <FieldGroup className="grid grid-cols-3 gap-4">
                  <Field>
                    <FieldLabel>Free Waiting Time (min)</FieldLabel>
                    <Input
                      type="number"
                      value={airportForm.freeWaitingMinutes}
                      onChange={(e) => setAirportForm(f => ({ ...f, freeWaitingMinutes: parseInt(e.target.value) || 0 }))}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Waiting Charge (Rs./min)</FieldLabel>
                    <Input
                      type="number"
                      value={airportForm.waitingChargePerMin}
                      onChange={(e) => setAirportForm(f => ({ ...f, waitingChargePerMin: parseFloat(e.target.value) || 0 }))}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Min Advance Booking (Hrs)</FieldLabel>
                    <Input
                      type="number"
                      placeholder="Inherit"
                      value={(airportForm as any).minAdvanceBookingHours ?? ''}
                      onChange={(e) => setAirportForm(f => ({ ...f, minAdvanceBookingHours: e.target.value === '' ? undefined : parseFloat(e.target.value) }))}
                    />
                  </Field>
                </FieldGroup>

                {renderPreBookingCharges(airportForm.preBookingCharges!, (charges) => setAirportForm(f => ({ ...f, preBookingCharges: charges })))}
                {renderPeakHourConfig(airportForm.peakHour!, (config) => setAirportForm(f => ({ ...f, peakHour: config })))}
                {renderNightChargeConfig(airportForm.nightCharge!, (config) => setAirportForm(f => ({ ...f, nightCharge: config })))}
                {renderShortNoticeChargeConfig(airportForm.shortNoticeCharge, (config) => setAirportForm(f => ({ ...f, shortNoticeCharge: config })))}
              </>
            )}

            {type === 'railway' && (
              <>
                <FieldGroup className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Transfer Type</FieldLabel>
                    <Select
                      value={railwayForm.type}
                      onValueChange={(value: 'pickup' | 'drop' | 'both') => setRailwayForm(f => ({ ...f, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pickup">Station Pickup</SelectItem>
                        <SelectItem value="drop">Station Drop</SelectItem>
                        <SelectItem value="both">Both (Pickup & Drop)</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel>Calculation Type</FieldLabel>
                    <Select
                      value={railwayForm.calculationType}
                      onValueChange={(value: FareCalculationType) => setRailwayForm(f => ({ ...f, calculationType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Fare</SelectItem>
                        <SelectItem value="per_km">Per KM</SelectItem>
                        <SelectItem value="slab">Slab-wise</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>

                {railwayForm.calculationType === 'fixed' && (
                  <Field>
                    <FieldLabel>Fixed Fare (Rs.)</FieldLabel>
                    <Input type="number" value={railwayForm.fixedFare} onChange={(e) => setRailwayForm(f => ({ ...f, fixedFare: parseFloat(e.target.value) }))} />
                  </Field>
                )}

                {railwayForm.calculationType === 'per_km' && (
                  <FieldGroup className="grid grid-cols-3 gap-4">
                    <Field>
                      <FieldLabel>Per KM Rate (Rs.)</FieldLabel>
                      <Input type="number" value={railwayForm.perKmRate} onChange={(e) => setRailwayForm(f => ({ ...f, perKmRate: parseFloat(e.target.value) }))} />
                    </Field>
                    <Field>
                      <FieldLabel>Base Fare (Rs.)</FieldLabel>
                      <Input type="number" value={railwayForm.baseFare} onChange={(e) => setRailwayForm(f => ({ ...f, baseFare: parseFloat(e.target.value) }))} />
                    </Field>
                    <Field>
                      <FieldLabel>Minimum Fare (Rs.)</FieldLabel>
                      <Input type="number" value={railwayForm.minimumFare} onChange={(e) => setRailwayForm(f => ({ ...f, minimumFare: parseFloat(e.target.value) }))} />
                    </Field>
                  </FieldGroup>
                )}

                {railwayForm.calculationType === 'slab' && (
                  renderSlabConfig(railwayForm.slabs || [], (slabs) => setRailwayForm(f => ({ ...f, slabs })))
                )}

                <FieldGroup className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Free Waiting Time (min)</FieldLabel>
                    <Input type="number" value={railwayForm.freeWaitingMinutes} onChange={(e) => setRailwayForm(f => ({ ...f, freeWaitingMinutes: parseInt(e.target.value) || 0 }))} />
                  </Field>
                  <Field>
                    <FieldLabel>Waiting Charge (Rs./min)</FieldLabel>
                    <Input type="number" value={railwayForm.waitingChargePerMin} onChange={(e) => setRailwayForm(f => ({ ...f, waitingChargePerMin: parseFloat(e.target.value) || 0 }))} />
                  </Field>
                </FieldGroup>

                {renderPreBookingCharges(railwayForm.preBookingCharges!, (charges) => setRailwayForm(f => ({ ...f, preBookingCharges: charges })))}
                {renderPeakHourConfig(railwayForm.peakHour!, (config) => setRailwayForm(f => ({ ...f, peakHour: config })))}
                {renderNightChargeConfig(railwayForm.nightCharge!, (config) => setRailwayForm(f => ({ ...f, nightCharge: config })))}
              </>
            )}

            {type === 'rental' && (
              <>
                <Field>
                  <FieldLabel>Rental Type</FieldLabel>
                  <Select
                    value={rentalForm.rentalType}
                    onValueChange={(value: RentalType) => setRentalForm(f => ({ ...f, rentalType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="without_capping">Without KM Capping</SelectItem>
                      <SelectItem value="with_capping">With KM Capping</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <FieldGroup className={rentalForm.rentalType === 'with_capping' ? "grid grid-cols-3 gap-4" : "grid grid-cols-2 gap-4"}>
                  <Field>
                    <FieldLabel>Package Hours</FieldLabel>
                    <Input
                      type="number"
                      value={rentalForm.packageHours}
                      onChange={(e) => setRentalForm(f => ({ ...f, packageHours: parseInt(e.target.value) }))}
                    />
                  </Field>
                  {rentalForm.rentalType === 'with_capping' && (
                    <Field>
                      <FieldLabel>Package KM</FieldLabel>
                      <Input
                        type="number"
                        value={rentalForm.packageKm || 0}
                        onChange={(e) => setRentalForm(f => ({ ...f, packageKm: parseInt(e.target.value) || 0 }))}
                      />
                    </Field>
                  )}
                  <Field>
                    <FieldLabel>Package Fare (Rs.)</FieldLabel>
                    <Input
                      type="number"
                      value={rentalForm.packageFare}
                      onChange={(e) => setRentalForm(f => ({ ...f, packageFare: parseFloat(e.target.value) }))}
                    />
                  </Field>
                </FieldGroup>

                <FieldGroup className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Free Waiting Time (min)</FieldLabel>
                    <Input
                      type="number"
                      value={rentalForm.freeWaitingMinutes}
                      onChange={(e) => setRentalForm(f => ({ ...f, freeWaitingMinutes: parseInt(e.target.value) || 0 }))}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Min Advance Booking (Hrs)</FieldLabel>
                    <Input
                      type="number"
                      placeholder="Inherit"
                      value={(rentalForm as any).minAdvanceBookingHours ?? ''}
                      onChange={(e) => setRentalForm(f => ({ ...f, minAdvanceBookingHours: e.target.value === '' ? undefined : parseFloat(e.target.value) }))}
                    />
                  </Field>
                </FieldGroup>

                <FieldGroup className={rentalForm.rentalType === 'with_capping' ? "grid grid-cols-2 gap-4" : "grid grid-cols-1 gap-4"}>
                  {rentalForm.rentalType === 'with_capping' && (
                    <Field>
                      <FieldLabel>Extra KM Rate (Rs.)</FieldLabel>
                      <Input
                        type="number"
                        value={rentalForm.extraKmRate}
                        onChange={(e) => setRentalForm(f => ({ ...f, extraKmRate: parseFloat(e.target.value) }))}
                      />
                    </Field>
                  )}
                  <Field>
                    <FieldLabel>Extra Hour Rate (Rs.)</FieldLabel>
                    <Input
                      type="number"
                      value={rentalForm.extraHourRate}
                      onChange={(e) => setRentalForm(f => ({ ...f, extraHourRate: parseFloat(e.target.value) }))}
                    />
                  </Field>
                </FieldGroup>

                {renderPreBookingCharges(rentalForm.preBookingCharges!, (charges) => setRentalForm(f => ({ ...f, preBookingCharges: charges })))}
                {renderPeakHourConfig(rentalForm.peakHour!, (config) => setRentalForm(f => ({ ...f, peakHour: config })))}
                {renderNightChargeConfig(rentalForm.nightCharge!, (config) => setRentalForm(f => ({ ...f, nightCharge: config })))}
                {renderShortNoticeChargeConfig(rentalForm.shortNoticeCharge, (config) => setRentalForm(f => ({ ...f, shortNoticeCharge: config })))}
              </>
            )}

            {type === 'city' && (
              <>
                <Field>
                  <FieldLabel>Calculation Type</FieldLabel>
                  <Select
                    value={cityForm.calculationType}
                    onValueChange={(value: FareCalculationType) => setCityForm(f => ({ ...f, calculationType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per_km">Per KM</SelectItem>
                      <SelectItem value="slab">Slab-wise</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                {cityForm.calculationType === 'per_km' && (
                  <FieldGroup className="grid grid-cols-3 gap-4">
                    <Field>
                      <FieldLabel>Per KM Rate (Rs.)</FieldLabel>
                      <Input
                        type="number"
                        value={cityForm.perKmRate}
                        onChange={(e) => setCityForm(f => ({ ...f, perKmRate: parseFloat(e.target.value) }))}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Base Fare (Rs.)</FieldLabel>
                      <Input
                        type="number"
                        value={cityForm.baseFare}
                        onChange={(e) => setCityForm(f => ({ ...f, baseFare: parseFloat(e.target.value) }))}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Minimum Fare (Rs.)</FieldLabel>
                      <Input
                        type="number"
                        value={cityForm.minimumFare}
                        onChange={(e) => setCityForm(f => ({ ...f, minimumFare: parseFloat(e.target.value) }))}
                      />
                    </Field>
                  </FieldGroup>
                )}

                {cityForm.calculationType === 'slab' && (
                  renderSlabConfig(cityForm.slabs || [], (slabs) => setCityForm(f => ({ ...f, slabs })))
                )}

                <FieldGroup className="grid grid-cols-3 gap-4">
                  <Field>
                    <FieldLabel>Per Minute Rate (Rs.)</FieldLabel>
                    <Input
                      type="number"
                      step="0.1"
                      value={cityForm.perMinuteRate}
                      onChange={(e) => setCityForm(f => ({ ...f, perMinuteRate: parseFloat(e.target.value) }))}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Free Waiting Time (min)</FieldLabel>
                    <Input
                      type="number"
                      value={cityForm.freeWaitingMinutes}
                      onChange={(e) => setCityForm(f => ({ ...f, freeWaitingMinutes: parseInt(e.target.value) || 0 }))}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Min Advance Booking (Hrs)</FieldLabel>
                    <Input
                      type="number"
                      placeholder="Inherit"
                      value={(cityForm as any).minAdvanceBookingHours ?? ''}
                      onChange={(e) => setCityForm(f => ({ ...f, minAdvanceBookingHours: e.target.value === '' ? undefined : parseFloat(e.target.value) }))}
                    />
                  </Field>
                </FieldGroup>

                {renderPreBookingCharges(cityForm.preBookingCharges!, (charges) => setCityForm(f => ({ ...f, preBookingCharges: charges })))}
                {renderPeakHourConfig(cityForm.peakHour!, (config) => setCityForm(f => ({ ...f, peakHour: config })))}
                {renderNightChargeConfig(cityForm.nightCharge!, (config) => setCityForm(f => ({ ...f, nightCharge: config })))}
                {renderShortNoticeChargeConfig(cityForm.shortNoticeCharge, (config) => setCityForm(f => ({ ...f, shortNoticeCharge: config })))}
              </>
            )}

            {type === 'outstation' && (
              <>
                <Field>
                  <FieldLabel>Outstation Type</FieldLabel>
                  <Select
                    value={outstationForm.outstationType}
                    onValueChange={(value: OutstationType) => setOutstationForm(f => ({ ...f, outstationType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_way">One Way</SelectItem>
                      <SelectItem value="round_trip">Round Trip</SelectItem>
                      <SelectItem value="route_wise">Route Wise</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel>Day Calculation Method</FieldLabel>
                  <Select
                    value={outstationForm.dayCalculationMethod || 'calendar_day_night_grace'}
                    onValueChange={(value: OutstationDayCalculationMethod) => setOutstationForm(f => ({ ...f, dayCalculationMethod: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="calendar_day_night_grace">Calendar Day + Night Grace</SelectItem>
                      <SelectItem value="rolling_24_hours">Rolling 24 Hours</SelectItem>
                      <SelectItem value="strict_calendar_day">Strict Calendar Day</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                {outstationForm.dayCalculationMethod === 'calendar_day_night_grace' && (
                  <FieldGroup className="grid grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel>Grace End Time</FieldLabel>
                      <Input
                        type="time"
                        value={outstationForm.graceEndTime || '04:00'}
                        onChange={(e) => setOutstationForm(f => ({ ...f, graceEndTime: e.target.value }))}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Extra Hour Charge (Rs./hr)</FieldLabel>
                      <Input
                        type="number"
                        value={outstationForm.extraHourCharge || 0}
                        onChange={(e) => setOutstationForm(f => ({ ...f, extraHourCharge: parseFloat(e.target.value) || 0 }))}
                      />
                    </Field>
                  </FieldGroup>
                )}

                {outstationForm.outstationType === 'one_way' && (
                  renderSlabConfig(outstationForm.slabs || [], (slabs) => setOutstationForm(f => ({ ...f, slabs })))
                )}

                {outstationForm.outstationType === 'round_trip' && (
                  <Field>
                    <FieldLabel>Round Trip Rate (Rs./km)</FieldLabel>
                    <Input
                      type="number"
                      value={outstationForm.roundTripPerKmRate}
                      onChange={(e) => setOutstationForm(f => ({ ...f, roundTripPerKmRate: parseFloat(e.target.value) }))}
                    />
                  </Field>
                )}

                {outstationForm.outstationType === 'route_wise' && outstationForm.cityId && (
                  renderRouteConfig(
                    outstationForm.routes || [],
                    (routes) => setOutstationForm(f => ({ ...f, routes })),
                    outstationForm.cityId
                  )
                )}

                {outstationForm.outstationType === 'route_wise' && !outstationForm.cityId && (
                  <div className="rounded-lg border p-4 text-center text-muted-foreground">
                    Please select a city first to configure routes
                  </div>
                )}

                <FieldGroup className="grid grid-cols-3 gap-4">
                  <Field>
                    <FieldLabel>Driver Allowance</FieldLabel>
                    <Select
                      value={outstationForm.driverAllowanceCalculationMethod || 'per_chargeable_day'}
                      onValueChange={(value: DriverAllowanceCalculationMethod) => setOutstationForm(f => ({ ...f, driverAllowanceCalculationMethod: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per_chargeable_day">Per Chargeable Day</SelectItem>
                        <SelectItem value="per_overnight_halt">Per Overnight Halt</SelectItem>
                        <SelectItem value="fixed_per_trip">Fixed Per Trip</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel>Driver Allowance Amount (Rs.)</FieldLabel>
                    <Input
                      type="number"
                      value={outstationForm.driverAllowancePerDay}
                      onChange={(e) => setOutstationForm(f => ({ ...f, driverAllowancePerDay: parseFloat(e.target.value) }))}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Minimum KM Per Day</FieldLabel>
                    <Input
                      type="number"
                      value={outstationForm.minimumKmPerDay}
                      onChange={(e) => setOutstationForm(f => ({ ...f, minimumKmPerDay: parseInt(e.target.value) || 0 }))}
                    />
                  </Field>
                </FieldGroup>

                <FieldGroup className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Free Waiting Time (min)</FieldLabel>
                    <Input
                      type="number"
                      value={outstationForm.freeWaitingMinutes}
                      onChange={(e) => setOutstationForm(f => ({ ...f, freeWaitingMinutes: parseInt(e.target.value) || 0 }))}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Min Advance Booking (Hrs)</FieldLabel>
                    <Input
                      type="number"
                      placeholder="Inherit"
                      value={(outstationForm as any).minAdvanceBookingHours ?? ''}
                      onChange={(e) => setOutstationForm(f => ({ ...f, minAdvanceBookingHours: e.target.value === '' ? undefined : parseFloat(e.target.value) }))}
                    />
                  </Field>
                </FieldGroup>

                {(outstationForm.outstationType === 'one_way' || outstationForm.outstationType === 'route_wise') && (
                  renderAutoSlotReturnConfig(outstationForm.autoSlotReturn, (config) => setOutstationForm(f => ({ ...f, autoSlotReturn: config })))
                )}

                {renderPreBookingCharges(outstationForm.preBookingCharges!, (charges) => setOutstationForm(f => ({ ...f, preBookingCharges: charges })))}
                {renderPeakHourConfig(outstationForm.peakHour!, (config) => setOutstationForm(f => ({ ...f, peakHour: config })))}
                {renderNightChargeConfig(outstationForm.nightCharge!, (config) => setOutstationForm(f => ({ ...f, nightCharge: config })))}
                {renderShortNoticeChargeConfig(outstationForm.shortNoticeCharge, (config) => setOutstationForm(f => ({ ...f, shortNoticeCharge: config })))}
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {editingFare ? 'Update Fare' : 'Add Fare'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
