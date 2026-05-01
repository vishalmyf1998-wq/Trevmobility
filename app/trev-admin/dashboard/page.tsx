"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAdmin, useUserType } from "@/lib/admin-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { 
  Users, Building2, Car, MapPin, DollarSign, Calendar, CreditCard, 
  BarChart3, Headset, LayoutDashboard, AlertTriangle, HardDrive,
  Truck, Activity, FileText, Edit, CheckCircle, XCircle, Wallet,
  MapPinned
} from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts'

export default function TrevAdminDashboard() {
  const router = useRouter()
  const { userType } = useUserType()
  const { 
    drivers, cars, bookings, b2cCustomers, b2bClients, b2bEmployees,
    dutySlips, invoices, hubs, adminUsers, fareGroups, promoCodes,
    driverPayouts, cities, airports, supportTickets,
    approveBookingEdit, rejectBookingEdit
  } = useAdmin()
  
  const [statsLoading, setStatsLoading] = useState(true)
  const [chartDays, setChartDays] = useState(7)

  useEffect(() => {
    const timer = setTimeout(() => setStatsLoading(false), 1200)
    return () => clearTimeout(timer)
  }, [])

  // Fleet Stats
  const activeDrivers = drivers.filter(d => d.status === "active").length
  const availableCars = cars.filter(c => c.status === "available").length
  const totalBookings = bookings.length
  const todayBookings = bookings.filter(b => 
    new Date(b.createdAt).toDateString() === new Date().toDateString()
  ).length
  const pendingInvoices = invoices.filter(i => i.status === "pending").length
  const b2bClientsCount = b2bClients.length
  const b2cCount = b2cCustomers.length
  const pendingPayouts = driverPayouts.filter(p => p.status === 'pending').length
  const liveTrips = bookings.filter(b => ['dispatched', 'arrived', 'picked_up'].includes(b.status)).length
  const openTickets = supportTickets.filter(t => t.status === 'open').length
  const totalRevenue = bookings.filter(b => b.status === 'closed').reduce((sum, b) => sum + (b.grandTotal || 0), 0);
  
  const todayDateString = new Date().toISOString().split('T')[0];

  const pendingEditBookings = bookings.filter(b => b.status === 'pending_edit_approval');

  const dailyTrendData = useMemo(() => {
    const trendDays = 7;
    const data: Record<string, { date: string; name: string; bookings: number; revenue: number; newB2c: number; newTickets: number }> = {};

    for (let i = trendDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      data[dateStr] = {
        date: dateStr,
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        bookings: 0,
        revenue: 0,
        newB2c: 0,
        newTickets: 0,
      };
    }

    bookings.forEach(booking => {
      if (booking.createdAt) {
        const d = new Date(booking.createdAt);
        if (!isNaN(d.getTime())) {
          const bookingDateStr = d.toISOString().split('T')[0];
          if (data[bookingDateStr]) {
            data[bookingDateStr].bookings++;
            if (booking.status === 'closed') {
                data[bookingDateStr].revenue += (booking.grandTotal || booking.estimatedFare || 0);
            }
          }
        }
      }
    });

    b2cCustomers.forEach(customer => {
        if (customer.createdAt) {
            const d = new Date(customer.createdAt);
            if (!isNaN(d.getTime())) {
                const customerDateStr = d.toISOString().split('T')[0];
                if (data[customerDateStr]) data[customerDateStr].newB2c++;
            }
        }
    });

    supportTickets.forEach(ticket => {
        if (ticket.createdAt) {
            const d = new Date(ticket.createdAt);
            if (!isNaN(d.getTime())) {
                const ticketDateStr = d.toISOString().split('T')[0];
                if (data[ticketDateStr]) data[ticketDateStr].newTickets++;
            }
        }
    });

    return Object.values(data);
  }, [bookings, b2cCustomers, supportTickets]);

  const stats = [
    {
      title: "Live Trips",
      value: liveTrips,
      change: "Ongoing now",
      icon: MapPinned,
      color: "blue",
      href: "/live-tracking"
    },
    {
      title: "Today's Bookings",
      value: todayBookings,
      change: "+12%",
      icon: Calendar,
      color: "purple",
      href: `/bookings?dateFrom=${todayDateString}T00:00&dateTo=${todayDateString}T23:59`,
      trendData: dailyTrendData.map(d => ({ name: d.name, value: d.bookings }))
    },
    {
      title: "Active Drivers",
      value: activeDrivers,
      change: "+5%",
      icon: Users,
      color: "green",
      href: "/drivers"
    },
    {
      title: "Available Cars", 
      value: availableCars,
      change: "+2%",
      icon: Car,
      color: "cyan",
      href: "/cars"
    },
    {
      title: "Total Revenue",
      value: `₹${totalRevenue.toLocaleString()}`,
      change: "+20%",
      icon: DollarSign,
      color: "emerald",
      href: "/invoices",
      trendData: dailyTrendData.map(d => ({ name: d.name, value: d.revenue }))
    },
    {
      title: "B2B Clients",
      value: b2bClientsCount,
      change: "+3%",
      icon: Building2,
      color: "indigo",
      href: "/b2b-clients"
    },
    {
      title: "B2C Customers",
      value: b2cCount,
      change: "+15%",
      icon: Users,
      color: "blue",
      href: "/b2c-customers",
      trendData: dailyTrendData.map(d => ({ name: d.name, value: d.newB2c }))
    },
    {
      title: "Pending Invoices",
      value: pendingInvoices,
      change: "-1%",
      icon: DollarSign,
      color: "orange",
      href: "/invoices"
    },
    {
      title: "Pending Payouts",
      value: pendingPayouts,
      change: "-2%",
      icon: Wallet,
      color: "rose",
      href: "/driver-payouts"
    },
    {
      title: "Open Tickets",
      value: openTickets,
      change: "Support queue",
      icon: Headset,
      color: "rose",
      href: "/admin-users/support?status=open",
      trendData: dailyTrendData.map(d => ({ name: d.name, value: d.newTickets }))
    }
  ]

  const colorMap: { [key: string]: string } = {
    green: '#22c55e',
    blue: '#3b82f6',
    purple: '#a855f7',
    indigo: '#6366f1',
    orange: '#f97316',
    cyan: '#06b6d4',
    rose: '#f43f5e',
    emerald: '#10b981',
  };

  const recentActivity = bookings
    .flatMap(b => (b.eventLog || []).map(e => ({ ...e, bookingNumber: b.bookingNumber })))
    .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime())
    .slice(0, 5)

  const chartData = Array.from({ length: chartDays }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return {
      date: d.toISOString().split('T')[0],
      name: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      bookings: 0,
      revenue: 0,
    };
  }).reverse();

  bookings.forEach(booking => {
    if (booking.createdAt) {
      const d = new Date(booking.createdAt);
      if (!isNaN(d.getTime())) {
        const bookingDateStr = d.toISOString().split('T')[0];
        const dayData = chartData.find(d => d.date === bookingDateStr);
        if (dayData) {
          dayData.bookings++;
          dayData.revenue += (booking.grandTotal || booking.estimatedFare || 0);
        }
      }
    }
  });

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-lg">
          Overview of fleet operations, bookings, B2B clients, and financials
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {stats.map((stat, index) => (
          <Card 
            key={stat.title} 
            className={`${statsLoading ? 'cursor-wait' : ''} ${stat.href ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}`}
            onClick={() => stat.href && router.push(stat.href)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-6 w-6 ${stat.color === 'green' ? 'text-green-500' : stat.color === 'blue' ? 'text-blue-500' : stat.color === 'purple' ? 'text-purple-500' : stat.color === 'indigo' ? 'text-indigo-500' : stat.color === 'orange' ? 'text-orange-500' : stat.color === 'cyan' ? 'text-cyan-500' : stat.color === 'rose' ? 'text-rose-500' : 'text-emerald-500'}`} />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-10 w-24" />
              ) : (
                <div className="flex items-end justify-between gap-4">
                  <div className="flex-shrink-0">
                    <div className="text-2xl font-bold">
                      {stat.value}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className={stat.change.startsWith('+') ? 'text-green-500 font-medium' : 'text-red-500 font-medium'}>{stat.change}</span> from last month
                    </p>
                  </div>
                  {stat.trendData && (
                    <div className="h-10 w-24">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stat.trendData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke={colorMap[stat.color] || '#8884d8'}
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trends Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Trends Overview
            </CardTitle>
            <CardDescription>Bookings and Revenue over the last {chartDays} days.</CardDescription>
          </div>
          <Select value={chartDays.toString()} onValueChange={(val) => setChartDays(Number(val))}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Select Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="14">Last 14 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="pl-2">
          {statsLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    yAxisId="left"
                    width={40}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    allowDecimals={false} 
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `₹${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }} 
                  />
                  <Legend />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    name="Bookings"
                    dataKey="bookings" 
                    stroke="#3b82f6" 
                    fillOpacity={1}
                    fill="url(#colorBookings)"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Area 
                    yAxisId="right"
                    type="monotone" 
                    name="Revenue"
                    dataKey="revenue" 
                    stroke="#a855f7" 
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Bookings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Recent Bookings
              <Badge variant="outline" className="text-xs">{bookings.slice(0,5).length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statsLoading ? (
              Array.from({length: 5}).map((_, i) => (
                <div key={i} className="p-3 rounded-lg bg-muted/30 animate-pulse h-12" />
              ))
            ) : bookings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-40" />
                <p className="text-sm">No bookings yet</p>
              </div>
            ) : (
              bookings.slice(0,5).map(booking => (
                <div key={booking.id} className="flex items-center p-3 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer group">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                    <DollarSign className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="ml-3 min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{booking.customerName || 'B2B Booking'}</p>
                    <p className="text-xs text-muted-foreground capitalize">{booking.status}</p>
                  </div>
                  <Badge variant="outline" className="ml-auto">
                    ₹{booking.grandTotal?.toLocaleString() || 0}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="outline" className="justify-start h-12" onClick={() => router.push('/drivers')}>
              <Users className="mr-3 h-5 w-5 text-muted-foreground" /> Assign New Driver
            </Button>
            <Button variant="outline" className="justify-start h-12" onClick={() => router.push('/cars')}>
              <Car className="mr-3 h-5 w-5 text-muted-foreground" /> Add Vehicle
            </Button>
            <Button variant="outline" className="justify-start h-12" onClick={() => router.push('/bookings')}>
              <Calendar className="mr-3 h-5 w-5 text-muted-foreground" /> Create Booking
            </Button>
            <Button variant="outline" className="justify-start h-12" onClick={() => router.push('/b2b-clients')}>
              <Building2 className="mr-3 h-5 w-5 text-muted-foreground" /> Manage B2B Client
            </Button>
            <Button variant="outline" className="justify-start h-12" onClick={() => router.push('/b2c-customers')}>
              <Users className="mr-3 h-5 w-5 text-muted-foreground" /> Manage Customers
            </Button>
            <Button variant="outline" className="justify-start h-12" onClick={() => router.push('/driver-payouts')}>
              <Wallet className="mr-3 h-5 w-5 text-muted-foreground" /> Settlements
            </Button>
            <Button variant="outline" className="justify-start h-12" onClick={() => router.push('/live-tracking')}>
              <MapPinned className="mr-3 h-5 w-5 text-muted-foreground" /> Live Tracking
            </Button>
            <Button variant="outline" className="justify-start h-12" onClick={() => router.push('/admin-users/support')}>
              <Headset className="mr-3 h-5 w-5 text-muted-foreground" /> Support Tickets
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
            ) : (
              recentActivity.map((activity, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-b-0">
                  <div className="flex flex-col min-w-0 flex-1 pr-2">
                    <span className="text-sm font-medium truncate capitalize">{activity.event.replace(/_/g, ' ')} - {activity.bookingNumber}</span>
                    <span className="text-xs text-muted-foreground truncate">{activity.notes || `By ${activity.performedBy}`}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs whitespace-nowrap shrink-0">
                    {new Date(activity.performedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Booking Edits */}
      {pendingEditBookings.length > 0 && (
        <Card className="border-purple-500/20 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-600">
              <Edit className="h-5 w-5" />
              Pending Booking Edits ({pendingEditBookings.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingEditBookings.slice(0, 5).map(booking => (
              <div key={booking.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{booking.bookingNumber} <span className="text-muted-foreground">({booking.customerName})</span></p>
                  <p className="text-xs text-muted-foreground truncate">
                    {booking.pickupLocation} to {booking.dropLocation}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Button size="sm" variant="outline" className="h-8" onClick={() => router.push(`/bookings?review=${booking.id}`)}>
                    Review
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Operations Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Operations Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 lg:grid-cols-6 gap-6 pt-0">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-1">{hubs.length}</div>
            <div className="text-sm text-muted-foreground">Hubs</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-1">{fareGroups.length}</div>
            <div className="text-sm text-muted-foreground">Fare Groups</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-1">{promoCodes.length}</div>
            <div className="text-sm text-muted-foreground">Promo Codes</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-1">{cities.length}</div>
            <div className="text-sm text-muted-foreground">Cities</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-1">{airports.length}</div>
            <div className="text-sm text-muted-foreground">Airports</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-1">{adminUsers.length}</div>
            <div className="text-sm text-muted-foreground">Admin Users</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
