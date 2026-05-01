"use client"

import { useState, useEffect } from "react"
import { useAdmin, useUserType } from "@/lib/admin-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { 
  Calendar, CreditCard, Headset, User, Wallet, MapPin, Phone,
  CheckCircle2, AlertCircle, Download, RefreshCw
} from "lucide-react"

export default function EmployeeDashboard() {
  const { userType } = useUserType()
  const { 
    bookings, walletTransactions, b2bEmployees,
    currentUser, getB2BEmployee 
  } = useAdmin()
  
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'bookings' | 'wallet' | 'support'>('bookings')

  // Mock current employee (in real: find by currentUser.email)
  const currentEmployee = b2bEmployees.find(e => e.officeEmail === currentUser?.email) || {
    id: 'demo',
    name: 'Demo Employee',
    employeeId: 'EMP001',
    b2bClientId: 'demo-client',
    officeEmail: currentUser?.email || 'employee@company.com',
    phone: '+91 98765 43210',
    status: 'approved',
    canLogin: true
  } as any

  useEffect(() => {
    setTimeout(() => setLoading(false), 800)
  }, [])

  const myBookings = bookings.filter(b => b.b2bEmployeeId === currentEmployee.id).slice(0, 5)
  const recentTransactions = walletTransactions.slice(0, 5)

  const tabs = [
    { id: 'bookings' as const, title: 'My Bookings', icon: Calendar, count: myBookings.length },
    { id: 'wallet' as const, title: 'Wallet', icon: Wallet, count: recentTransactions.length },
    { id: 'support' as const, title: 'Support', icon: Headset, count: 3 }
  ]

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      )
    }

    switch (activeTab) {
      case 'bookings':
        return (
          <div className="space-y-6">
            {/* Employee Profile Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{currentEmployee.name}</CardTitle>
                    <p className="text-muted-foreground">{currentEmployee.employeeId}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Company</span>
                    <span className="font-medium">{currentEmployee.company || 'Demo Corp'}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Phone</span>
                    <span>{currentEmployee.phone}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Approved
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Bookings</span>
                    <span className="font-semibold">{myBookings.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Bookings Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Bookings ({myBookings.length})</CardTitle>
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {myBookings.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No bookings yet</p>
                    <p className="text-sm">Your bookings will appear here</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Booking ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myBookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell className="font-mono text-sm">#{booking.id.slice(-6)}</TableCell>
                          <TableCell>{booking.customerName}</TableCell>
                          <TableCell>{new Date(booking.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant={booking.status === 'completed' ? 'default' : 'secondary'}>
                              {booking.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ₹{booking.totalFare?.toLocaleString() || 0}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )
      case 'wallet':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-6 w-6" />
                  Wallet Balance
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center py-12">
                <div className="text-4xl font-bold text-green-600 mb-2">₹5,240</div>
                <p className="text-muted-foreground">Available balance</p>
                <Button className="mt-4 w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Request Payout
                </Button>
              </CardContent>
            </Card>
            {/* Recent Transactions - similar table */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Transaction table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTransactions.slice(0,5).map((tx, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{tx.type}</TableCell>
                        <TableCell className={tx.type === 'credit' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                          {tx.type === 'credit' ? '+' : '-'}₹{Math.abs(tx.amount).toLocaleString()}
                        </TableCell>
                        <TableCell>{new Date(tx.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )
      case 'support':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Headset className="h-6 w-6" />
                  Support Tickets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center p-4 border rounded-lg">
                    <AlertCircle className="h-5 w-5 text-orange-500 mr-3" />
                    <div>
                      <p className="font-medium">Booking Delay Issue</p>
                      <p className="text-sm text-muted-foreground">Car not available on time</p>
                    </div>
                    <Badge className="ml-auto">Pending</Badge>
                  </div>
                  {/* More tickets */}
                </div>
              </CardContent>
            </Card>
          </div>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl flex items-center justify-center shadow-lg">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">{currentEmployee.name}</CardTitle>
              <p className="text-muted-foreground text-lg">{currentEmployee.employeeId}</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Card>
        <CardHeader>
          <div className="flex -mx-2">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                className={`flex-1 mx-2 rounded-xl h-12 ${activeTab === tab.id ? 'bg-gradient-to-r from-emerald-500 to-green-600 shadow-lg' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.title}
                {tab.count > 0 && <Badge className="ml-auto h-5 w-8">{tab.count}</Badge>}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {renderTabContent()}
        </CardContent>
      </Card>
    </div>
  )
}
