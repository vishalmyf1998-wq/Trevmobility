// @ts-nocheck
"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAdmin } from "@/lib/admin-context"
import { Booking, PromoCode } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Plus,
  Search,
  XCircle,
  Car,
  Phone,
  Building2,
  User,
  Wallet,
  ArrowLeft,
  UserPlus,
  Trash2
} from "lucide-react"
import { toast } from "sonner"
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field"
import { PhoneInput } from "@/components/ui/phone-input"

type BookingFormData = Omit<Booking, "id" | "createdAt" | "bookingNumber" | "eventLog">

const ADMIN_USER = "Admin" // In real app, get from auth context

const initialFormData: BookingFormData = {
  b2cCustomerId: undefined,
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  customerAddress: "",
  b2bClientId: undefined,
  b2bEmployeeId: undefined,
  driverId: undefined,
  carId: undefined,
  cityId: "",
  carCategoryId: "",
  tripType: "city_ride",
  airportId: undefined,
  airportTerminalId: undefined,
  pickupLocation: "",
  dropLocation: "",
  pickupDate: "",
  pickupTime: "",
  returnDate: "",
  estimatedKm: 0,
  estimatedFare: 0,
  actualKm: 0,
  actualFare: 0,
  extraCharges: 0,
  peakHourCharge: 0,
  nightCharge: 0,
  waitingCharge: 0,
  tollCharges: 0,
  parkingCharges: 0,
  miscCharges: 0,
  totalFare: 0,
  gstAmount: 0,
  grandTotal: 0,
  advancePaid: 0,
  promoDiscount: 0,
  status: "pending",
  paymentStatus: "pending",
  remarks: "",
  stops: [],
}

