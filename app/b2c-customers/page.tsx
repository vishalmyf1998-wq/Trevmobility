// @ts-nocheck
"use client"

import { useState } from "react"
import { useAdmin } from "@/lib/admin-context"
import { B2CCustomer } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { Search, MoreHorizontal, Phone, Mail, UserCircle, Car, DollarSign, ShieldAlert, CheckCircle2 } from "lucide-react"

export default function B2CCustomersPage() {
  const { b2cCustomers, bookings, updateB2CCustomer } = useAdmin()
  const [searchQuery, setSearchQuery] = useState("")

  const filteredCustomers = b2cCustomers.filter(customer => {
    const query = searchQuery.toLowerCase()
    return (
      customer.name.toLowerCase().includes(query) ||
      customer.phone.toLowerCase().includes(query) ||
      (customer.email && customer.email.toLowerCase().includes(query)) ||
      customer.customerCode.toLowerCase().includes(query)
    )
  })

  const handleToggleStatus = async (customer: B2CCustomer) => {
    const newStatus = customer.status === 'blocked' ? 'active' : 'blocked'
    try {
      await updateB2CCustomer(customer.id, { status: newStatus })
      toast.success(`Customer ${customer.name} marked as ${newStatus}`)
    } catch (error) {
      toast.error('Failed to update customer status')
    }
  }

  const getCustomerStats = (customerId: string) => {
    const customerBookings = bookings.filter(b => b.b2cCustomerId === customerId)
    const totalRides = customerBookings.length
    const totalSpent = customerBookings.reduce((sum, b) => {
      return sum + (b.grandTotal || 0)
    }, 0)
    
    return { totalRides, totalSpent }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">B2C Customers</h1>
          <p className="text-muted-foreground">Manage individual retail customers</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <UserCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{b2cCustomers.length}</p>
                <p className="text-sm text-muted-foreground">Total Customers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{b2cCustomers.filter(c => c.status !== 'blocked').length}</p>
                <p className="text-sm text-muted-foreground">Active Customers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
                <ShieldAlert className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{b2cCustomers.filter(c => c.status === 'blocked').length}</p>
                <p className="text-sm text-muted-foreground">Blocked Customers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, email or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 max-w-md"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Wallet</TableHead>
                    <TableHead>Ride Stats</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No customers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => {
                    const stats = getCustomerStats(customer.id)
                    const isActive = customer.status !== 'blocked'

                    return (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">
                                {customer.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{customer.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {customer.customerCode}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-sm text-foreground">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              {customer.phone}
                            </div>
                            {customer.email && (
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Mail className="h-3.5 w-3.5" />
                                {customer.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-sm font-medium text-primary">
                              <DollarSign className="h-3.5 w-3.5" />
                              ₹{(customer.walletBalance || 0).toLocaleString('en-IN')}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-sm">
                              <Car className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{stats.totalRides} rides</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <DollarSign className="h-3.5 w-3.5" />
                              ₹{stats.totalSpent.toLocaleString('en-IN')}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isActive ? (
                            <Badge className="bg-green-500/10 text-green-600 border-green-200 hover:bg-green-500/20">Active</Badge>
                          ) : (
                            <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20">Blocked</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {new Date(customer.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleToggleStatus(customer)}>
                                {isActive ? (
                                  <>
                                    <ShieldAlert className="mr-2 h-4 w-4 text-destructive" />
                                    <span className="text-destructive">Block Customer</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                                    <span className="text-green-600">Unblock Customer</span>
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
