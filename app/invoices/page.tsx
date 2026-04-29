"use client"

import { useState, useEffect } from "react"
import { useAdmin } from "@/lib/admin-context"
import { Invoice } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, FileText, Download, Eye, Building2, User, Printer, Search, CalendarCheck, Receipt } from "lucide-react"
import { toast } from "sonner"
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field"
import Link from "next/link"
import { PrintableInvoice } from "@/components/InvoicePrint"

export default function InvoicesPage() {
  const {
    bookings,
    dutySlips,
    invoices,
    b2bClients,
    gstConfig,
    addInvoice,
    updateInvoice,
    getBooking,
    getDriver,
    getCar,
    getCity,
    getCarCategory,
  } = useAdmin()

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null)
  const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null)
  const [formData, setFormData] = useState({
    bookingId: "",
    clientType: "b2c" as "b2c" | "b2b",
    b2bClientId: "",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    customerAddress: "",
  })

  // Get completed bookings that don't have invoices yet
  const completedBookings = bookings.filter(
    (b) => b.status === "closed" && !invoices.some((inv) => inv.bookingId === b.id)
  )

  const activeB2BClients = b2bClients.filter((c) => c.status === "active")

  const handleCreate = () => {
    if (!formData.bookingId) {
      toast.error("Please select a booking")
      return
    }

    const booking = getBooking(formData.bookingId)
    if (!booking) {
      toast.error("Booking not found")
      return
    }

    if (formData.clientType === "b2b" && !formData.b2bClientId) {
      toast.error("Please select a B2B client")
      return
    }

    // Get customer details
    let customerData = {
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      customerEmail: booking.customerEmail,
      customerAddress: booking.customerAddress,
      customerGst: undefined as string | undefined,
    }
    let isGSTEnabled = true

    if (formData.clientType === "b2b" && formData.b2bClientId) {
      const client = b2bClients.find((c) => c.id === formData.b2bClientId)
      if (client) {
        customerData = {
          customerName: client.companyName,
          customerPhone: client.phone,
          customerEmail: client.email,
          customerAddress: client.billingAddress,
          customerGst: client.gstNumber,
        }
        if (client.isGSTEnabled === false) {
          isGSTEnabled = false
        }
      }
    }

    // Calculate GST
    const gstRate = isGSTEnabled ? gstConfig.cgstRate + gstConfig.sgstRate : 0
    const subtotal = booking.totalFare
    const gstAmount = (subtotal * gstRate) / 100
    const totalAmount = subtotal + gstAmount

    // Find associated duty slip
    const dutySlip = dutySlips.find((ds) => ds.bookingId === booking.id)

    const newInvoice: Omit<Invoice, "id" | "createdAt"> = {
      invoiceNumber: `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(4, "0")}`,
      bookingId: booking.id,
      dutySlipId: dutySlip?.id,
      clientType: formData.clientType,
      b2bClientId: formData.clientType === "b2b" ? formData.b2bClientId : undefined,
      ...customerData,
      invoiceDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days
      subtotal,
      gstRate,
      gstAmount,
      cgst: gstAmount / 2,
      sgst: gstAmount / 2,
      totalAmount,
      status: "pending",
      paidAmount: 0,
      balanceAmount: totalAmount,
    }

    addInvoice(newInvoice)
    toast.success("Invoice created successfully")
    setIsCreateOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      bookingId: "",
      clientType: "b2c",
      b2bClientId: "",
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      customerAddress: "",
    })
  }

  const handleStatusChange = (invoiceId: string, status: Invoice["status"]) => {
    const invoice = invoices.find((i) => i.id === invoiceId)
    if (invoice && status === "paid") {
      updateInvoice(invoiceId, {
        status,
        paidAmount: invoice.totalAmount,
        balanceAmount: 0,
      })
    } else {
      updateInvoice(invoiceId, { status })
    }
    toast.success(`Invoice marked as ${status}`)
  }

  const getStatusBadge = (status: Invoice["status"]) => {
    const styles: Record<string, string> = {
      pending: "bg-warning/10 text-warning border-warning/20",
      paid: "bg-success/10 text-success border-success/20",
      cancelled: "bg-destructive/10 text-destructive border-destructive/20",
      overdue: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    }
    return (
      <Badge variant="outline" className={styles[status]}>
        {status}
      </Badge>
    )
  }

  const handlePrintInvoice = (invoice: Invoice) => {
    setPrintingInvoice(invoice)
    setTimeout(() => {
      window.print()
    }, 500)
  }

  useEffect(() => {
    const handleAfterPrint = () => setPrintingInvoice(null)
    window.addEventListener('afterprint', handleAfterPrint)
    return () => window.removeEventListener('afterprint', handleAfterPrint)
  }, [])

  const filteredInvoices = invoices.filter((invoice) => {
    if (!invoice) return false;
    const matchesSearch =
      (invoice.invoiceNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (invoice.customerName || "").toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const stats = {
    total: invoices.length,
    pending: invoices.filter((i) => i.status === "pending").length,
    paid: invoices.filter((i) => i.status === "paid").length,
    totalRevenue: invoices
      .filter((i) => i.status === "paid")
      .reduce((sum, i) => sum + i.totalAmount, 0),
  }

  const tripTypeLabels: Record<string, string> = {
    airport_pickup: "Airport Pickup",
    airport_drop: "Airport Drop",
    rental: "Rental",
    city_ride: "City Ride",
    outstation: "Outstation",
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Invoices</h1>
          <p className="text-muted-foreground">Generate and manage invoices for completed bookings</p>
        </div>
        <div className="flex gap-2">
          <Link href="/bookings">
            <Button variant="outline">
              <CalendarCheck className="mr-2 h-4 w-4" />
              View Bookings
            </Button>
          </Link>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
                <DialogDescription>Generate an invoice from a completed booking</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Field>
                  <FieldLabel>Select Booking</FieldLabel>
                  <Select
                    value={formData.bookingId}
                    onValueChange={(value) => {
                      const booking = getBooking(value)
                      if (booking) {
                        setFormData({
                          ...formData,
                          bookingId: value,
                          clientType: booking.b2bClientId ? "b2b" : "b2c",
                          b2bClientId: booking.b2bClientId || "",
                        })
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a completed booking" />
                    </SelectTrigger>
                    <SelectContent>
                      {completedBookings.length === 0 ? (
                        <SelectItem value="no-bookings" disabled>
                          No completed bookings available
                        </SelectItem>
                      ) : (
                        completedBookings.map((booking) => (
                          <SelectItem key={booking.id} value={booking.id}>
                            {booking.bookingNumber} - {booking.customerName} - Rs.{" "}
                            {booking.grandTotal.toFixed(0)}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </Field>

                {formData.bookingId && (
                  <>
                    {(() => {
                      const booking = getBooking(formData.bookingId)
                      if (!booking) return null

                      return (
                        <Card className="bg-muted/50">
                          <CardContent className="pt-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Trip Type</p>
                                <p className="font-medium">{tripTypeLabels[booking.tripType]}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Date</p>
                                <p className="font-medium">{booking.pickupDate}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">From</p>
                                <p className="font-medium">{booking.pickupLocation}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">To</p>
                                <p className="font-medium">{booking.dropLocation}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Total Fare</p>
                                <p className="font-semibold">Rs. {booking.totalFare.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Grand Total</p>
                                <p className="font-bold text-lg">Rs. {booking.grandTotal.toFixed(2)}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })()}

                    <Tabs
                      value={formData.clientType}
                      onValueChange={(v) =>
                        setFormData({ ...formData, clientType: v as "b2c" | "b2b", b2bClientId: "" })
                      }
                    >
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="b2c" className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Individual (B2C)
                        </TabsTrigger>
                        <TabsTrigger value="b2b" className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Business (B2B)
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="b2b" className="mt-4">
                        <Field>
                          <FieldLabel>B2B Client</FieldLabel>
                          <Select
                            value={formData.b2bClientId}
                            onValueChange={(value) => setFormData({ ...formData, b2bClientId: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select B2B client" />
                            </SelectTrigger>
                            <SelectContent>
                              {activeB2BClients.length === 0 ? (
                                <SelectItem value="no-clients" disabled>
                                  No active B2B clients
                                </SelectItem>
                              ) : (
                                activeB2BClients.map((client) => (
                                  <SelectItem key={client.id} value={client.id}>
                                    {client.companyName} ({client.gstNumber})
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          {formData.b2bClientId && (
                            <p className="text-sm text-muted-foreground mt-1">
                              GST and billing details will be auto-filled from client profile
                            </p>
                          )}
                        </Field>
                      </TabsContent>

                      <TabsContent value="b2c" className="mt-4">
                        <p className="text-sm text-muted-foreground">
                          Customer details will be taken from the booking information.
                        </p>
                      </TabsContent>
                    </Tabs>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate}>Create Invoice</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Receipt className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <Receipt className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.paid}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <Receipt className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {stats.totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>All Invoices</CardTitle>
              <CardDescription>{filteredInvoices.length} invoices found</CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search invoices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No invoices found</p>
              <p className="text-sm">Create your first invoice from a completed booking</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice Info</TableHead>
                  <TableHead>Billed To</TableHead>
                  <TableHead>Booking Ref</TableHead>
                  <TableHead>Amount Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => {
                  const booking = getBooking(invoice.bookingId)

                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="align-top">
                        <div className="flex flex-col">
                          <span className="font-mono font-semibold text-sm">{invoice.invoiceNumber}</span>
                          <span className="text-[11px] text-muted-foreground mt-0.5">
                            {new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <div className="mt-1.5">
                            <Badge variant={invoice.clientType === "b2b" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 h-4">
                              {String(invoice.clientType || "b2c").toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell className="align-top">
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5">
                            {invoice.clientType === "b2b" ? (
                              <Building2 className="h-4 w-4 text-primary" />
                            ) : (
                              <User className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{invoice.customerName}</span>
                            {invoice.customerPhone && (
                              <span className="text-[11px] text-muted-foreground mt-0.5">{invoice.customerPhone}</span>
                            )}
                            {invoice.customerEmail && (
                              <span className="text-[11px] text-muted-foreground mt-0.5">{invoice.customerEmail}</span>
                            )}
                            {invoice.customerGst && (
                        <span className="text-[11px] font-medium text-slate-600 mt-1 bg-slate-100 px-2 py-0.5 rounded w-fit">
                                GST: {invoice.customerGst}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell className="align-top">
                        {booking ? (
                          <div className="flex flex-col">
                            <span className="font-mono text-sm">{booking.bookingNumber}</span>
                            <span className="text-[11px] text-muted-foreground mt-0.5">
                              {tripTypeLabels[booking.tripType]}
                            </span>
                            <span className="text-[11px] text-muted-foreground mt-0.5">
                              {new Date(booking.pickupDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      
                      <TableCell className="align-top">
                        <div className="flex flex-col gap-1 w-36">
                          <div className="flex justify-between text-[11px] text-muted-foreground">
                            <span>Subtotal:</span>
                            <span>₹ {invoice.subtotal.toFixed(2)}</span>
                          </div>
                          {invoice.gstAmount > 0 ? (
                            <div className="flex justify-between text-[11px] text-muted-foreground">
                              <span>GST ({invoice.gstRate}%):</span>
                              <span>₹ {invoice.gstAmount.toFixed(2)}</span>
                            </div>
                          ) : (
                            <div className="flex justify-between text-[11px] text-muted-foreground">
                              <span>GST (0%):</span>
                              <span>₹ 0.00</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm font-semibold pt-1.5 border-t">
                            <span>Total:</span>
                            <span>₹ {invoice.totalAmount.toFixed(2)}</span>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell className="align-top">
                        <div className="flex flex-col gap-1.5 items-start">
                          {getStatusBadge(invoice.status)}
                          {invoice.status === 'pending' && (
                            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 mt-1">
                              <CalendarCheck className="h-3 w-3" /> Due {new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-right align-top">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => setViewInvoice(invoice)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {invoice.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusChange(invoice.id, "paid")}
                            >
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Invoice Dialog */}
      <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-100">
          <DialogHeader className="flex-shrink-0 px-6 py-4 bg-white border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Invoice Preview</DialogTitle>
                <DialogDescription>
                  Tax invoice for {viewInvoice?.invoiceNumber}
                </DialogDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  if (viewInvoice) handlePrintInvoice(viewInvoice)
                }}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print Invoice
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          <ScrollArea className="flex-grow p-6">
            {viewInvoice && (() => {
              const booking = getBooking(viewInvoice.bookingId)
              const driver = booking?.driverId ? getDriver(booking.driverId) : undefined
              const car = booking?.carId ? getCar(booking.carId) : undefined
              
              return (
                <div className="flex justify-center pb-8">
                  <div className="shadow-lg rounded-xl overflow-hidden bg-white print:shadow-none print:rounded-none">
                    <PrintableInvoice 
                      invoice={viewInvoice}
                      booking={booking}
                      driver={driver}
                      car={car}
                      gstConfig={gstConfig}
                    />
                  </div>
                </div>
              )
            })()}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Hidden Print Area */}
      {printingInvoice && (() => {
        const booking = getBooking(printingInvoice.bookingId)
        const driver = booking?.driverId ? getDriver(booking.driverId) : undefined
        const car = booking?.carId ? getCar(booking.carId) : undefined
        
        return (
          <div className="fixed top-0 left-[200vw] print:left-0 print:inset-0 print:bg-white print:z-[9999] print:m-0 print:p-0">
            <PrintableInvoice 
              invoice={printingInvoice}
              booking={booking}
              driver={driver}
              car={car}
              gstConfig={gstConfig}
            />
          </div>
        );
      })()}
    </div>
  )
}
