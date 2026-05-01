"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUserType } from "@/lib/admin-context"
import { useAdmin } from "@/lib/admin-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { 
  Users, Building2, FileText, DollarSign, Calendar, CreditCard, 
  BarChart3, Headset, LayoutDashboard, AlertTriangle, UserCheck, CheckCircle, XCircle 
} from "lucide-react"

export default function CorporateAdminDashboard() {
  const router = useRouter()
  const { userType } = useUserType()
  const { 
    b2bClients, b2bEmployees, bookings, b2cCustomers, 
    adminUsers, adminRoles, hubs, invoices, currentUser, updateB2BEmployee
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

  const CorporateStats = [
    {
      title: 'Total Spend',
      value: `₹${totalSpend.toLocaleString('en-IN')}`,
      change: '+12%',
      icon: DollarSign,
      color: 'blue'
    },
    {
      title: 'Approved Employees',
      value: approvedEmployees,
      change: '+8%',
      icon: Users,
      color: 'green'
    },
    {
      title: 'Pending Approvals',
      value: pendingEmployees,
      change: '+3%',
      icon: AlertTriangle,
      color: 'orange'
    },
    {
      title: 'Recent Bookings',
      value: recentBookings.length,
      change: '+15%',
      icon: Calendar,
      color: 'purple'
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
        {CorporateStats.map((stat, index) => (
          <Card key={stat.title} className={statsLoading ? 'cursor-wait' : ''}>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
              recentBookings.map((booking) => (
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

        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="ghost" className="w-full justify-start h-12">
              <Users className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
            <Button variant="ghost" className="w-full justify-start h-12">
              <FileText className="mr-2 h-4 w-4" />
              New Booking
            </Button>
            <Button variant="ghost" className="w-full justify-start h-12">
              <FileText className="mr-2 h-4 w-4" />
              View Invoices
            </Button>
            <Button variant="ghost" className="w-full justify-start h-12">
              <Headset className="mr-2 h-4 w-4" />
              Support Tickets
            </Button>
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
    </div>
  )
}
