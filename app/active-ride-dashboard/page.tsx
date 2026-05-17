"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, RefreshCw, Search, Zap, Leaf, Clock, Phone, ChevronDown, BatteryCharging, ChevronUp, AlertCircle, AlertTriangle, PhoneCall, ShieldAlert, History, Map, ClipboardList, Banknote, Download, FileText, Edit3, XCircle, CheckCircle, Gauge, User, Navigation, Headset, Car, Wallet, Copy, MessageCircle } from 'lucide-react';
import { useAdmin } from "@/lib/admin-context";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardHeader } from "./components/DashboardHeader";
import { FreeDriversSidebar } from "./components/FreeDriversSidebar";

const MapComponent = dynamic(() => import('@/components/tracking-map'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-slate-50">
      <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  ),
});

function hashToOffset(value: string, spread = 0.08) {
  const hash = value.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return ((hash % 100) / 100 - 0.5) * spread;
}

function distanceKm(a?: { latitude: number; longitude: number } | null, b?: { latitude: number; longitude: number } | null) {
  if (!a || !b) return null;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function getEstimatedPickupPoint(ride: any) {
  const booking = ride.originalBooking || ride;
  if (booking.pickupLatitude && booking.pickupLongitude) {
    return { latitude: booking.pickupLatitude, longitude: booking.pickupLongitude };
  }
  const seed = `${booking.id || ""}${booking.pickupLocation || ""}`;
  return {
    latitude: 19.076 + hashToOffset(seed),
    longitude: 72.8777 + hashToOffset(seed.split("").reverse().join("")),
  };
}

const DriverSearchDropdown = ({ ride }: { ride: any }) => {
    const { drivers, cars, carLocations, updateBooking } = useAdmin();
    const [search, setSearch] = useState("");
    const pickupPoint = getEstimatedPickupPoint(ride);
    const availableDrivers = drivers
      .filter((d: any) => d.status === 'active')
      .map((d: any) => {
        const car = cars.find((c: any) => c.assignedDriverId === d.id || c.id === d.assignedCarId);
        const loc = car ? carLocations.find((l: any) => l.carId === car.id) : null;
        const gpsDistance = distanceKm(loc, pickupPoint);
        const fallbackDistance = Math.max(1.8, Math.min(12, (ride.originalBooking?.estimatedKm || 8) * 0.22));
        const distance = gpsDistance ?? fallbackDistance;
        const avgSpeed = Math.max(18, Math.min(45, loc?.speed || 28));
        return {
          ...d,
          car,
          loc,
          suggestion: {
            distance,
            eta: Math.max(4, Math.ceil((distance / avgSpeed) * 60)),
            isLiveGps: Boolean(gpsDistance),
          },
        };
      })
      .filter((d: any) => {
        const query = search.toLowerCase();
        return d.name.toLowerCase().includes(query) || d.phone?.toLowerCase().includes(query) || d.car?.registrationNumber?.toLowerCase().includes(query);
      })
      .sort((a: any, b: any) => a.suggestion.eta - b.suggestion.eta);

    return (
        <div className="flex flex-col gap-2">
            <Input placeholder="Search driver..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 text-xs" />
            <ScrollArea className="h-[200px]">
                {availableDrivers.map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between gap-3 p-2 hover:bg-slate-50 cursor-pointer rounded-md border-b border-slate-100 last:border-0" onClick={() => { updateBooking(ride.originalBooking.id, { driverId: d.id, carId: d.assignedCarId || d.car?.id || ride.originalBooking.carId }); toast.success("Driver assigned!"); }}>
                        <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-slate-800">{d.name}</p>
                              {d.suggestion.eta <= 12 && <Badge className="h-4 bg-green-100 text-green-700 border-none px-1.5 text-[9px]">Best</Badge>}
                            </div>
                            <p className="text-[10px] text-slate-500">{d.phone}</p>
                            <p className="text-[10px] font-semibold text-blue-600">
                              {d.suggestion.distance.toFixed(1)} km • {d.suggestion.eta} min {d.suggestion.isLiveGps ? "live" : "est."}
                            </p>
                        </div>
                        <Badge variant="secondary" className="text-[9px]">Assign</Badge>
                    </div>
                ))}
            </ScrollArea>
        </div>
    )
};

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ActiveRideDashboard() {
  const {
    bookings,
    getDriver,
    getCar,
    carLocations,
    bookingTags = [],
    updateBooking,
    supportTickets = [],
    updateSupportTicket,
    getB2BClient,
    addSupportTicket,
    updateCarLocation,
    drivers,
    cars
  } = useAdmin();

  const [expandedRideId, setExpandedRideId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'delayed' | 'unassigned' | 'dispatched' | 'arrived' | 'pickup' | 'dropped' | 'closed'>('all');
  const [isSimulating, setIsSimulating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [liveMetrics, setLiveMetrics] = useState<Record<string, { distance: number; eta: number; soc: number; actualEta: number }>>({});
  const stateRef = useRef({ bookings, carLocations });

  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [ticketRide, setTicketRide] = useState<any>(null);
  const [ticketData, setTicketData] = useState({ subject: "", type: "Complaint", priority: "medium", description: "" });
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [refundRide, setRefundRide] = useState<any>(null);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState("");
  const [replayState, setReplayState] = useState<Record<string, any>>({});

  // Manual Adjustment State
  const [isManualAdjDialogOpen, setIsManualAdjDialogOpen] = useState(false);
  const [manualAdjRide, setManualAdjRide] = useState<any>(null);
  const [manualAdjData, setManualAdjData] = useState({ tollCharges: 0, parkingCharges: 0 });

  useEffect(() => {
    stateRef.current = { bookings, carLocations };
  }, [bookings, carLocations]);

  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      const { bookings: currentBookings, carLocations: currentLocations } = stateRef.current;
      const activeOnly = currentBookings.filter((b) => ['dispatched', 'arrived', 'picked_up'].includes(b.status));

      activeOnly.forEach((trip: any) => {
        if (!trip.carId) return;
        const loc = currentLocations.find((l: any) => l.carId === trip.carId);
        const baseLat = loc?.latitude || 19.0760;
        const baseLng = loc?.longitude || 72.8777;
        const newSpeed = Math.max(10, (loc?.speed || 40) + (Math.random() * 10 - 5));

        updateCarLocation(trip.carId, {
          latitude: baseLat + (Math.random() - 0.2) * 0.001 * (newSpeed / 40),
          longitude: baseLng + (Math.random() - 0.2) * 0.001 * (newSpeed / 40),
          heading: (loc?.heading || 90) + (Math.random() * 20 - 10),
          speed: newSpeed,
          lastUpdated: new Date().toISOString(),
        });

        setLiveMetrics((prev) => {
          const prevMetrics = prev[trip.id] || { distance: 4.2 + Math.random() * 10, soc: 68 + Math.random() * 10, eta: 12, actualEta: 14 };
          const newDistance = Math.max(0.1, prevMetrics.distance - (newSpeed / 3600) * 3);
          const newEta = Math.ceil((newDistance / newSpeed) * 60);
          return {
            ...prev,
            [trip.id]: {
              distance: newDistance,
              eta: newEta,
              actualEta: newEta + 2,
              soc: Math.max(10, prevMetrics.soc - 0.1),
            },
          };
        });
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isSimulating, updateCarLocation]);

  const checkIsDelayed = (b: any) => {
    if (b.status !== 'dispatched' || !b.pickupDate || !b.pickupTime) return false;
    const pickupTimeMs = new Date(`${b.pickupDate}T${b.pickupTime}`).getTime();
    const metrics = liveMetrics[b.id];
    const predictedArrivalMs = metrics ? Date.now() + metrics.eta * 60000 : Date.now();
    return predictedArrivalMs > pickupTimeMs;
  };

  const delayedCount = useMemo(() => bookings.filter((b: any) => checkIsDelayed(b)).length, [bookings, liveMetrics]);
  const unassignedCount = useMemo(() => bookings.filter((b: any) => !b.driverId && ['confirmed', 'assigned'].includes(b.status)).length, [bookings]);
  const dispatchedCount = useMemo(() => bookings.filter((b: any) => b.status === 'dispatched').length, [bookings]);
  const arrivedCount = useMemo(() => bookings.filter((b: any) => b.status === 'arrived').length, [bookings]);
  const ongoingCount = useMemo(() => bookings.filter((b: any) => b.status === 'picked_up').length, [bookings]);
  const droppedCount = useMemo(() => bookings.filter((b: any) => b.status === 'dropped').length, [bookings]);
  const closedCount = useMemo(() => bookings.filter((b: any) => ['closed', 'cancelled'].includes(b.status)).length, [bookings]);

  const filteredBookings = useMemo(() => {
    const activeStatuses = ['confirmed', 'assigned', 'dispatched', 'arrived', 'picked_up', 'dropped'];
    let statusFiltered;
    switch (statusFilter) {
      case 'all':
        statusFiltered = bookings.filter((b: any) => activeStatuses.includes(b.status));
        break;
      case 'unassigned':
        statusFiltered = bookings.filter((b: any) => !b.driverId && ['confirmed', 'assigned'].includes(b.status));
        break;
      case 'dispatched':
        statusFiltered = bookings.filter((b: any) => b.status === 'dispatched');
        break;
      case 'arrived':
        statusFiltered = bookings.filter((b: any) => b.status === 'arrived');
        break;
      case 'pickup':
        statusFiltered = bookings.filter((b: any) => b.status === 'picked_up');
        break;
      case 'dropped':
        statusFiltered = bookings.filter((b: any) => b.status === 'dropped');
        break;
      case 'closed':
        statusFiltered = bookings.filter((b: any) => ['closed', 'cancelled'].includes(b.status));
        break;
      case 'delayed':
        statusFiltered = bookings.filter((b: any) => checkIsDelayed(b));
        break;
      default:
        statusFiltered = bookings.filter((b: any) => activeStatuses.includes(b.status));
    }

    const query = searchQuery.trim().toLowerCase();
    return statusFiltered.filter((b: any) => {
      const pickupDate = b.pickupDate || "";
      const matchesSearch = !query || [
        b.bookingNumber,
        b.id,
        b.customerName,
        b.customerPhone,
        b.pickupLocation,
        b.dropLocation,
      ].some((value) => String(value || "").toLowerCase().includes(query));
      const matchesFrom = !dateFrom || pickupDate >= dateFrom;
      const matchesTo = !dateTo || pickupDate <= dateTo;
      return matchesSearch && matchesFrom && matchesTo;
    });
  }, [bookings, statusFilter, liveMetrics, searchQuery, dateFrom, dateTo]);

  const sortedRides = useMemo(() => {
    const liveRides = filteredBookings.map((b: any) => {
      const driver = b.driverId ? getDriver(b.driverId) : null;
      const car = b.carId ? getCar(b.carId) : null;
      const carLoc = car ? carLocations.find((l: any) => l.carId === car.id) : null;

      const isDelayed = checkIsDelayed(b);
      const metrics = liveMetrics[b.id];
      const delayMins = metrics
        ? Math.max(0, Math.floor((Date.now() + metrics.eta * 60000 - new Date(`${b.pickupDate}T${b.pickupTime}`).getTime()) / 60000))
        : 0;

      const rawStatus = b.status;
      const statusColor = isDelayed ? 'amber' : !b.driverId ? 'orange' : rawStatus === 'picked_up' ? 'blue' : 'green';
      const displayStatus = isDelayed ? 'Delayed' : !b.driverId ? 'Unassigned' : rawStatus === 'picked_up' ? 'Ongoing' : formatStatus(rawStatus);

        return {
          id: b.id,
          displayId: b.id.substring(0, 8).toUpperCase(),
          bookingId: b.bookingNumber,
          customerName: b.customerName,
          customerPhone: b.customerPhone,
          driverName: driver ? driver.name : 'Unassigned',
          driverId: driver ? driver.id.split('-')[0].toUpperCase() : 'N/A',
          driverPhone: driver ? driver.phone : 'N/A',
          vehicleNo: car ? car.registrationNumber : 'Unassigned',
          vehicleType: car ? `${car.make} ${car.model}` : 'N/A',
        isEV: true,
        isDelayed,
        delayMins,
        status: displayStatus,
        statusColor,
        rideType: (b.tripType || '').replace(/_/g, ' '),
        time: `${b.pickupDate}, ${b.pickupTime || ''}`,
        fare: `₹ ${b.estimatedFare}`,
        walletBal: b.b2bClientId ? 'Corporate' : 'Direct Pay',
        originalBooking: b,
        speed: carLoc?.speed || 0,
        metrics: metrics || { distance: 4.2, eta: 12, actualEta: 14, soc: 68 },
        tags: b.tags || [],
      };
    });

    return liveRides.sort((a: any, b: any) => {
      if (a.isDelayed && !b.isDelayed) return -1;
      if (!a.isDelayed && b.isDelayed) return 1;
      return 0;
    });
  }, [filteredBookings, getDriver, getCar, carLocations, liveMetrics]);

  const freeDrivers = useMemo(() => {
    const busyDriverIds = bookings.filter((b: any) => ['dispatched', 'arrived', 'picked_up'].includes(b.status) && b.driverId).map((b: any) => b.driverId);
    return drivers.filter((d: any) => d.status === 'active' && !busyDriverIds.includes(d.id)).map((d: any) => {
        const car = cars.find((c: any) => c.assignedDriverId === d.id);
        const loc = car ? carLocations.find((l: any) => l.carId === car.id) : null;
        return {
            ...d,
            car,
            loc,
            soc: Math.floor(60 + Math.random() * 40)
        }
    });
  }, [drivers, cars, bookings, carLocations]);

  const handleCreateTicket = () => {
      if (!ticketData.subject) {
          toast.error("Subject is required");
          return;
      }
      if (!ticketRide) return;

      addSupportTicket({
          bookingId: ticketRide.originalBooking.id,
          bookingNumber: ticketRide.bookingId,
          subject: ticketData.subject,
          customerName: ticketRide.customerName,
          type: ticketData.type,
          priority: ticketData.priority,
          description: `Booking Reference: ${ticketRide.bookingId}\n\n${ticketData.description}`,
          status: "open"
      });

      toast.success("Support ticket created successfully");
      setIsTicketDialogOpen(false);
      setTicketRide(null);
  };

  const handleExport = () => {
    if (sortedRides.length === 0) {
      toast.error("No rides available to export");
      return;
    }

    const headers = ["Booking ID", "Customer", "Phone", "Status", "Pickup Date/Time", "Driver", "Vehicle", "Trip Type", "Fare"];
    const rows = sortedRides.map((ride: any) => [
      ride.bookingId,
      ride.customerName,
      ride.customerPhone,
      ride.status,
      ride.time,
      ride.driverName,
      ride.vehicleNo,
      ride.rideType,
      ride.originalBooking?.estimatedFare || "",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `active-rides-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Active rides exported");
  };

  return (
    <div className="flex flex-col xl:flex-row h-screen bg-slate-50 overflow-hidden">
      <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto">
       <DashboardHeader
         isSimulating={isSimulating}
         setIsSimulating={setIsSimulating}
         isRefreshing={isRefreshing}
         handleRefresh={() => { setIsRefreshing(true); setTimeout(() => setIsRefreshing(false), 500); }}
         statusFilter={statusFilter}
         setStatusFilter={setStatusFilter}
         searchQuery={searchQuery}
         setSearchQuery={setSearchQuery}
         dateFrom={dateFrom}
         setDateFrom={setDateFrom}
         dateTo={dateTo}
         setDateTo={setDateTo}
         onExport={handleExport}
         resultCount={sortedRides.length}
         counts={{
           delayed: delayedCount,
           unassigned: unassignedCount,
           dispatched: dispatchedCount,
           arrived: arrivedCount,
           ongoing: ongoingCount,
           dropped: droppedCount,
           closed: closedCount,
         }}
       />

       {/* List of Active Rides */}
       <div className="space-y-3">
         {isRefreshing && (
            <>
              {[0, 1, 2].map((item) => (
                <div key={item} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-5 w-56" />
                      <Skeleton className="h-3 w-72 max-w-full" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <Skeleton className="h-12 w-20 rounded-xl" />
                      <Skeleton className="h-12 w-20 rounded-xl" />
                      <Skeleton className="h-12 w-20 rounded-xl" />
                    </div>
                  </div>
                </div>
              ))}
            </>
         )}
         {!isRefreshing && sortedRides.length === 0 && (
            <div className="text-center p-12 bg-white rounded-2xl shadow-sm border border-slate-200 mt-4">
                <Car className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-semibold text-lg">No matching rides found</p>
                <p className="text-slate-400 text-sm mt-1">Try changing the search, date range, or status filter.</p>
            </div>
         )}
         {!isRefreshing && sortedRides.map((ride) => {
            const isExpanded = expandedRideId === ride.id;
            const isDelayed = ride.status === 'Delayed';
            const isUnassigned = ride.driverName === 'Unassigned';
            const isClosed = ['Completed', 'Dropped Off', 'Cancelled'].includes(ride.status);
            
            const driver = ride.originalBooking.driverId ? getDriver(ride.originalBooking.driverId) : null;
            const b2bClient = ride.originalBooking.b2bClientId ? getB2BClient(ride.originalBooking.b2bClientId) : null;
            const rideTickets = supportTickets.filter((t: any) => t.bookingId === ride.originalBooking.id) || [];
            const activeTickets = rideTickets.filter((t: any) => t.status !== 'resolved');

            const currentReplay = replayState[ride.id];
            const displayCarLocations = currentReplay?.active ? [{
                carId: ride.originalBooking.carId || 'mock-car',
                latitude: currentReplay.lat,
                longitude: currentReplay.lng,
                heading: (currentReplay.progress * 15) % 360,
                speed: 40 + (Math.random() * 10),
                lastUpdated: new Date().toISOString()
            }] : carLocations;

            // Premium border styling
            let borderNormal = 'border-slate-100 hover:border-blue-200 shadow-sm';
            let borderExpanded = 'border-blue-400 ring-2 ring-blue-500/10 shadow-md';

            if (isDelayed) {
                borderNormal = 'border-amber-300 hover:border-amber-400 shadow-sm';
                borderExpanded = 'border-amber-500 ring-2 ring-amber-500/20 shadow-md';
            } else if (isUnassigned) {
                borderNormal = 'border-orange-300 hover:border-orange-400 shadow-sm';
                borderExpanded = 'border-orange-500 ring-2 ring-orange-500/20 shadow-md';
            } else if (isClosed) {
                borderNormal = 'border-slate-200 opacity-60 bg-slate-50/50 grayscale hover:grayscale-0 transition-all';
                borderExpanded = 'border-slate-300 ring-1 ring-slate-300/20 opacity-100 bg-white grayscale-0';
            }

            const rideMetrics = liveMetrics[ride.originalBooking.id] || { distance: 4.2, eta: 12, actualEta: 14, soc: 68 + Math.random() * 20 };
            const estRange = Math.floor((rideMetrics.soc / 100) * 250);

            return (
              <div key={ride.id} className={`relative bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${isExpanded ? borderExpanded : borderNormal}`}>
                
                {/* Clickable Header */}
                <div 
                   className={`group p-3 md:p-4 px-4 cursor-pointer select-none relative z-10`}
                   onClick={(e) => {
                       setExpandedRideId(isExpanded ? null : ride.id)
                   }}
                >
                   <div className="flex flex-col md:flex-row md:items-center text-sm w-full relative">
                       {/* Alert Pulse Background for Critical states */}
                       {isDelayed && !isClosed && <div className="absolute inset-0 bg-red-500/10 animate-pulse pointer-events-none rounded-xl" />}
                       {isUnassigned && !isDelayed && !isClosed && <div className="absolute inset-0 bg-orange-500/10 animate-pulse pointer-events-none rounded-xl" />}

                       {/* Col 1: Status & Booking */}
                       <div className="w-full md:w-[20%] flex flex-col gap-1 pr-4 border-b md:border-b-0 md:border-r border-slate-100 py-2 md:py-0 relative z-10">
                           <div className="flex justify-between items-center">
                               <span className="font-bold text-slate-800 tracking-tight">{ride.displayId}</span>
                               <div className="flex items-center gap-1.5">
                                   {ride.delayMins > 0 && (
                                       <Badge className="bg-red-600 text-white hover:bg-red-700 border-none text-[10px] font-bold h-5 py-0 px-2 rounded-md shadow-sm animate-pulse">
                                           {ride.delayMins}m Late
                                       </Badge>
                                   )}
                                   <Badge className={`bg-${ride.statusColor}-100 text-${ride.statusColor}-700 hover:bg-${ride.statusColor}-200 border-none text-[10px] font-bold h-5 py-0 px-2 rounded-md shadow-sm`}>
                                       {ride.status}
                                   </Badge>
                               </div>
                           </div>
                           <div className="text-[11px] text-slate-500 font-medium">{ride.bookingId} • <span className="capitalize">{ride.rideType}</span></div>
                           <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-1"><Clock className="h-3.5 w-3.5 text-slate-400" /> {ride.time}</div>
                       </div>

                       {/* Col 2: Customer */}
                       <div className="w-full md:w-[18%] flex flex-col gap-1 px-0 md:px-4 border-b md:border-b-0 md:border-r border-slate-100 py-2 md:py-0">
                           <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Customer</div>
                           <div className="font-bold text-slate-800 truncate text-[13px]" title={ride.customerName}>{ride.customerName}</div>
                           <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5"><Phone className="h-3 w-3 text-slate-400" /> {ride.customerPhone}</div>
                       </div>

                       {/* Col 3: Driver */}
                       <div className="w-full md:w-[20%] flex flex-col gap-1 px-0 md:px-4 border-b md:border-b-0 md:border-r border-slate-100 py-2 md:py-0">
                           <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Driver</div>
                           
                           {!isClosed ? (
                               <Popover>
                                   <PopoverTrigger asChild>
                                       <div 
                                           className="flex items-center gap-1 font-bold text-slate-800 truncate cursor-pointer hover:text-blue-600 transition-colors group/driver p-1 -ml-1 rounded-lg hover:bg-blue-50 w-fit text-[13px]"
                                           onClick={(e) => e.stopPropagation()}
                                       >
                                           <span className={`truncate ${ride.driverName === 'Unassigned' ? 'text-orange-600' : ''}`}>{ride.driverName}</span>
                                           <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-300 group-hover/driver:text-blue-500" />
                                       </div>
                                   </PopoverTrigger>
                                   <PopoverContent className="w-72 p-3 shadow-xl border-slate-200 rounded-xl" align="start" side="bottom">
                                       <DriverSearchDropdown ride={ride} />
                                   </PopoverContent>
                               </Popover>
                           ) : (
                               <div className="font-bold text-slate-800 truncate w-full p-1 -ml-1 text-[13px]">{ride.driverName}</div>
                           )}
                           
                           <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                               {ride.driverName !== 'Unassigned' ? ride.driverId : 'Awaiting Assignment'}
                           </div>
                       </div>

                       {/* Col 4: Vehicle & EV Metrics */}
                       <div className="w-full md:w-[18%] flex flex-col gap-1 px-0 md:px-4 border-b md:border-b-0 md:border-r border-slate-100 py-2 md:py-0">
                           <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Vehicle Details</div>
                           <div className="font-bold text-slate-800 truncate flex items-center gap-1.5 text-[13px]">
                               <span className="truncate">{ride.vehicleNo}</span>
                               {ride.isEV && <Badge variant="outline" className="text-[9px] bg-green-50 text-green-700 px-1.5 py-0 h-4 rounded-sm border-green-200 shrink-0"><Leaf className="h-2 w-2 mr-0.5" /> EV</Badge>}
                           </div>
                           <div className="flex items-center gap-2 mt-0.5">
                               {ride.driverName !== 'Unassigned' && !isClosed && (
                                   <div className={`flex items-center gap-1 text-[11px] font-medium ${rideMetrics.soc < 20 ? 'text-red-600' : 'text-green-600'}`}>
                                       <BatteryCharging className="h-3.5 w-3.5" />
                                       <span>{rideMetrics.soc.toFixed(0)}%</span>
                                       <span className="text-slate-400 font-normal">({estRange}km)</span>
                                   </div>
                               )}
                               {(isClosed || ride.driverName === 'Unassigned') && (
                                   <span className="text-[11px] text-slate-500 truncate">{ride.vehicleType}</span>
                               )}
                           </div>
                       </div>

                       {/* Col 5: Current Event */}
                       <div className="w-full md:w-[14%] flex flex-col justify-center gap-1 px-0 md:px-4 border-b md:border-b-0 md:border-r border-slate-100 py-2 md:py-0">
                           <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Trip Event</div>
                           <Badge variant="outline" className={`w-fit border-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                               (!ride.originalBooking.driverId && ['pending', 'confirmed'].includes(ride.originalBooking.status)) ? 'bg-amber-100 text-amber-700' :
                               ride.originalBooking.status === 'assigned' ? 'bg-blue-100 text-blue-700' :
                               ride.originalBooking.status === 'dispatched' ? 'bg-indigo-100 text-indigo-700' :
                               ride.originalBooking.status === 'arrived' ? 'bg-purple-100 text-purple-700' :
                               ride.originalBooking.status === 'picked_up' ? 'bg-emerald-100 text-emerald-700' :
                               ride.originalBooking.status === 'dropped' ? 'bg-teal-100 text-teal-700' :
                               'bg-slate-100 text-slate-700'
                           }`}>
                               {(!ride.originalBooking.driverId && ['pending', 'confirmed'].includes(ride.originalBooking.status)) ? 'Unassigned' : ride.originalBooking.status.replace(/_/g, ' ')}
                           </Badge>
                       </div>

                       {/* Col 6: Fare & Mode */}
                       <div className="w-full md:flex-1 flex justify-between items-center pl-0 md:pl-4 py-2 md:py-0">
                           <div className="flex flex-col gap-1">
                               <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Fare / Mode</div>
                               <div className="font-bold text-slate-900 text-[14px] whitespace-nowrap">{ride.fare}</div>
                               <div className="text-[11px] text-slate-500 font-medium mt-0.5 whitespace-nowrap">{ride.originalBooking.b2bClientId ? 'Corporate' : 'Direct Pay'}</div>
                           </div>

                           {/* Chevron */}
                           <div className={`p-1.5 rounded-full transition-colors ${isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-transparent text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600'}`}>
                               {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                           </div>
                       </div>
                   </div>

                   {/* Tags Row */}
                   {(!isClosed || (ride.tags && ride.tags.length > 0)) && (
                       <div className="flex items-center gap-2 flex-wrap mt-3">
                           {ride.tags?.map((t: string) => (
                               <Badge key={t} className="text-[10px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100 px-2 py-0.5 h-5 rounded-md font-semibold flex items-center gap-1 shadow-sm">
                                   {t}
                                   {!isClosed && (
                                       <XCircle 
                                           className="h-3 w-3 cursor-pointer hover:text-indigo-900 ml-0.5 opacity-70 hover:opacity-100" 
                                           onClick={(e) => {
                                               e.stopPropagation();
                                               updateBooking(ride.originalBooking.id, { tags: ride.tags.filter((tag: string) => tag !== t) });
                                               toast.success("Tag removed");
                                           }} 
                                       />
                                   )}
                               </Badge>
                           ))}
                           {!isClosed && (
                               <Popover>
                                   <PopoverTrigger asChild>
                                       <span className="text-[10px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer bg-blue-50/50 hover:bg-blue-100 px-2 py-0.5 rounded-md border border-blue-100 border-dashed flex items-center h-5 transition-colors" onClick={(e) => e.stopPropagation()}>+ Add Tag</span>
                                   </PopoverTrigger>
                                   <PopoverContent className="w-56 p-3 shadow-xl border-slate-200 rounded-xl" align="start" side="bottom">
                                       <p className="text-[11px] font-bold text-slate-800 mb-3">Select Tag to Add</p>
                                       <div className="flex flex-wrap gap-1.5">
                                           {bookingTags && bookingTags.length > 0 ? bookingTags.map((tag: any) => {
                                               const tagName = tag.name || tag;
                                               return (
                                                   <Badge 
                                                       key={tag.id || tagName} 
                                                       variant="outline" 
                                                       className={`text-[10px] cursor-pointer hover:bg-slate-100 transition-colors rounded-md ${ride.tags?.includes(tagName) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                       onClick={(e) => {
                                                           e.stopPropagation();
                                                           const currentTags = ride.tags || [];
                                                           if (!currentTags.includes(tagName)) {
                                                               updateBooking(ride.originalBooking.id, { tags: [...currentTags, tagName] });
                                                               toast.success("Tag added");
                                                               document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
                                                           }
                                                       }}
                                                   >
                                                       {tagName}
                                                   </Badge>
                                               )
                                           }) : (
                                               <p className="text-[10px] text-slate-500 w-full">No tags configured in settings.</p>
                                           )}
                                       </div>
                                   </PopoverContent>
                               </Popover>
                           )}
                       </div>
                   )}
                </div>

                {/* ========================================================= */}
                {/* EXPANDED CONTENT AREA - ACTIVE RIDE */}
                {/* ========================================================= */}
                {isExpanded && !isClosed && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-4 md:p-6 animate-in fade-in slide-in-from-top-2 duration-300 relative z-10 rounded-b-2xl">
                    
                    {/* Ride specific action buttons */}
                    <div className="flex justify-end items-center mb-6 gap-3 flex-wrap">
                        <Button variant="outline" size="sm" className="bg-white rounded-xl shadow-sm border-slate-200 hover:bg-slate-50 hover:text-blue-700" onClick={() => ride.driverPhone !== 'N/A' ? window.open(`tel:${ride.driverPhone}`) : toast.error('No driver assigned')}><PhoneCall className="h-4 w-4 mr-2 text-blue-600" /> Call Driver</Button>
                        <Button variant="outline" size="sm" className="bg-white rounded-xl shadow-sm border-slate-200 hover:bg-slate-50 hover:text-green-700" onClick={() => ride.customerPhone ? window.open(`tel:${ride.customerPhone}`) : toast.error('No customer phone')}><PhoneCall className="h-4 w-4 mr-2 text-green-600" /> Call Customer</Button>
                        <Button variant="secondary" size="sm" className="bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200 border rounded-xl shadow-sm"><AlertTriangle className="h-4 w-4 mr-2" /> Breakdown Alert</Button>
                        <Button variant="default" size="sm" className="bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-sm" onClick={() => { setTicketRide(ride); setTicketData({ subject: `Issue with Booking ${ride.bookingId}`, type: "Complaint", priority: "medium", description: "" }); setIsTicketDialogOpen(true); }}><Headset className="h-4 w-4 mr-2" /> Raise Ticket</Button>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                      
                      {/* Main Content Column (Left - 8 columns) */}
                      <div className="xl:col-span-8 space-y-6">
                         
                         {/* Live Ride Status Panel */}
                         <Card className={`shadow-md overflow-hidden rounded-2xl border-none`}>
                            <div className={`${ride.status === 'Delayed' ? 'bg-amber-500' : ride.driverName === 'Unassigned' ? 'bg-orange-500' : 'bg-blue-700'} text-white p-4 flex justify-between items-center`}>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-full"><Navigation className="h-5 w-5 animate-pulse" /></div>
                                    <div>
                                        <span className="font-bold tracking-wide uppercase text-sm block leading-none mb-1">
                                            Live Status: {ride.status} {ride.delayMins ? `(Delayed by ${ride.delayMins} mins)` : ''}
                                        </span>
                                        <span className="text-xs text-white/80 font-medium">Tracking via Vehicle Telematics</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-none text-[10px] animate-pulse rounded-full px-3 py-1"><div className="h-2 w-2 rounded-full bg-green-400 mr-2 shadow-[0_0_8px_rgba(74,222,128,0.8)]"></div>Connected</Badge>
                                </div>
                            </div>
                            <CardContent className="p-0 relative">
                               {/* Real-Time Tracking System Map */}
                               <div className="h-[400px] w-full bg-slate-100 relative flex items-center justify-center overflow-hidden z-0">
                                   <div className="absolute inset-0 z-0">
                                     <MapComponent
                                       trips={[ride.originalBooking]}
                                       carLocations={carLocations}
                                       selectedTrip={ride.originalBooking.id}
                                       onSelectTrip={() => {}}
                                       getDriver={getDriver}
                                       getCar={getCar}
                                       showAllRoutes={true}
                                     />
                                   </div>
                                   
                                   {/* Glassmorphism Badges */}
                                   <div className="absolute top-4 left-4 flex flex-col gap-2 z-[400] pointer-events-none">
                                       <Badge className="bg-white/70 text-slate-800 shadow-sm backdrop-blur-md hover:bg-white/90 pointer-events-auto rounded-lg px-3 py-1.5"><MapPin className="h-3.5 w-3.5 mr-2 text-green-600" /> Live Vehicle Location</Badge>
                                       <Badge className="bg-white/70 text-slate-800 shadow-sm backdrop-blur-md hover:bg-white/90 pointer-events-auto rounded-lg px-3 py-1.5"><Zap className="h-3.5 w-3.5 mr-2 text-blue-600" /> Route Polyline Active</Badge>
                                   </div>
                               </div>
                            </CardContent>
                         </Card>

                         {/* EV Ride Metrics / Live Analytics */}
                         <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                             <Card className="col-span-1 md:col-span-1 shadow-sm bg-white rounded-2xl border-slate-100">
                                 <CardContent className="p-4 text-center">
                                     <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">ETA</p>
                                     <p className="text-xl font-bold text-blue-700">{rideMetrics.eta} min</p>
                                 </CardContent>
                             </Card>
                             <Card className="col-span-1 md:col-span-1 shadow-sm bg-white rounded-2xl border-slate-100">
                                 <CardContent className="p-4 text-center">
                                     <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Actual ETA</p>
                                     <p className="text-xl font-bold text-slate-800">{rideMetrics.actualEta} min</p>
                                 </CardContent>
                             </Card>
                             <Card className="col-span-1 md:col-span-1 shadow-sm bg-white rounded-2xl border-slate-100">
                                 <CardContent className="p-4 text-center">
                                     <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Dist Left</p>
                                     <p className="text-xl font-bold text-blue-700">{rideMetrics.distance.toFixed(1)} km</p>
                                 </CardContent>
                             </Card>
                             <Card className="col-span-1 md:col-span-1 shadow-sm bg-white rounded-2xl border-slate-100">
                                 <CardContent className="p-4 text-center">
                                     <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Live Speed</p>
                                     <p className="text-xl font-bold text-amber-600">{ride.speed.toFixed(0)} km/h</p>
                                 </CardContent>
                             </Card>
                             <Card className="col-span-1 md:col-span-1 shadow-sm bg-green-50 border border-green-100 rounded-2xl relative overflow-hidden">
                                 <div className="absolute top-0 right-0 p-1"><Leaf className="h-6 w-6 text-green-200/50" /></div>
                                 <CardContent className="p-4 text-center relative z-10">
                                     <p className="text-[10px] text-green-700 font-bold uppercase tracking-wider mb-1">Battery (SOC)</p>
                                     <p className="text-xl font-bold text-green-800">{rideMetrics.soc.toFixed(0)}%</p>
                                 </CardContent>
                             </Card>
                             <Card className="col-span-1 md:col-span-1 shadow-sm bg-green-50 border border-green-100 rounded-2xl relative overflow-hidden">
                                 <CardContent className="p-4 text-center relative z-10">
                                     <p className="text-[10px] text-green-700 font-bold uppercase tracking-wider mb-1">Est. Range</p>
                                     <p className="text-xl font-bold text-green-800">{Math.floor((rideMetrics.soc / 100) * 250)} km</p>
                                 </CardContent>
                             </Card>
                             <Card className="col-span-2 md:col-span-6 shadow-none bg-blue-50/50 border border-blue-100 border-dashed rounded-xl">
                                 <CardContent className="p-3 flex justify-center items-center gap-2">
                                     <Clock className="h-4 w-4 text-blue-500" />
                                     <span className="text-sm font-medium text-blue-800">Idle Time during ride: <strong>3 mins</strong></span>
                                 </CardContent>
                             </Card>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Trip Details Section */}
                            <Card className="shadow-sm bg-white rounded-2xl border-slate-100">
                                <CardHeader className="pb-3 bg-slate-50/50 border-b border-slate-100 rounded-t-2xl px-5">
                                    <CardTitle className="text-md flex items-center gap-2 text-slate-800"><MapPin className="h-5 w-5 text-blue-500" /> Route Information</CardTitle>
                                </CardHeader>
                                <CardContent className="p-5 space-y-4">
                                    <div className="relative pl-6 border-l-2 border-slate-200 ml-3 space-y-8">
                                        <div className="relative">
                                            <div className="absolute -left-[31px] bg-white border-4 border-green-500 rounded-full h-4 w-4 shadow-sm"></div>
                                            <h4 className="text-sm font-bold text-slate-800">Pickup Location</h4>
                                            <p className="text-[13px] text-slate-500 mt-1 leading-relaxed font-medium">{ride.originalBooking.pickupLocation || 'N/A'}</p>
                                            <div className="grid grid-cols-2 gap-3 mt-4">
                                                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Reached Time</p>
                                                    <p className="text-[13px] font-bold text-slate-700">10:15 AM</p>
                                                </div>
                                                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Left Time</p>
                                                    <p className="text-[13px] font-bold text-slate-700">10:20 AM</p>
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-2 font-medium">Added by: System Auto-assign</p>
                                        </div>
                                        <div className="relative">
                                            <div className="absolute -left-[31px] bg-white border-4 border-blue-600 rounded-full h-4 w-4 shadow-sm"></div>
                                            <h4 className="text-sm font-bold text-slate-800">Drop Location</h4>
                                            <p className="text-[13px] text-slate-500 mt-1 leading-relaxed font-medium">{ride.originalBooking.dropLocation || 'N/A'}</p>
                                            <div className="grid grid-cols-2 gap-3 mt-4">
                                                <div className="bg-blue-50/80 p-2.5 rounded-xl border border-blue-100">
                                                    <p className="text-[10px] text-blue-600 uppercase font-bold tracking-wider mb-0.5">Current ETA</p>
                                                    <p className="text-[13px] font-bold text-blue-800">{new Date(Date.now() + rideMetrics.eta * 60000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                                </div>
                                                <div className="bg-blue-50/80 p-2.5 rounded-xl border border-blue-100">
                                                    <p className="text-[10px] text-blue-600 uppercase font-bold tracking-wider mb-0.5">Dist. Remaining</p>
                                                    <p className="text-[13px] font-bold text-blue-800">{rideMetrics.distance.toFixed(1)} km</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="space-y-6">
                                {/* Driver Details Card */}
                                <Card className="shadow-sm bg-white rounded-2xl border-slate-100">
                                    <CardHeader className="pb-3 bg-slate-50/50 border-b border-slate-100 rounded-t-2xl px-5 flex flex-row justify-between items-center">
                                        <CardTitle className="text-md flex items-center gap-2 text-slate-800"><User className="h-5 w-5 text-blue-500" /> Driver Profile</CardTitle>
                                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-slate-100">
                                            <User className="h-5 w-5 text-blue-600" />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-5 space-y-5">
                                        <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                                            <div>
                                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Driver Status</p>
                                                <Badge className="bg-green-100 text-green-800 hover:bg-green-200 text-[11px] border-none font-bold rounded-md px-2">{ride.driverName === 'Unassigned' ? 'Not Assigned' : 'On Duty - In Ride'}</Badge>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Shift Timing</p>
                                                <p className="font-bold text-slate-700 text-[13px]">08:00 AM - 06:00 PM</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Duty Hours Today</p>
                                                <p className="font-bold text-slate-700 text-[13px]">2h 45m</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Rating</p>
                                                <p className="font-bold text-amber-500 text-[14px]">★ {driver?.rating || "4.8"} <span className="text-slate-400 font-medium text-[11px]">/ 5.0</span></p>
                                            </div>
                                        </div>
                                        
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="w-full text-[13px] font-semibold bg-slate-50 border-slate-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 rounded-xl h-10 transition-colors" onClick={(e) => e.stopPropagation()}>
                                                    <Search className="h-4 w-4 mr-2" /> Change or Assign Driver
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-72 p-3 shadow-2xl border-slate-200 rounded-xl" align="center" side="bottom">
                                                <DriverSearchDropdown ride={ride} />
                                            </PopoverContent>
                                        </Popover>
                                    </CardContent>
                                </Card>

                                {/* Ride Details Card */}
                                <Card className="shadow-sm bg-white rounded-2xl border-slate-100">
                                    <CardHeader className="pb-3 bg-slate-50/50 border-b border-slate-100 rounded-t-2xl px-5">
                                        <CardTitle className="text-md flex items-center gap-2 text-slate-800"><Car className="h-5 w-5 text-blue-500" /> Booking Details</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-5">
                                        <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                                            <div>
                                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Created By</p>
                                                <p className="font-bold text-slate-700 text-[13px]">{ride.originalBooking.createdBy || 'Admin'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Source</p>
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-700 rounded-md text-[11px] font-bold px-2">{b2bClient ? b2bClient.companyName : ride.walletBal}</Badge>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Ride Category</p>
                                                <p className="font-bold text-slate-700 text-[13px] capitalize bg-slate-50 p-2 rounded-lg border border-slate-100 inline-block">{ride.rideType}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                         </div>
                      </div>

                      {/* Sidebar Column (Right - 4 columns) */}
                      <div className="xl:col-span-4 space-y-6">

                         {/* Support Request Module (Important) */}
                         <Card className={`border-${activeTickets.length > 0 ? 'red-200' : 'slate-100'} shadow-sm bg-white rounded-2xl`}>
                            <CardHeader className={`${activeTickets.length > 0 ? 'bg-red-50' : 'bg-slate-50/50'} pb-4 border-b border-${activeTickets.length > 0 ? 'red-100' : 'slate-100'} rounded-t-2xl px-5`}>
                                <div className="flex justify-between items-center">
                                    <CardTitle className={`text-md flex items-center gap-2 ${activeTickets.length > 0 ? 'text-red-700' : 'text-slate-800'}`}>
                                        <AlertCircle className="h-5 w-5" /> Active Support
                                    </CardTitle>
                                    {activeTickets.length > 0 && <Badge variant="outline" className="bg-red-600 text-white border-none font-bold text-[10px] px-2 rounded-md">{activeTickets.length} Alert(s)</Badge>}
                                </div>
                            </CardHeader>
                            <CardContent className={`p-5 ${activeTickets.length > 0 ? 'bg-red-50/30' : ''}`}>
                                {activeTickets.length === 0 ? (
                                    <div className="text-center py-6">
                                        <ShieldAlert className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                        <p className="text-[13px] text-slate-500 font-medium">No active support requests.</p>
                                    </div>
                                ) : (
                                    activeTickets.map((ticket: any) => (
                                        <div key={ticket.id} className="bg-white p-4 rounded-xl border border-red-200 shadow-sm mb-4 last:mb-0">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <Badge variant="outline" className="text-red-700 border-red-200 bg-red-50 text-[10px] px-2 rounded-md font-bold">{ticket.ticketNumber || ticket.id}</Badge>
                                                    <span className="text-[10px] text-slate-500 ml-2 capitalize font-medium">{ticket.priority} Priority</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            
                                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 mb-4">
                                                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1.5">{ticket.subject || 'Complaint'}</p>
                                                <p className="text-[13px] font-medium text-slate-800 leading-relaxed">"{ticket.description}"</p>
                                                <p className="text-[11px] text-slate-500 mt-2.5 font-medium">Raised By: <strong className="capitalize text-slate-700">{ticket.userType || 'Customer'}</strong></p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2.5">
                                                <Button size="sm" variant="destructive" className="w-full text-xs bg-red-600 hover:bg-red-700 rounded-lg shadow-sm" onClick={() => { if(updateSupportTicket) updateSupportTicket(ticket.id, { priority: 'high' }); toast.success("Ticket Escalated!"); }}><AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> Escalate</Button>
                                                <Button size="sm" variant="outline" className="w-full text-xs bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 rounded-lg shadow-sm" onClick={() => { updateBooking(ride.originalBooking.id, { status: 'cancelled' }); if(updateSupportTicket) updateSupportTicket(ticket.id, { status: 'resolved' }); toast.error("Ride marked as Breakdown!"); }}><ShieldAlert className="h-3.5 w-3.5 mr-1.5" /> Breakdown</Button>
                                                <Button size="sm" variant="outline" className="w-full text-xs rounded-lg border-slate-200 hover:bg-slate-50 font-medium" onClick={() => window.open(`tel:${ride.driverPhone}`)}><PhoneCall className="h-3.5 w-3.5 mr-1.5 text-blue-600" /> Call</Button>
                                                <Button size="sm" variant="outline" className="w-full text-xs text-slate-500 hover:text-red-600 rounded-lg border-slate-200 hover:bg-red-50 font-medium" onClick={() => { if(updateSupportTicket) updateSupportTicket(ticket.id, { status: 'resolved' }); toast.success("Ticket Rejected & Closed"); }}><XCircle className="h-3.5 w-3.5 mr-1.5" /> Reject</Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                         </Card>

                         {/* Fare / Price Details Module */}
                         <Card className="shadow-sm bg-white rounded-2xl border-slate-100">
                            <CardHeader className="pb-4 bg-slate-50/50 border-b border-slate-100 rounded-t-2xl px-5">
                                <CardTitle className="text-md flex items-center gap-2 text-slate-800"><Wallet className="h-5 w-5 text-blue-500" /> Fare Estimate</CardTitle>
                            </CardHeader>
                            <CardContent className="p-5">
                                <div className="space-y-3.5 text-[13px] font-medium text-slate-600">
                                    <div className="flex justify-between items-center">
                                        <span>Current Base Fare</span>
                                        <span className="font-bold text-slate-800">₹ {(ride.originalBooking.estimatedFare || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>Toll & Parking</span>
                                        <span className="font-bold text-slate-800">+ ₹ {((ride.originalBooking.tollCharges || 0) + (ride.originalBooking.parkingCharges || 0)).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>GST Amount</span>
                                        <span className="font-bold text-slate-800">+ ₹ {(ride.originalBooking.gstAmount || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-green-600">
                                        <span>Discount (CORP_10)</span>
                                        <span className="font-bold">- ₹ {(ride.originalBooking.promoDiscount || 0).toFixed(2)}</span>
                                    </div>
                                    <Separator className="my-4 bg-slate-100" />
                                    <div className={`flex justify-between items-center font-bold text-lg p-4 rounded-xl border shadow-sm ${ride.originalBooking.paymentStatus === 'paid' ? 'bg-blue-50/50 border-blue-100' : 'bg-red-50 border-red-200'}`}>
                                        <div className="flex flex-col">
                                            <span className="text-slate-800">Total Fare</span>
                                            <span className={`text-[10px] font-bold mt-1 uppercase tracking-wider ${ride.originalBooking.paymentStatus === 'paid' ? 'text-green-600' : 'text-red-600'}`}>
                                                {ride.originalBooking.paymentStatus === 'paid' 
                                                    ? (ride.originalBooking.b2bClientId ? '✓ Online Paid' : '✓ Paid to Driver (Cash)') 
                                                    : (ride.originalBooking.b2bClientId ? `Due (Online): ₹${(ride.originalBooking.grandTotal || ride.originalBooking.estimatedFare || 0).toFixed(2)}` : `Due (Cash): ₹${(ride.originalBooking.grandTotal || ride.originalBooking.estimatedFare || 0).toFixed(2)}`)
                                                }
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {ride.originalBooking.paymentStatus !== 'paid' && (
                                                <Button 
                                                    size="sm" 
                                                    className="bg-green-600 hover:bg-green-700 text-white text-xs h-8 px-3 rounded-lg shadow-sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        updateBooking(ride.originalBooking.id, { paymentStatus: 'paid' });
                                                        toast.success("Payment marked as Paid!");
                                                    }}
                                                >
                                                    Mark as Paid
                                                </Button>
                                            )}
                                            <span className={`text-xl ${ride.originalBooking.paymentStatus === 'paid' ? 'text-blue-700' : 'text-red-600'}`}>₹ {(ride.originalBooking.grandTotal || ride.originalBooking.estimatedFare || 0).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                         </Card>

                         {/* Trip History Timeline */}
                         <Card className="shadow-sm bg-white rounded-2xl border-slate-100">
                            <CardHeader className="pb-4 bg-slate-50/50 border-b border-slate-100 rounded-t-2xl px-5">
                                <CardTitle className="text-md flex items-center gap-2 text-slate-800"><History className="h-5 w-5 text-blue-500" /> Trip Timeline</CardTitle>
                            </CardHeader>
                            <CardContent className="p-5">
                                <ScrollArea className="h-[280px] pr-4">
                                    <div className="relative border-l-2 border-slate-200 ml-3 space-y-7 pb-4">
                                        
                                        {rideTickets.map((ticket: any) => (
                                            <div key={ticket.id} className="relative pl-6">
                                                <div className="absolute -left-[9px] bg-red-500 rounded-full h-4 w-4 border-4 border-white shadow-sm"></div>
                                                <h4 className="text-[13px] font-bold text-slate-800">Support Raised</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="outline" className="text-[9px] py-0 h-4 border-slate-200">{new Date(ticket.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Badge>
                                                    <span className="text-[10px] text-slate-400 capitalize font-medium">{ticket.userType || 'Customer'}</span>
                                                </div>
                                                <p className="text-[11px] text-slate-600 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100 font-medium">{ticket.subject ? `${ticket.subject}: ` : ''}{ticket.description}</p>
                                            </div>
                                        ))}

                                        <div className="relative pl-6">
                                            <div className="absolute -left-[9px] bg-green-500 rounded-full h-4 w-4 border-4 border-white shadow-sm"></div>
                                            <h4 className="text-[13px] font-bold text-slate-800">Ride Started</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className="text-[9px] py-0 h-4 border-slate-200">10:20 AM</Badge>
                                                <span className="text-[10px] text-slate-400 font-medium">Driver</span>
                                            </div>
                                            <p className="text-[11px] text-green-700 mt-2 bg-green-50 p-2 rounded-lg border border-green-100 font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" /> OTP Verified Successfully</p>
                                        </div>

                                        <div className="relative pl-6">
                                            <div className="absolute -left-[9px] bg-green-500 rounded-full h-4 w-4 border-4 border-white shadow-sm"></div>
                                            <h4 className="text-[13px] font-bold text-slate-800">Driver Arrived</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className="text-[9px] py-0 h-4 border-slate-200">10:15 AM</Badge>
                                                <span className="text-[10px] text-slate-400 font-medium">GPS Geofence</span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-1 font-medium">Wait time: 5 mins</p>
                                        </div>
                                        
                                        <div className="relative pl-6">
                                            <div className="absolute -left-[9px] bg-blue-500 rounded-full h-4 w-4 border-4 border-white shadow-sm"></div>
                                            <h4 className="text-[13px] font-bold text-slate-800">Driver Enroute</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className="text-[9px] py-0 h-4 border-slate-200">09:45 AM</Badge>
                                                <span className="text-[10px] text-slate-400 font-medium">Driver Action</span>
                                            </div>
                                        </div>
                                        
                                    </div>
                                </ScrollArea>
                            </CardContent>
                         </Card>

                      </div>
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* EXPANDED CONTENT AREA - POST RIDE (CLOSED) */}
                {/* ========================================================= */}
                {isExpanded && isClosed && (
                  <div className="border-t border-slate-100 bg-slate-50/80 p-4 md:p-6 animate-in fade-in slide-in-from-top-2 duration-300 relative z-10 rounded-b-2xl">
                    
                    {/* Post Ride Action Buttons */}
                    <div className="flex justify-end items-center mb-6 gap-3 flex-wrap">
                        <Button variant="outline" size="sm" className="bg-white rounded-xl shadow-sm border-slate-200"><Download className="h-4 w-4 mr-2 text-slate-500" /> Invoice</Button>
                        <Button variant="outline" size="sm" className="bg-white rounded-xl shadow-sm border-slate-200"><FileText className="h-4 w-4 mr-2 text-slate-500" /> PDF Report</Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="bg-white rounded-xl shadow-sm border-slate-200 hover:bg-slate-50 hover:text-blue-700"
                          onClick={() => {
                            const template = `Dear ${ride.customerName},\n\nThank you for riding with Trev!\nHere are your trip details:\n\nBooking ID: ${ride.bookingId}\nDate: ${ride.originalBooking.pickupDate}\nFrom: ${ride.originalBooking.pickupLocation}\nTo: ${ride.originalBooking.dropLocation}\n\nTotal Fare: ₹${(ride.originalBooking.grandTotal || ride.originalBooking.estimatedFare || 0).toFixed(2)}\n\nBest Regards,\nTrev Team`;
                            navigator.clipboard.writeText(template);
                            toast.success("Email invoice template copied to clipboard!");
                          }}
                        >
                          <Copy className="h-4 w-4 mr-2 text-slate-500" /> Copy Email
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="bg-white rounded-xl shadow-sm border-slate-200 hover:bg-green-50 hover:text-green-700"
                          onClick={() => {
                            const template = `Dear ${ride.customerName},\n\nThank you for riding with Trev!\nHere are your trip details:\n\nBooking ID: ${ride.bookingId}\nDate: ${ride.originalBooking.pickupDate}\nFrom: ${ride.originalBooking.pickupLocation}\nTo: ${ride.originalBooking.dropLocation}\n\nTotal Fare: ₹${(ride.originalBooking.grandTotal || ride.originalBooking.estimatedFare || 0).toFixed(2)}\n\nBest Regards,\nTrev Team`;
                            const phone = ride.customerPhone ? ride.customerPhone.replace(/\D/g, '') : '';
                            const waUrl = `https://wa.me/${phone.length === 10 ? '91' + phone : phone}?text=${encodeURIComponent(template)}`;
                            window.open(waUrl, '_blank');
                          }}
                        >
                          <MessageCircle className="h-4 w-4 mr-2 text-green-500" /> WhatsApp
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="bg-red-50 text-red-700 hover:bg-red-100 border-red-200 border rounded-xl shadow-sm" 
                          onClick={() => { setRefundRide(ride); setRefundAmount(ride.originalBooking.grandTotal || ride.originalBooking.estimatedFare || 0); setRefundReason(''); setIsRefundDialogOpen(true); }}
                        >
                          <Banknote className="h-4 w-4 mr-2" /> 
                          Process Refund
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="bg-white border border-slate-200 rounded-xl shadow-sm"
                          onClick={() => {
                            setManualAdjRide(ride);
                            setManualAdjData({ tollCharges: ride.originalBooking.tollCharges || 0, parkingCharges: ride.originalBooking.parkingCharges || 0 });
                            setIsManualAdjDialogOpen(true);
                          }}
                        >
                          <Edit3 className="h-4 w-4 mr-2 text-slate-500" /> Manual Adj.
                        </Button>
                    </div>

                    <Tabs defaultValue="overview" className="w-full">
                        <TabsList className="mb-6 bg-white border border-slate-200 shadow-sm rounded-xl p-1">
                            <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none">Overview</TabsTrigger>
                            <TabsTrigger value="timeline" className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none">Timeline</TabsTrigger>
                            <TabsTrigger value="fare" className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none">Fare Details</TabsTrigger>
                            <TabsTrigger value="tracking" className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none">Tracking Replay</TabsTrigger>
                            <TabsTrigger value="audit" className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none">Audit Logs</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="overview" className="space-y-6">
                            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                                {/* Left Col - Locations & Metrics */}
                                <div className="xl:col-span-8 space-y-6">
                                    <Card className="shadow-sm border-slate-200 rounded-2xl bg-white">
                                        <CardHeader className="pb-4 border-b border-slate-100">
                                            <CardTitle className="text-md flex items-center gap-2 text-slate-800"><MapPin className="h-5 w-5 text-blue-500" /> Trip Execution Details</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-6">
                                            <div className="relative pl-6 border-l-2 border-slate-200 ml-3 space-y-10">
                                                <div className="relative">
                                                    <div className="absolute -left-[31px] bg-white border-4 border-slate-300 rounded-full h-4 w-4"></div>
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="text-[14px] font-bold text-slate-800">Terminal 3, IGI Airport, New Delhi</h4>
                                                            <p className="text-[11px] font-bold tracking-wider uppercase text-slate-400 mt-1">Pickup Location</p>
                                                        </div>
                                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-2 py-0.5 rounded-md"><CheckCircle className="h-3 w-3 mr-1.5" /> Reached</Badge>
                                                    </div>
                                                    <div className="flex gap-6 mt-4">
                                                        <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
                                                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Driver Arrived</p>
                                                            <p className="text-[13px] font-bold text-slate-700">06:05 PM</p>
                                                        </div>
                                                        <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
                                                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Ride Started</p>
                                                            <p className="text-[13px] font-bold text-slate-700">06:12 PM</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="relative">
                                                    <div className="absolute -left-[31px] bg-white border-4 border-slate-800 rounded-full h-4 w-4"></div>
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="text-[14px] font-bold text-slate-800">Vasant Kunj Sector C, New Delhi</h4>
                                                            <p className="text-[11px] font-bold tracking-wider uppercase text-slate-400 mt-1">Drop Location</p>
                                                        </div>
                                                        <Badge className="bg-slate-800 px-2 py-0.5 rounded-md"><MapPin className="h-3 w-3 mr-1.5" /> Dropped Off</Badge>
                                                    </div>
                                                    <div className="flex gap-6 mt-4">
                                                        <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
                                                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Drop Time</p>
                                                            <p className="text-[13px] font-bold text-slate-700">07:45 PM</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="shadow-sm border-slate-200 rounded-2xl bg-white">
                                        <CardHeader className="pb-4 border-b border-slate-100">
                                            <CardTitle className="text-md flex items-center gap-2 text-slate-800"><Gauge className="h-5 w-5 text-blue-500" /> Trip Analytics</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                                            <div>
                                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Est. Distance</p>
                                                <p className="text-xl font-bold text-slate-800">18.5 km</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Actual Distance</p>
                                                <p className="text-xl font-bold text-blue-700">20.2 km</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Ride Duration</p>
                                                <p className="text-xl font-bold text-slate-800">1h 33m</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Waiting Time</p>
                                                <p className="text-xl font-bold text-amber-600">7m</p>
                                            </div>
                                            <div className="col-span-2 md:col-span-4 bg-green-50 p-3.5 rounded-xl border border-green-100 flex items-center gap-3">
                                                <ShieldAlert className="h-5 w-5 text-green-600" />
                                                <div>
                                                    <p className="text-[10px] text-green-700 uppercase font-bold tracking-wider mb-0.5">Safety Shield Status</p>
                                                    <p className="text-[13px] font-bold text-green-800">Safe Trip - No SOS / Alerts Raised</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Right Col - Driver & Timings */}
                                <div className="xl:col-span-4 space-y-6">
                                    <Card className="shadow-sm border-slate-200 rounded-2xl bg-white">
                                        <CardHeader className="pb-4 border-b border-slate-100">
                                            <CardTitle className="text-md flex items-center gap-2 text-slate-800"><User className="h-5 w-5 text-blue-500" /> Driver Details</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-5 space-y-5">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center border border-blue-100"><User className="h-6 w-6 text-blue-500" /></div>
                                                <div>
                                                    <p className="font-bold text-slate-800 text-[15px]">{ride.driverName}</p>
                                                    <p className="text-[12px] text-slate-500 font-medium mt-0.5">{ride.driverId} • {ride.vehicleNo}</p>
                                                </div>
                                            </div>
                                            <Separator className="bg-slate-100" />
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Rating Given</p>
                                                    <p className="font-bold text-amber-500 text-[14px]">★★★★☆ <span className="text-slate-600 ml-1">{driver?.rating || "4.0"}</span></p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Phone</p>
                                                    <p className="font-bold text-slate-700 text-[13px]">{ride.driverPhone}</p>
                                                </div>
                                            </div>
                                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1.5">Customer Feedback</p>
                                                <p className="text-[12px] italic text-slate-700 font-medium">"Car was clean, but driver took a slightly longer route."</p>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="shadow-sm border-slate-200 rounded-2xl bg-white">
                                        <CardHeader className="pb-4 border-b border-slate-100">
                                            <CardTitle className="text-md flex items-center gap-2 text-slate-800"><Clock className="h-5 w-5 text-blue-500" /> Timing Logs</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-5 space-y-3.5 text-[13px] font-medium">
                                            <div className="flex justify-between items-center"><span className="text-slate-500">Scheduled</span><span className="text-slate-800">{ride.originalBooking.pickupTime || 'N/A'}</span></div>
                                            <div className="flex justify-between items-center"><span className="text-slate-500">Created At</span><span className="text-slate-800">{new Date(ride.originalBooking.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>
                                            <div className="flex justify-between items-center"><span className="text-slate-500">Date</span><span className="text-slate-800">{ride.originalBooking.pickupDate || 'N/A'}</span></div>
                                            <Separator className="bg-slate-100 my-2" />
                                            <div className="flex justify-between items-center"><span className="text-slate-500">Last Updated</span><span className="font-bold text-slate-800">{ride.originalBooking.updatedAt ? new Date(ride.originalBooking.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}</span></div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="fare" className="space-y-6">
                            <Card className="shadow-sm border-slate-200 bg-white rounded-2xl max-w-2xl mx-auto">
                                <CardHeader className="pb-4 border-b border-slate-100">
                                    <CardTitle className="text-md flex items-center gap-2 text-slate-800"><Banknote className="h-5 w-5 text-blue-500" /> Final Fare Breakdown</CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="space-y-4 text-[14px] font-medium text-slate-600">
                                        <div className="flex justify-between items-center">
                                            <span>Base Fare</span>
                                            <span className="font-bold text-slate-800">₹ {(ride.originalBooking.estimatedFare || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span>Toll / Parking Charges</span>
                                            <span className="font-bold text-slate-800">+ ₹ {((ride.originalBooking.tollCharges || 0) + (ride.originalBooking.parkingCharges || 0)).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-blue-600">
                                            <span>GST & Taxes</span>
                                            <span className="font-bold">+ ₹ {(ride.originalBooking.gstAmount || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-green-700 bg-green-50 p-3 rounded-xl border border-green-100 mt-2">
                                            <span className="font-bold">Promo Applied</span>
                                            <span className="font-bold">- ₹ {(ride.originalBooking.promoDiscount || 0).toFixed(2)}</span>
                                        </div>
                                        
                                        <Separator className="my-5 bg-slate-100" />
                                        
                                        <div className={`flex justify-between items-center font-bold text-2xl p-5 rounded-2xl border shadow-sm ${ride.originalBooking.paymentStatus === 'paid' ? 'bg-slate-50 border-slate-200' : 'bg-red-50 border-red-200'}`}>
                                            <div className="flex flex-col">
                                                <span className="text-slate-800 text-lg">Final Amount</span>
                                                <span className={`text-[11px] uppercase tracking-wider font-bold mt-1 ${ride.originalBooking.paymentStatus === 'paid' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {ride.originalBooking.paymentStatus === 'paid' 
                                                        ? (ride.originalBooking.b2bClientId ? '✓ Online Paid' : '✓ Cash Received') 
                                                        : (ride.originalBooking.b2bClientId ? `Due (Online Pay)` : `Due (Cash)`)
                                                    }
                                                </span>
                                            </div>
                                        <div className="flex items-center gap-4">
                                            {ride.originalBooking.paymentStatus !== 'paid' && (
                                                <Button 
                                                    size="sm" 
                                                    className="bg-green-600 hover:bg-green-700 text-white text-sm h-10 px-4 rounded-xl shadow-sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        updateBooking(ride.originalBooking.id, { paymentStatus: 'paid' });
                                                        toast.success("Payment marked as Paid!");
                                                    }}
                                                >
                                                    Mark as Paid
                                                </Button>
                                            )}
                                            <span className={ride.originalBooking.paymentStatus === 'paid' ? 'text-blue-700' : 'text-red-600'}>₹ {(ride.originalBooking.grandTotal || ride.originalBooking.estimatedFare || 0).toFixed(2)}</span>
                                        </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mt-6">
                                            <div className="bg-white p-4 border border-slate-200 rounded-xl">
                                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">Payment Status</p>
                                                <Badge className={`px-3 py-1 text-xs rounded-lg border-none ${ride.originalBooking.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                                    {ride.originalBooking.paymentStatus === 'paid' 
                                                        ? (ride.originalBooking.b2bClientId ? 'Online Paid' : 'Cash Collected') 
                                                        : (ride.originalBooking.b2bClientId ? `Payment Due` : `Cash Due`)
                                                    }
                                                </Badge>
                                            </div>
                                            <div className="bg-white p-4 border border-slate-200 rounded-xl">
                                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">Refund Status</p>
                                                <p className="text-[13px] font-bold text-slate-500">Not Applicable</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="timeline">
                             <Card className="shadow-sm border-slate-200 bg-white rounded-2xl max-w-3xl mx-auto">
                                <CardHeader className="pb-4 border-b border-slate-100">
                                    <CardTitle className="text-md flex items-center gap-2 text-slate-800"><History className="h-5 w-5 text-blue-500" /> Full Trip Timeline</CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="relative border-l-2 border-slate-200 ml-4 space-y-10">
                                        
                                        {rideTickets.map((ticket: any) => (
                                            <div key={ticket.id} className="relative pl-6">
                                                <div className="absolute -left-[9px] bg-red-500 rounded-full h-4 w-4 border-4 border-white shadow-sm"></div>
                                                <h4 className="text-[14px] font-bold text-slate-800">Support Raised</h4>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <Badge variant="outline" className="text-[10px] border-slate-200 py-0.5">{new Date(ticket.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Badge>
                                                    <span className="text-[11px] text-slate-500 capitalize font-medium">{ticket.userType || 'Customer'}</span>
                                                </div>
                                                <p className="text-[12px] text-slate-700 mt-2 bg-slate-50 p-3 rounded-xl border border-slate-100 font-medium"><strong>{ticket.subject ? `${ticket.subject}: ` : ''}</strong>{ticket.description}</p>
                                            </div>
                                        ))}

                                        <div className="relative pl-6">
                                            <div className="absolute -left-[9px] bg-slate-800 rounded-full h-4 w-4 border-4 border-white shadow-sm"></div>
                                            <h4 className="text-[14px] font-bold text-slate-800">Ride Dropped Off</h4>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <Badge variant="outline" className="text-[10px] border-slate-200 py-0.5">07:45 PM</Badge>
                                                <span className="text-[11px] text-slate-500 font-medium">Driver App</span>
                                            </div>
                                        </div>

                                        <div className="relative pl-6">
                                            <div className="absolute -left-[9px] bg-green-500 rounded-full h-4 w-4 border-4 border-white shadow-sm"></div>
                                            <h4 className="text-[14px] font-bold text-slate-800">Ride Started</h4>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <Badge variant="outline" className="text-[10px] border-slate-200 py-0.5">06:12 PM</Badge>
                                                <span className="text-[11px] text-slate-500 font-medium">OTP Verified</span>
                                            </div>
                                        </div>

                                        <div className="relative pl-6">
                                            <div className="absolute -left-[9px] bg-blue-500 rounded-full h-4 w-4 border-4 border-white shadow-sm"></div>
                                            <h4 className="text-[14px] font-bold text-slate-800">Driver Arrived at Pickup</h4>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <Badge variant="outline" className="text-[10px] border-slate-200 py-0.5">06:05 PM</Badge>
                                                <span className="text-[11px] text-slate-500 font-medium">GPS Geofence</span>
                                            </div>
                                        </div>
                                        
                                        <div className="relative pl-6">
                                            <div className="absolute -left-[9px] bg-amber-500 rounded-full h-4 w-4 border-4 border-white shadow-sm"></div>
                                            <h4 className="text-[14px] font-bold text-slate-800">Driver Enroute</h4>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <Badge variant="outline" className="text-[10px] border-slate-200 py-0.5">05:46 PM</Badge>
                                                <span className="text-[11px] text-slate-500 font-medium">Driver App</span>
                                            </div>
                                        </div>

                                        <div className="relative pl-6">
                                            <div className="absolute -left-[9px] bg-slate-300 rounded-full h-4 w-4 border-4 border-white shadow-sm"></div>
                                            <h4 className="text-[14px] font-bold text-slate-800">Driver Assigned</h4>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <Badge variant="outline" className="text-[10px] border-slate-200 py-0.5">05:45 PM</Badge>
                                                <span className="text-[11px] text-slate-500 font-medium">System Auto-Assign</span>
                                            </div>
                                        </div>
                                        
                                    </div>
                                </CardContent>
                             </Card>
                        </TabsContent>

                        <TabsContent value="tracking">
                             <Card className="shadow-sm border-slate-200 bg-white rounded-2xl">
                                <CardHeader className="pb-4 border-b border-slate-100">
                                    <CardTitle className="text-md flex items-center gap-2 text-slate-800"><Map className="h-5 w-5 text-blue-500" /> Historical Tracking & Replay</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                   <div className="h-[500px] w-full bg-slate-100 relative flex flex-col items-center justify-center overflow-hidden z-0 rounded-b-2xl">
                                       <div className="absolute inset-0 z-0">
                                           <MapComponent
                                             trips={[ride.originalBooking]}
                                             carLocations={displayCarLocations}
                                             selectedTrip={ride.originalBooking.id}
                                             onSelectTrip={() => {}}
                                             getDriver={getDriver}
                                             getCar={getCar}
                                             showAllRoutes={true}
                                           />
                                       </div>
                                   </div>
                                </CardContent>
                             </Card>
                        </TabsContent>

                        <TabsContent value="audit">
                             <Card className="shadow-sm border-slate-200 bg-white rounded-2xl max-w-4xl mx-auto">
                                <CardHeader className="pb-4 border-b border-slate-100">
                                    <CardTitle className="text-md flex items-center gap-2 text-slate-800"><ClipboardList className="h-5 w-5 text-blue-500" /> Admin Activity Logs</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0 overflow-x-auto">
                                    <table className="w-full text-[13px] text-left border-collapse">
                                        <thead className="text-[11px] text-slate-400 bg-slate-50 uppercase tracking-wider border-b border-slate-100">
                                            <tr>
                                                <th className="px-6 py-4 font-bold">Timestamp</th>
                                                <th className="px-6 py-4 font-bold">Trip Status</th>
                                                <th className="px-6 py-4 font-bold">Action Taken</th>
                                                <th className="px-6 py-4 font-bold">Performed By</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            <tr className="bg-white hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-slate-700 whitespace-nowrap">May 14, 08:15 PM</td>
                                                <td className="px-6 py-4"><Badge className="bg-slate-100 text-slate-600 border-none font-bold">Closed</Badge></td>
                                                <td className="px-6 py-4 font-medium text-slate-600">Viewed Details</td>
                                                <td className="px-6 py-4"><Badge variant="outline" className="bg-white text-slate-600 border-slate-200">Admin - Neha</Badge></td>
                                            </tr>
                                            <tr className="bg-white hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-slate-700 whitespace-nowrap">May 14, 07:46 PM</td>
                                                <td className="px-6 py-4"><Badge className="bg-slate-800 text-white border-none font-bold">Dropped Off</Badge></td>
                                                <td className="px-6 py-4 font-medium text-slate-600">System processed payment via Corporate Wallet</td>
                                                <td className="px-6 py-4"><Badge variant="secondary" className="bg-blue-50 text-blue-700">System Auto</Badge></td>
                                            </tr>
                                            <tr className="bg-white hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-slate-700 whitespace-nowrap">May 14, 04:30 PM</td>
                                                <td className="px-6 py-4"><Badge className="bg-blue-100 text-blue-700 border-none font-bold">Confirmed</Badge></td>
                                                <td className="px-6 py-4 font-medium text-slate-600">Applied Promo Code 'AIRPORT_20'</td>
                                                <td className="px-6 py-4"><Badge variant="outline" className="bg-white text-slate-600 border-slate-200">Customer App</Badge></td>
                                            </tr>
                                            <tr className="bg-white hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-slate-700 whitespace-nowrap">May 14, 04:25 PM</td>
                                                <td className="px-6 py-4"><Badge className="bg-amber-100 text-amber-700 border-none font-bold">Pending</Badge></td>
                                                <td className="px-6 py-4 font-medium text-slate-600">Booking Created via B2B API Portal</td>
                                                <td className="px-6 py-4"><Badge variant="secondary" className="bg-purple-50 text-purple-700">Corporate API</Badge></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </CardContent>
                             </Card>
                        </TabsContent>

                    </Tabs>

                  </div>
                )}

              </div>
            );
         })}
       </div>
       
       {/* Create Ticket Dialog */}
       <Dialog open={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen}>
         <DialogContent className="sm:max-w-lg rounded-2xl">
           <DialogHeader>
             <DialogTitle className="text-xl text-slate-800">Raise Support Ticket</DialogTitle>
             <DialogDescription className="text-slate-500">
               Create a ticket for booking <strong className="text-slate-700">{ticketRide?.bookingId}</strong>
             </DialogDescription>
           </DialogHeader>
           <div className="grid gap-5 py-4">
             <div className="space-y-2">
               <Label className="text-slate-700 font-bold text-xs uppercase tracking-wider">Subject</Label>
               <Input 
                 placeholder="Briefly describe the issue" 
                 value={ticketData.subject}
                 onChange={(e) => setTicketData({...ticketData, subject: e.target.value})}
                 className="h-10 rounded-xl"
               />
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label className="text-slate-700 font-bold text-xs uppercase tracking-wider">Type</Label>
                 <Select value={ticketData.type} onValueChange={(v) => setTicketData({...ticketData, type: v})}>
                   <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Select type" /></SelectTrigger>
                   <SelectContent className="rounded-xl">
                     <SelectItem value="Complaint">Complaint</SelectItem>
                     <SelectItem value="Billing">Billing</SelectItem>
                     <SelectItem value="Technical">Technical</SelectItem>
                     <SelectItem value="General Inquiry">General Inquiry</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                 <Label className="text-slate-700 font-bold text-xs uppercase tracking-wider">Priority</Label>
                 <Select value={ticketData.priority} onValueChange={(v) => setTicketData({...ticketData, priority: v})}>
                   <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Select priority" /></SelectTrigger>
                   <SelectContent className="rounded-xl">
                     <SelectItem value="low">Low</SelectItem>
                     <SelectItem value="medium">Medium</SelectItem>
                     <SelectItem value="high">High</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
             </div>
             <div className="space-y-2">
               <Label className="text-slate-700 font-bold text-xs uppercase tracking-wider">Description</Label>
               <Textarea 
                 placeholder="Provide a detailed description of the issue..." 
                 rows={4} 
                 value={ticketData.description}
                 onChange={(e) => setTicketData({...ticketData, description: e.target.value})}
                 className="rounded-xl resize-none"
               />
             </div>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setIsTicketDialogOpen(false)} className="rounded-xl">Cancel</Button>
             <Button onClick={handleCreateTicket} className="rounded-xl bg-blue-600 hover:bg-blue-700">Submit Ticket</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

       {/* Refund Dialog */}
       <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
         <DialogContent className="sm:max-w-md rounded-2xl">
           <DialogHeader>
             <DialogTitle className="text-xl text-slate-800">Process Refund</DialogTitle>
             <DialogDescription className="text-slate-500">
               Calculate and process a partial or full refund for booking <strong className="text-slate-700">{refundRide?.bookingId}</strong>
             </DialogDescription>
           </DialogHeader>
           <div className="grid gap-5 py-4">
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-600 uppercase tracking-wider">Total Billed</span>
                <span className="text-xl font-bold text-slate-800">₹ {(refundRide?.originalBooking?.grandTotal || refundRide?.originalBooking?.estimatedFare || 0).toFixed(2)}</span>
             </div>
             <div className="space-y-3">
               <Label className="text-slate-700 font-bold text-xs uppercase tracking-wider">Refund Amount (₹)</Label>
               <Input 
                 type="number"
                 placeholder="0.00" 
                 value={refundAmount || ""}
                 onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                 className="h-12 text-lg font-bold rounded-xl"
               />
               <div className="flex gap-2">
                 <Badge variant="outline" className="cursor-pointer hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors px-3 py-1.5 rounded-lg" onClick={() => setRefundAmount((refundRide?.originalBooking?.grandTotal || refundRide?.originalBooking?.estimatedFare || 0) * 0.25)}>25%</Badge>
                 <Badge variant="outline" className="cursor-pointer hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors px-3 py-1.5 rounded-lg" onClick={() => setRefundAmount((refundRide?.originalBooking?.grandTotal || refundRide?.originalBooking?.estimatedFare || 0) * 0.5)}>50%</Badge>
                 <Badge variant="outline" className="cursor-pointer hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors px-3 py-1.5 rounded-lg" onClick={() => setRefundAmount((refundRide?.originalBooking?.grandTotal || refundRide?.originalBooking?.estimatedFare || 0))}>100% (Full)</Badge>
               </div>
             </div>
             <div className="space-y-2">
               <Label className="text-slate-700 font-bold text-xs uppercase tracking-wider">Reason for Refund</Label>
               <Select value={refundReason} onValueChange={setRefundReason}>
                 <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Select reason" /></SelectTrigger>
                 <SelectContent className="rounded-xl">
                   <SelectItem value="Driver Late">Driver Late</SelectItem>
                   <SelectItem value="Car Condition">Car Condition Issue</SelectItem>
                   <SelectItem value="AC Not Working">AC Not Working</SelectItem>
                   <SelectItem value="Overcharged">Overcharged / Route Deviation</SelectItem>
                   <SelectItem value="Other">Other Customer Satisfaction</SelectItem>
                 </SelectContent>
               </Select>
             </div>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setIsRefundDialogOpen(false)} className="rounded-xl">Cancel</Button>
             <Button variant="destructive" className="rounded-xl bg-red-600 hover:bg-red-700" onClick={() => { if (!refundAmount || refundAmount <= 0) { toast.error("Please enter a valid refund amount"); return; } if (!refundReason) { toast.error("Please select a reason for the refund"); return; } toast.success(`Refund of ₹${refundAmount.toFixed(2)} processed successfully for ${refundReason}`); setIsRefundDialogOpen(false); setRefundRide(null); }}>
               Process Refund
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

       {/* Manual Adjustment Dialog */}
       <Dialog open={isManualAdjDialogOpen} onOpenChange={setIsManualAdjDialogOpen}>
         <DialogContent className="sm:max-w-md rounded-2xl">
           <DialogHeader>
             <DialogTitle className="text-xl text-slate-800">Manual Fare Adjustment</DialogTitle>
             <DialogDescription className="text-slate-500">
               Edit extra charges for booking <strong className="text-slate-700">{manualAdjRide?.bookingId}</strong>
             </DialogDescription>
           </DialogHeader>
           <div className="grid gap-5 py-4">
             <div className="space-y-3">
               <Label className="text-slate-700 font-bold text-xs uppercase tracking-wider">Toll Charges (₹)</Label>
               <Input 
                 type="number"
                 placeholder="0.00" 
                 value={manualAdjData.tollCharges === 0 ? "" : manualAdjData.tollCharges}
                 onChange={(e) => setManualAdjData({...manualAdjData, tollCharges: parseFloat(e.target.value) || 0})}
                 className="h-12 text-lg font-bold rounded-xl"
               />
             </div>
             <div className="space-y-3">
               <Label className="text-slate-700 font-bold text-xs uppercase tracking-wider">Parking Charges (₹)</Label>
               <Input 
                 type="number"
                 placeholder="0.00" 
                 value={manualAdjData.parkingCharges === 0 ? "" : manualAdjData.parkingCharges}
                 onChange={(e) => setManualAdjData({...manualAdjData, parkingCharges: parseFloat(e.target.value) || 0})}
                 className="h-12 text-lg font-bold rounded-xl"
               />
             </div>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setIsManualAdjDialogOpen(false)} className="rounded-xl">Cancel</Button>
             <Button variant="default" className="rounded-xl bg-blue-600 hover:bg-blue-700" onClick={() => { 
                 if (manualAdjRide && manualAdjRide.originalBooking) {
                     const extra = manualAdjData.tollCharges + manualAdjData.parkingCharges;
                     const newGrandTotal = (manualAdjRide.originalBooking.estimatedFare || 0) + extra + (manualAdjRide.originalBooking.gstAmount || 0) - (manualAdjRide.originalBooking.promoDiscount || 0);
                     updateBooking(manualAdjRide.originalBooking.id, { tollCharges: manualAdjData.tollCharges, parkingCharges: manualAdjData.parkingCharges, grandTotal: newGrandTotal });
                     toast.success("Charges updated successfully!");
                 }
                 setIsManualAdjDialogOpen(false); 
                 setManualAdjRide(null); 
             }}>Update Charges</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
      </div>

      <FreeDriversSidebar freeDrivers={freeDrivers} />
    </div>
  );
}