export default function BookingsPage() {
    const router = useRouter()
    const {
      bookings,
      b2cCustomers,
      addBooking,
      drivers,
      cars,
      cities,
      airports,
      carCategories,
      b2bClients,
      b2bEmployees,
      fareGroups,
      promoCodes,
      gstConfig,
      upsertB2CCustomer,
      getAirport,
      getAirportTerminal,
      getB2BClient,
      getB2BEmployee,
      userType,
      currentUser,
      tollLocations,
      updatePromoCode
    } = useAdmin()

    const isCorpEmployee = userType === 'corporate-employee'
    const isCorpAdmin = userType === 'corporate-admin'
    const isB2BUser = isCorpEmployee || isCorpAdmin
    const currentB2BUser = isB2BUser
      ? b2bEmployees.find(e => e.officeEmail === currentUser?.email) ||
        b2bEmployees.find(e => e.id === (isCorpAdmin ? 'dummy-corp-admin' : 'dummy-corp-emp')) ||
        (b2bEmployees.length > 0 ? b2bEmployees[0] : {
          id: 'demo',
          name: 'Demo Employee',
          employeeId: 'EMP001',
          b2bClientId: b2bClients[0]?.id || 'demo-client',
          officeEmail: currentUser?.email || 'employee@company.com',
          phone: '+91 98765 43210',
          status: 'approved',
          canLogin: true
        } as any)
      : null

    const [formData, setFormData] = useState<BookingFormData>(initialFormData)
    const [customerType, setCustomerType] = useState<"b2c" | "b2b">(isB2BUser ? "b2b" : "b2c")
    const [b2cSearchQuery, setB2cSearchQuery] = useState("")
    const [b2cSearchOpen, setB2cSearchOpen] = useState(false)

    const isAirportTrip = formData.tripType === "airport_pickup" || formData.tripType === "airport_drop"
    const cityAirports = airports.filter((airport) => airport.cityId === formData.cityId && airport.isActive)
    const selectedAirport = formData.airportId ? getAirport(formData.airportId) : undefined
    const airportTerminals = selectedAirport?.terminals.filter((terminal) => terminal.isActive) || []

    const formatAirportLocation = useCallback((airportId?: string, terminalId?: string) => {
        if (!airportId || !terminalId) return ""
        const airport = getAirport(airportId)
        const terminal = getAirportTerminal(airportId, terminalId)
        if (!airport || !terminal) return ""
        return `${airport.name} (${airport.code}) - ${terminal.name}`
    }, [getAirport, getAirportTerminal])

    const getPromoEligibilityError = useCallback((
      promo: PromoCode,
      amount: number,
      cityId: string,
      tripType: Booking["tripType"]
    ) => {
      const now = new Date()
      if (!promo.isActive) return "This promo code is inactive"
      if (new Date(promo.validFrom) > now) return "This promo code is not active yet"
      if (new Date(promo.validTo) < now) return "This promo code has expired"
      if (promo.usedCount >= promo.usageLimit) return "This promo code has reached its usage limit"
      if (amount < promo.minOrderValue) {
        return `Minimum fare required is Rs. ${promo.minOrderValue.toFixed(2)}`
      }
      if (promo.applicableTripTypes.length > 0 && !promo.applicableTripTypes.includes(tripType)) {
        return "This promo code is not valid for the selected trip type"
      }
      if (promo.applicableCities.length > 0) {
        if (!cityId) return "Select a city to use this promo code"
        if (!promo.applicableCities.includes(cityId)) {
          return "This promo code is not valid for the selected city"
        }
      }
      return null
    }, [])

    const calculatePromoDiscount = useCallback((promo: PromoCode, amount: number) => {
      const discount =
        promo.discountType === "percentage"
          ? Math.min((amount * promo.discountValue) / 100, promo.maxDiscount || Number.POSITIVE_INFINITY)
          : promo.discountValue

      return Math.min(discount, amount)
    }, [])

    const eligiblePromoCodes = promoCodes.filter(
      (promo) => !getPromoEligibilityError(promo, formData.totalFare, formData.cityId, formData.tripType)
    )
    const selectedFormPromo = formData.promoCodeId
      ? promoCodes.find((promo) => promo.id === formData.promoCodeId)
      : undefined
    const selectedPromoError = selectedFormPromo
      ? getPromoEligibilityError(selectedFormPromo, formData.totalFare, formData.cityId, formData.tripType)
      : null

    const generateBookingNumber = () => {
      const date = new Date()
      const year = date.getFullYear().toString().slice(-2)
      const month = (date.getMonth() + 1).toString().padStart(2, "0")
      const day = date.getDate().toString().padStart(2, "0")
      const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, "0")
      return `BK${year}${month}${day}${randomPart}`
    }

    const createEventLog = (
      event: BookingEventLog["event"],
      toStatus: string,
      fromStatus?: string,
      notes?: string
    ): BookingEventLog => ({
      id: crypto.randomUUID(),
      event,
      fromStatus,
      toStatus,
      performedBy: ADMIN_USER,
      performedAt: new Date().toISOString(),
      notes,
    })

    const calculateFareFromConfig = useCallback((cityId: string, carCategoryId: string, tripType: string, clientType: "b2c" | "b2b", b2bClientId?: string, airportId?: string, airportTerminalId?: string) => {
        let fareGroup = null

        if (clientType === "b2b" && b2bClientId) {
            const client = b2bClients.find(c => c.id === b2bClientId)
            if (client?.fareGroupId) {
                fareGroup = fareGroups.find(fg => fg.id === client.fareGroupId)
            }
        }

        if (!fareGroup) {
            fareGroup = fareGroups.find(
            (fg) => (clientType === "b2b" ? fg.type === "B2B" : fg.type === "B2C") && fg.isDefault
            ) || fareGroups.find(fg => clientType === "b2b" ? fg.type === "B2B" : fg.type === "B2C") || fareGroups[0]
        }

        if (!fareGroup || !cityId || !carCategoryId) {
            return { baseFare: 0, perKmRate: 0, calculationType: "fixed" as const }
        }

        switch (tripType) {
            case "airport_pickup":
            case "airport_drop": {
            const transferType = tripType === "airport_pickup" ? "pickup" : "drop"
            const matchingFares = fareGroup.airportFares.filter(
                (f) =>
                f.cityId === cityId &&
                f.carCategoryId === carCategoryId &&
                (f.type === transferType || f.type === "both")
            )
            const airportFare =
                matchingFares.find((f) => f.airportId === airportId && airportTerminalId && (
                f.airportTerminalIds?.includes(airportTerminalId) || f.airportTerminalId === airportTerminalId
                )) ||
                matchingFares.find((f) => f.airportId === airportId && !f.airportTerminalId && !f.airportTerminalIds?.length) ||
                matchingFares.find((f) => !f.airportId && !f.airportTerminalId)
            if (airportFare) {
                return {
                baseFare: airportFare.baseFare || airportFare.fixedFare || 0,
                perKmRate: airportFare.perKmRate || 0,
                calculationType: airportFare.calculationType,
                slabs: airportFare.slabs,
                fixedFare: airportFare.fixedFare,
                minimumFare: airportFare.minimumFare,
                preBookingCharges: airportFare.preBookingCharges,
                urgentBooking: airportFare.urgentBooking,
                }
            }
            break
            }
            case "city_ride": {
            const cityFare = fareGroup.cityRideFares.find(
                (f) => f.cityId === cityId && f.carCategoryId === carCategoryId
            )
            if (cityFare) {
                return {
                baseFare: cityFare.baseFare || cityFare.fixedFare || 0,
                perKmRate: cityFare.perKmRate || 0,
                calculationType: cityFare.calculationType,
                slabs: cityFare.slabs,
                fixedFare: cityFare.fixedFare,
                minimumFare: cityFare.minimumFare,
                preBookingCharges: cityFare.preBookingCharges,
                urgentBooking: cityFare.urgentBooking,
                }
            }
            break
            }
            case "rental": {
            const rentalFare = fareGroup.rentalFares.find(
                (f) => f.cityId === cityId && f.carCategoryId === carCategoryId
            )
            if (rentalFare) {
                return {
                baseFare: rentalFare.packageFare,
                perKmRate: rentalFare.extraKmRate,
                calculationType: "package" as const,
                packageHours: rentalFare.packageHours,
                packageKm: rentalFare.packageKm,
                extraHourRate: rentalFare.extraHourRate,
                preBookingCharges: rentalFare.preBookingCharges,
                urgentBooking: rentalFare.urgentBooking,
                }
            }
            break
            }
            case "outstation": {
            const outstationFare = fareGroup.outstationFares.find(
                (f) => f.cityId === cityId && f.carCategoryId === carCategoryId
            )
            if (outstationFare) {
                return {
                baseFare: 0,
                perKmRate: outstationFare.oneWayPerKmRate || 0,
                roundTripPerKmRate: outstationFare.roundTripPerKmRate,
                calculationType: outstationFare.outstationType,
                routes: outstationFare.routes,
                driverAllowancePerDay: outstationFare.driverAllowancePerDay,
                minimumKmPerDay: outstationFare.minimumKmPerDay,
                preBookingCharges: outstationFare.preBookingCharges,
                urgentBooking: outstationFare.urgentBooking,
                autoSlotReturn: outstationFare.autoSlotReturn,
                }
            }
            break
            }
        }

        return { baseFare: 0, perKmRate: 0, calculationType: "fixed" as const }
    }, [fareGroups, b2bClients])
    
    useEffect(() => {
        if (isB2BUser && currentB2BUser?.id && (!formData.b2bClientId || (isCorpEmployee && !formData.b2bEmployeeId))) {
            setFormData(prev => ({
            ...prev,
            b2bClientId: currentB2BUser.b2bClientId || prev.b2bClientId,
            b2bEmployeeId: isCorpEmployee ? currentB2BUser.id : prev.b2bEmployeeId
            }));
        }

        if (formData.cityId && formData.carCategoryId && formData.tripType) {
            const fareConfig = calculateFareFromConfig(
            formData.cityId,
            formData.carCategoryId,
            formData.tripType,
            customerType,
            formData.b2bClientId,
            formData.airportId,
            formData.airportTerminalId
            )

            let estimatedFare = 0
            let preBookingToll = 0
            let preBookingParking = 0

            if (fareConfig.preBookingCharges) {
            if (fareConfig.preBookingCharges.tollEnabled) {
                preBookingToll = fareConfig.preBookingCharges.tollAmount
            }
            if (fareConfig.preBookingCharges.parkingEnabled) {
                preBookingParking = fareConfig.preBookingCharges.parkingAmount
            }
            }

            const estKm = formData.estimatedKm || 0
            let days = 1
            if (formData.pickupDate && formData.returnDate) {
            const pDate = new Date(formData.pickupDate)
            const rDate = new Date(formData.returnDate)
            if (!isNaN(pDate.getTime()) && !isNaN(rDate.getTime())) {
                days = Math.ceil(Math.abs(rDate.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
            }
            }

            if (fareConfig.calculationType === "fixed" && fareConfig.fixedFare) {
            estimatedFare = fareConfig.fixedFare
            } else if (fareConfig.calculationType === "package" && fareConfig.baseFare) {
            estimatedFare = fareConfig.baseFare
            } else if (fareConfig.calculationType === "per_km" && fareConfig.perKmRate) {
            estimatedFare = (fareConfig.baseFare || 0) + (estKm * fareConfig.perKmRate)
            if (fareConfig.minimumFare && estimatedFare < fareConfig.minimumFare) {
                estimatedFare = fareConfig.minimumFare
            }
            } else if (formData.tripType === "outstation") {
            const minKm = (fareConfig.minimumKmPerDay || 250) * days
            const billableKm = Math.max(estKm, minKm)
            const rate = fareConfig.roundTripPerKmRate || fareConfig.perKmRate || 0
            const driverAllowance = (fareConfig.driverAllowancePerDay || 0) * days
            estimatedFare = (billableKm * rate) + driverAllowance
            } else {
            estimatedFare = fareConfig.baseFare || fareConfig.minimumFare || 0
            }

            let returnDiscountAmount = 0
            let returnDiscountLabel = ''
            if ((formData as any).isAutoSlotReturn && fareConfig.autoSlotReturn?.discountEnabled) {
            const discountValue = fareConfig.autoSlotReturn.discountValue || 0
            if (fareConfig.autoSlotReturn.discountType === 'flat') {
                returnDiscountAmount = discountValue
                returnDiscountLabel = `Auto return discount Rs. ${discountValue}`
            } else {
                returnDiscountAmount = (estimatedFare * discountValue) / 100
                returnDiscountLabel = `Auto return discount ${discountValue}%`
            }
            if (fareConfig.autoSlotReturn.maxDiscount && returnDiscountAmount > fareConfig.autoSlotReturn.maxDiscount) {
                returnDiscountAmount = fareConfig.autoSlotReturn.maxDiscount
            }
            returnDiscountAmount = Math.min(returnDiscountAmount, estimatedFare)
            estimatedFare = Math.max(estimatedFare - returnDiscountAmount, 0)
            }

            let urgentCharge = 0
            if (fareConfig.urgentBooking?.enabled && formData.pickupDate && formData.pickupTime) {
            const pickupDateTime = new Date(`${formData.pickupDate}T${formData.pickupTime}`)
            const now = new Date()
            if (!isNaN(pickupDateTime.getTime())) {
                const diffHours = (pickupDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)
                if (diffHours >= 0 && diffHours <= fareConfig.urgentBooking.timeWindowHours) {
                if (fareConfig.urgentBooking.chargeType === 'flat') {
                    urgentCharge = fareConfig.urgentBooking.chargeValue
                } else {
                    urgentCharge = (estimatedFare * fareConfig.urgentBooking.chargeValue) / 100
                }
                }
            }
            }

            const totalFare = estimatedFare + preBookingToll + preBookingParking + urgentCharge
            const selectedPromo = promoCodes.find((promo) => promo.id === formData.promoCodeId)
            const promoDiscount =
            selectedPromo && !getPromoEligibilityError(selectedPromo, totalFare, formData.cityId, formData.tripType)
                ? calculatePromoDiscount(selectedPromo, totalFare)
                : 0
            const taxableFare = Math.max(totalFare - promoDiscount, 0)

            let isGSTEnabled = true
            if (customerType === 'b2b' && formData.b2bClientId) {
            const client = b2bClients.find(c => c.id === formData.b2bClientId)
            if (client && client.isGSTEnabled === false) {
                isGSTEnabled = false
            }
            }

            const gstRate = isGSTEnabled ? gstConfig.cgstRate + gstConfig.sgstRate : 0
            const gstAmount = (taxableFare * gstRate) / 100
            const grandTotal = taxableFare + gstAmount

            setFormData(prev => ({
            ...prev,
            estimatedFare,
            returnDiscountAmount,
            returnDiscountLabel,
            tollCharges: preBookingToll,
            parkingCharges: preBookingParking,
            extraCharges: urgentCharge, // Store urgent charge as extra charge
            totalFare,
            promoDiscount,
            gstAmount,
            grandTotal,
            }))
        }
    }, [formData.cityId, formData.carCategoryId, formData.tripType, (formData as any).isAutoSlotReturn, formData.b2bClientId, formData.airportId, formData.airportTerminalId, formData.promoCodeId, customerType, calculateFareFromConfig, getPromoEligibilityError, calculatePromoDiscount, promoCodes, gstConfig, b2bClients])

    useEffect(() => {
        const actualPickup = formData.tripType === "airport_pickup"
            ? formatAirportLocation(formData.airportId, formData.airportTerminalId)
            : formData.pickupLocation
        const actualDrop = formData.tripType === "airport_drop"
            ? formatAirportLocation(formData.airportId, formData.airportTerminalId)
            : formData.dropLocation

        if (actualPickup?.length > 3 && actualDrop?.length > 3) {
            const calculateDistance = () => {
            const base = actualPickup.length + actualDrop.length
            let estKm = (base * 3) % 60 + 12 

            if (formData.tripType === "outstation") {
                estKm = (base * 12) % 600 + 150
            }

            let extraStopsKm = 0;
            if (formData.stops && formData.stops.length > 0) {
                extraStopsKm = formData.stops.filter(s => s.location && s.location.length > 3).reduce((acc, stop) => {
                    return acc + ((stop.location.length * 2) % 15 + 5); 
                }, 0);
            }

            const totalEstKm = estKm + extraStopsKm;
            
            let autoTollAmount = 0;
            if (tollLocations && tollLocations.length > 0) {
                const pickupLower = actualPickup.toLowerCase();
                const dropLower = actualDrop.toLowerCase();
                tollLocations.forEach(toll => {
                if (toll.isActive) {
                    const tollNameLower = toll.name.toLowerCase();
                    if (pickupLower.includes(tollNameLower) || dropLower.includes(tollNameLower)) {
                    autoTollAmount += toll.amount;
                    }
                }
                });
            }

            setFormData(prev => {
                const hasChanges = prev.estimatedKm !== totalEstKm || (autoTollAmount > 0 && prev.tollCharges !== autoTollAmount);
                if (!hasChanges) return prev;
                return {
                ...prev,
                estimatedKm: totalEstKm,
                tollCharges: autoTollAmount > 0 ? autoTollAmount : prev.tollCharges
                }
            });
            }

            const timeoutId = setTimeout(calculateDistance, 800)
            return () => clearTimeout(timeoutId)
        }
    }, [formData.pickupLocation, formData.dropLocation, formData.tripType, formData.airportId, formData.airportTerminalId, formatAirportLocation, JSON.stringify(formData.stops), tollLocations])

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()

      if (!formData.customerName && customerType === "b2c") {
        toast.error("Please enter customer name")
        return
      }
      if (!formData.customerPhone && customerType === "b2c") {
        toast.error("Please enter customer phone number")
        return
      }
      if (customerType === "b2b" && !formData.b2bClientId) {
        toast.error("Please select a B2B client")
        return
      }
      if (customerType === "b2b" && !formData.b2bEmployeeId) {
        toast.error("Please select a B2B employee")
        return
      }
      if (!formData.cityId || !formData.carCategoryId) {
        toast.error("Please select city and car category")
        return
      }
      if (isAirportTrip && (!formData.airportId || !formData.airportTerminalId)) {
        toast.error("Please select airport and terminal")
        return
      }
      
      const selectedPromo = formData.promoCodeId
        ? promoCodes.find((promo) => promo.id === formData.promoCodeId)
        : undefined
      if (formData.promoCodeId && !selectedPromo) {
        toast.error("Selected promo code was not found")
        return
      }
      if (selectedPromo) {
        const promoError = getPromoEligibilityError(
          selectedPromo,
          formData.totalFare,
          formData.cityId,
          formData.tripType
        )
        if (promoError) {
          toast.error(promoError)
          return
        }
      }

      let finalData = { ...formData }
      if (customerType === "b2c") {
        const customer = await upsertB2CCustomer({
            name: formData.customerName,
            phone: formData.customerPhone,
            email: formData.customerEmail,
            address: formData.customerAddress,
        })
        finalData = { ...finalData, b2cCustomerId: customer.id }
      }
      if (isAirportTrip) {
        const airportLocation = formatAirportLocation(formData.airportId, formData.airportTerminalId)
        finalData = {
            ...finalData,
            pickupLocation: formData.tripType === "airport_pickup" ? airportLocation : formData.pickupLocation,
            dropLocation: formData.tripType === "airport_drop" ? airportLocation : formData.dropLocation,
        }
      } else {
        finalData = { ...finalData, airportId: undefined, airportTerminalId: undefined }
      }
      if (customerType === "b2b" && formData.b2bClientId && formData.b2bEmployeeId) {
        const client = getB2BClient(formData.b2bClientId)
        const employee = getB2BEmployee(formData.b2bEmployeeId)
        if (client && employee) {
            finalData = {
                ...finalData,
                customerName: employee.name,
                customerPhone: employee.phone,
                customerEmail: employee.officeEmail,
                customerAddress: client.billingAddress || employee.address || '',
            }
        }
      }

      const eventLog = createEventLog("created", "pending", undefined, "Booking created")
      addBooking({
        ...finalData,
        bookingNumber: generateBookingNumber(),
        eventLog: [eventLog],
        createdBy: ADMIN_USER,
      })
      if (selectedPromo) {
        updatePromoCode(selectedPromo.id, { usedCount: selectedPromo.usedCount + 1 })
      }
      toast.success("Booking created successfully")
      // Reset form after successful submission
      setFormData(initialFormData)
    }

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8">
            <div className="flex items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Create New Booking</h1>
                    <p className="text-muted-foreground">Fill in the details to create a new trip.</p>
                </div>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Customer Information</CardTitle>
                            <CardDescription>Select or create a customer for this booking.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <Field>
                                <FieldLabel>Customer Type</FieldLabel>
                                <Select value={customerType} onValueChange={(v) => setCustomerType(v as "b2c" | "b2b")} disabled={isB2BUser}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select customer type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="b2c">Individual (B2C)</SelectItem>
                                        <SelectItem value="b2b">Business (B2B)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>

                            {customerType === 'b2c' && (
                              <div className="space-y-4 pt-4 border-t">
                                <Field>
                                  <FieldLabel>Search Existing Customer</FieldLabel>
                                  <Popover open={b2cSearchOpen} onOpenChange={setB2cSearchOpen}>
                                    <PopoverTrigger asChild>
                                      <div className="relative">
                                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                          placeholder="Search by name, phone, or code..."
                                          value={b2cSearchQuery}
                                          onChange={(e) => {
                                            setB2cSearchQuery(e.target.value)
                                            if (e.target.value.length > 0) setB2cSearchOpen(true)
                                            else setB2cSearchOpen(false)
                                          }}
                                          className="pl-10"
                                        />
                                      </div>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                      <Command>
                                        <CommandInput placeholder="Type to search..." />
                                        <CommandList>
                                          <CommandEmpty>
                                            <div className="p-4 text-sm text-center">No customers found.</div>
                                          </CommandEmpty>
                                          <CommandGroup>
                                            {b2cCustomers
                                              .filter(c =>
                                                !b2cSearchQuery ||
                                                c.name.toLowerCase().includes(b2cSearchQuery.toLowerCase()) ||
                                                c.phone.includes(b2cSearchQuery) ||
                                                (c.customerCode && c.customerCode.toLowerCase().includes(b2cSearchQuery.toLowerCase()))
                                              ).map((customer) => (
                                                <CommandItem
                                                  key={customer.id}
                                                  onSelect={() => {
                                                    setFormData(prev => ({
                                                      ...prev,
                                                      b2cCustomerId: customer.id,
                                                      customerName: customer.name,
                                                      customerPhone: customer.phone,
                                                      customerEmail: customer.email || "",
                                                      customerAddress: customer.address || "",
                                                    }))
                                                    setB2cSearchQuery(customer.name)
                                                    setB2cSearchOpen(false)
                                                    toast.success(`Selected: ${customer.name}`)
                                                  }}
                                                >
                                                  <div className="flex items-center justify-between w-full">
                                                    <div>
                                                      <p>{customer.name} <span className="text-muted-foreground text-xs">({customer.customerCode})</span></p>
                                                      <p className="text-xs text-muted-foreground">{customer.phone}</p>
                                                    </div>
                                                  </div>
                                                </CommandItem>
                                              ))}
                                          </CommandGroup>
                                        </CommandList>
                                      </Command>
                                    </PopoverContent>
                                  </Popover>
                                </Field>
                                {formData.b2cCustomerId ? (
                                  <div className="bg-muted/50 rounded-lg p-3 relative">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-1 right-1 h-6 w-6 text-muted-foreground"
                                        onClick={() => {
                                          setFormData(prev => ({
                                            ...prev,
                                            b2cCustomerId: undefined,
                                            customerName: "",
                                            customerPhone: "",
                                            customerEmail: "",
                                            customerAddress: "",
                                          }))
                                          setB2cSearchQuery("")
                                        }}
                                      >
                                        <XCircle className="h-4 w-4" />
                                      </Button>
                                    <p className="text-sm font-semibold mb-2">Selected Customer</p>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                      <div><strong className="text-muted-foreground font-normal">Name:</strong> {formData.customerName}</div>
                                      <div><strong className="text-muted-foreground font-normal">Phone:</strong> {formData.customerPhone}</div>
                                      {formData.customerEmail && <div className="col-span-2"><strong className="text-muted-foreground font-normal">Email:</strong> {formData.customerEmail}</div>}
                                      {formData.customerAddress && <div className="col-span-2"><strong className="text-muted-foreground font-normal">Address:</strong> {formData.customerAddress}</div>}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-2 gap-4">
                                    <Field>
                                      <FieldLabel>Customer Name *</FieldLabel>
                                      <Input value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} placeholder="Full Name" />
                                    </Field>
                                    <Field>
                                      <FieldLabel>Customer Phone *</FieldLabel>
                                      <PhoneInput value={formData.customerPhone} onChange={val => setFormData({...formData, customerPhone: val})} placeholder="Phone Number" />
                                    </Field>
                                  </div>
                                )}
                              </div>
                            )}

                            {customerType === 'b2b' && (
                              <div className="space-y-4 pt-4 border-t">
                                {isB2BUser && (
                                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                                      <Building2 className="h-5 w-5 text-primary" />
                                      <div>
                                        <p className="font-medium text-sm">B2B Booking Only</p>
                                        <p className="text-xs text-muted-foreground">Your account is restricted to corporate bookings</p>
                                      </div>
                                    </div>
                                  )}
                                <Field>
                                    <FieldLabel>Select B2B Client *</FieldLabel>
                                    <Select
                                      value={formData.b2bClientId || ""}
                                      onValueChange={(value) =>
                                        setFormData({ ...formData, b2bClientId: value, b2bEmployeeId: undefined })
                                      }
                                      disabled={isB2BUser}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select a B2B client" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {b2bClients
                                          .filter((c) => c.status === "active")
                                          .map((client) => (
                                            <SelectItem key={client.id} value={client.id}>
                                              {client.companyName} - {client.contactPerson}
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                  </Field>
                                  {formData.b2bClientId && (
                                    <Field>
                                      <FieldLabel>Select Employee {isCorpEmployee && "(Auto-selected)"}</FieldLabel>
                                      <Select
                                        value={formData.b2bEmployeeId || ""}
                                        onValueChange={(value) =>
                                          setFormData({ ...formData, b2bEmployeeId: value })
                                        }
                                        disabled={isCorpEmployee}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select an employee" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {b2bEmployees
                                            .filter((e) => e.b2bClientId === formData.b2bClientId && e.status === "approved" && e.canLogin)
                                            .map((employee) => (
                                              <SelectItem key={employee.id} value={employee.id}>
                                                {employee.name} - {employee.employeeId} ({employee.officeEmail})
                                              </SelectItem>
                                            ))}
                                          {b2bEmployees.filter((e) => e.b2bClientId === formData.b2bClientId && e.status === "approved" && e.canLogin).length === 0 && (
                                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                              No approved employees found for this client
                                            </div>
                                          )}
                                        </SelectContent>
                                      </Select>
                                      {isB2BUser && currentB2BUser && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Logged in as: <strong>{currentB2BUser.name}</strong> ({currentB2BUser.employeeId})
                                        </p>
                                      )}
                                    </Field>
                                  )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Trip Details</CardTitle>
                            <CardDescription>Specify the trip route, type, and schedule.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                        <FieldGroup className="grid grid-cols-3 gap-4">
                          <Field>
                            <FieldLabel>City *</FieldLabel>
                            <Select
                              value={formData.cityId}
                              onValueChange={(value) =>
                                setFormData({
                                  ...formData,
                                  cityId: value,
                                  airportId: undefined,
                                  airportTerminalId: undefined,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select city" />
                              </SelectTrigger>
                              <SelectContent>
                                {cities
                                  .filter((c) => c.isActive)
                                  .map((city) => (
                                    <SelectItem key={city.id} value={city.id}>
                                      {city.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </Field>
                          <Field>
                            <FieldLabel>Car Category *</FieldLabel>
                            <Select
                              value={formData.carCategoryId}
                              onValueChange={(value) =>
                                setFormData({ ...formData, carCategoryId: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {carCategories
                                  .filter((c) => c.isActive)
                                  .map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                      {cat.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </Field>
                          <Field>
                            <FieldLabel>Trip Type *</FieldLabel>
                            <Select
                              value={formData.tripType}
                              onValueChange={(value) =>
                                setFormData({
                                  ...formData,
                                  tripType: value as Booking["tripType"],
                                  airportId: undefined,
                                  airportTerminalId: undefined,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select trip type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="city_ride">City Ride</SelectItem>
                                <SelectItem value="airport_pickup">Airport Pickup</SelectItem>
                                <SelectItem value="airport_drop">Airport Drop</SelectItem>
                                <SelectItem value="rental">Rental</SelectItem>
                                <SelectItem value="outstation">Outstation</SelectItem>
                              </SelectContent>
                            </Select>
                          </Field>
                        </FieldGroup>

                        {isAirportTrip && (
                          <FieldGroup className="grid grid-cols-2 gap-4">
                            <Field>
                              <FieldLabel>Airport *</FieldLabel>
                              <Select
                                value={formData.airportId || ""}
                                onValueChange={(value) =>
                                  setFormData({
                                    ...formData,
                                    airportId: value,
                                    airportTerminalId: undefined,
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select airport" />
                                </SelectTrigger>
                                <SelectContent>
                                  {cityAirports.map((airport) => (
                                    <SelectItem key={airport.id} value={airport.id}>
                                      {airport.name} ({airport.code})
                                    </SelectItem>
                                  ))}
                                  {cityAirports.length === 0 && (
                                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                      No active airports for this city.
                                    </div>
                                  )}
                                </SelectContent>
                              </Select>
                            </Field>
                            <Field>
                              <FieldLabel>Terminal *</FieldLabel>
                              <Select
                                value={formData.airportTerminalId || ""}
                                onValueChange={(value) =>
                                  setFormData({ ...formData, airportTerminalId: value })
                                }
                                disabled={!formData.airportId}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select terminal" />
                                </SelectTrigger>
                                <SelectContent>
                                  {airportTerminals.map((terminal) => (
                                    <SelectItem key={terminal.id} value={terminal.id}>
                                      {terminal.name}
                                    </SelectItem>
                                  ))}
                                  {formData.airportId && airportTerminals.length === 0 && (
                                     <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                      No active terminals for this airport.
                                    </div>
                                  )}
                                </SelectContent>
                              </Select>
                            </Field>
                          </FieldGroup>
                        )}
                      
                       <div className="space-y-2">
                           <Field>
                                <FieldLabel>{formData.tripType === "airport_pickup" ? "Pickup From" : "Pickup Location *"}</FieldLabel>
                                <Input
                                value={
                                    formData.tripType === "airport_pickup"
                                    ? formatAirportLocation(formData.airportId, formData.airportTerminalId)
                                    : formData.pickupLocation
                                }
                                onChange={(e) =>
                                    setFormData({ ...formData, pickupLocation: e.target.value })
                                }
                                placeholder={formData.tripType === "airport_pickup" ? "Airport/Terminal selected above" : "Enter pickup location"}
                                disabled={formData.tripType === "airport_pickup"}
                                />
                            </Field>
                            {(formData.stops || []).length > 0 && (
                                <div className="space-y-2 pl-4 border-l-2 ml-2">
                                {(formData.stops || []).map((stop, index) => (
                                    <Field key={stop.id}>
                                    <div className="flex items-center gap-2">
                                        <Label className="text-xs font-semibold text-muted-foreground w-14 shrink-0">Stop {index + 1}</Label>
                                        <Input
                                        value={stop.location}
                                        onChange={(e) => {
                                            const newStops = [...(formData.stops || [])];
                                            newStops[index].location = e.target.value;
                                            setFormData(prev => ({ ...prev, stops: newStops }));
                                        }}
                                        placeholder={`Enter stop location`}
                                        />
                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                                            setFormData(prev => ({ ...prev, stops: (prev.stops || []).filter((_, i) => i !== index) }))
                                        }}
                                        ><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                    </Field>
                                ))}
                                </div>
                            )}
                             <div className="flex items-center justify-end gap-2">
                                 <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => {
                                        setFormData(prev => ({
                                        ...prev,
                                        stops: [...(prev.stops || []), { id: `stop_${Date.now()}`, location: '' }]
                                        }))
                                    }}
                                    >
                                    <Plus className="mr-1 h-3 w-3" /> Add Stop
                                </Button>
                             </div>
                            <Field>
                                <FieldLabel>{formData.tripType === "airport_drop" ? "Drop At" : "Drop Location *"}</FieldLabel>
                                <Input
                                value={
                                    formData.tripType === "airport_drop"
                                    ? formatAirportLocation(formData.airportId, formData.airportTerminalId)
                                    : formData.dropLocation
                                }
                                onChange={(e) =>
                                    setFormData({ ...formData, dropLocation: e.target.value })
                                }
                                placeholder={formData.tripType === "airport_drop" ? "Airport/Terminal selected above" : "Enter drop location"}
                                disabled={formData.tripType === "airport_drop"}
                                />
                            </Field>
                       </div>

                        <FieldGroup className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <Field>
                            <FieldLabel>Pickup Date *</FieldLabel>
                            <Input
                              type="date"
                              value={formData.pickupDate}
                              onChange={(e) =>
                                setFormData({ ...formData, pickupDate: e.target.value })
                              }
                            />
                          </Field>
                          <Field>
                            <FieldLabel>Pickup Time *</FieldLabel>
                            <Input
                              type="time"
                              value={formData.pickupTime}
                              onChange={(e) =>
                                setFormData({ ...formData, pickupTime: e.target.value })
                              }
                            />
                          </Field>
                          {(formData.tripType === "rental" || formData.tripType === "outstation") && (
                            <Field>
                              <FieldLabel>Return Date</FieldLabel>
                              <Input
                                type="date"
                                value={formData.returnDate || ""}
                                onChange={(e) =>
                                  setFormData({ ...formData, returnDate: e.target.value })
                                }
                              />
                            </Field>
                          )}
                           <Field>
                            <FieldLabel>Est. Distance (KM)</FieldLabel>
                            <Input
                            type="number"
                            value={formData.estimatedKm || ""}
                            readOnly
                            className="bg-muted font-bold"
                            placeholder="Auto..."
                            />
                          </Field>
                        </FieldGroup>
                         <Field>
                            <FieldLabel>Remarks / Instructions</FieldLabel>
                            <Textarea
                                value={formData.remarks || ""}
                                onChange={(e) =>
                                setFormData({ ...formData, remarks: e.target.value })
                                }
                                placeholder="e.g., VIP guest, specific route preference"
                                rows={2}
                            />
                        </Field>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6 lg:sticky lg:top-24 h-fit">
                    <Card>
                        <CardHeader>
                            <CardTitle>Fare & Payment</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                        {formData.cityId && formData.carCategoryId ? (
                            <div className="space-y-4">
                                {!isB2BUser && (
                                <Field>
                                    <FieldLabel>Promo Code</FieldLabel>
                                    <Select
                                    value={formData.promoCodeId || "none"}
                                    onValueChange={(value) =>
                                        setFormData({
                                        ...formData,
                                        promoCodeId: value === "none" ? undefined : value,
                                        })
                                    }
                                    >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select promo code" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No promo code</SelectItem>
                                        {selectedFormPromo && selectedPromoError && (
                                        <SelectItem value={selectedFormPromo.id} disabled>
                                            {selectedFormPromo.code} - {selectedPromoError}
                                        </SelectItem>
                                        )}
                                        {eligiblePromoCodes.map((promo) => (
                                        <SelectItem key={promo.id} value={promo.id}>
                                            {promo.code} -{" "}
                                            {promo.discountType === "percentage"
                                            ? `${promo.discountValue}% off`
                                            : `Rs. ${promo.discountValue} off`}
                                        </SelectItem>
                                        ))}
                                        {eligiblePromoCodes.length === 0 && <div className="p-2 text-xs text-center text-muted-foreground">No eligible codes</div>}
                                    </SelectContent>
                                    </Select>
                                    {selectedPromoError ? (
                                    <p className="text-xs text-destructive mt-1">{selectedPromoError}</p>
                                    ) : selectedFormPromo ? (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {selectedFormPromo.description}
                                    </p>
                                    ) : null}
                                </Field>
                                )}
                                <Card className="bg-slate-50 dark:bg-slate-900">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">Fare Estimate</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Base Fare</span>
                                        <span className="font-medium">₹ {formData.estimatedFare.toFixed(2)}</span>
                                    </div>
                                    {formData.tollCharges > 0 && (
                                        <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Toll (Pre-booked)</span>
                                        <span>₹ {formData.tollCharges.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {formData.parkingCharges > 0 && (
                                        <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Parking (Pre-booked)</span>
                                        <span>₹ {formData.parkingCharges.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {formData.extraCharges > 0 && (
                                        <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Urgent Booking Fee</span>
                                        <span>₹ {formData.extraCharges.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center border-t pt-2 mt-2">
                                        <span className="text-muted-foreground font-medium">Subtotal</span>
                                        <span className="font-medium">₹ {formData.totalFare.toFixed(2)}</span>
                                    </div>
                                    {formData.promoDiscount > 0 && (
                                        <div className="flex justify-between items-center text-green-600 dark:text-green-500">
                                        <span>Promo Discount</span>
                                        <span>- ₹ {formData.promoDiscount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center text-muted-foreground">
                                        <span>GST ({gstConfig.cgstRate + gstConfig.sgstRate}%)</span>
                                        <span>₹ {formData.gstAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center font-bold text-lg border-t border-border pt-3 mt-3">
                                        <span>Grand Total</span>
                                        <span>₹ {formData.grandTotal.toFixed(2)}</span>
                                    </div>
                                </CardContent>
                                </Card>

                                <Field>
                                    <FieldLabel>Advance Paid (₹)</FieldLabel>
                                    <Input
                                    type="number"
                                    className="w-full mt-1 text-right font-bold"
                                    value={formData.advancePaid || ""}
                                    onChange={(e) => setFormData({ ...formData, advancePaid: parseFloat(e.target.value) || 0 })}
                                    placeholder="0.00"
                                    />
                                </Field>
                                
                                {(formData.advancePaid || 0) > 0 && (
                                    <div className="flex justify-between items-center font-bold text-red-600 dark:text-red-500 pt-2 border-t mt-4">
                                    <span>Balance Due</span>
                                    <span>₹ {Math.max(formData.grandTotal - (formData.advancePaid || 0), 0).toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground py-16 px-4">
                                <Wallet className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium">Awaiting details</h3>
                                <p className="mt-1 text-sm text-gray-500">Select City, Car, and Trip Type to see fare estimate.</p>
                            </div>
                        )}
                        </CardContent>
                    </Card>
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" className="w-full" onClick={() => router.push('/')}>
                            Cancel
                        </Button>
                        <Button type="submit" className="w-full" disabled={!formData.cityId || !formData.carCategoryId || (customerType === 'b2c' && !formData.customerName) || (customerType === 'b2b' && !formData.b2bEmployeeId)}>
                            Create Booking
                        </Button>
                  </div>
                </div>
            </form>
        </div>
    )
}
