'use client'

import { useState, useMemo } from 'react'
import { useAdmin } from '@/lib/admin-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { CreditCard, IndianRupee, Clock, AlertTriangle, CheckCircle, Search, Building2, User } from 'lucide-react'
import { toast } from 'sonner'

export default function PendingPaymentsPage() {
  const {
    bookings,
    invoices,
    b2bClients,
    updateBooking,
    updateInvoice,
    getB2BClient,
  } = useAdmin()

  const [searchQuery, setSearchQuery] = useState('')
  const [paymentDialog, setPaymentDialog] = useState<{
    open: boolean
    type: 'booking' | 'invoice'
    id: string
    amount: number
    paidAmount: number
  } | null>(null)
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'bank_transfer'>('cash')

  // Pending booking payments (closed bookings with payment status pending or partial)
  const pendingBookingPayments = useMemo(() => {
    return bookings.filter(
      (b) => b.status === 'closed' && (b.paymentStatus === 'pending' || b.paymentStatus === 'partial')
    )
  }, [bookings])

  // Pending invoice payments
  const pendingInvoicePayments = useMemo(() => {
    return invoices.filter(
      (inv) => inv.status === 'pending' || inv.status === 'overdue'
    )
  }, [invoices])

  // B2B client balances
  const b2bBalances = useMemo(() => {
    return b2bClients
      .filter((c) => c.currentBalance > 0)
      .sort((a, b) => b.currentBalance - a.currentBalance)
  }, [b2bClients])

  const totalPendingBookings = pendingBookingPayments.reduce((sum, b) => {
    const paidAmount = b.paymentStatus === 'partial' ? b.grandTotal * 0.5 : 0 // Simplified
    return sum + (b.grandTotal - paidAmount)
  }, 0)

  const totalPendingInvoices = pendingInvoicePayments.reduce((sum, inv) => sum + inv.balanceAmount, 0)
  const totalB2BOutstanding = b2bBalances.reduce((sum, c) => sum + c.currentBalance, 0)

  const filteredBookingPayments = pendingBookingPayments.filter(
    (b) =>
      b.bookingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredInvoicePayments = pendingInvoicePayments.filter(
    (inv) =>
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleOpenPaymentDialog = (type: 'booking' | 'invoice', id: string, amount: number, paidAmount: number) => {
    setPaymentDialog({ open: true, type, id, amount, paidAmount })
    setPaymentAmount(amount - paidAmount)
  }

  const handleRecordPayment = () => {
    if (!paymentDialog) return

    if (paymentDialog.type === 'booking') {
      const booking = bookings.find((b) => b.id === paymentDialog.id)
      if (booking) {
        const newStatus = paymentAmount >= paymentDialog.amount - paymentDialog.paidAmount ? 'paid' : 'partial'
        updateBooking(booking.id, { paymentStatus: newStatus })
        toast.success(`Payment of ₹${paymentAmount.toLocaleString()} recorded successfully`)
      }
    } else {
      const invoice = invoices.find((inv) => inv.id === paymentDialog.id)
      if (invoice) {
        const newPaidAmount = invoice.paidAmount + paymentAmount
        const newStatus = newPaidAmount >= invoice.totalAmount ? 'paid' : 'pending'
        updateInvoice(invoice.id, {
          paidAmount: newPaidAmount,
          balanceAmount: invoice.totalAmount - newPaidAmount,
          status: newStatus,
        })
        toast.success(`Payment of ₹${paymentAmount.toLocaleString()} recorded successfully`)
      }
    }

    setPaymentDialog(null)
    setPaymentAmount(0)
  }

  const getPaymentStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      partial: 'bg-orange-100 text-orange-700 border-orange-200',
      paid: 'bg-green-100 text-green-700 border-green-200',
      overdue: 'bg-red-100 text-red-700 border-red-200',
    }
    return styles[status] || 'bg-muted text-muted-foreground'
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Pending Payments</h1>
          <p className="text-muted-foreground">Track and manage outstanding payments</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(totalPendingBookings + totalPendingInvoices + totalB2BOutstanding).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all sources</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Booking Payments</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalPendingBookings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{pendingBookingPayments.length} pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoice Payments</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalPendingInvoices.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{pendingInvoicePayments.length} invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">B2B Outstanding</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalB2BOutstanding.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{b2bBalances.length} clients</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="bookings">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="bookings">
                  Booking Payments ({pendingBookingPayments.length})
                </TabsTrigger>
                <TabsTrigger value="invoices">
                  Invoice Payments ({pendingInvoicePayments.length})
                </TabsTrigger>
                <TabsTrigger value="b2b">
                  B2B Balances ({b2bBalances.length})
                </TabsTrigger>
              </TabsList>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
            </div>

            {/* Booking Payments Tab */}
            <TabsContent value="bookings">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Trip Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookingPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success" />
                        No pending booking payments
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBookingPayments.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <div>
                            <span className="font-mono font-medium">{booking.bookingNumber}</span>
                            <p className="text-xs text-muted-foreground">
                              {new Date(booking.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {booking.b2bClientId ? (
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <User className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div>
                              <p className="font-medium">{booking.customerName}</p>
                              <p className="text-xs text-muted-foreground">{booking.customerPhone}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {booking.tripType.split('_').join(' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">₹{booking.grandTotal.toLocaleString()}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getPaymentStatusBadge(booking.paymentStatus)}>
                            {booking.paymentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() =>
                              handleOpenPaymentDialog('booking', booking.id, booking.grandTotal, 0)
                            }
                          >
                            <CreditCard className="mr-2 h-4 w-4" />
                            Record Payment
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Invoice Payments Tab */}
            <TabsContent value="invoices">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoicePayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success" />
                        No pending invoice payments
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoicePayments.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <span className="font-mono font-medium">{invoice.invoiceNumber}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {invoice.b2bClientId ? (
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <User className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div>
                              <p className="font-medium">{invoice.customerName}</p>
                              {invoice.b2bClientId && (
                                <p className="text-xs text-muted-foreground">
                                  {getB2BClient(invoice.b2bClientId)?.companyName}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>₹{invoice.totalAmount.toLocaleString()}</TableCell>
                        <TableCell className="text-success">₹{invoice.paidAmount.toLocaleString()}</TableCell>
                        <TableCell className="font-semibold text-destructive">
                          ₹{invoice.balanceAmount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <span className={new Date(invoice.dueDate) < new Date() ? 'text-destructive' : ''}>
                            {new Date(invoice.dueDate).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getPaymentStatusBadge(invoice.status)}>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() =>
                              handleOpenPaymentDialog(
                                'invoice',
                                invoice.id,
                                invoice.totalAmount,
                                invoice.paidAmount
                              )
                            }
                          >
                            <CreditCard className="mr-2 h-4 w-4" />
                            Record Payment
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            {/* B2B Balances Tab */}
            <TabsContent value="b2b">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Credit Limit</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Available Credit</TableHead>
                    <TableHead>Credit Days</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {b2bBalances.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success" />
                        No outstanding B2B balances
                      </TableCell>
                    </TableRow>
                  ) : (
                    b2bBalances.map((client) => {
                      const utilization = (client.currentBalance / client.creditLimit) * 100
                      return (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">{client.companyName}</TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{client.contactPerson}</p>
                              <p className="text-xs text-muted-foreground">{client.phone}</p>
                            </div>
                          </TableCell>
                          <TableCell>₹{client.creditLimit.toLocaleString()}</TableCell>
                          <TableCell className="font-semibold text-destructive">
                            ₹{client.currentBalance.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-success">
                            ₹{(client.creditLimit - client.currentBalance).toLocaleString()}
                          </TableCell>
                          <TableCell>{client.creditDays} days</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-muted rounded-full">
                                <div
                                  className={`h-full rounded-full ${
                                    utilization > 80 ? 'bg-destructive' : utilization > 50 ? 'bg-warning' : 'bg-success'
                                  }`}
                                  style={{ width: `${Math.min(utilization, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">{utilization.toFixed(0)}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={!!paymentDialog?.open} onOpenChange={() => setPaymentDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Enter payment details to record
            </DialogDescription>
          </DialogHeader>
          {paymentDialog && (
            <div className="space-y-4 py-4">
              <div className="flex justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Total Amount</span>
                <span className="font-semibold">₹{paymentDialog.amount.toLocaleString()}</span>
              </div>
              {paymentDialog.paidAmount > 0 && (
                <div className="flex justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">Already Paid</span>
                  <span className="font-semibold text-success">₹{paymentDialog.paidAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Balance Due</span>
                <span className="font-semibold text-destructive">
                  ₹{(paymentDialog.amount - paymentDialog.paidAmount).toLocaleString()}
                </span>
              </div>

              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Payment Amount</FieldLabel>
                  <Input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    max={paymentDialog.amount - paymentDialog.paidAmount}
                    min={0}
                  />
                </Field>
                <Field>
                  <FieldLabel>Payment Method</FieldLabel>
                  <Select value={paymentMethod} onValueChange={(v: typeof paymentMethod) => setPaymentMethod(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={paymentAmount <= 0}>
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
