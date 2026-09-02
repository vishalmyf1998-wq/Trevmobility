// @ts-nocheck
"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAdmin } from "@/lib/admin-context"
import { Booking, PromoCode } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import CustomerInfoForm from "./components/CustomerInfoForm"
import TripDetailsForm from "./components/TripDetailsForm"
import FareAndPaymentForm from "./components/FareAndPaymentForm"
import RecurringSettingsForm from "./components/RecurringSettingsForm"
import { buildOutstationBillingInput, calculateOutstationBilling } from "@/lib/outstation-day-calculation"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

type RecurringSettings = {
  frequency: 'daily' | 'weekly' | 'custom'
  selectedDays: string[]
  startDate: Date
  endDate: Date
}

import { Textarea } from "@/components/ui/textarea"
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import { Plane, MapPin, Car, Route, ArrowRight, ArrowLeft, Building2, XCircle, Search, Plus, Trash2, Wallet, User, Phone, Calendar, Clock, StickyNote, ChevronRight, ChevronLeft, Repeat, CheckCircle } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { PhoneInput } from "@/components/ui/phone-input"

type BookingFormData = Omit<Booking, "id" | "createdAt" | "bookingNumber" | "eventLog"> & {
  recurringSettings?: RecurringSettings
}

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
  returnTime: "",
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
  recurringSettings: undefined,
}

