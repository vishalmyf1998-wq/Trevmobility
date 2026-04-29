"use client"

import { useState, useEffect } from "react"
import { useAdmin } from "@/lib/admin-context"
import { DutySlip } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FileText, Clock, Search, Printer, CheckCircle2, CalendarCheck, MapPin, Car, User } from "lucide-react"
import { toast } from "sonner"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import Link from "next/link"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PrintableDutySlip } from "@/components/DutySlipPrint"

export default function DutySlipsPage() {
  const {
    dutySlips,
    updateDutySlip,
    bookings,
    drivers,
    cars,
    getDriver,
    getCar,
    getBooking,
    getCity,
    getB2BEmployee,
    getB2BClient,
  } = useAdmin()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingSlip, setEditingSlip] = useState<DutySlip | null>(null)
  const [printingSlip, setPrintingSlip] = useState<DutySlip | null>(null)
  const [viewingSlip, setViewingSlip] = useState<DutySlip | null>(null)
  const [editFormData, setEditFormData] = useState({
    endTime: "",
    endKm: 0,
    remarks: "",
  })

  const filteredSlips = dutySlips.filter((slip) => {
    const driver = getDriver(slip.driverId)
    const car = getCar(slip.carId)
    const booking = getBooking(slip.bookingId)

    const matchesSearch =
      slip.dutySlipNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      car?.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking?.bookingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking?.customerName.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || slip.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const handleCompleteSlip = (slip: DutySlip) => {
    setEditingSlip(slip)
    setEditFormData({
      endTime: new Date().toISOString().slice(0, 16),
      endKm: slip.endKm || 0,
      remarks: slip.remarks || "",
    })
    setIsEditOpen(true)
  }

  const handleSubmitComplete = () => {
    if (!editingSlip) return

    const totalKm = editFormData.endKm - editingSlip.startKm
    const startDate = new Date(editingSlip.startTime)
    const endDate = new Date(editFormData.endTime)
    const totalHours = Math.round(((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)) * 10) / 10

    updateDutySlip(editingSlip.id, {
      status: "completed",
      endTime: editFormData.endTime,
      endKm: editFormData.endKm,
      totalKm,
      totalHours,
      remarks: editFormData.remarks,
    })

    toast.success("Duty slip completed")
    setIsEditOpen(false)
    setEditingSlip(null)
  }

  const handleViewDetails = (slip: DutySlip) => {
    setViewingSlip(slip)
  }

  const handlePrintSlip = (slip: DutySlip) => {
    if (!getBooking(slip.bookingId)) {
      toast.error('Booking not found for this duty slip')
      return
    }
    setPrintingSlip(slip)
    setTimeout(() => {
      window.print()
    }, 500)
  }

  useEffect(() => {
    const handleAfterPrint = () => setPrintingSlip(null)
    window.addEventListener('afterprint', handleAfterPrint)
    return () => window.removeEventListener('afterprint', handleAfterPrint)
  }, [])

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "-"
    const date = new Date(dateString)
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const activeSlips = dutySlips.filter((s) => s.status === "active")
  const completedSlips = dutySlips.filter((s) => s.status === "completed")
  const todayCompleted = completedSlips.filter((s) => {
    const today = new Date().toDateString()
    return new Date(s.createdAt).toDateString() === today
  })

  const tripTypeLabels: Record<string, string> = {
    airport_pickup: "Airport Pickup",
    airport_drop: "Airport Drop",
    rental: "Rental",
    city_ride: "City Ride",
    outstation: "Outstation",
  }

  return (
    <>
    <div className="flex flex-col gap-6 print:hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Duty Slips</h1>
          <p className="text-muted-foreground">
            Track and manage duty slips generated from bookings
          </p>
        </div>
        <Link href="/bookings">
          <Button variant="outline">
            <CalendarCheck className="mr-2 h-4 w-4" />
            View Bookings
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Slips</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dutySlips.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Trips</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{activeSlips.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{todayCompleted.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total KM Today</CardTitle>
            <Car className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {todayCompleted.reduce((sum, s) => sum + (s.totalKm || 0), 0)} km
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>All Duty Slips</CardTitle>
              <CardDescription>{filteredSlips.length} slips found</CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search slips..."
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
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Slip No.</TableHead>
                <TableHead>Booking</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Driver / Car</TableHead>
                <TableHead>Trip Details</TableHead>
                <TableHead>KM / Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSlips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {searchQuery || statusFilter !== "all"
                      ? "No duty slips found"
                      : "No duty slips created yet. Start a trip from Bookings to create duty slips."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSlips.map((slip) => {
                  const driver = getDriver(slip.driverId)
                  const car = getCar(slip.carId)
                  const booking = getBooking(slip.bookingId)
                  const city = booking ? getCity(booking.cityId) : null

                  return (
                    <TableRow key={slip.id}>
                      <TableCell>
                        <span className="font-mono font-medium">{slip.dutySlipNumber}</span>
                        <p className="text-xs text-muted-foreground">
                          {new Date(slip.createdAt).toLocaleDateString()}
                        </p>
                      </TableCell>
                      <TableCell>
                        {booking ? (
                          <div>
                            <span className="font-mono text-sm">{booking.bookingNumber}</span>
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {tripTypeLabels[booking.tripType]}
                            </Badge>
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {booking ? (
                          <div>
                            <p className="font-medium flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {booking.customerName}
                            </p>
                            <p className="text-xs text-muted-foreground">{booking.customerPhone}</p>
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{driver?.name || "-"}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Car className="h-3 w-3" />
                            {car?.registrationNumber || "-"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {booking ? (
                          <div className="text-sm">
                            <p className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-success" />
                              {booking.pickupLocation}
                            </p>
                            <p className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="h-3 w-3 text-destructive" />
                              {booking.dropLocation}
                            </p>
                            {city && (
                              <p className="text-xs text-muted-foreground mt-1">{city.name}</p>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>
                            {slip.totalKm ? `${slip.totalKm} km` : `${slip.startKm} km (start)`}
                          </p>
                          <p className="text-muted-foreground">
                            {slip.totalHours ? `${slip.totalHours} hrs` : "-"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            slip.status === "active"
                              ? "bg-warning/10 text-warning border-warning/20"
                              : "bg-success/10 text-success border-success/20"
                          }
                        >
                          {slip.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {slip.status === "active" ? (
                            <Button variant="default" size="sm" onClick={() => handleCompleteSlip(slip)}>
                              <CheckCircle2 className="mr-1 h-4 w-4" />
                              Complete
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" onClick={() => handleViewDetails(slip)}>
                              <FileText className="mr-1 h-4 w-4" />
                              View
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handlePrintSlip(slip)}>
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Complete/View Duty Slip Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Complete Duty Slip
            </DialogTitle>
            <DialogDescription>
              {editingSlip?.dutySlipNumber} - Enter trip completion details
            </DialogDescription>
          </DialogHeader>

          {editingSlip && (
            <div className="space-y-4 py-4">
              {/* Booking Info */}
              {(() => {
                const booking = getBooking(editingSlip.bookingId)
                const driver = getDriver(editingSlip.driverId)
                const car = getCar(editingSlip.carId)

                return (
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Customer</p>
                          <p className="font-medium">{booking?.customerName || "-"}</p>
                          <p className="text-xs text-muted-foreground">{booking?.customerPhone}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Driver & Car</p>
                          <p className="font-medium">{driver?.name || "-"}</p>
                          <p className="text-xs text-muted-foreground">
                            {car?.registrationNumber} - {car?.make} {car?.model}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Pickup</p>
                          <p className="font-medium">{booking?.pickupLocation || "-"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Drop</p>
                          <p className="font-medium">{booking?.dropLocation || "-"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })()}

              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Start Time</FieldLabel>
                  <Input value={formatDateTime(editingSlip.startTime)} disabled />
                </Field>
                <Field>
                  <FieldLabel>End Time</FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      type="datetime-local"
                      value={editFormData.endTime}
                      onChange={(e) => setEditFormData({ ...editFormData, endTime: e.target.value })}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        const now = new Date()
                        now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
                        setEditFormData({ ...editFormData, endTime: now.toISOString().slice(0, 16) })
                      }}
                    >
                      Now
                    </Button>
                  </div>
                </Field>
              </FieldGroup>

              <FieldGroup className="grid grid-cols-3 gap-4">
                <Field>
                  <FieldLabel>Start KM</FieldLabel>
                  <Input value={editingSlip.startKm} disabled />
                </Field>
                <Field>
                  <FieldLabel>End KM</FieldLabel>
                  <Input
                    type="number"
                    value={editFormData.endKm}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, endKm: parseInt(e.target.value) || 0 })
                    }
                    min={editingSlip.startKm}
                  />
                </Field>
                <Field>
                  <FieldLabel>Total KM</FieldLabel>
                  <Input
                    value={
                    Math.max(0, editFormData.endKm - editingSlip.startKm)
                    }
                    disabled
                  />
                </Field>
              </FieldGroup>

              <Field>
                <FieldLabel>Remarks</FieldLabel>
                <Textarea
                  value={editFormData.remarks}
                  onChange={(e) => setEditFormData({ ...editFormData, remarks: e.target.value })}
                  placeholder="Any additional notes..."
                  rows={2}
                />
              </Field>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
            Cancel
            </Button>
              <Button onClick={handleSubmitComplete}>Complete Trip</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

  {/* Duty Slip View Dialog */}
  <Dialog open={!!viewingSlip} onOpenChange={(open) => !open && setViewingSlip(null)}>
    <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
      <DialogHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <DialogTitle>Duty Slip Preview</DialogTitle>
            <DialogDescription>
              Duty slip details for {viewingSlip?.dutySlipNumber}
            </DialogDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            if (viewingSlip) handlePrintSlip(viewingSlip)
          }}>
            <Printer className="mr-2 h-4 w-4" />
            Print Slip
          </Button>
        </div>
      </DialogHeader>
      <ScrollArea className="flex-grow">
        {viewingSlip && (() => {
          const booking = getBooking(viewingSlip.bookingId)
          if (!booking) return <p className="text-center py-8 text-muted-foreground">Booking not found</p>
          
          const driver = getDriver(viewingSlip.driverId)
          const car = getCar(viewingSlip.carId)
          const city = getCity(booking.cityId)
          
          return (
            <div className="p-4 bg-slate-100 rounded-lg flex justify-center">
              <div className="shadow-md">
                <PrintableDutySlip 
                  booking={booking}
                  dutySlip={viewingSlip}
                  driver={driver}
                  car={car}
                  city={city}
                  b2bEmployee={booking.b2bEmployeeId ? getB2BEmployee(booking.b2bEmployeeId) : undefined}
                  b2bClient={booking.b2bClientId ? getB2BClient(booking.b2bClientId) : undefined}
                />
              </div>
            </div>
          )
        })()}
      </ScrollArea>
    </DialogContent>
  </Dialog>

    {/* Hidden Print Area */}
    {printingSlip && getBooking(printingSlip.bookingId) && (() => {
      const bk = getBooking(printingSlip.bookingId)!;
      return (
        <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:z-[9999] print:m-0 print:p-0">
          <PrintableDutySlip 
            booking={bk}
            dutySlip={printingSlip}
            driver={getDriver(printingSlip.driverId)}
            car={getCar(printingSlip.carId)}
            city={getCity(bk.cityId)}
            b2bEmployee={bk.b2bEmployeeId ? getB2BEmployee(bk.b2bEmployeeId) : undefined}
            b2bClient={bk.b2bClientId ? getB2BClient(bk.b2bClientId) : undefined}
          />
        </div>
      );
    })()}
    </>
  )
}
