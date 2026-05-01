  "use client"

  import { useState, useEffect, useCallback, useRef, Suspense } from "react"
  import { useSearchParams } from "next/navigation"
  import { useAdmin } from "@/lib/admin-context"
  import { Booking, BookingEventLog, PromoCode } from "@/lib/types"
  import { Button } from "@/components/ui/button"
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
  import { Input } from "@/components/ui/input"
  import { Badge } from "@/components/ui/badge"
  import { Textarea } from "@/components/ui/textarea"
  import { Label } from "@/components/ui/label"
  import { ScrollArea } from "@/components/ui/scroll-area"
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table"
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from "@/components/ui/dialog"
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
  } from "@/components/ui/dropdown-menu"
  import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from "@/components/ui/alert-dialog"
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
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
  import {
    Plus,
    Search,
    MoreHorizontal,
    Pencil,
    Trash2,
    UserPlus,
    CheckCircle,
    CheckCircle2,
    XCircle,
    Car,
    MapPin,
    Phone,
    Building2,
    User,
    Send,
    MapPinned,
    UserCheck,
    Flag,
    Link2,
    History,
    ArrowLeft,
    ArrowRight,
    ArrowUpDown,
    FileText,
    RefreshCw,
    Clock,
    Tag,
    Check,
    Ticket,
    Upload,
    Download,
    Banknote,
    Wallet,
    Route,
    ExternalLink,
    Printer,
    Headset,
  } from "lucide-react"
  import { toast } from "sonner"
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field"
import { PhoneInput } from "@/components/ui/phone-input"
  import { PrintableDutySlip } from "@/components/DutySlipPrint"
  import { PrintableVoucher } from "@/components/VoucherPrint"

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
  }

  interface EventConfirmData {
    title: string
    description: string
    onConfirm: () => void
  }

  // Status flow for forward/backward navigation
  const STATUS_FLOW: Booking["status"][] = [
    "pending",
    "pending_edit_approval",
    "confirmed", 
    "assigned",
    "dispatched",
    "arrived",
    "picked_up",
    "dropped",
    "closed",
  ]

  export default function BookingsPage() {
    return (
      <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading Bookings...</div>}>
        <BookingsContent />
      </Suspense>
    )
  }

  function BookingsContent() {
    const {
      bookings,
      b2cCustomers,
      addBooking,
      updateBooking,
      deleteBooking,
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
      dutySlips,
      addDutySlip,
      updateDutySlip,
      updateDriver,
      updateCar,
      updatePromoCode,
      upsertB2CCustomer,
      findB2CCustomer,
      getDriver,
      getCar,
      getCity,
      getAirport,
      getAirportTerminal,
      getCarCategory,
      getB2BClient,
      getB2BEmployee,
      bookingTags,
      getBookingTag,
      getBooking,
      userType,
      currentUser,
      approveBookingEdit,
      rejectBookingEdit,
      addSupportTicket
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

    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [dateFrom, setDateFrom] = useState("")
    const [dateTo, setDateTo] = useState("")
    const [sortBy, setSortBy] = useState<string>("createdAt")
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
    const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false)
    const [isPairDialogOpen, setIsPairDialogOpen] = useState(false)
    const [isRejectingEdit, setIsRejectingEdit] = useState(false)
    const [editRejectionReason, setEditRejectionReason] = useState("")
    const [isReviewEditDialogOpen, setIsReviewEditDialogOpen] = useState(false)
    const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false)
    const [isPickupDialogOpen, setIsPickupDialogOpen] = useState(false)
    const [isEventLogDialogOpen, setIsEventLogDialogOpen] = useState(false)
    const [isVoucherDialogOpen, setIsVoucherDialogOpen] = useState(false)
    const [isDutySlipDialogOpen, setIsDutySlipDialogOpen] = useState(false)
    const [isEditClosedDutyDialogOpen, setIsEditClosedDutyDialogOpen] = useState(false)
    const [isAddCustomerDialogOpen, setIsAddCustomerDialogOpen] = useState(false)
    const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false)
    const [ticketBooking, setTicketBooking] = useState<Booking | null>(null)
    const [ticketData, setTicketData] = useState({ subject: "", type: "Complaint", priority: "medium", description: "" })
    const [b2cSearchOpen, setB2cSearchOpen] = useState(false)
    const [b2cSearchQuery, setB2cSearchQuery] = useState("")
    const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
    const [assigningBooking, setAssigningBooking] = useState<Booking | null>(null)
    const [reassigningBooking, setReassigningBooking] = useState<Booking | null>(null)
    const [reviewingBooking, setReviewingBooking] = useState<Booking | null>(null)
    const [closingBooking, setClosingBooking] = useState<Booking | null>(null)
    const [pickingUpBooking, setPickingUpBooking] = useState<Booking | null>(null)
    const [editingClosedDutyBooking, setEditingClosedDutyBooking] = useState<Booking | null>(null)
    const [viewingEventLogBooking, setViewingEventLogBooking] = useState<Booking | null>(null)
    const [viewingVoucherBooking, setViewingVoucherBooking] = useState<Booking | null>(null)
    const [viewingDutySlipBooking, setViewingDutySlipBooking] = useState<Booking | null>(null)
    const [printingVoucher, setPrintingVoucher] = useState<Booking | null>(null)
    const [printingSlip, setPrintingSlip] = useState<DutySlip | null>(null)
    const [formData, setFormData] = useState<BookingFormData>(initialFormData)
    const [eventConfirmData, setEventConfirmData] = useState<EventConfirmData | null>(null)
    const [customerType, setCustomerType] = useState<"b2c" | "b2b">(isB2BUser ? "b2b" : "b2c")
    const [assignData, setAssignData] = useState({ driverId: "", carId: "" })
    const [reassignData, setReassignData] = useState({ driverId: "", carId: "", reason: "" })
    const [pairData, setPairData] = useState({ driverId: "", carId: "" })
    const [pickupData, setPickupData] = useState({ startKm: 0, startTime: "" })
    const [editClosedDutyData, setEditClosedDutyData] = useState({
      driverId: "",
      startTime: "",
      endTime: "",
      startKm: 0,
      endKm: 0,
    })
    const [closeData, setCloseData] = useState({
      endKm: 0,
      endTime: "",
      tollCharges: 0,
      parkingCharges: 0,
      miscCharges: 0,
      waitingCharge: 0,
      remarks: "",
    })