type RideType = "airport" | "outstation" | "rental" | "local";
type AirportDirection = "to" | "from";


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

    const [bookingType, setBookingType] = useState<"trev" | "business" | "recurring">(isB2BUser ? "business" : "trev");
    const [backend, setBackend] = useState<"myf" | "trev">("myf");
    const [rideType, setRideType] = useState<RideType>("airport");
    const [airportDirection, setAirportDirection] = useState<AirportDirection>("to");
    const [step, setStep] = useState(1);
    const [showDateTimePopup, setShowDateTimePopup] = useState(false);

    const steps = [
      { id: 1, label: "Customer", icon: User },
      { id: 2, label: "Trip Details", icon: MapPin },
      { id: 3, label: "Select Car", icon: Car },
      { id: 4, label: "Confirm", icon: CheckCircle },
    ];

    const [formData, setFormData] = useState<BookingFormData>(initialFormData)
    const [recurringSettings, setRecurringSettings] = useState<RecurringSettings | undefined>()
    const customerType = useMemo(() => (bookingType === 'business' || bookingType === 'recurring' ? 'b2b' : 'b2c'), [bookingType]);

    const [b2cSearchQuery, setB2cSearchQuery] = useState("")
    const [b2cSearchOpen, setB2cSearchOpen] = useState(false)

    useEffect(() => {
      let newTripType: Booking['tripType'] = 'city_ride';
      if (rideType === 'airport') {
        newTripType = airportDirection === 'to' ? 'airport_drop' : 'airport_pickup';
      } else if (rideType === 'outstation') {
        newTripType = 'outstation';
      } else if (rideType === 'rental') {
        newTripType = 'rental';
      } else if (rideType === 'local') {
        newTripType = 'city_ride';
      }
      setFormData(prev => ({ ...prev, tripType: newTripType }));
    }, [rideType, airportDirection]);

    useEffect(() => {
      setBookingType(isB2BUser ? "business" : "trev");
    }, [isB2BUser]);

    const handleCustomerTypeChange = (type: "b2c" | "b2b") => {
      setBookingType(type === 'b2c' ? 'trev' : 'business');
    }

    const isAirportTrip = rideType === "airport";
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

    const rideTypes = [
      {
        id: "airport" as RideType,
        label: "Airport",
        icon: Plane,
      },
      {
        id: "outstation" as RideType,
        label: "Outstation",
        icon: Route,
      },
      {
        id: "rental" as RideType,
        label: "Rental",
        icon: Car,
      },
      {
        id: "local" as RideType,
        label: "Local",
        icon: MapPin,
      },
    ];

    const isStep1Valid = useMemo(() => {
      if (bookingType === "business") {
        return formData.b2bClientId && formData.b2bEmployeeId && formData.pickupLocation && formData.dropLocation;
      }
      return formData.customerName && formData.customerPhone && formData.pickupLocation && formData.dropLocation;
    }, [formData, bookingType]);

    const handleNextStep = () => {
      if (step === 1 && isStep1Valid) {
        setStep(2);
      } else if (step === 2 && formData.pickupDate && formData.pickupTime) {
        setStep(3);
      } else if (step === 3) {
        setStep(4);
      }
    };

    const handleDateTimeConfirm = () => {
      setShowDateTimePopup(false);
      setStep(2);
    };

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
                driverAllowanceCalculationMethod: outstationFare.driverAllowanceCalculationMethod,
                dayCalculationMethod: outstationFare.dayCalculationMethod,
                graceEndTime: outstationFare.graceEndTime,
                extraHourCharge: outstationFare.extraHourCharge,
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
            let outstationBilling = null

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
            const rate = fareConfig.roundTripPerKmRate || fareConfig.perKmRate || 0
            outstationBilling = calculateOutstationBilling(buildOutstationBillingInput(fareConfig as any, {
                pickupDate: formData.pickupDate,
                pickupTime: formData.pickupTime,
                dropDate: formData.returnDate || formData.pickupDate,
                dropTime: (formData as any).returnTime || formData.pickupTime,
                estimatedKm: estKm,
                perKmRate: rate,
            }))
            estimatedFare = outstationBilling.totalFare
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
            days: outstationBilling?.chargeableDays,
            extraHours: outstationBilling?.extraHours,
            minimumChargeableKm: outstationBilling?.minimumChargeableKm,
            driverAllowanceAmount: outstationBilling?.driverAllowance,
            tollCharges: preBookingToll,
            parkingCharges: preBookingParking,
            extraCharges: urgentCharge, // Store urgent charge as extra charge
            totalFare,
            promoDiscount,
            gstAmount,
            grandTotal,
            }))
        }
    }, [formData.cityId, formData.carCategoryId, formData.tripType, formData.pickupDate, formData.pickupTime, formData.returnDate, (formData as any).returnTime, formData.estimatedKm, (formData as any).isAutoSlotReturn, formData.b2bClientId, formData.airportId, formData.airportTerminalId, formData.promoCodeId, customerType, calculateFareFromConfig, getPromoEligibilityError, calculatePromoDiscount, promoCodes, gstConfig, b2bClients])

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

      if (bookingType === 'recurring' && recurringSettings) {
        const { frequency, selectedDays, startDate, endDate } = recurringSettings;
        if (!startDate || !endDate) {
            toast.error("Please select a start and end date for recurring bookings.");
            return;
        }

        const dayMap = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
        const selectedDayNumbers = selectedDays.map(day => dayMap[day]);

        let bookingDates: Date[] = [];
        let currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            const dayOfWeek = currentDate.getDay();
            if (frequency === 'daily') {
                bookingDates.push(new Date(currentDate));
            } else if (frequency === 'weekly' || frequency === 'custom') {
                if (selectedDayNumbers.includes(dayOfWeek)) {
                    bookingDates.push(new Date(currentDate));
                }
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }

        if (bookingDates.length === 0) {
            toast.error("No valid dates found for the selected recurring settings.");
            return;
        }
        
        // Basic validation before creating multiple bookings
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
        
        try {
            let customerId = formData.b2cCustomerId;
            if (customerType === "b2c" && !customerId) {
                const customer = await upsertB2CCustomer({
                    name: formData.customerName,
                    phone: formData.customerPhone,
                    email: formData.customerEmail,
                    address: formData.customerAddress,
                });
                customerId = customer.id;
            }

            for (const date of bookingDates) {
                const pickupDate = date.toISOString().split('T')[0]; // format to 'YYYY-MM-DD'
                
                let finalData = { 
                    ...formData, 
                    pickupDate,
                    b2cCustomerId: customerId 
                };

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
                
                const eventLog = createEventLog("created", "pending", undefined, `Recurring booking created`);
                addBooking({
                    ...finalData,
                    bookingNumber: generateBookingNumber(),
                    eventLog: [eventLog],
                    createdBy: ADMIN_USER,
                });
            }
            toast.success(`${bookingDates.length} recurring bookings created successfully!`);
            setFormData(initialFormData);
            setRecurringSettings(undefined);
            setStep(1);

        } catch (error) {
            toast.error("Failed to create recurring bookings. Please try again.");
            console.error(error);
        }
        return;
      }

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
        <div className="min-h-screen bg-[#f7f7f7] flex">
            {/* Sidebar */}
            <div className="w-72 bg-white border-r border-gray-200 p-6">
              <div className="mb-6">
                <h1 className="text-xl font-bold text-gray-900">New Booking</h1>
                <p className="text-sm text-gray-500 mt-1">Create a new ride booking</p>
              </div>

              {/* Booking Type Selector */}
              <div className="mb-6">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Booking Type</Label>
                <div className="space-y-2">
                  <button
                    onClick={() => setBookingType("trev")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                      bookingType === "trev"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "text-gray-500 hover:bg-gray-50 border border-transparent"
                    }`}
                  >
                    <User className="h-4 w-4" />
                    <span className="font-medium text-sm">TREV (B2C)</span>
                  </button>
                  <button
                    onClick={() => setBookingType("business")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                      bookingType === "business"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "text-gray-500 hover:bg-gray-50 border border-transparent"
                    }`}
                  >
                    <Building2 className="h-4 w-4" />
                    <span className="font-medium text-sm">Business (B2B)</span>
                  </button>
                  <button
                    onClick={() => setBookingType("recurring")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                      bookingType === "recurring"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "text-gray-500 hover:bg-gray-50 border border-transparent"
                    }`}
                  >
                    <Repeat className="h-4 w-4" />
                    <span className="font-medium text-sm">Recurring</span>
                  </button>
                </div>
              </div>

              {/* Progress Steps */}
              <nav className="space-y-2">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Steps</Label>
                {steps.map((s, index) => {
                  const Icon = s.icon;
                  const isActive = step === s.id;
                  const isCompleted = step > s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        if (isCompleted || s.id === 1) setStep(s.id);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                        isActive
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : isCompleted
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "text-gray-500 hover:bg-gray-50 border border-transparent"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isActive ? "bg-blue-500 text-white" : isCompleted ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"
                      }`}>
                        {isCompleted ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </div>
                      <span className="font-medium text-sm">{s.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8">
              <form onSubmit={handleSubmit}>
                {step === 1 && (
                  <div className="max-w-2xl">
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">
                        {bookingType === "business" ? "Business Customer" : "Customer Information"}
                      </h2>
                      <p className="text-gray-500 mt-1">
                        {bookingType === "business" ? "Select B2B client and employee" : "Enter the customer details for this booking"}
                      </p>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
                      {bookingType === "business" ? (
                        <>
                          <Field>
                            <FieldLabel>Select B2B Client *</FieldLabel>
                            <Select
                              value={formData.b2bClientId || ""}
                              onValueChange={(value) => setFormData({ ...formData, b2bClientId: value, b2bEmployeeId: undefined })}
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
                              <FieldLabel>Select Employee *</FieldLabel>
                              <Select
                                value={formData.b2bEmployeeId || ""}
                                onValueChange={(value) => setFormData({ ...formData, b2bEmployeeId: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select an employee" />
                                </SelectTrigger>
                                <SelectContent>
                                  {b2bEmployees
                                    .filter((e) => e.b2bClientId === formData.b2bClientId && e.status === "approved" && e.canLogin)
                                    .map((employee) => (
                                      <SelectItem key={employee.id} value={employee.id}>
                                        {employee.name} - {employee.employeeId}
                                      </SelectItem>
                                    ))}
                                  {b2bEmployees.filter((e) => e.b2bClientId === formData.b2bClientId && e.status === "approved" && e.canLogin).length === 0 && (
                                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                      No approved employees found for this client
                                    </div>
                                  )}
                                </SelectContent>
                              </Select>
                            </Field>
                          )}
                          <FieldGroup className="grid grid-cols-2 gap-4">
                            <Field>
                              <FieldLabel>Pickup Address *</FieldLabel>
                              <Input value={formData.pickupLocation} onChange={e => setFormData({...formData, pickupLocation: e.target.value})} placeholder="Enter pickup location" />
                            </Field>
                            <Field>
                              <FieldLabel>Drop Address *</FieldLabel>
                              <Input value={formData.dropLocation} onChange={e => setFormData({...formData, dropLocation: e.target.value})} placeholder="Enter drop location" />
                            </Field>
                          </FieldGroup>
                          <Field>
                            <FieldLabel>Special Notes</FieldLabel>
                            <Textarea value={formData.remarks || ""} onChange={e => setFormData({...formData, remarks: e.target.value})} placeholder="Any special instructions..." rows={2} />
                          </Field>
                        </>
                      ) : (
                        <>
                          <FieldGroup className="grid grid-cols-2 gap-4">
                            <Field>
                              <FieldLabel>Customer Name *</FieldLabel>
                              <Input value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} placeholder="Enter full name" />
                            </Field>
                            <Field>
                              <FieldLabel>Mobile Number *</FieldLabel>
                              <PhoneInput value={formData.customerPhone} onChange={val => setFormData({...formData, customerPhone: val})} placeholder="Enter phone number" />
                            </Field>
                          </FieldGroup>
                          <Field>
                            <FieldLabel>Pickup Address *</FieldLabel>
                            <Input value={formData.pickupLocation} onChange={e => setFormData({...formData, pickupLocation: e.target.value})} placeholder="Enter pickup location" />
                          </Field>
                          <Field>
                            <FieldLabel>Drop Address *</FieldLabel>
                            <Input value={formData.dropLocation} onChange={e => setFormData({...formData, dropLocation: e.target.value})} placeholder="Enter drop location" />
                          </Field>
                          <Field>
                            <FieldLabel>Special Notes</FieldLabel>
                            <Textarea value={formData.remarks || ""} onChange={e => setFormData({...formData, remarks: e.target.value})} placeholder="Any special instructions..." rows={2} />
                          </Field>
                        </>
                      )}
                      <div className="flex justify-end pt-4">
                        <Button type="button" onClick={handleNextStep} disabled={!isStep1Valid} size="lg">
                          Next: Trip Details <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="max-w-2xl">
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">Trip Details</h2>
                      <p className="text-gray-500 mt-1">
                        {bookingType === "recurring" ? "Select date, time and recurring schedule" : "Select date and time for your trip"}
                      </p>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
                      <FieldGroup className="grid grid-cols-2 gap-4">
                        <Field>
                          <FieldLabel>Pickup Date *</FieldLabel>
                          <Input type="date" value={formData.pickupDate} onChange={e => setFormData({...formData, pickupDate: e.target.value})} />
                        </Field>
                        <Field>
                          <FieldLabel>Pickup Time *</FieldLabel>
                          <Input type="time" value={formData.pickupTime} onChange={e => setFormData({...formData, pickupTime: e.target.value})} />
                        </Field>
                      </FieldGroup>
                      {bookingType === "recurring" && (
                        <div className="border-t border-gray-200 pt-6">
                          <h4 className="text-sm font-medium text-gray-700 mb-4">Recurring Schedule</h4>
                          <div className="space-y-4">
                            <Field>
                              <FieldLabel>Frequency</FieldLabel>
                              <Select value={recurringSettings?.frequency || "weekly"} onValueChange={(value) => setRecurringSettings(prev => ({ ...prev, frequency: value as any }))}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select frequency" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="daily">Daily</SelectItem>
                                  <SelectItem value="weekly">Weekly</SelectItem>
                                  <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                              </Select>
                            </Field>
                            {(recurringSettings?.frequency === "weekly" || recurringSettings?.frequency === "custom") && (
                              <Field>
                                <FieldLabel>Select Days</FieldLabel>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                    <button
                                      key={day}
                                      type="button"
                                      onClick={() => {
                                        const days = recurringSettings?.selectedDays || [];
                                        const newDays = days.includes(day) ? days.filter(d => d !== day) : [...days, day];
                                        setRecurringSettings(prev => ({ ...prev, selectedDays: newDays }));
                                      }}
                                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                                        (recurringSettings?.selectedDays || []).includes(day)
                                          ? "bg-blue-500 text-white"
                                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                      }`}
                                    >
                                      {day}
                                    </button>
                                  ))}
                                </div>
                              </Field>
                            )}
                            <FieldGroup className="grid grid-cols-2 gap-4">
                              <Field>
                                <FieldLabel>Start Date</FieldLabel>
                                <Input type="date" onChange={(e) => setRecurringSettings(prev => ({ ...prev, startDate: new Date(e.target.value) }))} />
                              </Field>
                              <Field>
                                <FieldLabel>End Date</FieldLabel>
                                <Input type="date" onChange={(e) => setRecurringSettings(prev => ({ ...prev, endDate: new Date(e.target.value) }))} />
                              </Field>
                            </FieldGroup>
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between pt-4">
                        <Button type="button" variant="outline" onClick={() => setStep(1)} size="lg">
                          <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                        <Button type="button" onClick={handleNextStep} disabled={!formData.pickupDate || !formData.pickupTime} size="lg">
                          Next: Select Car <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="max-w-3xl">
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">Select City & Car</h2>
                      <p className="text-gray-500 mt-1">Choose city and car category to see available options</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
                      <Field>
                        <FieldLabel>City *</FieldLabel>
                        <Select value={formData.cityId} onValueChange={value => setFormData({...formData, cityId: value})}>
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
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Select Car Category</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {carCategories.map(cat => {
                            const isSelected = formData.carCategoryId === cat.id;
                            return (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => setFormData({...formData, carCategoryId: cat.id})}
                                className={`p-6 rounded-2xl border-2 text-left transition-all ${
                                  isSelected
                                    ? "border-blue-500 bg-blue-50 shadow-lg"
                                    : "border-gray-200 bg-white hover:border-gray-300 hover:shadow"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <Car className={`h-8 w-8 ${isSelected ? "text-blue-500" : "text-gray-400"}`} />
                                  {isSelected && <CheckCircle className="h-5 w-5 text-blue-500" />}
                                </div>
                                <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                                <p className="text-sm text-gray-500 mt-1">{cat.description || "Standard sedan"}</p>
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                  <span className="text-2xl font-bold text-gray-900">₹ {formData.estimatedFare > 0 ? formData.estimatedFare.toFixed(0) : "---"}</span>
                                  <span className="text-sm text-gray-500 ml-1">est.</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex justify-between pt-4">
                        <Button type="button" variant="outline" onClick={() => setStep(2)} size="lg">
                          <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                        <Button type="button" onClick={handleNextStep} disabled={!formData.cityId || !formData.carCategoryId} size="lg">
                          Next: Review <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="max-w-2xl">
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">Booking Summary</h2>
                      <p className="text-gray-500 mt-1">Review all details before confirming</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Customer</h4>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-900">{formData.customerName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-900">{formData.customerPhone}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Trip</h4>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-900">{formData.pickupDate} at {formData.pickupTime}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-900">{formData.pickupLocation} → {formData.dropLocation}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-gray-200 pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Car className="h-5 w-5 text-gray-400" />
                            <span className="font-medium text-gray-900">{carCategories.find(c => c.id === formData.carCategoryId)?.name}</span>
                          </div>
                          <span className="text-2xl font-bold text-gray-900">₹ {formData.grandTotal.toFixed(2)}</span>
                        </div>
                        {formData.remarks && (
                          <div className="flex items-start gap-2 bg-gray-50 rounded-lg p-3">
                            <StickyNote className="h-4 w-4 text-gray-400 mt-0.5" />
                            <span className="text-sm text-gray-600">{formData.remarks}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between pt-4">
                        <Button type="button" variant="outline" onClick={() => setStep(3)} size="lg">
                          <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                        <Button type="submit" size="lg" className="bg-green-600 hover:bg-green-700">
                          <CheckCircle className="mr-2 h-4 w-4" /> Confirm Booking
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>
        </div>
    );
}

