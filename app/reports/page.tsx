'use client'

import { useState, useMemo } from 'react'
import { useAdmin } from '@/lib/admin-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  BarChart3,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Car,
  Users,
  MapPin,
  Calendar,
  Download,
  FileText,
  Building2,
} from 'lucide-react'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4']

export default function ReportsPage() {
  const {
    bookings,
    invoices,
    drivers,
    cars,
    cities,
    b2bClients,
    getCity,
    getCarCategory,
    getDriver,
  } = useAdmin()

  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year'>('month')
  const [selectedCity, setSelectedCity] = useState<string>('all')

  // Calculate date range
  const getDateFilter = () => {
    const now = new Date()
    switch (dateRange) {
      case 'today':
        return new Date(now.setHours(0, 0, 0, 0))
      case 'week':
        return new Date(now.setDate(now.getDate() - 7))
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1))
      case 'year':
        return new Date(now.setFullYear(now.getFullYear() - 1))
    }
  }

  const filteredBookings = useMemo(() => {
    const dateFilter = getDateFilter()
    return bookings.filter((b) => {
      const bookingDate = new Date(b.createdAt)
      const matchesDate = bookingDate >= dateFilter
      const matchesCity = selectedCity === 'all' || b.cityId === selectedCity
      return matchesDate && matchesCity
    })
  }, [bookings, dateRange, selectedCity])

  // Revenue metrics
  const totalRevenue = filteredBookings
    .filter((b) => b.status === 'closed')
    .reduce((sum, b) => sum + b.grandTotal, 0)

  const totalTrips = filteredBookings.filter((b) => b.status === 'closed').length
  const averageTripValue = totalTrips > 0 ? totalRevenue / totalTrips : 0

  // Trip type breakdown
  const tripTypeData = useMemo(() => {
    const breakdown: Record<string, { count: number; revenue: number }> = {}
    filteredBookings
      .filter((b) => b.status === 'closed')
      .forEach((b) => {
        if (!breakdown[b.tripType]) {
          breakdown[b.tripType] = { count: 0, revenue: 0 }
        }
        breakdown[b.tripType].count++
        breakdown[b.tripType].revenue += b.grandTotal
      })
    return Object.entries(breakdown).map(([type, data]) => ({
      name: type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      trips: data.count,
      revenue: data.revenue,
    }))
  }, [filteredBookings])

  // City-wise breakdown
  const cityData = useMemo(() => {
    const breakdown: Record<string, { count: number; revenue: number }> = {}
    filteredBookings
      .filter((b) => b.status === 'closed')
      .forEach((b) => {
        const cityName = getCity(b.cityId)?.name || 'Unknown'
        if (!breakdown[cityName]) {
          breakdown[cityName] = { count: 0, revenue: 0 }
        }
        breakdown[cityName].count++
        breakdown[cityName].revenue += b.grandTotal
      })
    return Object.entries(breakdown).map(([city, data]) => ({
      name: city,
      trips: data.count,
      revenue: data.revenue,
    }))
  }, [filteredBookings, getCity])

  // Driver performance
  const driverPerformance = useMemo(() => {
    const performance: Record<string, { trips: number; revenue: number; name: string }> = {}
    filteredBookings
      .filter((b) => b.status === 'closed' && b.driverId)
      .forEach((b) => {
        const driver = getDriver(b.driverId!)
        if (driver) {
          if (!performance[b.driverId!]) {
            performance[b.driverId!] = { trips: 0, revenue: 0, name: driver.name }
          }
          performance[b.driverId!].trips++
          performance[b.driverId!].revenue += b.grandTotal
        }
      })
    return Object.values(performance)
      .sort((a, b) => b.trips - a.trips)
      .slice(0, 10)
  }, [filteredBookings, getDriver])

  // B2B vs B2C split
  const b2bB2cData = useMemo(() => {
    const b2b = filteredBookings.filter((b) => b.b2bClientId && b.status === 'closed')
    const b2c = filteredBookings.filter((b) => !b.b2bClientId && b.status === 'closed')
    return [
      { name: 'B2C', value: b2c.length, revenue: b2c.reduce((s, b) => s + b.grandTotal, 0) },
      { name: 'B2B', value: b2b.length, revenue: b2b.reduce((s, b) => s + b.grandTotal, 0) },
    ]
  }, [filteredBookings])

  // Daily revenue trend (last 7 days)
  const dailyTrend = useMemo(() => {
    const days: Record<string, number> = {}
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const key = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      days[key] = 0
    }
    
    bookings
      .filter((b) => b.status === 'closed')
      .forEach((b) => {
        const bookingDate = new Date(b.createdAt)
        const dayDiff = Math.floor((now.getTime() - bookingDate.getTime()) / (1000 * 60 * 60 * 24))
        if (dayDiff >= 0 && dayDiff < 7) {
          const key = bookingDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
          if (days[key] !== undefined) {
            days[key] += b.grandTotal
          }
        }
      })
    
    return Object.entries(days).map(([date, revenue]) => ({ date, revenue }))
  }, [bookings])

  // Status breakdown
  const statusBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {
      pending: 0,
      confirmed: 0,
      assigned: 0,
      dispatched: 0,
      arrived: 0,
      picked_up: 0,
      dropped: 0,
      closed: 0,
      cancelled: 0,
    }
    filteredBookings.forEach((b) => {
      breakdown[b.status]++
    })
    return Object.entries(breakdown)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({
        name: status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        value: count,
      }))
  }, [filteredBookings])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">Business insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Cities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city.id} value={city.id}>
                  {city.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={(v: typeof dateRange) => setDateRange(v)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</div>
            <div className="flex items-center text-xs text-success mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>+12% from last period</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTrips}</div>
            <div className="flex items-center text-xs text-success mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>+8% from last period</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Trip Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{averageTripValue.toFixed(0)}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <span>Per completed trip</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Fleet</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {drivers.filter((d) => d.status === 'active').length} / {cars.filter((c) => c.status !== 'inactive').length}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <span>Drivers / Cars</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend (Last 7 Days)</CardTitle>
            <CardDescription>Daily revenue performance</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: { label: 'Revenue', color: 'hsl(var(--primary))' },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyTrend}>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Trip Type Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Trip Type Breakdown</CardTitle>
            <CardDescription>Revenue by trip category</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: { label: 'Revenue', color: 'hsl(var(--primary))' },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tripTypeData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* B2B vs B2C */}
        <Card>
          <CardHeader>
            <CardTitle>B2B vs B2C Distribution</CardTitle>
            <CardDescription>Client type breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-[300px]">
              <ChartContainer
                config={{
                  value: { label: 'Trips', color: 'hsl(var(--primary))' },
                }}
                className="h-[250px] w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={b2bB2cData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {b2bB2cData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              {b2bB2cData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded" style={{ backgroundColor: COLORS[index] }} />
                  <span className="text-sm">{item.name}: ₹{item.revenue.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Booking Status Distribution</CardTitle>
            <CardDescription>Current booking statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                value: { label: 'Count', color: 'hsl(var(--primary))' },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusBreakdown} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tables Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* City Performance */}
        <Card>
          <CardHeader>
            <CardTitle>City-wise Performance</CardTitle>
            <CardDescription>Revenue and trips by city</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>City</TableHead>
                  <TableHead className="text-right">Trips</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cityData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No data available
                    </TableCell>
                  </TableRow>
                ) : (
                  cityData.map((city) => (
                    <TableRow key={city.name}>
                      <TableCell className="font-medium">{city.name}</TableCell>
                      <TableCell className="text-right">{city.trips}</TableCell>
                      <TableCell className="text-right font-medium">₹{city.revenue.toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Drivers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Drivers</CardTitle>
            <CardDescription>Based on completed trips</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead className="text-right">Trips</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {driverPerformance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No data available
                    </TableCell>
                  </TableRow>
                ) : (
                  driverPerformance.map((driver, index) => (
                    <TableRow key={driver.name}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
                            {index + 1}
                          </Badge>
                          <span className="font-medium">{driver.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{driver.trips}</TableCell>
                      <TableCell className="text-right font-medium">₹{driver.revenue.toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
