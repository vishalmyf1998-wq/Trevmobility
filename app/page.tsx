// @ts-nocheck
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAdmin } from '@/lib/admin-context'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Users,
  Car,
  MapPin,
  Building2,
  DollarSign,
  CalendarCheck,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Navigation,
  Phone,
  FileText,
  Plus,
  ChevronRight,
  CalendarDays,
  Wallet,
  Gift,
  Star,
  Headset,
  Percent,
  ReceiptText,
  ShieldCheck
} from 'lucide-react'

type DateFilterType = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'custom'

export default function DashboardPage() {
  const {
    drivers,
    cars,
    cities,
    fareGroups,
    b2cCustomers,
    b2bClients,
    b2bApprovalRules,
    carCategories,
    bookings,
    walletTransactions,
    invoices,
    dutySlips,
    promoCodes,
    cityPolygons,
    driverPayouts,
    getDriver,
    getCar,
    getCity,
    getCarCategory
  } = useAdmin()

  const [dateFilter, setDateFilter] = useState<DateFilterType>('today')
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>(undefined)
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>(undefined)
  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const [adminCounts, setAdminCounts] = useState({
    openTickets: 0,
    pendingReferrals: 0,
    lowReviews: 0,
    peakRules: 0,
    extrasRules: 0,
  })

  useEffect(() => {
    const fetchAdminCounts = async () => {
      const safeCount = async (query: PromiseLike<{ count: number | null; error: unknown }>) => {
        const { count, error } = await query
        return error ? 0 : count || 0
      }

      const [
        openTickets,
        pendingReferrals,
        lowDriverReviews,
        lowCarReviews,
        peakRules,
        routeTolls,
        stateTaxes,
        parkingFees,
      ] = await Promise.all([
        safeCount(
          supabase
            .from('open_support_tickets')
            .select('id', { count: 'exact', head: true })
        ),
        safeCount(
          supabase
            .from('referrals')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending')
        ),
        safeCount(
          supabase
            .from('trip_reviews')
            .select('id', { count: 'exact', head: true })
            .lte('driver_rating', 3)
        ),
        safeCount(
          supabase
            .from('trip_reviews')
            .select('id', { count: 'exact', head: true })
            .lte('car_rating', 3)
        ),
        safeCount(
          supabase
            .from('peak_hours')
            .select('id', { count: 'exact', head: true })
        ),
        safeCount(
          supabase
            .from('route_tolls')
            .select('id', { count: 'exact', head: true })
        ),
        safeCount(
          supabase
            .from('state_taxes')
            .select('id', { count: 'exact', head: true })
        ),
        safeCount(
          supabase
            .from('parking_fees')
            .select('id', { count: 'exact', head: true })
        ),
      ])

      setAdminCounts({
        openTickets,
        pendingReferrals,
        lowReviews: lowDriverReviews + lowCarReviews,
        peakRules,
        extrasRules: routeTolls + stateTaxes + parkingFees,
      })
    }

    fetchAdminCounts()
  }, [])

  // Get date range based on filter
  const dateRange = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    switch (dateFilter) {
      case 'today':
        return { from: today, to: today }
      case 'yesterday':
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        return { from: yesterday, to: yesterday }
      case 'last7days':
        const last7 = new Date(today)
        last7.setDate(last7.getDate() - 6)
        return { from: last7, to: today }
      case 'last30days':
        const last30 = new Date(today)
        last30.setDate(last30.getDate() - 29)
        return { from: last30, to: today }
      case 'thisMonth':
        return { 
          from: new Date(now.getFullYear(), now.getMonth(), 1), 
          to: today 
        }
      case 'lastMonth':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
        return { from: lastMonthStart, to: lastMonthEnd }
      case 'custom':
        return { 
          from: customDateFrom || today, 
          to: customDateTo || today 
        }
      default:
        return { from: today, to: today }
    }
  }, [dateFilter, customDateFrom, customDateTo])

  const formatDateRange = () => {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
    if (dateFilter === 'today') return 'Today'
    if (dateFilter === 'yesterday') return 'Yesterday'
    if (dateRange.from.getTime() === dateRange.to.getTime()) {
      return dateRange.from.toLocaleDateString('en-IN', options)
    }
    return `${dateRange.from.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${dateRange.to.toLocaleDateString('en-IN', options)}`
  }

  // Calculate stats based on date filter
  const stats = useMemo(() => {
    const isDateInRange = (dateStr: string) => {
      const date = new Date(dateStr)
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      return dateOnly >= dateRange.from && dateOnly <= dateRange.to
    }

    // Filter bookings by date range
    const filteredBookings = bookings.filter(b => isDateInRange(b.pickupDate))
    const activeBookings = bookings.filter(b => 
      ['dispatched', 'arrived', 'picked_up'].includes(b.status)
    )
    const completedBookings = filteredBookings.filter(b => b.status === 'closed')
    const cancelledBookings = filteredBookings.filter(b => b.status === 'cancelled')
    
    const filteredRevenue = completedBookings.reduce((sum, b) => sum + b.grandTotal, 0)
    const totalRevenue = bookings
      .filter(b => b.status === 'closed')
      .reduce((sum, b) => sum + b.grandTotal, 0)
    
    // Filter invoices by date range
    const filteredInvoices = invoices.filter(i => isDateInRange(i.invoiceDate))
    const paidInvoices = filteredInvoices.filter(i => i.status === 'paid')
    const pendingInvoices = filteredInvoices.filter(i => i.status === 'pending')
    const collectedAmount = paidInvoices.reduce((sum, i) => sum + i.paidAmount, 0)
    const pendingAmount = pendingInvoices.reduce((sum, i) => sum + i.balanceAmount, 0)
    
    const activeDrivers = drivers.filter(d => d.status === 'active')
    const availableCars = cars.filter(c => c.status === 'available')
    const onTripCars = cars.filter(c => c.status === 'on_trip')
    const totalWalletBalance = b2cCustomers.reduce((sum, c) => sum + (c.walletBalance || 0), 0)
    const activePromoCodes = promoCodes.filter(p => p.isActive).length
    const activeSurgeZones = cityPolygons.filter((p: any) => (p.surgeMultiplier || p.surge_multiplier || 1) > 1).length
    const pendingDriverPayouts = driverPayouts.filter(p => p.status === 'pending').length
    
    return {
      filteredBookings: filteredBookings.length,
      activeBookings: activeBookings.length,
      completedBookings: completedBookings.length,
      cancelledBookings: cancelledBookings.length,
      totalBookings: bookings.length,
      totalRevenue,
      filteredRevenue,
      collectedAmount,
      pendingAmount,
      activeDrivers: activeDrivers.length,
      totalDrivers: drivers.length,
      availableCars: availableCars.length,
      onTripCars: onTripCars.length,
      totalCars: cars.length,
      b2bClients: b2bClients.filter(c => c.status === 'active').length,
      pendingBookings: filteredBookings.filter(b => b.status === 'pending').length,
      b2cCustomers: b2cCustomers.length,
      totalWalletBalance,
      walletTransactions: walletTransactions.length,
      activePromoCodes,
      b2bApprovalRules: b2bApprovalRules.length,
      activeSurgeZones,
      pendingDriverPayouts
    }
  }, [
    bookings,
    invoices,
    drivers,
    cars,
    b2bClients,
    b2cCustomers,
    walletTransactions,
    promoCodes,
    cityPolygons,
    b2bApprovalRules,
    driverPayouts,
    dateRange
  ])

  // Get live trips (dispatched, arrived, picked_up)
  const liveTrips = useMemo(() => {
    return bookings
      .filter(b => ['dispatched', 'arrived', 'picked_up'].includes(b.status))
      .slice(0, 5)
  }, [bookings]);

  // Get recent bookings
  const recentBookings = useMemo(() => {
    return [...bookings]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
  }, [bookings]);

  useEffect(() => {
    const delayedBookings = bookings.filter(b => {
      if (!['confirmed', 'assigned', 'dispatched'].includes(b.status)) return false;
      if (!b.pickupDate || !b.pickupTime) return false;
      const pickupDateTime = new Date(`${b.pickupDate}T${b.pickupTime}`);
      if (isNaN(pickupDateTime.getTime())) return false;
      const now = new Date();
      return Math.floor((now.getTime() - pickupDateTime.getTime()) / 60000) > 0;
    });

    if (delayedBookings.length > 0) {
      toast.error(`${delayedBookings.length} driver(s) delayed for pickup!`, {
        description: 'Check Live Tracking for details.',
      });
    }
  }, [bookings]);

  // Get pending actions
  const pendingActions = useMemo(() => {
    const actions = []

    const delayedBookings = bookings.filter(b => {
      if (!['confirmed', 'assigned', 'dispatched'].includes(b.status)) return false;
      if (!b.pickupDate || !b.pickupTime) return false;
      const pickupDateTime = new Date(`${b.pickupDate}T${b.pickupTime}`);
      if (isNaN(pickupDateTime.getTime())) return false;
      const now = new Date();
      return Math.floor((now.getTime() - pickupDateTime.getTime()) / 60000) > 0;
    });

    if (delayedBookings.length > 0) {
      actions.push({
        type: 'destructive',
        title: `${delayedBookings.length} driver(s) delayed for pickup`,
        link: '/live-tracking'
      });
    }

    const unassignedBookings = bookings.filter(b => b.status === 'confirmed' && !b.driverId)
    if (unassignedBookings.length > 0) {
      actions.push({
        type: 'warning',
        title: `${unassignedBookings.length} booking(s) need driver assignment`,
        link: '/bookings'
      })
    }    
    const pendingInvoices = invoices.filter(i => i.status === 'pending')
    if (pendingInvoices.length > 0) {
      actions.push({
        type: 'info',
        title: `${pendingInvoices.length} invoice(s) pending payment`,
        link: '/invoices'
      })
    }
    
    const expiringSoonDrivers = drivers.filter(d => {
      const expiry = new Date(d.licenseExpiry)
      const daysUntilExpiry = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      return daysUntilExpiry <= 30 && daysUntilExpiry > 0
    })
    if (expiringSoonDrivers.length > 0) {
      actions.push({
        type: 'warning',
        title: `${expiringSoonDrivers.length} driver license(s) expiring soon`,
        link: '/drivers'
      })
    }
    
    return actions
  }, [bookings, invoices, drivers]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-500/10 text-amber-600 border-amber-200'
      case 'confirmed': return 'bg-blue-500/10 text-blue-600 border-blue-200'
      case 'assigned': return 'bg-indigo-500/10 text-indigo-600 border-indigo-200'
      case 'dispatched': return 'bg-cyan-500/10 text-cyan-600 border-cyan-200'
      case 'arrived': return 'bg-purple-500/10 text-purple-600 border-purple-200'
      case 'picked_up': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
      case 'dropped': return 'bg-teal-500/10 text-teal-600 border-teal-200'
      case 'closed': return 'bg-green-500/10 text-green-600 border-green-200'
      case 'cancelled': return 'bg-red-500/10 text-red-600 border-red-200'
      default: return 'bg-gray-500/10 text-gray-600 border-gray-200'
    }
  };

  const getTripTypeLabel = (type: string) => {
    switch (type) {
      case 'airport_pickup': return 'Airport Pickup'
      case 'airport_drop': return 'Airport Drop'
      case 'rental': return 'Rental'
      case 'city_ride': return 'City Ride'
      case 'outstation': return 'Outstation'
      default: return type
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here&apos;s your fleet overview.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <Popover open={showCustomPicker} onOpenChange={setShowCustomPicker}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[180px] justify-start">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {formatDateRange()}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-3 border-b">
                  <Select 
                    value={dateFilter} 
                    onValueChange={(value: DateFilterType) => {
                      setDateFilter(value)
                      if (value !== 'custom') {
                        setShowCustomPicker(false)
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="yesterday">Yesterday</SelectItem>
                      <SelectItem value="last7days">Last 7 Days</SelectItem>
                      <SelectItem value="last30days">Last 30 Days</SelectItem>
                      <SelectItem value="thisMonth">This Month</SelectItem>
                      <SelectItem value="lastMonth">Last Month</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {dateFilter === 'custom' && (
                  <div className="p-3">
                    <div className="flex flex-col gap-3">
                      <div>
                        <p className="text-sm font-medium mb-2">From Date</p>
                        <Calendar
                          mode="single"
                          selected={customDateFrom}
                          onSelect={(date) => setCustomDateFrom(date)}
                          disabled={(date) => date > new Date()}
                          initialFocus
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">To Date</p>
                        <Calendar
                          mode="single"
                          selected={customDateTo}
                          onSelect={(date) => setCustomDateTo(date)}
                          disabled={(date) => date > new Date() || (customDateFrom ? date < customDateFrom : false)}
                        />
                      </div>
                      <Button 
                        onClick={() => setShowCustomPicker(false)}
                        disabled={!customDateFrom || !customDateTo}
                      >
                        Apply Range
                      </Button>
                    </div>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
          <Button asChild>
            <Link href="/bookings">
              <Plus className="mr-2 h-4 w-4" />
              New Booking
            </Link>
          </Button>
        </div>
      </div>

      {/* Pending Actions Alert */}
      {pendingActions.length > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">Action Required</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {pendingActions.map((action, i) => (
                    <Link
                      key={i}
                      href={action.link}
                      className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                    >
                      {action.title}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Filtered Bookings */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bookings</p>
                <p className="text-2xl font-bold mt-1">{stats.filteredBookings}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-emerald-600 flex items-center">
                    <ArrowUpRight className="h-3 w-3" />
                    {stats.activeBookings} active
                  </span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <CalendarCheck className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filtered Revenue */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(stats.filteredRevenue)}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-muted-foreground">
                    Total: {formatCurrency(stats.totalRevenue)}
                  </span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fleet Status */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fleet Status</p>
                <p className="text-2xl font-bold mt-1">{stats.availableCars}/{stats.totalCars}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-amber-600 flex items-center">
                    <Car className="h-3 w-3 mr-1" />
                    {stats.onTripCars} on trip
                  </span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Car className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Drivers */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Drivers</p>
                <p className="text-2xl font-bold mt-1">{stats.activeDrivers}/{stats.totalDrivers}</p>
                <div className="mt-1">
                  <Progress 
                    value={(stats.activeDrivers / Math.max(stats.totalDrivers, 1)) * 100} 
                    className="h-1.5"
                  />
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{stats.completedBookings}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{stats.pendingBookings}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{stats.cancelledBookings}</p>
              <p className="text-xs text-muted-foreground">Cancelled</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{formatCurrency(stats.collectedAmount)}</p>
              <p className="text-xs text-muted-foreground">Collected</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <ArrowDownRight className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{formatCurrency(stats.pendingAmount)}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
        </Card>
      </div>

      {/* New Admin Modules */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ModuleCard
          href="/b2c-wallet"
          icon={Wallet}
          title="Wallet Management"
          value={formatCurrency(stats.totalWalletBalance)}
          description={`${stats.b2cCustomers} customers, ${stats.walletTransactions} transactions`}
        />
        <ModuleCard
          href="/admin-users/referrals"
          icon={Gift}
          title="Refer & Earn"
          value={adminCounts.pendingReferrals.toString()}
          description="Pending referral rewards"
          tone="amber"
        />
        <ModuleCard
          href="/admin-users/reviews"
          icon={Star}
          title="Reviews & Ratings"
          value={adminCounts.lowReviews.toString()}
          description="Low rating reviews to monitor"
          tone="red"
        />
        <ModuleCard
          href="/admin-users/support"
          icon={Headset}
          title="Support & Tickets"
          value={adminCounts.openTickets.toString()}
          description="Open support tickets"
          tone="blue"
        />
        <ModuleCard
          href="/admin-users/surge"
          icon={Percent}
          title="Surge Pricing"
          value={(adminCounts.peakRules + stats.activeSurgeZones).toString()}
          description={`${adminCounts.peakRules} peak rules, ${stats.activeSurgeZones} active zones`}
        />
        <ModuleCard
          href="/admin-users/extras"
          icon={ReceiptText}
          title="Tolls & Taxes"
          value={adminCounts.extrasRules.toString()}
          description="Toll, tax and parking rules"
        />
        <ModuleCard
          href="/b2b-approvals"
          icon={ShieldCheck}
          title="B2B Approvals"
          value={stats.b2bApprovalRules.toString()}
          description="Approval workflow rules"
          tone="blue"
        />
        <ModuleCard
          href="/driver-payouts"
          icon={DollarSign}
          title="Driver Payouts"
          value={stats.pendingDriverPayouts.toString()}
          description="Pending settlement payouts"
          tone="amber"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Live Trips */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Live Trips</CardTitle>
                <CardDescription>Currently active trips</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/bookings">
                  View All
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {liveTrips.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Navigation className="h-10 w-10 text-muted-foreground/30" />
                <p className="mt-3 text-sm text-muted-foreground">No active trips</p>
                <p className="text-xs text-muted-foreground">Live trips will appear here</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {liveTrips.map((trip) => {
                  const driver = trip.driverId ? getDriver(trip.driverId) : null
                  const car = trip.carId ? getCar(trip.carId) : null
                  return (
                    <div
                      key={trip.id}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Navigation className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {trip.bookingNumber}
                          </p>
                          <Badge variant="outline" className={getStatusColor(trip.status || 'pending')}>
                            {(trip.status || 'pending').replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {trip.pickupLocation} → {trip.dropLocation}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {driver && (
                            <span className="text-xs text-muted-foreground flex items-center">
                              <Users className="h-3 w-3 mr-1" />
                              {driver.name}
                            </span>
                          )}
                          {car && (
                            <span className="text-xs text-muted-foreground flex items-center">
                              <Car className="h-3 w-3 mr-1" />
                              {car.registrationNumber}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href="/bookings">
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Bookings */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent Bookings</CardTitle>
                <CardDescription>Latest booking activity</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/bookings">
                  View All
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CalendarCheck className="h-10 w-10 text-muted-foreground/30" />
                <p className="mt-3 text-sm text-muted-foreground">No bookings yet</p>
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link href="/bookings">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Booking
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {recentBookings.map((booking) => {
                  const category = getCarCategory(booking.carCategoryId)
                  return (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{booking.bookingNumber}</p>
                          <Badge variant="outline" className={getStatusColor(booking.status || 'pending')}>
                            {(booking.status || 'pending').replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {getTripTypeLabel(booking.tripType)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {category?.name}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatCurrency(booking.grandTotal)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(booking.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short'
                          })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <QuickAction
                href="/bookings"
                icon={CalendarCheck}
                title="New Booking"
                description="Create a new booking"
              />
              <QuickAction
                href="/drivers"
                icon={Users}
                title="Add Driver"
                description="Register a new driver"
              />
              <QuickAction
                href="/cars"
                icon={Car}
                title="Add Vehicle"
                description="Add a new car to fleet"
              />
              <QuickAction
                href="/fare-groups"
                icon={DollarSign}
                title="Configure Fares"
                description="Manage fare groups"
              />
              <QuickAction
                href="/admin-users/support"
                icon={Headset}
                title="Support Queue"
                description="Resolve customer tickets"
              />
              <QuickAction
                href="/admin-users/surge"
                icon={Percent}
                title="Surge Rules"
                description="Manage peak hour pricing"
              />
            </div>
          </CardContent>
        </Card>

        {/* Fleet Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Fleet Summary</CardTitle>
            <CardDescription>Vehicle distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {carCategories.filter(c => c.isActive).map((category) => {
                const categoryCarCount = cars.filter(c => c.categoryId === category.id).length
                const availableCount = cars.filter(c => c.categoryId === category.id && c.status === 'available').length
                return (
                  <div key={category.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                        <Car className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{category.name}</p>
                        <p className="text-xs text-muted-foreground">{categoryCarCount} vehicles</p>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {availableCount} free
                    </Badge>
                  </div>
                )
              })}
              {carCategories.filter(c => c.isActive).length === 0 && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">No categories configured</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Business Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Business Summary</CardTitle>
            <CardDescription>Key metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">B2B Clients</span>
                </div>
                <span className="text-sm font-medium">{stats.b2bClients}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Service Cities</span>
                </div>
                <span className="text-sm font-medium">{cities.filter(c => c.isActive).length}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Fare Groups</span>
                </div>
                <span className="text-sm font-medium">{fareGroups.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Duty Slips</span>
                </div>
                <span className="text-sm font-medium">{dutySlips.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Promo Codes</span>
                </div>
                <span className="text-sm font-medium">{stats.activePromoCodes} active</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ModuleCard({
  href,
  icon: Icon,
  title,
  value,
  description,
  tone = 'green',
}: {
  href: string
  icon: React.ElementType
  title: string
  value: string
  description: string
  tone?: 'green' | 'amber' | 'red' | 'blue'
}) {
  const toneClasses = {
    green: 'bg-emerald-500/10 text-emerald-600',
    amber: 'bg-amber-500/10 text-amber-600',
    red: 'bg-red-500/10 text-red-600',
    blue: 'bg-blue-500/10 text-blue-600',
  }

  return (
    <Link href={href} className="group block">
      <Card className="h-full transition-colors group-hover:border-primary/60">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="mt-1 truncate text-2xl font-bold">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            </div>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted"
    >
      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  )
}
