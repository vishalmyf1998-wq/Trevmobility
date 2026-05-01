"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUserType } from "@/lib/admin-context"
import { useAdmin } from "@/lib/admin-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { 
  Users, Building2, FileText, DollarSign, Calendar, CreditCard, Edit, History,
  BarChart3, Headset, LayoutDashboard, AlertTriangle, UserCheck, CheckCircle, XCircle 
} from "lucide-react"

export default function CorporateAdminDashboard() {
  const router = useRouter()
  const { userType } = useUserType()
  const { 
    b2bClients, b2bEmployees, bookings, b2cCustomers, 
    adminUsers, adminRoles, hubs, invoices, currentUser, updateB2BEmployee,
    approveBookingEdit, rejectBookingEdit
  } = useAdmin()
  
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setStatsLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  const currentCorpClientId = b2bEmployees.find(e => e.officeEmail === currentUser?.email)?.b2bClientId || 
                              b2bClients.find(c => c.id === 'dummy-corp-client')?.id || 
                              b2bClients[0]?.id
  const myEmployees = b2bEmployees.filter(e => e.b2bClientId === currentCorpClientId)
  const myBookings = bookings.filter(b => b.b2bClientId === currentCorpClientId)

  const approvedEmployees = myEmployees.filter(e => e.status === 'approved' && e.canLogin).length
  const pendingEmployeeList = myEmployees.filter(e => e.status === 'pending_approval')
  const pendingEmployees = pendingEmployeeList.length
  const totalSpend = myBookings.reduce((sum, b) => sum + (b.grandTotal || 0), 0)
  const recentBookings = myBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)
  
  const recentEditUpdates = myBookings
    .flatMap(b => 
      (b.eventLog || [])
        .filter(e => e.event === 'edit_approved' || (e.event === 'rejected' && e.fromStatus === 'pending_edit_approval'))
        .map(e => ({ ...e, bookingNumber: b.bookingNumber, bookingId: b.id }))
    )
    .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime())
    .slice(0, 5);

  // This is for Trev Admin dashboard, but shown here as an example
  const pendingEditBookings = bookings.filter(b => b.status === 'pending_edit_approval');

  const CorporateStats = [
    {
      title: 'Total Spend',
      value: `₹${totalSpend.toLocaleString('en-IN')}`,
      change: '+12%',
      icon: DollarSign,
      color: 'blue',
      href: '/invoices'
    },
    {
      title: 'Approved Employees',
      value: approvedEmployees,
      change: '+8%',
      icon: Users,
      color: 'green',
      href: '/b2b-employees'
    },
    {
      title: 'Pending Approvals',
      value: pendingEmployees,
      change: '+3%',
      icon: AlertTriangle,
      color: 'orange'
      // This card has actions on the dashboard, so no href
    },
    {
      title: 'Recent Bookings',
      value: recentBookings.length,
      change: '+15%',
      icon: Calendar,
      color: 'purple',
      href: '/bookings'
    }
  ]

  const handleApprove = (id: string) => {
    updateB2BEmployee(id, { 
      status: 'approved', 
      canLogin: true, 
      approvedBy: currentUser?.email || 'Corporate Admin', 
      approvedAt: new Date().toISOString() 
    })
    toast.success("Employee approved successfully")
  }

  const handleReject = (id: string) => {
    updateB2BEmployee(id, { status: 'rejected', canLogin: false })
    toast.success("Employee rejected")
  }

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Corporate Dashboard</h1>
        <p className="text-muted-foreground text-lg">
          Manage your B2B operations, employees, and bookings
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {CorporateStats.map((stat) => (
          <Card 
            key={stat.title} 
            className={`${statsLoading ? 'cursor-wait' : ''} ${stat.href ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}`}
            onClick={() => stat.href && router.push(stat.href)}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.change} from last month
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Bookings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))
            ) : recentBookings.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No recent bookings</p>
            ) : (
              recentBookings.map(booking => (
                <div key={booking.id} className="flex items-center p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-3 min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {booking.customerName || 'B2B Booking'}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {booking.status} • {new Date(booking.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="ml-auto">
                    ₹{booking.totalFare?.toLocaleString() || 0}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
              </div>
            ) : pendingEmployeeList.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No pending approvals</p>
            ) : (
              pendingEmployeeList.slice(0, 5).map(emp => (
                <div key={emp.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{emp.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{emp.officeEmail}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100" onClick={() => handleApprove(emp.id)} title="Approve">
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100" onClick={() => handleReject(emp.id)} title="Reject">
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Booking Edit Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Booking Edit Updates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            ) : recentEditUpdates.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No recent booking edit updates</p>
            ) : (
              recentEditUpdates.map(update => (
                <div key={update.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      Booking <button onClick={() => router.push(`/bookings`)} className="font-bold text-primary hover:underline">{update.bookingNumber}</button> was {update.event === 'edit_approved' ? <span className="text-green-600 font-semibold">Approved</span> : <span className="text-red-600 font-semibold">Rejected</span>}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      By {update.performedBy} on {new Date(update.performedAt).toLocaleString()}
                    </p>
                    {update.event === 'rejected' && (
                      <p className="text-xs text-destructive mt-1">
                        Reason: {update.notes?.replace('Edit request rejected. Reason: ', '')}
                      </p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" className="h-8 ml-2" onClick={() => router.push(`/bookings`)}>
                    View Bookings
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* NOTE: This section is for the Trev Admin dashboard. */}
        {/* It will only appear when you are logged in as a Trev Admin. */}
        {userType === 'trev-admin' && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-purple-500" />
                Pending Booking Edits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {statsLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : pendingEditBookings.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No pending booking edits</p>
              ) : (
                pendingEditBookings.slice(0, 5).map(booking => (
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
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