const [newCustomerData, setNewCustomerData] = useState({ name: "", phone: "", email: "", address: "" })
    const fileInputRef = useRef<HTMLInputElement>(null)

    const searchParams = useSearchParams()
    const urlStatus = searchParams?.get('status')
    const isChangesApproval = urlStatus === 'pending_edit_approval'

    const activeDrivers = drivers.filter((d) => d.status === "active")
    const availableCars = cars.filter((c) => c.status === "available" || c.status === "on_trip")
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

    const handleB2CCustomerLookup = (query: { name?: string; phone?: string; email?: string }) => {
      const customer = findB2CCustomer(query)
      if (!customer) return

      setFormData(prev => ({
        ...prev,
        b2cCustomerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email || "",
        customerAddress: customer.address || "",
      }))
      toast.success(`Customer details loaded (${customer.customerCode})`)
    }

    const handleAddNewCustomer = async () => {
      if (!newCustomerData.name || !newCustomerData.phone) {
        toast.error("Customer name and phone are required.")
        return
      }

      const digitsOnly = newCustomerData.phone.replace(/\D/g, "")
      // Basic validation: must have country code + digits
      if (digitsOnly.length < 7) {
        toast.error("Please enter a valid phone number.")
        return
      }

      const customer = await upsertB2CCustomer({
        name: newCustomerData.name,
        phone: newCustomerData.phone,
        email: newCustomerData.email,
        address: newCustomerData.address,
      })
      toast.success(`New customer "${customer.name}" created successfully.`)
      
      // Select the new customer in the booking form
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
  
      setIsAddCustomerDialogOpen(false)
setNewCustomerData({ name: "", phone: "", email: "", address: "" })
    }

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

    // Calculate fare from fare configuration
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
            }
          }
          break
        }
      }

      return { baseFare: 0, perKmRate: 0, calculationType: "fixed" as const }
    }, [fareGroups, b2bClients])

    // Auto-open review dialog if URL has ?review=bookingId
    useEffect(() => {
      if (bookings.length > 0) {
        const reviewId = searchParams?.get('review');
        if (reviewId) {
          const bookingToReview = bookings.find((b) => b.id === reviewId);
          if (bookingToReview && bookingToReview.status === 'pending_edit_approval') {
            setReviewingBooking(bookingToReview);
            setIsReviewEditDialogOpen(true);
            if (typeof window !== 'undefined') {
              const newUrl = new URL(window.location.href);
              newUrl.searchParams.delete('review');
              window.history.replaceState(null, '', newUrl.pathname + newUrl.search);
            }
          }
        }
      }
    }, [bookings, searchParams]);

    // Auto-apply status filter from URL parameter
    useEffect(() => {
      if (urlStatus) {
        setStatusFilter(urlStatus);
      } else {
        setStatusFilter("all");
      }
    }, [urlStatus]);

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
        
        const totalFare = estimatedFare + preBookingToll + preBookingParking
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
          tollCharges: preBookingToll,
          parkingCharges: preBookingParking,
          totalFare,
          promoDiscount,
          gstAmount,
          grandTotal,
        }))
      }
    }, [formData.cityId, formData.carCategoryId, formData.tripType, formData.b2bClientId, formData.airportId, formData.airportTerminalId, formData.promoCodeId, customerType, calculateFareFromConfig, getPromoEligibilityError, calculatePromoDiscount, promoCodes, gstConfig, b2bClients])

    // Auto-calculate Estimated Distance based on Pickup & Drop Locations
    useEffect(() => {
      const actualPickup = formData.tripType === "airport_pickup"
        ? formatAirportLocation(formData.airportId, formData.airportTerminalId)
        : formData.pickupLocation
      const actualDrop = formData.tripType === "airport_drop"
        ? formatAirportLocation(formData.airportId, formData.airportTerminalId)
        : formData.dropLocation

      if (actualPickup?.length > 3 && actualDrop?.length > 3) {
        const calculateDistance = () => {
          // In a real application, replace this with Google Maps Distance Matrix API call
          // Example: const response = await fetch(`/api/distance?origin=${actualPickup}&destination=${actualDrop}`);
          
          // Deterministic mock distance calculation for simulation
          const base = actualPickup.length + actualDrop.length
          let estKm = (base * 3) % 60 + 12 // 12 to 72 km for local rides
          
          if (formData.tripType === "outstation") {
            estKm = (base * 12) % 600 + 150 // 150 to 750 km for outstation rides
          }
          
          setFormData(prev => prev.estimatedKm === estKm ? prev : { ...prev, estimatedKm: estKm })
        }

        // Debounce the calculation to avoid running on every single keystroke
        const timeoutId = setTimeout(calculateDistance, 800)
        return () => clearTimeout(timeoutId)
      }
    }, [formData.pickupLocation, formData.dropLocation, formData.tripType, formData.airportId, formData.airportTerminalId, formatAirportLocation])

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
    finalData = {
    ...finalData,
    b2cCustomerId: customer.id,
    }
    }
    if (isAirportTrip) {
    const airportLocation = formatAirportLocation(formData.airportId, formData.airportTerminalId)
    finalData = {
    ...finalData,
    pickupLocation: formData.tripType === "airport_pickup" ? airportLocation : formData.pickupLocation,
    dropLocation: formData.tripType === "airport_drop" ? airportLocation : formData.dropLocation,
    }
    } else {
    finalData = {
    ...finalData,
    airportId: undefined,
    airportTerminalId: undefined,
    }
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

      if (editingBooking) {
        const eventLog = createEventLog("confirmed", editingBooking.status, editingBooking.status, "Booking updated")
        updateBooking(editingBooking.id, {
          ...finalData,
          eventLog: [...(editingBooking.eventLog || []), eventLog],
        })
        toast.success("Booking updated successfully")
      } else {
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
      }
      handleCloseDialog()
    }

    const handleAssignDriver = async () => {
      if (!assigningBooking) return

      if (!assignData.driverId || !assignData.carId) {
        toast.error("Please select both driver and car")
        return
      }

      try {
        const eventLog = createEventLog("assigned", "assigned", assigningBooking.status, "Driver and car assigned")
        updateBooking(assigningBooking.id, {
          driverId: assignData.driverId,
          carId: assignData.carId,
          status: "assigned",
          eventLog: [...(assigningBooking.eventLog || []), eventLog]
        })
        toast.success("Driver and car assigned successfully")
        setIsAssignDialogOpen(false)
        setAssigningBooking(null)
        setAssignData({ driverId: "", carId: "" })
      } catch (err: any) {
        toast.error("Error assigning driver")
      }
    }

    const handleReassignDriver = async () => {
      if (!reassigningBooking) return

      if (!reassignData.driverId || !reassignData.carId) {
        toast.error("Please select both driver and car")
        return
      }

      try {
        const eventLog = createEventLog("assigned", "assigned", reassigningBooking.status, `Reassigned: ${reassignData.reason}`)
        updateBooking(reassigningBooking.id, {
          driverId: reassignData.driverId,
          carId: reassignData.carId,
          eventLog: [...(reassigningBooking.eventLog || []), eventLog]
        })

        // Update duty slip if exists
        const dutySlip = dutySlips.find(ds => ds.bookingId === reassigningBooking.id && ds.status === "active")
        if (dutySlip) {
          updateDutySlip(dutySlip.id, {
            driverId: reassignData.driverId,
            carId: reassignData.carId,
            remarks: `${dutySlip.remarks || ""}\nReassigned: ${reassignData.reason}`,
          })
        }

        toast.success("Driver reassigned successfully")
        setIsReassignDialogOpen(false)
        setReassigningBooking(null)
        setReassignData({ driverId: "", carId: "", reason: "" })
      } catch (err: any) {
        // Error handled in context
      }
    }

    const handlePairDriverCar = () => {
      if (!pairData.driverId || !pairData.carId) {
        toast.error("Please select both driver and car")
        return
      }

      updateDriver(pairData.driverId, { assignedCarId: pairData.carId })
      updateCar(pairData.carId, { assignedDriverId: pairData.driverId })

      toast.success("Driver and car paired successfully")
      setIsPairDialogOpen(false)
      setPairData({ driverId: "", carId: "" })
    }

    // Update status with event logging
    const updateStatusWithLog = async (booking: Booking, newStatus: Booking["status"], eventType: BookingEventLog["event"], notes?: string) => {
      try {
        const eventLog = createEventLog(eventType, newStatus, booking.status, notes)
        updateBooking(booking.id, {
          status: newStatus,
          eventLog: [...(booking.eventLog || []), eventLog]
        })
      } catch (err: any) {
        toast.error("Failed to update status")
      }
    }

    // Driver App Event Handlers
    const handleDispatch = async (booking: Booking) => {
      if (!booking.driverId || !booking.carId) {
        toast.error("Please assign driver and car first")
        return
      }

      await updateStatusWithLog(booking, "dispatched", "dispatched", "Driver dispatched to pickup location")

      const dutySlipNumber = `DS${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, "0")}${(dutySlips.length + 1).toString().padStart(4, "0")}`

      addDutySlip({
        dutySlipNumber,
        bookingId: booking.id,
        driverId: booking.driverId,
        carId: booking.carId,
        startTime: new Date().toISOString(),
        startKm: 0,
        status: "active",
      })

      toast.success("Driver dispatched - Duty slip created")
    }

    const handleArrived = async (booking: Booking) => {
      await updateStatusWithLog(booking, "arrived", "arrived", "Driver arrived at pickup location")
      toast.success("Driver arrived at pickup location")
    }

    const handleOpenPickupDialog = (booking: Booking) => {
      setPickingUpBooking(booking)
      const now = new Date()
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
      
      const dutySlip = dutySlips.find(ds => ds.bookingId === booking.id && ds.status === "active")
      
      setPickupData({
        startKm: dutySlip?.startKm || 0,
        startTime: now.toISOString().slice(0, 16)
      })
      setIsPickupDialogOpen(true)
    }

    const handlePickupSubmit = async () => {
      if (!pickingUpBooking) return
      
      const actualKm = pickupData.startKm
      const startTimeIso = new Date(pickupData.startTime).toISOString()

      try {
        await updateStatusWithLog(pickingUpBooking, "picked_up", "picked_up", `Customer picked up at ${actualKm} KM`)
        
        const dutySlip = dutySlips.find(ds => ds.bookingId === pickingUpBooking.id && ds.status === "active")
        if (dutySlip) {
          updateDutySlip(dutySlip.id, {
            startKm: actualKm,
            startTime: startTimeIso,
          })
        }

        toast.success("Customer picked up - Trip started")
        setIsPickupDialogOpen(false)
        setPickingUpBooking(null)
      } catch (err: any) {
        toast.error("Failed to mark picked up")
      }
    }

    const handleDrop = async (booking: Booking) => {
      await updateStatusWithLog(booking, "dropped", "dropped", "Customer dropped at destination")
      toast.success("Customer dropped - Ready to close trip")
    }

    // Move status backward
    const handleRevertStatus = async (booking: Booking, targetStatus: Booking["status"]) => {
      const currentIndex = STATUS_FLOW.indexOf(booking.status)
      const targetIndex = STATUS_FLOW.indexOf(targetStatus)
      
      if (targetIndex >= currentIndex) {
        toast.error("Can only revert to a previous status")
        return
      }

      try {
        const eventLog = createEventLog(
          targetStatus as BookingEventLog["event"], 
          targetStatus, 
          booking.status, 
          `Status reverted from ${booking.status} to ${targetStatus} by admin`
        )
        updateBooking(booking.id, {
          status: targetStatus,
          eventLog: [...(booking.eventLog || []), eventLog]
        })
        toast.success(`Status reverted to ${targetStatus}`)
      } catch (err: any) {
        toast.error("Failed to revert status")
      }
    }

    const handleOpenCloseDialog = (booking: Booking) => {
      setClosingBooking(booking)
      const now = new Date()
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset())

      setCloseData({
        endKm: booking.actualKm || booking.estimatedKm || 0,
        endTime: now.toISOString().slice(0, 16),
        tollCharges: booking.tollCharges || 0,
        parkingCharges: booking.parkingCharges || 0,
        miscCharges: booking.miscCharges || 0,
        waitingCharge: booking.waitingCharge || 0,
        remarks: "",
      })
      setIsCloseDialogOpen(true)
    }

    const handleCloseTrip = async () => {
      if (!closingBooking) return

      const fareConfig = calculateFareFromConfig(
        closingBooking.cityId,
        closingBooking.carCategoryId,
        closingBooking.tripType,
        closingBooking.b2bClientId ? "b2b" : "b2c",
        closingBooking.b2bClientId,
        closingBooking.airportId,
        closingBooking.airportTerminalId
      )

      let actualFare = closingBooking.estimatedFare
      const actualKm = closeData.endKm

      if (fareConfig.calculationType === "per_km" && fareConfig.perKmRate) {
        actualFare = (fareConfig.baseFare || 0) + (actualKm * fareConfig.perKmRate)
        if (fareConfig.minimumFare && actualFare < fareConfig.minimumFare) {
          actualFare = fareConfig.minimumFare
        }
      } else if (fareConfig.calculationType === "slab" && fareConfig.slabs) {
        const applicableSlab = fareConfig.slabs.find(s => actualKm >= s.fromKm && actualKm <= s.toKm)
        if (applicableSlab) {
          actualFare = actualKm * applicableSlab.farePerKm
        }
      }

      const extraCharges = closeData.tollCharges + closeData.parkingCharges + closeData.miscCharges + closeData.waitingCharge
      const totalFare = actualFare + extraCharges
      
      let isGSTEnabled = true
      if (closingBooking.b2bClientId) {
        const client = b2bClients.find(c => c.id === closingBooking.b2bClientId)
        if (client && client.isGSTEnabled === false) {
          isGSTEnabled = false
        }
      }

      const gstRate = isGSTEnabled ? gstConfig.cgstRate + gstConfig.sgstRate : 0
      const gstAmount = (totalFare * gstRate) / 100
      const grandTotal = totalFare + gstAmount

      try {
        const eventLog = createEventLog("closed", "closed", closingBooking.status, `Trip closed. Final KM: ${actualKm}, Total Fare: Rs. ${grandTotal.toFixed(2)}`)
        updateBooking(closingBooking.id, {
          status: "closed",
          actualKm,
          actualFare,
          tollCharges: closeData.tollCharges,
          parkingCharges: closeData.parkingCharges,
          miscCharges: closeData.miscCharges,
          waitingCharge: closeData.waitingCharge,
          totalFare,
          gstAmount,
          grandTotal,
          remarks: closeData.remarks ? `${closingBooking.remarks || ""}\nClose notes: ${closeData.remarks}` : closingBooking.remarks,
          eventLog: [...(closingBooking.eventLog || []), eventLog]
        })

        const dutySlip = dutySlips.find(ds => ds.bookingId === closingBooking.id)
        if (dutySlip) {
          const startTime = new Date(dutySlip.startTime)
          const endTime = closeData.endTime ? new Date(closeData.endTime) : new Date()
          const totalHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)

          updateDutySlip(dutySlip.id, {
            endTime: endTime.toISOString(),
            endKm: actualKm,
            totalKm: actualKm - dutySlip.startKm,
            totalHours: Math.round(totalHours * 100) / 100,
            status: "completed",
            remarks: closeData.remarks,
          })
        }

        toast.success("Trip closed successfully")
        setIsCloseDialogOpen(false)
        setClosingBooking(null)
      } catch (err: any) {
        // Error handled in context
      }
    }

    const handleOpenEditClosedDutyDialog = (booking: Booking) => {
      setEditingClosedDutyBooking(booking)
      const dutySlip = getDutySlipForBooking(booking.id)
      
      const formatTime = (iso?: string) => {
        if (!iso) return ""
        try {
          const d = new Date(iso)
          d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
          return d.toISOString().slice(0, 16)
        } catch { return "" }
      }

      let defaultStart = dutySlip?.startTime
      if (!defaultStart && booking.pickupDate) {
        try { defaultStart = new Date(`${booking.pickupDate}T${booking.pickupTime || "00:00"}`).toISOString() } catch {}
      }
      let defaultEnd = dutySlip?.endTime || new Date().toISOString()

      setEditClosedDutyData({
        driverId: dutySlip?.driverId || booking.driverId || "",
        startTime: formatTime(defaultStart),
        endTime: formatTime(defaultEnd),
        startKm: dutySlip?.startKm || 0,
        endKm: dutySlip?.endKm || dutySlip?.startKm || booking.actualKm || 0,
      })
      setIsEditClosedDutyDialogOpen(true)
    }

    const handleUpdateClosedDuty = async () => {
      if (!editingClosedDutyBooking) return

      const dutySlip = getDutySlipForBooking(editingClosedDutyBooking.id)

      const totalKm = Math.max(0, editClosedDutyData.endKm - editClosedDutyData.startKm)
      const startDate = editClosedDutyData.startTime ? new Date(editClosedDutyData.startTime) : new Date()
      const endDate = editClosedDutyData.endTime ? new Date(editClosedDutyData.endTime) : new Date()
      const totalHours = Math.max(0, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60))

      const fareConfig = calculateFareFromConfig(
        editingClosedDutyBooking.cityId,
        editingClosedDutyBooking.carCategoryId,
        editingClosedDutyBooking.tripType,
        editingClosedDutyBooking.b2bClientId ? "b2b" : "b2c",
        editingClosedDutyBooking.b2bClientId,
        editingClosedDutyBooking.airportId,
        editingClosedDutyBooking.airportTerminalId
      )

      let actualFare = editingClosedDutyBooking.estimatedFare
      const actualKm = totalKm

      if (fareConfig.calculationType === "per_km" && fareConfig.perKmRate) {
        actualFare = (fareConfig.baseFare || 0) + (actualKm * fareConfig.perKmRate)
        if (fareConfig.minimumFare && actualFare < fareConfig.minimumFare) {
          actualFare = fareConfig.minimumFare
        }
      } else if (fareConfig.calculationType === "slab" && fareConfig.slabs) {
        const applicableSlab = fareConfig.slabs.find(s => actualKm >= s.fromKm && actualKm <= s.toKm)
        if (applicableSlab) {
          actualFare = actualKm * applicableSlab.farePerKm
        }
      }

      const extraCharges = (editingClosedDutyBooking.tollCharges || 0) + 
                           (editingClosedDutyBooking.parkingCharges || 0) + 
                           (editingClosedDutyBooking.miscCharges || 0) + 
                           (editingClosedDutyBooking.waitingCharge || 0)
                           
      const totalFare = actualFare + extraCharges
      const taxableFare = Math.max(totalFare - (editingClosedDutyBooking.promoDiscount || 0), 0)

      let isGSTEnabled = true
      if (editingClosedDutyBooking.b2bClientId) {
        const client = b2bClients.find(c => c.id === editingClosedDutyBooking.b2bClientId)
        if (client && client.isGSTEnabled === false) isGSTEnabled = false
      }

      const gstRate = isGSTEnabled ? gstConfig.cgstRate + gstConfig.sgstRate : 0
      const gstAmount = (taxableFare * gstRate) / 100
      const grandTotal = taxableFare + gstAmount

      try {
        const eventLog = createEventLog("closed", "closed", "closed", `Duty details manually updated by admin. Final KM: ${actualKm}, Total Fare: Rs. ${grandTotal.toFixed(2)}`)
        
        updateBooking(editingClosedDutyBooking.id, {
          driverId: editClosedDutyData.driverId,
          actualKm,
          actualFare,
          totalFare,
          gstAmount,
          grandTotal,
          eventLog: [...(editingClosedDutyBooking.eventLog || []), eventLog]
        })

        if (dutySlip) {
          updateDutySlip(dutySlip.id, {
            driverId: editClosedDutyData.driverId,
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
            startKm: editClosedDutyData.startKm,
            endKm: editClosedDutyData.endKm,
            totalKm: actualKm,
            totalHours: Math.round(totalHours * 100) / 100
          })
        }

        toast.success("Closed duty updated successfully")
        setIsEditClosedDutyDialogOpen(false)
        setEditingClosedDutyBooking(null)
      } catch (err: any) {
        toast.error("Failed to update closed duty")
      }
    }

    const handleCancelBooking = async (booking: Booking) => {
      await updateStatusWithLog(booking, "cancelled", "cancelled", "Booking cancelled by admin")
      toast.success("Booking cancelled")
    }

    const handleReactivateBooking = async (booking: Booking) => {
      await updateStatusWithLog(booking, "pending", "pending", "Booking reactivated by admin")
      toast.success("Booking reactivated")
    }

    const handleToggleTag = (bookingId: string, tagId: string) => {
      const currentBooking = bookings.find(b => b.id === bookingId)
      if (!currentBooking) return

      const currentTags = currentBooking.tags || []
      const newTags = currentTags.includes(tagId)
        ? currentTags.filter(t => t !== tagId)
        : [...currentTags, tagId]
      
      updateBooking(bookingId, { tags: newTags })
      toast.success(currentTags.includes(tagId) ? 'Tag removed' : 'Tag added')
    }

    const handleConfirmEvent = (title: string, description: string, onConfirm: () => void) => {
      setEventConfirmData({ title, description, onConfirm })
    }

    const handleOpenTicketDialog = (booking: Booking) => {
      setTicketBooking(booking)
      setTicketData({
        subject: `Issue with Booking ${booking.bookingNumber}`,
        type: "Complaint",
        priority: "medium",
        description: ""
      })
      setIsTicketDialogOpen(true)
    }

    const handleCreateTicket = () => {
      if (!ticketData.subject) {
        toast.error("Subject is required")
        return
      }
      if (!ticketBooking) return

      addSupportTicket({
        subject: ticketData.subject,
        customerName: ticketBooking.customerName || "Unknown",
        type: ticketData.type,
        priority: ticketData.priority,
        description: `Booking Reference: ${ticketBooking.bookingNumber}\n\n${ticketData.description}`,
        status: "open"
      })

      toast.success("Support ticket created successfully")
      setIsTicketDialogOpen(false)
      setTicketBooking(null)
    }


    const handleEdit = (booking: Booking) => {
      setEditingBooking(booking)
      setCustomerType(booking.b2bClientId ? "b2b" : "b2c")
      setB2cSearchQuery(booking.customerName)
      setB2cSearchOpen(false)
  setFormData({
    b2cCustomerId: booking.b2cCustomerId,
    customerName: booking.customerName,
    customerPhone: booking.customerPhone,
    customerEmail: booking.customerEmail,
    customerAddress: booking.customerAddress,
    b2bClientId: booking.b2bClientId,
    b2bEmployeeId: booking.b2bEmployeeId,
    driverId: booking.driverId,
    carId: booking.carId,
        cityId: booking.cityId,
        carCategoryId: booking.carCategoryId,
        tripType: booking.tripType,
        airportId: booking.airportId,
        airportTerminalId: booking.airportTerminalId,
        pickupLocation: booking.pickupLocation,
        dropLocation: booking.dropLocation,
        pickupDate: booking.pickupDate,
        pickupTime: booking.pickupTime,
        returnDate: booking.returnDate,
        estimatedKm: booking.estimatedKm,
        estimatedFare: booking.estimatedFare,
        actualKm: booking.actualKm,
        actualFare: booking.actualFare,
        extraCharges: booking.extraCharges,
        peakHourCharge: booking.peakHourCharge,
        nightCharge: booking.nightCharge,
        waitingCharge: booking.waitingCharge,
        tollCharges: booking.tollCharges,
        parkingCharges: booking.parkingCharges,
        miscCharges: booking.miscCharges,
        totalFare: booking.totalFare,
        gstAmount: booking.gstAmount,
        grandTotal: booking.grandTotal,
        advancePaid: booking.advancePaid || 0,
        promoCodeId: booking.promoCodeId,
        promoDiscount: booking.promoDiscount || 0,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        remarks: booking.remarks,
      })
      setIsDialogOpen(true)
    }

    const handleCloseDialog = () => {
      setIsDialogOpen(false)
      setEditingBooking(null)
      setFormData(initialFormData)
      setCustomerType("b2c")
      setB2cSearchQuery("")
      setB2cSearchOpen(false)
    }

    const handleViewVoucher = (booking: Booking) => {
      setViewingVoucherBooking(booking)
      setIsVoucherDialogOpen(true)
    }

    const handlePrintVoucher = (booking: Booking) => {
      setPrintingVoucher(booking)
      setTimeout(() => {
        window.print()
      }, 500)
    }

    const handlePrintSlip = (slip: DutySlip) => {
      setPrintingSlip(slip)
      setTimeout(() => {
        window.print()
      }, 500)
    }

    useEffect(() => {
      const handleAfterPrint = () => {
        setPrintingSlip(null)
        setPrintingVoucher(null)
      }
      window.addEventListener('afterprint', handleAfterPrint)
      return () => window.removeEventListener('afterprint', handleAfterPrint)
    }, [])

    const handleDownloadTemplate = () => {
      const headers = [
        'CustomerName', 'CustomerPhone', 'CustomerEmail', 'CustomerAddress',
        'CityName', 'CarCategory', 'TripType', 'PickupLocation', 'DropLocation',
        'PickupDate', 'PickupTime', 'EstimatedKm', 'Remarks'
      ].join(',')

      const sampleRow = [
        'John Doe', '9876543210', 'john@example.com', '123 Main St',
        'Mumbai', 'Sedan', 'city_ride', 'Andheri West', 'Bandra East',
        '2024-05-01', '10:00', '15', 'VIP Guest'
      ].join(',')

      const csvContent = `${headers}\n${sampleRow}\n`
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', 'bulk_bookings_template.csv')
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const rows = text.split('\n').filter(row => row.trim())
        if (rows.length < 2) {
          toast.error('CSV file is empty or invalid')
          return
        }

        const parseCSVRow = (str: string) => {
          const re = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
          return str.split(re).map(val => val.trim().replace(/^"|"$/g, ''))
        }

        const headers = parseCSVRow(rows[0]).map(h => h.toLowerCase())
        let addedCount = 0
        let errorCount = 0

        for (let i = 1; i < rows.length; i++) {
          const values = parseCSVRow(rows[i])
          const rowData: Record<string, string> = {}
          headers.forEach((h, index) => {
            rowData[h] = values[index]
          })

          const city = cities.find(c => c.name.toLowerCase() === rowData['cityname']?.toLowerCase())
          const category = carCategories.find(c => c.name.toLowerCase() === rowData['carcategory']?.toLowerCase())
          
          if (!city || !category || !rowData['customername'] || !rowData['customerphone'] || !rowData['pickupdate']) {
            errorCount++
            continue
          }

          const customer = await upsertB2CCustomer({
            name: rowData['customername'],
            phone: rowData['customerphone'],
            email: rowData['customeremail'] || "",
            address: rowData['customeraddress'] || "",
          })

          const tripType = (rowData['triptype'] as Booking["tripType"]) || "city_ride"
          const fareConfig = calculateFareFromConfig(city.id, category.id, tripType, "b2c")
          let estimatedFare = fareConfig.baseFare || fareConfig.minimumFare || 0
          if (fareConfig.calculationType === "fixed" && fareConfig.fixedFare) {
            estimatedFare = fareConfig.fixedFare
          } else if (fareConfig.calculationType === "package" && fareConfig.baseFare) {
            estimatedFare = fareConfig.baseFare
          }
          
          let preBookingToll = 0
          let preBookingParking = 0
          if (fareConfig.preBookingCharges) {
            if (fareConfig.preBookingCharges.tollEnabled) preBookingToll = fareConfig.preBookingCharges.tollAmount
            if (fareConfig.preBookingCharges.parkingEnabled) preBookingParking = fareConfig.preBookingCharges.parkingAmount
          }
          
          const totalFare = estimatedFare + preBookingToll + preBookingParking
          const gstRate = gstConfig.cgstRate + gstConfig.sgstRate
          const gstAmount = (totalFare * gstRate) / 100
          const grandTotal = totalFare + gstAmount
          const eventLog = createEventLog("created", "pending", undefined, "Bulk uploaded via CSV")
          
          addBooking({
            bookingNumber: generateBookingNumber(),
            b2cCustomerId: customer.id,
            customerName: customer.name,
            customerPhone: customer.phone,
            customerEmail: customer.email || "",
            customerAddress: customer.address || "",
            cityId: city.id,
            carCategoryId: category.id,
            tripType,
            pickupLocation: rowData['pickuplocation'] || "",
            dropLocation: rowData['droplocation'] || "",
            pickupDate: rowData['pickupdate'],
            pickupTime: rowData['pickuptime'] || "10:00",
            estimatedKm: parseFloat(rowData['estimatedkm']) || 0,
            estimatedFare,
            actualKm: 0,
            actualFare: 0,
            extraCharges: 0,
            peakHourCharge: 0,
            nightCharge: 0,
            waitingCharge: 0,
            tollCharges: preBookingToll,
            parkingCharges: preBookingParking,
            miscCharges: 0,
            totalFare,
            gstAmount,
            grandTotal,
            promoDiscount: 0,
            status: "pending",
            paymentStatus: "pending",
            remarks: rowData['remarks'] || "",
            eventLog: [eventLog],
          })
          addedCount++
        }

        if (addedCount > 0) toast.success(`Successfully imported ${addedCount} bookings`)
        if (errorCount > 0) toast.warning(`Skipped ${errorCount} invalid rows (Check required fields)`)
      } catch (error) {
        toast.error('Error parsing CSV file')
      }

      if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const filteredBookings = bookings.filter((booking) => {
    if (!booking) return false;

      // B2B Role based filtering
      if (isCorpAdmin && currentB2BUser && booking.b2bClientId !== currentB2BUser.b2bClientId) return false;
      if (isCorpEmployee && currentB2BUser && booking.b2bEmployeeId !== currentB2BUser.id) return false;

      const matchesSearch =
      (booking.bookingNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (booking.customerName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (booking.customerPhone || "").includes(searchQuery)

      const matchesStatus = statusFilter === "all" || booking.status === statusFilter

      const bookingDateTime = `${booking.pickupDate}T${booking.pickupTime}`
      const matchesDateFrom = !dateFrom || bookingDateTime >= dateFrom
      const matchesDateTo = !dateTo || bookingDateTime <= dateTo

      return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo
    }).sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case "createdAt":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case "pickupDate":
          comparison = `${a.pickupDate}T${a.pickupTime}`.localeCompare(`${b.pickupDate}T${b.pickupTime}`)
          break
        case "bookingNumber":
          comparison = a.bookingNumber.localeCompare(b.bookingNumber)
          break
        case "customerName":
          comparison = a.customerName.localeCompare(b.customerName)
          break
        case "amount":
          comparison = (a.grandTotal || a.estimatedFare || 0) - (b.grandTotal || b.estimatedFare || 0)
          break
      }
      return sortOrder === "asc" ? comparison : -comparison
    })

    const getStatusBadge = (status: Booking["status"]) => {
      const styles: Record<string, string> = {
        pending: "bg-warning/10 text-warning border-warning/20",
        pending_edit_approval: "bg-purple-500/10 text-purple-600 border-purple-500/20",
        confirmed: "bg-primary/10 text-primary border-primary/20",
        assigned: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        dispatched: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
        arrived: "bg-purple-500/10 text-purple-600 border-purple-500/20",
        picked_up: "bg-orange-500/10 text-orange-600 border-orange-500/20",
        dropped: "bg-teal-500/10 text-teal-600 border-teal-500/20",
        closed: "bg-success/10 text-success border-success/20",
        cancelled: "bg-destructive/10 text-destructive border-destructive/20",
      }
      const labels: Record<string, string> = {
        pending: "Pending",
        pending_edit_approval: "Pending Edit",
        confirmed: "Confirmed",
        assigned: "Assigned",
        dispatched: "Dispatched",
        arrived: "Arrived",
        picked_up: "Picked Up",
        dropped: "Dropped",
        closed: "Closed",
        cancelled: "Cancelled",
      }
      return (
        <Badge variant="outline" className={styles[status]}>
          {labels[status]}
        </Badge>
      )
    }

    const getTripTypeLabel = (type: Booking["tripType"]) => {
      const labels: Record<string, string> = {
        airport_pickup: "Airport Pickup",
        airport_drop: "Airport Drop",
        rental: "Rental",
        city_ride: "City Ride",
        outstation: "Outstation",
      }
      return labels[type]
    }

    const getNextAction = (booking: Booking) => {
      const currentIndex = STATUS_FLOW.indexOf(booking.status)
      if (currentIndex === -1 || booking.status === "cancelled") return null
      if (currentIndex >= STATUS_FLOW.length - 1) return null
      return STATUS_FLOW[currentIndex + 1]
    }

    const getPreviousStatuses = (booking: Booking) => {
      const currentIndex = STATUS_FLOW.indexOf(booking.status)
      if (currentIndex <= 0 || booking.status === "cancelled") return []
      return STATUS_FLOW.slice(0, currentIndex)
    }

    const getDutySlipForBooking = (bookingId: string) => {
      return dutySlips.find(ds => ds.bookingId === bookingId)
    }

    const formatEventTime = (isoString: string) => {
      return new Date(isoString).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    }

    return (
      <>
      <div className="flex flex-col gap-6 print:hidden">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isChangesApproval ? "Changes Pending" : "Bookings"}
            </h1>
            {!isChangesApproval && (
              <p className="text-muted-foreground">
                Manage trip bookings and track driver events
              </p>
            )}
          </div>
          {!isChangesApproval && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDownloadTemplate} title="Download CSV Template">
                <Download className="mr-2 h-4 w-4" />
                Template
              </Button>
              <input 
                type="file" 
                ref={fileInputRef} 
                accept=".csv" 
                className="hidden" 
                onChange={handleFileUpload} 
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Upload CSV
              </Button>
              {!isB2BUser && (
                <Button variant="outline" onClick={() => setIsPairDialogOpen(true)}>
                  <Link2 className="mr-2 h-4 w-4" />
                  Pair Driver & Car
                </Button>
              )}
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Booking
              </Button>
            </div>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="lg:col-span-2">
                <Label className="text-xs text-muted-foreground mb-1 block">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Booking #, name, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    {isChangesApproval ? (
                      <SelectItem value="pending_edit_approval">Pending Edit</SelectItem>
                    ) : (
                      <>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="pending_edit_approval">Pending Edit</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="assigned">Assigned</SelectItem>
                        <SelectItem value="dispatched">Dispatched</SelectItem>
                        <SelectItem value="arrived">Arrived</SelectItem>
                        <SelectItem value="picked_up">Picked Up</SelectItem>
                        <SelectItem value="dropped">Dropped</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">From Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">To Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground mb-1 block">Sort By</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="createdAt">Created At</SelectItem>
                      <SelectItem value="pickupDate">Pickup Date</SelectItem>
                      <SelectItem value="bookingNumber">Booking Number</SelectItem>
                      <SelectItem value="customerName">Customer Name</SelectItem>
                      <SelectItem value="amount">Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                  title={sortOrder === "asc" ? "Ascending" : "Descending"}
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {(searchQuery || (!isChangesApproval && statusFilter !== "all") || dateFrom || dateTo) && (
              <div className="mt-4 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("")
                    if (!isChangesApproval) {
                      setStatusFilter("all")
                    }
                    setDateFrom("")
                    setDateTo("")
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bookings Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Bookings</CardTitle>
            <CardDescription>
              {filteredBookings.length} booking(s) found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking #</TableHead>
                  <TableHead>B2B Client</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Trip Type</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                      No bookings found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBookings.map((booking) => {
                    const driver = getDriver(booking.driverId || "")
                    const car = getCar(booking.carId || "")
                    const city = getCity(booking.cityId)
                    const dutySlip = getDutySlipForBooking(booking.id)
                    const nextAction = getNextAction(booking)
                    const previousStatuses = getPreviousStatuses(booking)
                    const futureStatuses = STATUS_FLOW.slice(STATUS_FLOW.indexOf(booking.status) + 1)
                    
                    const displayDutySlip = dutySlip || {
                      id: 'temp-' + booking.id,
                      dutySlipNumber: 'DS-TBD',
                      bookingId: booking.id,
                      driverId: booking.driverId || '',
                      carId: booking.carId || '',
                      startTime: '',
                      startKm: 0,
                      status: 'active' as const,
                      createdAt: booking.createdAt
                    }

                    return (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium align-top">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-sm whitespace-nowrap">{booking.bookingNumber}</span>
                            </div>
                            {booking.externalBookingId && (
                              <span className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                                <ExternalLink className="h-3 w-3" /> {booking.externalBookingId}
                              </span>
                            )}
                            {booking.createdBy && (
                              <span className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                <User className="h-3 w-3" /> By: {booking.createdBy}
                              </span>
                            )}
                            {booking.tags && booking.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {booking.tags.map((tagId) => {
                                  const tag = getBookingTag(tagId)
                                  return tag ? (
                                    <span
                                      key={tagId}
                                      className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded whitespace-nowrap"
                                      style={{ 
                                        backgroundColor: `${tag.color}20`, 
                                        color: tag.color,
                                        border: `1px solid ${tag.color}40`
                                      }}
                                    >
                                      {tag.name}
                                    </span>
                                  ) : null
                                })}
                              </div>
                            )}
                            {/* Show rejection remarks for B2B users */}
                            {isB2BUser && booking.eventLog?.slice().reverse().find(e => e.event === 'rejected' && e.fromStatus === 'pending_edit_approval') && (
                              <div className="mt-2 text-[11px] text-destructive bg-destructive/10 px-2 py-1.5 rounded border border-destructive/20 leading-tight max-w-[200px] whitespace-normal">
                                <span className="font-semibold block mb-0.5 flex items-center gap-1"><XCircle className="h-3 w-3"/> Edit Rejected:</span>
                                {booking.eventLog.slice().reverse().find(e => e.event === 'rejected' && e.fromStatus === 'pending_edit_approval')?.notes?.replace('Edit request rejected. Reason: ', '')}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          {booking.b2bClientId ? (
                            <div className="flex flex-col">
                              <span className="font-medium text-sm text-primary whitespace-nowrap flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {getB2BClient(booking.b2bClientId)?.companyName || "Corporate"}
                              </span>
                              {booking.b2bEmployeeId && (
                                <span className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {getB2BEmployee(booking.b2bEmployeeId)?.employeeId || "Employee"}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap align-top">
                          {formatEventTime(booking.createdAt)}
                        </TableCell>
                        <TableCell className="align-top">
    <div className="flex flex-col">
                            <span className="font-medium text-sm">{booking.customerName}</span>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
    <Phone className="h-3 w-3" />
    {booking.customerPhone}
    </span>
                            {booking.customerEmail && (
                              <span className="text-[11px] text-muted-foreground truncate max-w-[150px] mt-0.5" title={booking.customerEmail}>
                                {booking.customerEmail}
      </span>
    )}
    </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <Badge variant="secondary" className="whitespace-nowrap">{getTripTypeLabel(booking.tripType)}</Badge>
                        </TableCell>
                        <TableCell className="align-top">
                          <span className="text-sm font-medium whitespace-nowrap">{city?.name || "-"}</span>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-col max-w-[180px]">
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <MapPin className="h-3 w-3 shrink-0 text-success" />
                              <span className="truncate cursor-help" title={booking.pickupLocation}>{booking.pickupLocation}</span>
                            </div>
                            <div className="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground">
                              <MapPin className="h-3 w-3 shrink-0 text-destructive" />
                              <span className="truncate cursor-help" title={booking.dropLocation}>{booking.dropLocation}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-col text-sm whitespace-nowrap">
                            <span>{booking.pickupDate}</span>
                            <span className="text-muted-foreground">{booking.pickupTime}</span>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          {driver ? (
                            <div className="flex flex-col">
                              <span className="text-sm font-medium whitespace-nowrap">{driver.name}</span>
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                                <Phone className="h-3 w-3" />
                                {driver.phone}
                              </span>
                              {car && (
                                <>
                                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 whitespace-nowrap mt-0.5">
                                    <Car className="h-3 w-3" />
                                    {car.registrationNumber}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                    {car.make} {car.model}
                                  </span>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Not assigned</span>
                          )}
                        </TableCell>
                        <TableCell className="align-top">{getStatusBadge(booking.status)}</TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-col whitespace-nowrap">
                            <span className="font-medium text-sm">
                              Rs. {(booking.grandTotal || booking.estimatedFare || 0).toFixed(0)}
                            </span>
                            {(booking.advancePaid || 0) > 0 && (
                              <span className="text-[11px] text-success font-medium mt-0.5">
                                Adv: Rs. {booking.advancePaid?.toFixed(0)}
                              </span>
                            )}
                            <span className="text-[11px] text-destructive font-medium mt-0.5">
                              Due: Rs. {Math.max((booking.grandTotal || 0) - (booking.advancePaid || 0), 0).toFixed(0)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right align-top">
                          {booking.status === 'pending_edit_approval' && !isB2BUser ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                size="sm" 
                                className="bg-green-100 text-green-700 hover:bg-green-200 border border-green-200 shadow-sm" 
                                onClick={() => {
                                  setReviewingBooking(booking);
                                  setIsRejectingEdit(false);
                                  setIsReviewEditDialogOpen(true);
                                }}
                              >
                                <CheckCircle className="mr-1 h-4 w-4" />
                                Accept
                              </Button>
                              <Button 
                                size="sm" 
                                className="bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 shadow-sm" 
                                onClick={() => {
                                  setReviewingBooking(booking);
                                  setIsRejectingEdit(true);
                                  setIsReviewEditDialogOpen(true);
                                }}
                              >
                                <XCircle className="mr-1 h-4 w-4" />
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => handleEdit(booking)} 
                                  disabled={booking.status === 'pending_edit_approval'}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  {booking.status === 'pending_edit_approval' ? 'Edit Pending Approval' : 'Edit'}
                                </DropdownMenuItem>

                                <DropdownMenuItem onClick={() => handleViewVoucher(booking)}>
                                  <Ticket className="mr-2 h-4 w-4" />
                                  View Voucher
                                </DropdownMenuItem>

                                <DropdownMenuItem onClick={() => handleOpenTicketDialog(booking)}>
                                  <Headset className="mr-2 h-4 w-4" />
                                  Raise Ticket
                                </DropdownMenuItem>

                                {/* Tags Submenu */}
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger>
                                    <Tag className="mr-2 h-4 w-4" />
                                    Manage Tags
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent>
                                    {bookingTags.length === 0 ? (
                                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                        No tags available
                                      </div>
                                    ) : (
                                      bookingTags.map((tag) => (
                                        <DropdownMenuItem
                                          key={tag.id}
                                          onSelect={(e) => {
                                            e.preventDefault()
                                            handleToggleTag(booking.id, tag.id)
                                          }}
                                        >
                                          <div className="flex items-center gap-2 w-full">
                                            <span
                                              className="inline-block w-3 h-3 rounded-full"
                                              style={{ backgroundColor: tag.color }}
                                            />
                                            <span>{tag.name}</span>
                                            {booking.tags?.includes(tag.id) && (
                                              <Check className="ml-auto h-4 w-4" />
                                            )}
                                          </div>
                                        </DropdownMenuItem>
                                      ))
                                    )}
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                                
                                <DropdownMenuSeparator />

                                {/* Driver Events (Next Action) */}
                                {!isB2BUser && (
                                  <>
                                    {booking.status === "pending" && (
                                      <DropdownMenuItem onClick={() => handleConfirmEvent("Confirm Booking", "Are you sure you want to confirm this booking?", () => updateStatusWithLog(booking, "confirmed", "confirmed", "Booking confirmed"))}>
                                        <CheckCircle2 className="mr-2 h-4 w-4 text-primary" /> Confirm Booking
                                      </DropdownMenuItem>
                                    )}
                                    {(booking.status === "pending" || booking.status === "confirmed") && (
                                      <DropdownMenuItem onClick={() => { setAssigningBooking(booking); setIsAssignDialogOpen(true); }}>
                                        <UserPlus className="mr-2 h-4 w-4 text-primary" /> Assign Driver
                                      </DropdownMenuItem>
                                    )}
                                    {booking.status === "assigned" && (
                                      <DropdownMenuItem onClick={() => handleConfirmEvent("Dispatch Driver", "Are you sure you want to dispatch the driver? This will generate a Duty Slip.", () => handleDispatch(booking))}>
                                        <Send className="mr-2 h-4 w-4 text-indigo-600" /> Dispatch Driver
                                      </DropdownMenuItem>
                                    )}
                                    {booking.status === "dispatched" && (
                                      <DropdownMenuItem onClick={() => handleConfirmEvent("Mark Arrived", "Has the driver arrived at the pickup location?", () => handleArrived(booking))}>
                                        <MapPinned className="mr-2 h-4 w-4 text-purple-600" /> Mark Arrived
                                      </DropdownMenuItem>
                                    )}
                                    {booking.status === "arrived" && (
                                    <DropdownMenuItem onClick={() => handleOpenPickupDialog(booking)}>
                                        <UserCheck className="mr-2 h-4 w-4 text-orange-600" /> Mark Picked Up
                                      </DropdownMenuItem>
                                    )}
                                    {booking.status === "picked_up" && (
                                      <DropdownMenuItem onClick={() => handleConfirmEvent("Mark Dropped", "Has the customer been dropped at the destination?", () => handleDrop(booking))}>
                                        <Flag className="mr-2 h-4 w-4 text-teal-600" /> Mark Dropped
                                      </DropdownMenuItem>
                                    )}
                                    {booking.status === "dropped" && (
                                      <DropdownMenuItem onClick={() => handleOpenCloseDialog(booking)}>
                                        <CheckCircle2 className="mr-2 h-4 w-4 text-success" /> Close Trip
                                      </DropdownMenuItem>
                                    )}

                                    {/* Forward / Backward Navigation Submenu */}
                                    {(previousStatuses.length > 0 || futureStatuses.length > 0) && !["closed", "cancelled"].includes(booking.status) && (
                                      <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                          <ArrowUpDown className="mr-2 h-4 w-4" /> Change Status Manually
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent>
                                          {previousStatuses.length > 0 && (
                                            <>
                                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center">
                                                <ArrowLeft className="mr-1 h-3 w-3" /> Revert to
                                              </div>
                                              {previousStatuses.map((status) => (
                                                <DropdownMenuItem key={status} onClick={() => handleConfirmEvent("Revert Status", `Are you sure you want to revert to '${status.replace(/_/g, " ")}'?`, () => handleRevertStatus(booking, status))}>
                                                  {status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                                                </DropdownMenuItem>
                                              ))}
                                            </>
                                          )}
                                          {previousStatuses.length > 0 && futureStatuses.length > 0 && <DropdownMenuSeparator />}
                                          {futureStatuses.length > 0 && (
                                            <>
                                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center">
                                                Skip to <ArrowRight className="ml-1 h-3 w-3" />
                                              </div>
                                              {futureStatuses.map((status) => (
                                                <DropdownMenuItem key={status} onClick={() => handleConfirmEvent("Skip Status", `Are you sure you want to skip to '${status.replace(/_/g, " ")}'?`, () => {
                                                  if (status === "closed") handleOpenCloseDialog(booking);
                                                  else updateStatusWithLog(booking, status, status as BookingEventLog["event"], `Status changed to ${status} by admin`);
                                                })}>
                                                  {status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                                                </DropdownMenuItem>
                                              ))}
                                            </>
                                          )}
                                        </DropdownMenuSubContent>
                                      </DropdownMenuSub>
                                    )}

                                    {/* Reassign Driver */}
                                    {booking.driverId && !["closed", "cancelled", "pending", "confirmed"].includes(booking.status) && (
                                      <DropdownMenuItem onClick={() => {
                                        setReassigningBooking(booking)
                                        setReassignData({ driverId: booking.driverId || "", carId: booking.carId || "", reason: "" })
                                        setIsReassignDialogOpen(true)
                                      }}>
                                        <RefreshCw className="mr-2 h-4 w-4" /> Reassign Driver
                                      </DropdownMenuItem>
                                    )}

                                    {/* Edit Closed Duty */}
                                    {booking.status === "closed" && (
                                      <DropdownMenuItem onClick={() => handleOpenEditClosedDutyDialog(booking)}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Edit Closed Duty
                                      </DropdownMenuItem>
                                    )}

                                    <DropdownMenuSeparator />

                                    {/* Event Log */}
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setViewingEventLogBooking(booking)
                                        setIsEventLogDialogOpen(true)
                                      }}
                                    >
                                      <History className="mr-2 h-4 w-4" />
                                      View Event Log
                                    </DropdownMenuItem>
                                  </>
                                )}

                                {/* Duty Slip */}
                                {booking.b2bClientId && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setViewingDutySlipBooking(booking)
                                        setIsDutySlipDialogOpen(true)
                                      }}
                                    >
                                      <FileText className="mr-2 h-4 w-4" />
                                      View Duty Slip
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handlePrintSlip(displayDutySlip)}
                                    >
                                      <Printer className="mr-2 h-4 w-4" />
                                      Print Duty Slip
                                    </DropdownMenuItem>
                                  </>
                                )}

                                <DropdownMenuSeparator />

                                {/* Cancel / Reactivate */}
                                {!["closed", "cancelled"].includes(booking.status) && (
                                  <DropdownMenuItem
                                    onClick={() => handleConfirmEvent("Cancel Booking", "Are you sure you want to cancel this booking?", () => handleCancelBooking(booking))}
                                    className="text-destructive"
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Cancel Booking
                                  </DropdownMenuItem>
                                )}
                              {!isB2BUser && booking.status === "cancelled" && (
                                <DropdownMenuItem
                                  onClick={() => handleConfirmEvent("Reactivate Booking", "Are you sure you want to reactivate this cancelled booking?", () => handleReactivateBooking(booking))}
                                  className="text-success"
                                >
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Reactivate Booking
                                </DropdownMenuItem>
                              )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create/Edit Booking Dialog */}
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            if (open) {
              setIsDialogOpen(true)
            } else {
              handleCloseDialog()
            }
          }}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingBooking ? "Edit Booking" : "Create New Booking"}
              </DialogTitle>
              <DialogDescription>
                {editingBooking
                  ? "Update booking details"
                  : "Fill in the details to create a new booking"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <Tabs value={customerType} onValueChange={(v) => setCustomerType(v as "b2c" | "b2b")}>
              {!isB2BUser && (
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="b2c">
                      <User className="mr-2 h-4 w-4" />
                      Individual (B2C)
                    </TabsTrigger>
                    <TabsTrigger value="b2b">
                      <Building2 className="mr-2 h-4 w-4" />
                      Business (B2B)
                    </TabsTrigger>
                  </TabsList>
                )}
              {isB2BUser && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg mb-4">
                    <Building2 className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">B2B Booking Only</p>
                    <p className="text-xs text-muted-foreground">Your account is restricted to corporate bookings</p>
                    </div>
                  </div>
                )}

                <TabsContent value="b2c" className="space-y-4">
                  {/* Customer Search */}
                  <Field>
                    <div className="flex items-center justify-between mb-1">
                      <FieldLabel>Search Customer</FieldLabel>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-xs text-primary"
                        onClick={() => setIsAddCustomerDialogOpen(true)}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Add New Customer
                      </Button>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, phone, or email..."
                        value={b2cSearchQuery}
                        onChange={(e) => {
                          setB2cSearchQuery(e.target.value)
                          setB2cSearchOpen(e.target.value.length > 0)
                        }}
                        onFocus={() => b2cSearchQuery.length > 0 && setB2cSearchOpen(true)}
                        className="pl-10"
                      />
                      {b2cSearchQuery && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                          onClick={() => {
                            setB2cSearchQuery("")
                            setB2cSearchOpen(false)
                          }}
                        >
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                    
                    {/* Search Results Dropdown */}
                    {b2cSearchOpen && (
                      <div className="border rounded-md mt-1 max-h-48 overflow-y-auto bg-popover shadow-md z-50 relative">
                        {b2cCustomers.filter(c => 
                          !b2cSearchQuery || 
                          c.name.toLowerCase().includes(b2cSearchQuery.toLowerCase()) ||
                          c.phone.includes(b2cSearchQuery) ||
                          (c.email && c.email.toLowerCase().includes(b2cSearchQuery.toLowerCase()))
                        ).length === 0 ? (
                          <div className="p-3 text-sm text-muted-foreground text-center">
                            No customer found. 
                            <button 
                              type="button"
                              className="text-primary underline ml-1"
                              onClick={() => {
                                setB2cSearchOpen(false)
                                setIsAddCustomerDialogOpen(true)
                              }}
                            >
                              Add new?
                            </button>
                          </div>
                        ) : (
                          b2cCustomers
                            .filter(c => 
                              !b2cSearchQuery || 
                              c.name.toLowerCase().includes(b2cSearchQuery.toLowerCase()) ||
                              c.phone.includes(b2cSearchQuery) ||
                              (c.email && c.email.toLowerCase().includes(b2cSearchQuery.toLowerCase()))
                            )
                            .map((customer) => (
                              <div
                                key={customer.id}
                                className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                                onClick={() => {
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
                                  toast.success(`Selected: ${customer.name} (${customer.customerCode})`)
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-sm">{customer.name}</span>
                                  <Badge variant="outline" className="text-[10px]">{customer.customerCode}</Badge>
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" /> {customer.phone}
                                  </span>
                                  {customer.email && (
                                    <span className="truncate max-w-[150px]">{customer.email}</span>
                                  )}
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                    )}
                  </Field>

                  {/* Selected Customer Display */}
                  {formData.b2cCustomerId && (
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Selected Customer</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {b2cCustomers.find((c) => c.id === formData.b2cCustomerId)?.customerCode}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Name:</span>
                          <span className="ml-1 font-medium">{formData.customerName}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Phone:</span>
                          <span className="ml-1">{formData.customerPhone}</span>
                        </div>
                        {formData.customerEmail && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Email:</span>
                            <span className="ml-1">{formData.customerEmail}</span>
                          </div>
                        )}
                        {formData.customerAddress && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Address:</span>
                            <span className="ml-1">{formData.customerAddress}</span>
                          </div>
                        )}
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-xs w-full mt-1"
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
                        Change Customer
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="b2b" className="space-y-4">
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
                      {!isB2BUser && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Only approved employees with login access are shown
                        </p>
                      )}
                    </Field>
                  )}
                </TabsContent>
              </Tabs>

              <div className="space-y-4 mt-4">
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
                              No active airports configured for this city
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
                              {terminal.name} ({terminal.code})
                            </SelectItem>
                          ))}
                          {formData.airportId && airportTerminals.length === 0 && (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                              No active terminals configured for this airport
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </Field>
                  </FieldGroup>
                )}

                <FieldGroup className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>{formData.tripType === "airport_pickup" ? "Airport Pickup *" : "Pickup Location *"}</FieldLabel>
                    <Input
                      value={
                        formData.tripType === "airport_pickup"
                          ? formatAirportLocation(formData.airportId, formData.airportTerminalId)
                          : formData.pickupLocation
                      }
                      onChange={(e) =>
                        setFormData({ ...formData, pickupLocation: e.target.value })
                      }
                      placeholder={formData.tripType === "airport_pickup" ? "Airport and terminal selected above" : "Enter pickup location"}
                      disabled={formData.tripType === "airport_pickup"}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>{formData.tripType === "airport_drop" ? "Airport Drop *" : "Drop Location *"}</FieldLabel>
                    <Input
                      value={
                        formData.tripType === "airport_drop"
                          ? formatAirportLocation(formData.airportId, formData.airportTerminalId)
                          : formData.dropLocation
                      }
                      onChange={(e) =>
                        setFormData({ ...formData, dropLocation: e.target.value })
                      }
                      placeholder={formData.tripType === "airport_drop" ? "Airport and terminal selected above" : "Enter drop location"}
                      disabled={formData.tripType === "airport_drop"}
                    />
                  </Field>
                </FieldGroup>

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
                      className="bg-muted font-medium cursor-not-allowed"
                      placeholder="Auto-calculating..."
                    />
                  </Field>
                </FieldGroup>

                <Field>
                  <FieldLabel>Remarks</FieldLabel>
                  <Textarea
                    value={formData.remarks || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, remarks: e.target.value })
                    }
                    placeholder="Any special instructions..."
                    rows={2}
                  />
                </Field>

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
                      </SelectContent>
                    </Select>
                    {selectedPromoError ? (
                      <p className="text-xs text-destructive mt-1">{selectedPromoError}</p>
                    ) : selectedFormPromo ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedFormPromo.description}
                      </p>
                    ) : eligiblePromoCodes.length === 0 ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        No promo codes are available for this booking.
                      </p>
                    ) : null}
                  </Field>
                )}
                {isB2BUser && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-sm">Promo Code:</span> Not available for corporate bookings
                    </p>
                  </div>
                )}

                {/* Fare Summary - Auto-calculated */}
                {formData.cityId && formData.carCategoryId && (
                  <Card className="bg-muted/50 border-primary/20">
                    <CardContent className="pt-4">
                      <h4 className="font-semibold mb-4 flex items-center gap-2 text-primary">
                        <Banknote className="h-4 w-4" />
                        Estimated Fare Breakup
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">
                            {formData.tripType === 'outstation' ? 'Outstation Base (Inc. Min KM & Driver)' :
                             formData.tripType === 'rental' ? 'Rental Package Base' : 
                             formData.tripType.includes('airport') ? 'Airport Transfer Base' : 'Estimated Base Fare'}:
                          </span>
                          <span className="font-medium">Rs. {formData.estimatedFare.toFixed(2)}</span>
                        </div>
                        {formData.tollCharges > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Toll (Pre-booked):</span>
                            <span>Rs. {formData.tollCharges.toFixed(2)}</span>
                          </div>
                        )}
                        {formData.parkingCharges > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Parking (Pre-booked):</span>
                            <span>Rs. {formData.parkingCharges.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center border-t pt-2 mt-2">
                          <span className="text-muted-foreground font-medium">Subtotal:</span>
                          <span className="font-medium">Rs. {formData.totalFare.toFixed(2)}</span>
                        </div>
                        {formData.promoDiscount > 0 && (
                          <div className="flex justify-between items-center text-success">
                            <span>Promo Discount:</span>
                            <span>- Rs. {formData.promoDiscount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-muted-foreground">
                          <span className="text-muted-foreground">GST ({gstConfig.cgstRate + gstConfig.sgstRate}%):</span>
                          <span>Rs. {formData.gstAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center font-bold text-lg border-t border-border pt-3 mt-3">
                          <span>Grand Total:</span>
                          <span>Rs. {formData.grandTotal.toFixed(2)}</span>
                        </div>

                        <div className="pt-4 mt-4 border-t border-border flex items-center justify-between gap-4">
                           <Label className="font-medium whitespace-nowrap">Advance Paid (Rs):</Label>
                           <Input 
                             type="number" 
                             className="w-32 text-right" 
                             value={formData.advancePaid || ""}
                             onChange={(e) => setFormData({...formData, advancePaid: parseFloat(e.target.value) || 0})}
                             placeholder="0"
                           />
                        </div>
                        {(formData.advancePaid || 0) > 0 && (
                          <div className="flex justify-between items-center font-bold text-destructive pt-2">
                            <span>Balance Due:</span>
                            <span>Rs. {Math.max(formData.grandTotal - (formData.advancePaid || 0), 0).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingBooking ? "Update Booking" : "Create Booking"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add New Customer Dialog */}
        <Dialog open={isAddCustomerDialogOpen} onOpenChange={setIsAddCustomerDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
              <DialogDescription>
                Create a new B2C customer profile.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Field>
                <FieldLabel>Customer Name *</FieldLabel>
                <Input
                  value={newCustomerData.name}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                  placeholder="Enter full name"
                />
              </Field>
              <Field>
                <FieldLabel>Phone Number *</FieldLabel>
                <PhoneInput
                  value={newCustomerData.phone}
                  onChange={(value) => setNewCustomerData({ ...newCustomerData, phone: value })}
                  placeholder="Enter phone number"
                />
              </Field>
              <Field>
                <FieldLabel>Email</FieldLabel>
                <Input
                  type="email"
                  value={newCustomerData.email}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </Field>
              <Field>
                <FieldLabel>Address</FieldLabel>
                <Input
                  value={newCustomerData.address}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, address: e.target.value })}
                  placeholder="Enter billing address"
                />
              </Field>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddCustomerDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddNewCustomer}>Save Customer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Driver Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Assign Driver & Car</DialogTitle>
              <DialogDescription>
                Assign a driver and car for booking {assigningBooking?.bookingNumber}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Field>
                <FieldLabel>Select Driver</FieldLabel>
                <Select
                  value={assignData.driverId}
                  onValueChange={(value) => {
                    const driver = drivers.find(d => d.id === value)
                    // Auto-select the driver's assigned car if available
                    const assignedCar = driver?.assignedCarId ? cars.find(c => c.id === driver.assignedCarId) : null
                    setAssignData({ 
                      ...assignData, 
                      driverId: value,
                      carId: assignedCar && (assignedCar.status === 'available' || assignedCar.status === 'on_trip') ? assignedCar.id : assignData.carId
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeDrivers.map((driver) => {
                      const assignedCar = driver.assignedCarId ? cars.find(c => c.id === driver.assignedCarId) : null
                      const category = assignedCar ? getCarCategory(assignedCar.categoryId) : null
                      const hasActiveBooking = bookings.some(b => 
                        b.driverId === driver.id && 
                        ['dispatched', 'arrived', 'picked_up'].includes(b.status)
                      )
                      return (
                        <SelectItem key={driver.id} value={driver.id}>
                          <div className="flex flex-col">
                            <span>{driver.name} {hasActiveBooking && <Badge variant="secondary" className="ml-1 text-[10px]">On Trip</Badge>}</span>
                            <span className="text-xs text-muted-foreground">
                              ID: {driver.licenseNumber} | Ph: {driver.phone}
                              {category && ` | ${category.name}`}
                            </span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </Field>

              {/* Selected Driver Details */}
              {assignData.driverId && (() => {
                const selectedDriver = getDriver(assignData.driverId)
                const assignedCar = selectedDriver?.assignedCarId ? getCar(selectedDriver.assignedCarId) : null
                const category = assignedCar ? getCarCategory(assignedCar.categoryId) : null
                const hasActiveBooking = bookings.find(b => 
                  b.driverId === selectedDriver?.id && 
                  ['dispatched', 'arrived', 'picked_up'].includes(b.status)
                )
                
                return (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <p className="text-sm font-medium">Selected Driver Details:</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Name:</span>
                        <span className="ml-1 font-medium">{selectedDriver?.name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">ID:</span>
                        <span className="ml-1 font-mono">{selectedDriver?.licenseNumber}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Phone:</span>
                        <span className="ml-1">{selectedDriver?.phone}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Mapped Car:</span>
                        <span className="ml-1">{assignedCar ? assignedCar.registrationNumber : 'None'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Category:</span>
                        <span className="ml-1">{category?.name || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Ride Status:</span>
                        <Badge variant={hasActiveBooking ? "destructive" : "secondary"} className="ml-1 text-xs">
                          {hasActiveBooking ? `On Trip (${hasActiveBooking.bookingNumber})` : 'Available'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )
              })()}

              <Field>
                <FieldLabel>Select Car</FieldLabel>
                <Select
                  value={assignData.carId}
                  onValueChange={(value) => setAssignData({ ...assignData, carId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a car" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCars.map((car) => {
                      const category = getCarCategory(car.categoryId)
                      const assignedDriver = car.assignedDriverId ? getDriver(car.assignedDriverId) : null
                      return (
                        <SelectItem key={car.id} value={car.id}>
                          <div className="flex flex-col">
                            <span>{car.registrationNumber} - {car.make} {car.model}</span>
                            <span className="text-xs text-muted-foreground">
                              {category?.name || 'N/A'}
                              {assignedDriver && ` | Mapped: ${assignedDriver.name}`}
                              {car.status === 'on_trip' && ' | Currently On Trip'}
                            </span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignDriver}>
                <UserPlus className="mr-2 h-4 w-4" />
                Assign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reassign Driver Dialog */}
        <Dialog open={isReassignDialogOpen} onOpenChange={setIsReassignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reassign Driver & Car</DialogTitle>
              <DialogDescription>
                Reassign driver for booking {reassigningBooking?.bookingNumber}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {reassigningBooking && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <p className="font-medium mb-1">Current Assignment:</p>
                  <p className="text-muted-foreground">
                    Driver: {getDriver(reassigningBooking.driverId || "")?.name || "N/A"}
                  </p>
                  <p className="text-muted-foreground">
                    Car: {getCar(reassigningBooking.carId || "")?.registrationNumber || "N/A"}
                  </p>
                </div>
              )}
              <Field>
                <FieldLabel>New Driver</FieldLabel>
                <Select
                  value={reassignData.driverId}
                  onValueChange={(value) => setReassignData({ ...reassignData, driverId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeDrivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name} - {driver.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>New Car</FieldLabel>
                <Select
                  value={reassignData.carId}
                  onValueChange={(value) => setReassignData({ ...reassignData, carId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a car" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCars.map((car) => {
                      const category = getCarCategory(car.categoryId)
                      return (
                        <SelectItem key={car.id} value={car.id}>
                          {car.registrationNumber} - {car.make} {car.model}
                          {category && ` (${category.name})`}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Reason for Reassignment</FieldLabel>
                <Textarea
                  value={reassignData.reason}
                  onChange={(e) => setReassignData({ ...reassignData, reason: e.target.value })}
                  placeholder="Enter reason for reassignment..."
                  rows={2}
                />
              </Field>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReassignDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleReassignDriver}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reassign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Pair Driver & Car Dialog */}
        {!isB2BUser && (
          <Dialog open={isPairDialogOpen} onOpenChange={setIsPairDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Pair Driver & Car</DialogTitle>
                <DialogDescription>
                  Manually pair a driver with a car when they haven&apos;t logged in through the app
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Field>
                  <FieldLabel>Select Driver</FieldLabel>
                  <Select
                    value={pairData.driverId}
                    onValueChange={(value) => setPairData({ ...pairData, driverId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a driver" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeDrivers.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.name} - {driver.phone}
                          {driver.assignedCarId && " (Already paired)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Select Car</FieldLabel>
                  <Select
                    value={pairData.carId}
                    onValueChange={(value) => setPairData({ ...pairData, carId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a car" />
                    </SelectTrigger>
                    <SelectContent>
                      {cars.map((car) => {
                        const category = getCarCategory(car.categoryId)
                        return (
                          <SelectItem key={car.id} value={car.id}>
                            {car.registrationNumber} - {car.make} {car.model}
                            {category && ` (${category.name})`}
                            {car.assignedDriverId && " (Already paired)"}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsPairDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handlePairDriverCar}>
                  <Link2 className="mr-2 h-4 w-4" />
                  Pair
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Pickup Dialog */}
        <Dialog open={isPickupDialogOpen} onOpenChange={setIsPickupDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Mark Picked Up</DialogTitle>
              <DialogDescription>
                Enter the start KM reading and pickup time to begin the trip.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Field>
                <FieldLabel>Start KM</FieldLabel>
                <Input
                  type="number"
                  value={pickupData.startKm || ""}
                  onChange={(e) => setPickupData({ ...pickupData, startKm: parseInt(e.target.value) || 0 })}
                  placeholder="Enter start KM"
                />
              </Field>
              <Field>
                <FieldLabel>Pickup Time</FieldLabel>
                <div className="flex gap-2">
                  <Input
                    type="datetime-local"
                    value={pickupData.startTime}
                    onChange={(e) => setPickupData({ ...pickupData, startTime: e.target.value })}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      const now = new Date()
                      now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
                      setPickupData({ ...pickupData, startTime: now.toISOString().slice(0, 16) })
                    }}
                  >
                    Now
                  </Button>
                </div>
              </Field>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPickupDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handlePickupSubmit} className="bg-orange-600 hover:bg-orange-700 text-white">
                <UserCheck className="mr-2 h-4 w-4" />
                Confirm Pickup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Close Trip Dialog */}
        <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Close Trip - {closingBooking?.bookingNumber}</DialogTitle>
              <DialogDescription>
                Enter final KM reading and any additional charges for this trip
              </DialogDescription>
              {closingBooking?.b2bClientId && (() => {
                const client = b2bClients.find(c => c.id === closingBooking.b2bClientId)
                if (client) {
                  return (
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        {client.billingType === 'point_to_point' ? 'Point to Point Billing' : 'Garage to Garage Billing'}
                      </Badge>
                      {client.isGSTEnabled === false && (
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                          GST Disabled
                        </Badge>
                      )}
                    </div>
                  )
                }
                return null
              })()}
            </DialogHeader>
            <div className="grid gap-4 py-4">
          <FieldGroup className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>End KM Reading</FieldLabel>
              <Input
                type="number"
                value={closeData.endKm}
                onChange={(e) =>
                  setCloseData({ ...closeData, endKm: parseInt(e.target.value) || 0 })
                }
                placeholder="Enter end KM"
              />
            </Field>
            <Field>
              <FieldLabel>End Time</FieldLabel>
              <div className="flex gap-2">
                <Input
                  type="datetime-local"
                  value={closeData.endTime}
                  onChange={(e) => setCloseData({ ...closeData, endTime: e.target.value })}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    const now = new Date()
                    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
                    setCloseData({ ...closeData, endTime: now.toISOString().slice(0, 16) })
                  }}
                >
                  Now
                </Button>
              </div>
            </Field>
          </FieldGroup>

              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-medium text-sm">Additional Charges</h4>
                <FieldGroup className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Toll Charges</FieldLabel>
                    <Input
                      type="number"
                      value={closeData.tollCharges}
                      onChange={(e) =>
                        setCloseData({ ...closeData, tollCharges: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="Rs. 0"
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Parking Charges</FieldLabel>
                    <Input
                      type="number"
                      value={closeData.parkingCharges}
                      onChange={(e) =>
                        setCloseData({ ...closeData, parkingCharges: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="Rs. 0"
                    />
                  </Field>
                </FieldGroup>
                <FieldGroup className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Waiting Charges</FieldLabel>
                    <Input
                      type="number"
                      value={closeData.waitingCharge}
                      onChange={(e) =>
                        setCloseData({ ...closeData, waitingCharge: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="Rs. 0"
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Misc Charges</FieldLabel>
                    <Input
                      type="number"
                      value={closeData.miscCharges}
                      onChange={(e) =>
                        setCloseData({ ...closeData, miscCharges: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="Rs. 0"
                    />
                  </Field>
                </FieldGroup>
              </div>

              <Field>
                <FieldLabel>Closing Remarks</FieldLabel>
                <Textarea
                  value={closeData.remarks}
                  onChange={(e) => setCloseData({ ...closeData, remarks: e.target.value })}
                  placeholder="Any notes about this trip..."
                  rows={2}
                />
              </Field>

              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Additional Charges:</span>
                    <span className="font-semibold">
                      Rs. {(closeData.tollCharges + closeData.parkingCharges + closeData.waitingCharge + closeData.miscCharges).toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCloseDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCloseTrip} className="bg-success hover:bg-success/90">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Close Trip
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Event Log Dialog */}
        <Dialog open={isEventLogDialogOpen} onOpenChange={setIsEventLogDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Event Log - {viewingEventLogBooking?.bookingNumber}</DialogTitle>
              <DialogDescription>
                Complete history of all events for this booking
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[400px] pr-4">
              <div className="space-y-4 py-4">
                {(viewingEventLogBooking?.eventLog || []).length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No events recorded</p>
                ) : (
                  [...(viewingEventLogBooking?.eventLog || [])].reverse().map((event, index) => (
                    <div key={event.id} className="flex gap-3 relative">
                      {index < (viewingEventLogBooking?.eventLog || []).length - 1 && (
                        <div className="absolute left-[11px] top-6 w-0.5 h-full bg-border" />
                      )}
                      <div className="relative z-10">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <Clock className="h-3 w-3 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm capitalize">
                            {event.event.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatEventTime(event.performedAt)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {event.fromStatus && (
                            <span>
                              {event.fromStatus.replace(/_/g, " ")} → {event.toStatus.replace(/_/g, " ")}
                            </span>
                          )}
                          {!event.fromStatus && <span>Status: {event.toStatus.replace(/_/g, " ")}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          By: <span className="font-medium">{event.performedBy}</span>
                        </p>
                        {event.notes && (
                          <p className="text-xs text-muted-foreground mt-1 bg-muted/50 rounded p-2">
                            {event.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEventLogDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Voucher View Dialog */}
        <Dialog open={isVoucherDialogOpen} onOpenChange={setIsVoucherDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-100">
            <DialogHeader className="flex-shrink-0 px-6 py-4 bg-white border-b">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle>Voucher Preview</DialogTitle>
                  <DialogDescription>
                    Booking voucher for {viewingVoucherBooking?.bookingNumber}
                  </DialogDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => {
                  if (viewingVoucherBooking) handlePrintVoucher(viewingVoucherBooking)
                }}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print Voucher
                </Button>
              </div>
            </DialogHeader>
            <ScrollArea className="flex-grow p-6">
              {viewingVoucherBooking && (() => {
                const city = getCity(viewingVoucherBooking.cityId)
                const carCategory = getCarCategory(viewingVoucherBooking.carCategoryId)
                return (
                  <div className="flex justify-center pb-8">
                    <div className="shadow-lg rounded-xl overflow-hidden bg-white print:shadow-none print:rounded-none">
                      <PrintableVoucher 
                        booking={viewingVoucherBooking}
                        city={city}
                        carCategory={carCategory}
                      />
                    </div>
                  </div>
                )
              })()}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Duty Slip View Dialog */}
        <Dialog open={isDutySlipDialogOpen} onOpenChange={setIsDutySlipDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-100">
            <DialogHeader className="flex-shrink-0 px-6 py-4 bg-white border-b">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle>Duty Slip Preview</DialogTitle>
                  <DialogDescription>
                    Duty slip for booking {viewingDutySlipBooking?.bookingNumber}
                  </DialogDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => {
                  if (!viewingDutySlipBooking) return
                  const slip = getDutySlipForBooking(viewingDutySlipBooking.id) || {
                    id: 'temp-' + viewingDutySlipBooking.id,
                    dutySlipNumber: 'DS-TBD',
                    bookingId: viewingDutySlipBooking.id,
                    driverId: viewingDutySlipBooking.driverId || '',
                    carId: viewingDutySlipBooking.carId || '',
                    startTime: '',
                    startKm: 0,
                    status: 'active' as const,
                    createdAt: viewingDutySlipBooking.createdAt
                  }
                  handlePrintSlip(slip)
                }}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print Slip
                </Button>
              </div>
            </DialogHeader>
            <ScrollArea className="flex-grow p-6">
              {viewingDutySlipBooking && (() => {
                const dutySlip = getDutySlipForBooking(viewingDutySlipBooking.id) || {
                  id: 'temp-' + viewingDutySlipBooking.id,
                  dutySlipNumber: 'DS-TBD',
                  bookingId: viewingDutySlipBooking.id,
                  driverId: viewingDutySlipBooking.driverId || '',
                  carId: viewingDutySlipBooking.carId || '',
                  startTime: '',
                  startKm: 0,
                  status: 'active' as const,
                  createdAt: viewingDutySlipBooking.createdAt
                }
                
                const driver = getDriver(dutySlip.driverId)
                const car = getCar(dutySlip.carId)
                const city = getCity(viewingDutySlipBooking.cityId)
                
                return (
                  <div className="flex justify-center pb-8">
                    <div className="shadow-lg rounded-xl overflow-hidden bg-white print:shadow-none print:rounded-none">
                      <PrintableDutySlip 
                        booking={viewingDutySlipBooking}
                        dutySlip={dutySlip}
                        driver={driver}
                        car={car}
                        city={city}
                        b2bEmployee={viewingDutySlipBooking.b2bEmployeeId ? getB2BEmployee(viewingDutySlipBooking.b2bEmployeeId) : undefined}
                        b2bClient={viewingDutySlipBooking.b2bClientId ? getB2BClient(viewingDutySlipBooking.b2bClientId) : undefined}
                      />
                    </div>
                  </div>
                )
              })()}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Edit Closed Duty Dialog */}
        <Dialog open={isEditClosedDutyDialogOpen} onOpenChange={setIsEditClosedDutyDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Closed Duty - {editingClosedDutyBooking?.bookingNumber}</DialogTitle>
              <DialogDescription>
                Modify duty details for this closed trip. This will automatically recalculate the final fare.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Field>
                <FieldLabel>Assigned Driver</FieldLabel>
                <Select
                  value={editClosedDutyData.driverId}
                  onValueChange={(value) => setEditClosedDutyData({ ...editClosedDutyData, driverId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeDrivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name} - {driver.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Start Time</FieldLabel>
                  <Input
                    type="datetime-local"
                    value={editClosedDutyData.startTime}
                    onChange={(e) => setEditClosedDutyData({ ...editClosedDutyData, startTime: e.target.value })}
                  />
                </Field>
                <Field>
                  <FieldLabel>End Time</FieldLabel>
                  <Input
                    type="datetime-local"
                    value={editClosedDutyData.endTime}
                    onChange={(e) => setEditClosedDutyData({ ...editClosedDutyData, endTime: e.target.value })}
                  />
                </Field>
              </FieldGroup>
              <FieldGroup className="grid grid-cols-3 gap-4">
                <Field>
                  <FieldLabel>Start KM</FieldLabel>
                  <Input
                    type="number"
                    value={editClosedDutyData.startKm}
                    onChange={(e) => setEditClosedDutyData({ ...editClosedDutyData, startKm: parseInt(e.target.value) || 0 })}
                  />
                </Field>
                <Field>
                  <FieldLabel>End KM</FieldLabel>
                  <Input
                    type="number"
                    value={editClosedDutyData.endKm}
                    onChange={(e) => setEditClosedDutyData({ ...editClosedDutyData, endKm: parseInt(e.target.value) || 0 })}
                  />
                </Field>
                <Field>
                  <FieldLabel>Total KM</FieldLabel>
                  <Input
                    type="number"
                    value={Math.max(0, editClosedDutyData.endKm - editClosedDutyData.startKm)}
                    readOnly
                    className="bg-muted font-medium cursor-not-allowed"
                  />
                </Field>
              </FieldGroup>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditClosedDutyDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateClosedDuty}>
                Update Duty Details
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Ticket Dialog */}
        <Dialog open={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Raise Support Ticket</DialogTitle>
              <DialogDescription>
                Create a ticket for booking {ticketBooking?.bookingNumber}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Field>
                <FieldLabel>Subject</FieldLabel>
                <Input 
                  placeholder="Briefly describe the issue" 
                  value={ticketData.subject}
                  onChange={(e) => setTicketData({...ticketData, subject: e.target.value})}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Type</FieldLabel>
                  <Select value={ticketData.type} onValueChange={(v) => setTicketData({...ticketData, type: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Complaint">Complaint</SelectItem>
                      <SelectItem value="Billing">Billing</SelectItem>
                      <SelectItem value="Technical">Technical</SelectItem>
                      <SelectItem value="General Inquiry">General Inquiry</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Priority</FieldLabel>
                  <Select value={ticketData.priority} onValueChange={(v) => setTicketData({...ticketData, priority: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field>
                <FieldLabel>Description</FieldLabel>
                <Textarea 
                  placeholder="Provide a detailed description of the issue..." 
                  rows={4} 
                  value={ticketData.description}
                  onChange={(e) => setTicketData({...ticketData, description: e.target.value})}
                />
              </Field>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTicketDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateTicket}>Submit Ticket</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Review Edit Dialog */}
        <Dialog open={isReviewEditDialogOpen} onOpenChange={setIsReviewEditDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Review Booking Edit - {reviewingBooking?.bookingNumber}</DialogTitle>
              <DialogDescription>
                A corporate user has requested changes to this booking. Review the changes below and approve or reject them.
              </DialogDescription>
            </DialogHeader>
            <div className="my-4 max-h-[50vh] overflow-y-auto">
              {reviewingBooking && reviewingBooking.pendingEdits ? (
                (() => {
                  const original = reviewingBooking;
                  const changes = reviewingBooking.pendingEdits;
                  const fieldsToShow: (keyof Booking)[] = [
                      'customerName', 'customerPhone', 'pickupLocation', 'dropLocation', 
                      'pickupDate', 'pickupTime', 'remarks', 'b2bEmployeeId'
                  ];
                  
                  const fieldLabels: Record<string, string> = {
                    customerName: 'Customer Name',
                    customerPhone: 'Customer Phone',
                    pickupLocation: 'Pickup Location',
                    dropLocation: 'Drop Location',
                    pickupDate: 'Pickup Date',
                    pickupTime: 'Pickup Time',
                    remarks: 'Remarks',
                    b2bEmployeeId: 'Employee'
                  };

                  const changedFields = fieldsToShow.filter(key => 
                      original[key] !== changes[key] && changes[key] !== undefined
                  );

                  if (changedFields.length === 0) {
                      return <p className="text-muted-foreground p-4 text-center">No changes to display.</p>;
                  }

                  return (
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead>Field</TableHead>
                                  <TableHead>Original Value</TableHead>
                                  <TableHead>New Value</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {changedFields.map(key => (
                                  <TableRow key={key}>
                                      <TableCell className="font-medium capitalize">
                                        {fieldLabels[key as keyof typeof fieldLabels] || key.replace(/([A-Z])/g, ' $1')}
                                      </TableCell>
                                      <TableCell>
                                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-md line-through dark:bg-red-900/50 dark:text-red-200">
                                            {key === 'b2bEmployeeId' ? getB2BEmployee(original[key] as string)?.name : String(original[key] || 'N/A')}
                                        </span>
                                      </TableCell>
                                      <TableCell>
                                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md font-semibold dark:bg-green-900/50 dark:text-green-200">
                                            {key === 'b2bEmployeeId' ? getB2BEmployee(changes[key] as string)?.name : String(changes[key] || 'N/A')}
                                        </span>
                                      </TableCell>                                  </TableRow>
                              ))}
                          </TableBody>
                      </Table>
                  );
                })()
              ) : (
                <p>No pending changes to display.</p>
              )}
            </div>
            <DialogFooter>
              {isRejectingEdit ? (
                <div className="w-full flex flex-col gap-3 mt-4 border-t pt-4">
                  <Input 
                    placeholder="Please provide a reason for rejection..." 
                    value={editRejectionReason}
                    onChange={(e) => setEditRejectionReason(e.target.value)}
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsRejectingEdit(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={() => {
                        if (reviewingBooking && editRejectionReason.trim()) {
                            rejectBookingEdit(reviewingBooking.id, editRejectionReason.trim());
                            setIsReviewEditDialogOpen(false);
                            setIsRejectingEdit(false);
                            setEditRejectionReason("");
                        } else {
                            toast.error("Reason is required to reject changes.");
                        }
                    }}>
                        Confirm Reject
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setIsReviewEditDialogOpen(false)}>Close</Button>
                  <Button variant="destructive" onClick={() => setIsRejectingEdit(true)}>
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject Changes
                  </Button>
                  <Button onClick={() => {
                      if (reviewingBooking) approveBookingEdit(reviewingBooking.id);
                      setIsReviewEditDialogOpen(false);
                  }} className="bg-purple-600 hover:bg-purple-700">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve Changes
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Generic Confirmation Dialog for Driver Events */}
        <AlertDialog open={!!eventConfirmData} onOpenChange={() => setEventConfirmData(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{eventConfirmData?.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {eventConfirmData?.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>No, Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                if (eventConfirmData) {
                  eventConfirmData.onConfirm();
                  setEventConfirmData(null);
                }
              }}>Yes, Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>

      {/* Hidden Print Area */}
      {printingSlip && getBooking(printingSlip.bookingId) && (() => {
        const bk = getBooking(printingSlip.bookingId)!;
        return (
          <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:z-[9999] print:m-0 print:p-0">
            <PrintableDutySlip 
              booking={bk}
              dutySlip={printingSlip}
              driver={getDriver(printingSlip.driverId)}
              car={getCar(printingSlip.carId)}
              city={getCity(bk.cityId)}
              b2bEmployee={bk.b2bEmployeeId ? getB2BEmployee(bk.b2bEmployeeId) : undefined}
              b2bClient={bk.b2bClientId ? getB2BClient(bk.b2bClientId) : undefined}
            />
          </div>
        );
      })()}

      {/* Hidden Print Area for Voucher */}
      {printingVoucher && (() => {
        const city = getCity(printingVoucher.cityId)
        const carCategory = getCarCategory(printingVoucher.carCategoryId)
        return (
          <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:z-[9999] print:m-0 print:p-0">
            <PrintableVoucher 
              booking={printingVoucher}
              city={city}
              carCategory={carCategory}
            />
          </div>
        );
      })()}
      </>
    )
  }
