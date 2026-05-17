"use client"

import { useState, useMemo } from "react"
import { useAdmin } from "@/lib/admin-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Search, FileText, Printer, CheckCircle, Clock } from "lucide-react"
import { toast } from "sonner"

export default function InvoicesPage() {
  const { bookings, getB2BClient, updateBooking } = useAdmin()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [viewingInvoice, setViewingInvoice] = useState<any>(null)

  // Generate invoices dynamically from closed bookings
  const invoices = useMemo(() => {
    return bookings
      .filter(b => b.status === "closed")
      .map(b => {
        const client = b.b2bClientId ? getB2BClient(b.b2bClientId) : null;
        const invoiceDate = new Date((b as { updatedAt?: string }).updatedAt || b.createdAt);
        const dueDate = new Date(invoiceDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days later

        // Calculate Subtotal & Tax based on your existing structure
        const gstAmount = b.gstAmount || 0;
        const subTotal = (b.grandTotal || 0) - gstAmount;

        return {
          id: `INV-${b.bookingNumber}`,
          bookingId: b.id,
          bookingNumber: b.bookingNumber,
          date: invoiceDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          dueDate: dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          customerName: client ? client.companyName : b.customerName,
          customerAddress: client?.billingAddress || b.customerAddress || "Address not provided",
          type: b.b2bClientId ? "B2B Corporate" : "B2C Retail",
          subTotal: subTotal,
          gstAmount: gstAmount,
          amount: b.grandTotal || 0,
          status: b.paymentStatus || "pending",
        }
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [bookings, getB2BClient])

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          inv.customerName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalRevenue = invoices.filter(i => i.status === "paid").reduce((acc, curr) => acc + curr.amount, 0)
  const pendingAmount = invoices.filter(i => i.status === "pending").reduce((acc, curr) => acc + curr.amount, 0)

  const handlePrint = () => {
    window.print()
  }

  const handleMarkAsPaid = () => {
    if (viewingInvoice) {
      updateBooking(viewingInvoice.bookingId, { paymentStatus: "paid" })
      toast.success(`Invoice ${viewingInvoice.id} marked as paid successfully!`)
      setViewingInvoice(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Paid</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Pending</Badge>
      case 'overdue':
        return <Badge className="bg-red-100 text-red-700 border-red-200">Overdue</Badge>
      default:
        return <Badge variant="outline" className="capitalize">{status}</Badge>
    }
  }

  return (
    <div className="flex flex-col gap-6 print:hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices & Billing</h1>
          <p className="text-muted-foreground">Manage payments and view auto-generated invoices for closed trips.</p>
        </div>
        <Button onClick={() => toast.info("Manual generation coming soon!")}>
          <FileText className="mr-2 h-4 w-4" />
          Generate Manual Invoice
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Revenue (Paid)</p>
              <h2 className="text-3xl font-bold text-green-600">₹{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Payments</p>
              <h2 className="text-3xl font-bold text-yellow-600">₹{pendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
            </div>
            <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Invoices</p>
              <h2 className="text-3xl font-bold text-blue-600">{invoices.length}</h2>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <CardTitle>Invoice List</CardTitle>
              <CardDescription>Review all billing transactions.</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search invoice or client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[250px]"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer / Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No invoices found. Close a trip to generate one automatically.
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium text-primary">{inv.id}</TableCell>
                    <TableCell>{inv.date}</TableCell>
                    <TableCell className="font-medium">{inv.customerName}</TableCell>
                    <TableCell><Badge variant="secondary" className="font-normal text-xs">{inv.type}</Badge></TableCell>
                    <TableCell className="font-semibold">₹{inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell>{getStatusBadge(inv.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setViewingInvoice(inv)}>
                        <FileText className="mr-1 h-4 w-4 text-muted-foreground" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invoice Details / Print Dialog */}
      <Dialog open={!!viewingInvoice} onOpenChange={(open) => !open && setViewingInvoice(null)}>
        <DialogContent className="max-w-3xl flex flex-col max-h-[90vh]">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Invoice Details</DialogTitle>
                <DialogDescription>Reference Booking: {viewingInvoice?.bookingNumber}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 pb-4">
            {viewingInvoice && (
              <div className="bg-white p-8 border rounded-lg shadow-sm text-sm print-area text-slate-800" id="invoice-print-area">
                <div className="flex justify-between items-start border-b pb-6 mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">INVOICE</h2>
                    <p className="text-slate-500 mt-1 font-medium">{viewingInvoice.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xl text-primary mb-1">Trevis Cabs</p>
                    <p className="text-slate-500">123 Corporate Park, Andheri East</p>
                    <p className="text-slate-500">Mumbai, Maharashtra 400069</p>
                    <p className="text-slate-500 mt-1">GSTIN: <span className="font-medium text-slate-700">27AAAAA0000A1Z5</span></p>
                  </div>
                </div>

                <div className="flex justify-between mb-8 bg-slate-50 p-4 rounded-lg">
                  <div className="flex-1">
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Billed To</p>
                    <p className="font-bold text-lg text-slate-800">{viewingInvoice.customerName}</p>
                    <p className="text-slate-600 mt-1 whitespace-pre-wrap">{viewingInvoice.customerAddress}</p>
                  </div>
                  <div className="text-right flex-1 border-l pl-4 ml-4">
                    <div className="space-y-2">
                      <p className="flex justify-between"><span className="text-slate-500">Invoice Date:</span> <span className="font-semibold">{viewingInvoice.date}</span></p>
                      <p className="flex justify-between"><span className="text-slate-500">Due Date:</span> <span className="font-semibold">{viewingInvoice.dueDate}</span></p>
                      <p className="flex justify-between items-center"><span className="text-slate-500">Status:</span> {getStatusBadge(viewingInvoice.status)}</p>
                    </div>
                  </div>
                </div>

                <Table className="mb-8 border">
                  <TableHeader>
                    <TableRow className="bg-slate-100 hover:bg-slate-100">
                      <TableHead className="font-bold text-slate-700">Description</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="py-4">
                        <p className="font-semibold text-slate-800">Transport / Cab Service</p>
                        <p className="text-xs text-slate-500 mt-1">Booking Ref: {viewingInvoice.bookingNumber} ({viewingInvoice.type})</p>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-slate-800 py-4">
                        ₹{viewingInvoice.subTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <div className="flex justify-end">
                  <div className="w-72 space-y-3 bg-slate-50 p-4 rounded-lg">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal</span>
                      <span className="font-medium">₹{viewingInvoice.subTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>GST (Taxes)</span>
                      <span className="font-medium">₹{viewingInvoice.gstAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-3 font-bold text-xl text-slate-900">
                      <span>Total</span>
                      <span>₹{viewingInvoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-12 pt-6 border-t text-center text-slate-500 text-xs">
                  <p>Thank you for doing business with Trevis Cabs.</p>
                  <p>For any queries regarding this invoice, please contact support@trevis.com</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 pt-4 border-t">
            <Button variant="outline" onClick={() => setViewingInvoice(null)}>Close</Button>

            {/* Only show Mark as Paid if it's currently pending */}
            {viewingInvoice?.status === "pending" && (
              <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleMarkAsPaid}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Mark as Paid
              </Button>
            )}

            {/* In a real app we'd use a dedicated printing library or iframe. Here we just trigger window.print */}
            <Button onClick={() => {
              // Quick trick to print only the invoice area
              const printContent = document.getElementById('invoice-print-area');
              if(printContent) {
                document.body.innerHTML = printContent.innerHTML;
                window.print();
                window.location.reload(); // reload to restore React state cleanly
              }
            }}>
              <Printer className="mr-2 h-4 w-4" />
              Print Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
