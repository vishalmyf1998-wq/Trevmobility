"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MapPin, RefreshCw, Zap, Leaf, Clock, Phone, ChevronDown, BatteryCharging, ChevronUp, AlertCircle, AlertTriangle, PhoneCall, ShieldAlert, History, Map, ClipboardList, Banknote, Download, FileText, Edit3, XCircle, CheckCircle, Gauge, User, Headset, Car, Wallet, Copy, MessageCircle, MoreHorizontal, ThumbsUp, ThumbsDown, Target, Tag, Save, Printer, Trash2, Plane, Train, GitCompare, Paperclip, FileImage, Plus } from 'lucide-react';
import { useAdmin } from "@/lib/admin-context";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardHeader } from "./components/DashboardHeader";
import { FreeDriversSidebar } from "./components/FreeDriversSidebar";
import { PrintableDutySlip } from "@/components/DutySlipPrint";
import { PrintableInvoice } from "@/components/InvoicePrint";
import { CityBadge } from "@/components/city-badge";
import { cityIdToScope, resolveFleetScope, scopeToCityId, matchesCityScope } from "@/lib/city-scope";

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

function getSmartFleetSuggestion(booking: any, hubs: any[], cities: any[]) {
  if (booking.tripType !== 'outstation') return null;

  const pickupCity = cities.find((city) => city.id === booking.cityId);
  const pickupPoint = getEstimatedPickupPoint(booking) ||
    (pickupCity?.latitude && pickupCity?.longitude
      ? { latitude: pickupCity.latitude, longitude: pickupCity.longitude }
      : null);
  if (!pickupPoint) return null;

  const getFleetEta = (scope: 'ncr' | 'jpr') => {
    const distances = hubs
      .filter((hub) => resolveFleetScope({ cityId: hub.cityId }) === scope)
      .map((hub) => distanceKm(hub, pickupPoint))
      .filter((distance): distance is number => distance !== null);
    if (!distances.length) return null;
    return Math.max(1, Math.round((Math.min(...distances) / 45) * 60));
  };

  const ncrEta = getFleetEta('ncr');
  const jprEta = getFleetEta('jpr');
  if (ncrEta === null || jprEta === null || ncrEta === jprEta) return null;

  const preferredCity: 'ncr' | 'jpr' = ncrEta < jprEta ? 'ncr' : 'jpr';
  return {
    preferredCity,
    preferredLabel: preferredCity === 'ncr' ? 'Delhi-NCR' : 'Jaipur',
    minutesCloser: Math.abs(ncrEta - jprEta),
    ncrEta,
    jprEta,
  };
}

// Ray-casting algorithm for Point in Polygon
function isPointInPolygon(point: { lat: number; lng: number }, polygon: { lat: number; lng: number }[]) {
  let isInside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat, yi = polygon[i].lng;
    const xj = polygon[j].lat, yj = polygon[j].lng;
    const intersect = ((yi > point.lng) !== (yj > point.lng)) && (point.lat < (xj - xi) * (point.lng - yi) / (yj - yi) + xi);
    if (intersect) isInside = !isInside;
  }
  return isInside;
}

function getEstimatedPickupPoint(ride: any): { latitude: number; longitude: number } | null {
  const booking = ride.originalBooking || ride;
  if (booking.pickupLatitude && booking.pickupLongitude) {
    return { latitude: booking.pickupLatitude, longitude: booking.pickupLongitude };
  }
  // If coordinates are missing, do NOT show a Mumbai-based fake point.
  // This prevents Delhi/NCR bookings from appearing at Mumbai.
  return null;
}

function getEstimatedDropPoint(ride: any): { latitude: number; longitude: number } | null {
  const booking = ride.originalBooking || ride;
  if (booking.dropLatitude && booking.dropLongitude) {
    return { latitude: booking.dropLatitude, longitude: booking.dropLongitude };
  }
  // If coordinates are missing, do NOT show a Mumbai-based fake point.
  return null;
}

function getEstimatedStopPoints(ride: any) {
  const booking = ride.originalBooking || ride;
  let stops = Array.isArray(booking.stops) ? [...booking.stops] : [];

  // Agar rental ride hai aur actual stops nahi hain, toh dummy stops add karo map pe dikhane ke liye
  if (stops.length === 0 && booking.tripType === 'rental') {
    stops = [
      { address: 'Meeting Point (Stop 1)' },
      { address: 'Site Visit (Stop 2)' },
      { address: 'Lunch (Stop 3)' }
    ];
  }

  return stops.map((stop: any, index: number) => {
    if (stop.latitude && stop.longitude) {
      return {
        latitude: stop.latitude,
        longitude: stop.longitude,
        label: stop.location || stop.address || `Stop ${index + 1}`,
        status: stop.status,
      };
    }

    const seed = `${booking.id || ""}${stop.id || index}${stop.location || stop.address || "stop"}`;
    return {
      latitude: 19.076 + hashToOffset(seed, 0.12),
      longitude: 72.8777 + hashToOffset(seed.split("").reverse().join(""), 0.12),
      label: stop.location || stop.address || `Stop ${index + 1}`,
      status: stop.status,
    };
  });
}

const DriverSearchDropdown = ({ ride }: { ride: any }) => {
    const { drivers, cars, carLocations, updateBooking, getAirportTerminal, getRailwayStationTerminal, hubs } = useAdmin();
    const [search, setSearch] = useState("");
    
    let pickupPoint = getEstimatedPickupPoint(ride);
    if (ride.originalBooking?.tripType === 'airport_pickup' && ride.originalBooking?.airportId && ride.originalBooking?.airportTerminalId) {
        const terminal = getAirportTerminal(ride.originalBooking.airportId, ride.originalBooking.airportTerminalId);
        if (terminal?.latitude && terminal?.longitude) pickupPoint = { latitude: terminal.latitude, longitude: terminal.longitude };
    } else if (ride.originalBooking?.tripType === 'railway_pickup' && ride.originalBooking?.railwayStationId && ride.originalBooking?.railwayStationTerminalId) {
        const terminal = getRailwayStationTerminal(ride.originalBooking.railwayStationId, ride.originalBooking.railwayStationTerminalId);
        if (terminal?.latitude && terminal?.longitude) pickupPoint = { latitude: terminal.latitude, longitude: terminal.longitude };
    }

    const availableDrivers = drivers
      .filter((d: any) =>
        d.status === 'active' &&
        resolveFleetScope(d, hubs) === resolveFleetScope(ride.originalBooking, hubs)
      )
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
                    <div key={d.id} className="flex items-center justify-between gap-3 p-2 hover:bg-slate-50 cursor-pointer rounded-md border-b border-slate-100 last:border-0" onClick={() => { updateBooking(ride.originalBooking.id, { driverId: d.id, carId: d.assignedCarId || d.car?.id || ride.originalBooking.carId, status: 'assigned' }); toast.success("Driver assigned!"); }}>
                        <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-slate-800">{d.name}</p>
                              {d.suggestion.eta <= 12 && <Badge className="h-4 bg-green-100 text-green-700 border-none px-1.5 text-[9px]">Best</Badge>}
                            </div>
                            <p className="text-[10px] text-slate-500">{d.phone} • {d.car ? `${d.car.category || ''} ${d.car.make || ''} ${d.car.model || ''}`.trim() : 'No Car'} • ⭐ {d.rating || '4.8'} • 08:00 - 18:00</p>
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

function getDelayInfo(ride: any, metrics: any) {
  const status = ride.status || 'pending';
  if (!ride.pickupDate || !ride.pickupTime) return null;

  const pickupDateTimeMs = new Date(`${ride.pickupDate}T${ride.pickupTime}`).getTime();
  if (isNaN(pickupDateTimeMs)) return null;

  const nowMs = Date.now();
  const minsToPickup = Math.floor((pickupDateTimeMs - nowMs) / 60000);
  const etaMins = metrics?.eta || 0;

  // 1. Delayed Drop (Ride is ongoing, taking too long)
  if (status === 'picked_up' && nowMs > pickupDateTimeMs + 120 * 60000) {
    return { type: 'delayed_drop', label: 'Late Drop', reason: 'Trip taking longer than expected', color: 'indigo' };
  }

  // 2. Late Pickup (Driver dispatched/arrived but missed pickup time)
  if (['dispatched', 'arrived'].includes(status) && minsToPickup < 0) {
    return { type: 'delayed_pickup', label: 'Late Pickup', reason: `Missed pickup by ${Math.abs(minsToPickup)}m`, color: 'red' };
  }

  // 3. Delayed Dispatch (Assigned but not dispatched, and it's getting close to pickup, e.g., < 30 mins)
  if (status === 'assigned' && minsToPickup < 30) {
    return { type: 'delayed_dispatch', label: 'Late Dispatch', reason: `Pickup in ${Math.max(0, minsToPickup)}m, driver inactive`, color: 'fuchsia' };
  }

  // 4. Deadrun Issue (Assigned/Dispatched, but ETA is greater than time left to pickup)
  if (['assigned', 'dispatched'].includes(status) && etaMins > minsToPickup + 5 && minsToPickup > 0) {
    return { type: 'too_far', label: 'Deadrun Issue', reason: `ETA ${etaMins}m > Time left ${minsToPickup}m`, color: 'amber' };
  }

  // 5. Late Assignment (Unassigned, and time to pickup is very short, e.g., < 45 mins)
  if (!ride.driverId && ['pending', 'confirmed'].includes(status) && minsToPickup < 45) {
    return { type: 'late_assignment', label: 'Late Assignment', reason: `Unassigned, pickup in ${Math.max(0, minsToPickup)}m`, color: 'rose' };
  }

  // Catch-all generic delay
  if (minsToPickup < 0 && ['pending', 'confirmed', 'assigned'].includes(status)) {
    return { type: 'delayed_general', label: 'Delayed', reason: `Running late by ${Math.abs(minsToPickup)}m`, color: 'red' };
  }

  return null;
}

// Dynamic tailwind styles for specific delay colors
const delayStyles: Record<string, { normal: string, expanded: string, badge: string, borderNormal: string, borderExpanded: string }> = {
  rose: {
    normal: 'border-rose-500/40 bg-rose-50/60 backdrop-blur-2xl shadow-[0_8px_32px_-12px_rgba(244,63,94,0.2)] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-12px_rgba(244,63,94,0.3)] transition-all duration-500 ease-out z-10',
    expanded: 'border-rose-500/70 ring-4 ring-rose-500/20 bg-rose-50/80 backdrop-blur-3xl shadow-[0_16px_60px_-16px_rgba(244,63,94,0.4)] scale-[1.01] transition-all duration-500 ease-out z-30',
    badge: 'bg-rose-50 border-rose-200 text-rose-700',
    borderNormal: 'border-rose-500/30 bg-rose-50/40 backdrop-blur-2xl shadow-[0_8px_32px_-12px_rgba(244,63,94,0.15)] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-12px_rgba(244,63,94,0.25)] transition-all duration-500 ease-out z-10',
    borderExpanded: 'border-rose-500/60 ring-4 ring-rose-500/15 bg-rose-50/60 backdrop-blur-3xl shadow-[0_16px_60px_-16px_rgba(244,63,94,0.35)] scale-[1.01] transition-all duration-500 ease-out z-30'
  },
  amber: {
    normal: 'border-amber-500/40 bg-amber-50/60 backdrop-blur-2xl shadow-[0_8px_32px_-12px_rgba(245,158,11,0.2)] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-12px_rgba(245,158,11,0.3)] transition-all duration-500 ease-out z-10',
    expanded: 'border-amber-500/70 ring-4 ring-amber-500/20 bg-amber-50/80 backdrop-blur-3xl shadow-[0_16px_60px_-16px_rgba(245,158,11,0.4)] scale-[1.01] transition-all duration-500 ease-out z-30',
    badge: 'bg-amber-50 border-amber-200 text-amber-700',
    borderNormal: 'border-amber-500/30 bg-amber-50/40 backdrop-blur-2xl shadow-[0_8px_32px_-12px_rgba(245,158,11,0.15)] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-12px_rgba(245,158,11,0.25)] transition-all duration-500 ease-out z-10',
    borderExpanded: 'border-amber-500/60 ring-4 ring-amber-500/15 bg-amber-50/60 backdrop-blur-3xl shadow-[0_16px_60px_-16px_rgba(245,158,11,0.35)] scale-[1.01] transition-all duration-500 ease-out z-30'
  },
  fuchsia: {
    normal: 'border-fuchsia-500/40 bg-fuchsia-50/60 backdrop-blur-2xl shadow-[0_8px_32px_-12px_rgba(217,70,239,0.2)] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-12px_rgba(217,70,239,0.3)] transition-all duration-500 ease-out z-10',
    expanded: 'border-fuchsia-500/70 ring-4 ring-fuchsia-500/20 bg-fuchsia-50/80 backdrop-blur-3xl shadow-[0_16px_60px_-16px_rgba(217,70,239,0.4)] scale-[1.01] transition-all duration-500 ease-out z-30',
    badge: 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700',
    borderNormal: 'border-fuchsia-500/30 bg-fuchsia-50/40 backdrop-blur-2xl shadow-[0_8px_32px_-12px_rgba(217,70,239,0.15)] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-12px_rgba(217,70,239,0.25)] transition-all duration-500 ease-out z-10',
    borderExpanded: 'border-fuchsia-500/60 ring-4 ring-fuchsia-500/15 bg-fuchsia-50/60 backdrop-blur-3xl shadow-[0_16px_60px_-16px_rgba(217,70,239,0.35)] scale-[1.01] transition-all duration-500 ease-out z-30'
  },
  red: {
    normal: 'border-red-500/40 bg-red-50/60 backdrop-blur-2xl shadow-[0_8px_32px_-12px_rgba(239,68,68,0.2)] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-12px_rgba(239,68,68,0.3)] transition-all duration-500 ease-out z-10',
    expanded: 'border-red-500/70 ring-4 ring-red-500/20 bg-red-50/80 backdrop-blur-3xl shadow-[0_16px_60px_-16px_rgba(239,68,68,0.4)] scale-[1.01] transition-all duration-500 ease-out z-30',
    badge: 'bg-red-50 border-red-200 text-red-700',
    borderNormal: 'border-red-500/30 bg-red-50/40 backdrop-blur-2xl shadow-[0_8px_32px_-12px_rgba(239,68,68,0.15)] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-12px_rgba(239,68,68,0.25)] transition-all duration-500 ease-out z-10',
    borderExpanded: 'border-red-500/60 ring-4 ring-red-500/15 bg-red-50/60 backdrop-blur-3xl shadow-[0_16px_60px_-16px_rgba(239,68,68,0.35)] scale-[1.01] transition-all duration-500 ease-out z-30'
  },
  indigo: {
    normal: 'border-indigo-500/40 bg-indigo-50/60 backdrop-blur-2xl shadow-[0_8px_32px_-12px_rgba(99,102,241,0.2)] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-12px_rgba(99,102,241,0.3)] transition-all duration-500 ease-out z-10',
    expanded: 'border-indigo-500/70 ring-4 ring-indigo-500/20 bg-indigo-50/80 backdrop-blur-3xl shadow-[0_16px_60px_-16px_rgba(99,102,241,0.4)] scale-[1.01] transition-all duration-500 ease-out z-30',
    badge: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    borderNormal: 'border-indigo-500/30 bg-indigo-50/40 backdrop-blur-2xl shadow-[0_8px_32px_-12px_rgba(99,102,241,0.15)] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-12px_rgba(99,102,241,0.25)] transition-all duration-500 ease-out z-10',
    borderExpanded: 'border-indigo-500/60 ring-4 ring-indigo-500/15 bg-indigo-50/60 backdrop-blur-3xl shadow-[0_16px_60px_-16px_rgba(99,102,241,0.35)] scale-[1.01] transition-all duration-500 ease-out z-30'
  }
};

const eventSyncStatusStyles = {
  success: {
    dot: 'bg-green-500',
    badge: 'bg-green-50 text-green-700 border-green-200',
    icon: CheckCircle,
    label: 'Success',
  },
  failed: {
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-700 border-red-200',
    icon: XCircle,
    label: 'Failed',
  },
  pending: {
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Clock,
    label: 'Pending',
  },
};

function getEventSyncStatus(ride: any, eventType: 'assigned' | 'dispatched' | 'arrived' | 'picked_up' | 'dropped' | 'support') {
  const status = ride.originalBooking?.status || ride.status;
  const hasDriver = Boolean(ride.originalBooking?.driverId);
  const orderedStatuses = ['pending', 'confirmed', 'assigned', 'dispatched', 'arrived', 'picked_up', 'dropped', 'closed'];
  const eventIndex = orderedStatuses.indexOf(eventType);
  const statusIndex = orderedStatuses.indexOf(status);
  const eventReached = eventType === 'support' || statusIndex >= eventIndex || status === 'closed';

  if (eventType === 'assigned' && !hasDriver) {
    return {
      push: { status: 'pending' as const, message: 'Driver assignment event not pushed yet' },
      receive: { status: 'pending' as const, message: 'Driver app acknowledgement waiting' },
    };
  }

  if (!eventReached) {
    return {
      push: { status: 'pending' as const, message: 'Event waiting in queue' },
      receive: { status: 'pending' as const, message: 'Receiver acknowledgement not due' },
    };
  }

  if (eventType === 'arrived' && ride.delayInfo?.type === 'delayed_pickup') {
    return {
      push: { status: 'success' as const, message: 'Event pushed to operations bus' },
      receive: { status: 'failed' as const, message: 'Late pickup acknowledgement breached SLA' },
    };
  }

  return {
    push: { status: 'success' as const, message: eventType === 'support' ? 'Ticket event pushed to support queue' : 'Event pushed to operations bus' },
    receive: { status: 'success' as const, message: eventType === 'support' ? 'Support queue acknowledged' : 'Driver/admin app acknowledged' },
  };
}

function EventSyncLog({ ride, eventType, compact = false }: { ride: any; eventType: 'assigned' | 'dispatched' | 'arrived' | 'picked_up' | 'dropped' | 'support'; compact?: boolean }) {
  const sync = getEventSyncStatus(ride, eventType);
  const rows = [
    { label: 'P', ...sync.push },
    { label: 'R', ...sync.receive },
  ];

  return (
    <div className={`mt-1 flex flex-wrap ${compact ? 'gap-1' : 'gap-1.5'}`}>
      {rows.map((row) => {
        const style = eventSyncStatusStyles[row.status];
        const Icon = style.icon;
        const label = row.status === 'success' ? 'Pass' : style.label;
        return (
          <Badge key={row.label} variant="outline" className={`h-5 rounded-md px-1.5 py-0 text-[9px] font-bold uppercase tracking-wide ${style.badge}`}>
            <Icon className="mr-1 h-2.5 w-2.5" />
            {row.label}: {label}
          </Badge>
        );
      })}
    </div>
  );
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
    cars,
    gstConfig,
    dutySlips = [],
    invoices = [],
    getCity,
    getB2BEmployee,
    addBooking,
    deleteBooking,
    b2bClients = [],
    cities = [],
    hubs = [],
    carCategories = [],
    tollLocations = [],
    getAirportTerminal,
    getRailwayStationTerminal,
    selectedCity,
    setSelectedCity,
    dispatchCenters = []
  } = useAdmin();

  const [expandedRideId, setExpandedRideId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'delayed' | 'unassigned' | 'dispatched' | 'arrived' | 'pickup' | 'dropped' | 'closed' | 'cancelled' | 'gps_off' | 'priority' | 'low_soc' | 'login_delay'>('all');
  const cityFilter = selectedCity;
  const [hubFilter, setHubFilter] = useState('all');
  const [delaySubFilter, setDelaySubFilter] = useState('all');
  const [ongoingSubFilter, setOngoingSubFilter] = useState('all');
  const [prioritySubFilter, setPrioritySubFilter] = useState('all');
  const [isSimulating, setIsSimulating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isAutoAllocateOn, setIsAutoAllocateOn] = useState(false);
  const [autoAllocationRadius, setAutoAllocationRadius] = useState(15);
  const [autoAllocationDelay, setAutoAllocationDelay] = useState(10); // 10 seconds default hold delay
  const [minSocThreshold, setMinSocThreshold] = useState(20); // 20% default min SOC
  const [hoveredDriverId, setHoveredDriverId] = useState<string | null>(null);
  const [assigningRideId, setAssigningRideId] = useState<string | null>(null);
  const [lastAllocationTime, setLastAllocationTime] = useState<Date | null>(null);
  const [nextAllocationTime, setNextAllocationTime] = useState<Date | null>(null);

  const [liveMetrics, setLiveMetrics] = useState<Record<string, { distance: number; eta: number; soc: number; actualEta: number }>>({});
  const stateRef = useRef({ bookings, carLocations, drivers, cars, tollLocations, gstConfig });
  const appliedTollsRef = useRef<Record<string, string[]>>({});

  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [ticketRide, setTicketRide] = useState<any>(null);
  const [ticketData, setTicketData] = useState({ subject: "", type: "Complaint", priority: "medium", description: "" });
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [refundRide, setRefundRide] = useState<any>(null);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState("");
  const [replayState, setReplayState] = useState<Record<string, any>>({});

  const handleCityFilterChange = useCallback((value: string) => {
    setHubFilter('all');
    setSelectedCity(value);
  }, [setSelectedCity]);

  // Manual Adjustment State
  const [isManualAdjDialogOpen, setIsManualAdjDialogOpen] = useState(false);
  const [manualAdjRide, setManualAdjRide] = useState<any>(null);
  const [manualAdjData, setManualAdjData] = useState({ tollCharges: 0, parkingCharges: 0 });

  // Cancel Booking State
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelRideTarget, setCancelRideTarget] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Edit Booking State
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editRideTarget, setEditRideTarget] = useState<any>(null);
  const [editRideData, setEditRideData] = useState({ 
    pickupDate: '', pickupTime: '', remarks: ''
  });

  // Manual Event State
  const [isManualEventDialogOpen, setIsManualEventDialogOpen] = useState(false);
  const [manualEventTarget, setManualEventTarget] = useState<any>(null);
  const [manualEventStatus, setManualEventStatus] = useState("");

  // Duty Slip & Invoice Dialogs
  const [isDutySlipDialogOpen, setIsDutySlipDialogOpen] = useState(false);
  const [dutySlipRide, setDutySlipRide] = useState<any>(null);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [invoiceRide, setInvoiceRide] = useState<any>(null);

  // Variations State
  const [isVariationDialogOpen, setIsVariationDialogOpen] = useState(false);
  const [variationRideTarget, setVariationRideTarget] = useState<any>(null);

  // Documents State
  const [isDocsDialogOpen, setIsDocsDialogOpen] = useState(false);
  const [docsRideTarget, setDocsRideTarget] = useState<any>(null);

  useEffect(() => {
    stateRef.current = { bookings, carLocations, drivers, cars, tollLocations, gstConfig };
  }, [bookings, carLocations, drivers, cars, tollLocations, gstConfig]);

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
        const newLat = baseLat + (Math.random() - 0.2) * 0.003 * (newSpeed / 40);
        const newLng = baseLng + (Math.random() - 0.2) * 0.003 * (newSpeed / 40);

        updateCarLocation(trip.carId, {
          latitude: newLat,
          longitude: newLng,
          heading: (loc?.heading || 90) + (Math.random() * 20 - 10),
          speed: newSpeed,
          lastUpdated: new Date().toISOString(),
        });
        
        // Auto-Toll Logic: Check if car coordinates fall inside any toll polygon
        const { tollLocations: currentTolls, gstConfig: currentGst } = stateRef.current;
        currentTolls?.filter((t: any) => t.isActive && t.coordinates?.length >= 3).forEach((toll: any) => {
            if (isPointInPolygon({ lat: newLat, lng: newLng }, toll.coordinates)) {
                if (!appliedTollsRef.current[trip.id]?.includes(toll.id)) {
                    if (!appliedTollsRef.current[trip.id]) appliedTollsRef.current[trip.id] = [];
                    appliedTollsRef.current[trip.id].push(toll.id);

                    const currentTollCharges = trip.tollCharges || 0;
                    const newTollCharges = currentTollCharges + toll.amount;
                    
                    const taxable = Math.max(0, (trip.estimatedFare || 0) + newTollCharges + (trip.parkingCharges || 0) - (trip.promoDiscount || 0));
                    const gstRate = currentGst ? currentGst.cgstRate + currentGst.sgstRate : 5;
                    const newGst = (taxable * gstRate) / 100;
                    const newGrandTotal = taxable + newGst;

                    updateBooking(trip.id, { 
                        tollCharges: newTollCharges,
                        gstAmount: newGst,
                        grandTotal: newGrandTotal 
                    });
                    toast.info(`📍 Auto-Toll: ₹${toll.amount} (${toll.name}) applied to ${trip.bookingNumber}`);
                }
            }
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
    }, 1000);

    return () => clearInterval(interval);
  }, [isSimulating, updateCarLocation]);

  // ==========================================
  // AUTO-ALLOCATION ENGINE
  // ==========================================
  useEffect(() => {
    // Agar auto-allocation band hai to return kar jao
    if (!isAutoAllocateOn) return;

    // Start an interval engine to tick every 2 seconds
    const interval = setInterval(() => {
      const { bookings: currentBookings, carLocations: currentLocations, drivers: currentDrivers, cars: currentCars } = stateRef.current;

      // 1. Find bookings with no drivers assigned that have passed the delay buffer
      const unassignedBookings = currentBookings
        .filter((b: any) => {
          if (b.driverId || !['pending', 'confirmed'].includes(b.status)) return false;
          // Calculate booking age in seconds
          const createdAt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          const ageSecs = (Date.now() - createdAt) / 1000;
          return ageSecs >= autoAllocationDelay;
        })
        .sort((a: any, b: any) => {
          const isAB2B = !!a.b2bClientId;
          const isBB2B = !!b.b2bClientId;
          if (isAB2B && !isBB2B) return -1; // Prioritize B2B
          if (!isAB2B && isBB2B) return 1;
          // For same-type bookings, prioritize earlier pickup times
          const timeA = new Date(`${a.pickupDate}T${a.pickupTime}`).getTime();
          const timeB = new Date(`${b.pickupDate}T${b.pickupTime}`).getTime();
          return timeA - timeB;
        });

      if (unassignedBookings.length === 0) return;

      // 2. Find drivers currently busy with rides
      const busyDriverIds = currentBookings.filter((b: any) => ['assigned', 'dispatched', 'arrived', 'picked_up'].includes(b.status) && b.driverId).map((b: any) => b.driverId);
      
      // 3. Find active (logged in) drivers who are completely free
      const availableDrivers = currentDrivers
        .filter((d: any) =>
          d.status === 'active' &&
          !busyDriverIds.includes(d.id)
        )
        .map((driver: any) => {
          // NOTE: In a real app, SOC would come from live car telematics data.
          // Here we are mocking it for demonstration.
          const car = currentCars.find((c: any) => c.assignedDriverId === driver.id || c.id === driver.assignedCarId);
          return {
            ...driver,
            // Use car's SOC if available, otherwise mock it.
            soc: (car as any)?.soc || Math.floor(15 + Math.random() * 85)
          };
        })
        .filter((driver: any) => driver.soc >= minSocThreshold);

      if (availableDrivers.length === 0) return;

      unassignedBookings.forEach((booking: any) => {
        const pickupPoint = getEstimatedPickupPoint(booking);
        let nearestDriver: any = null;
        let minDistance = Infinity;

        availableDrivers.forEach((driver: any) => {
          // Agar is loop me driver already kisi ride ko assign ho chuka hai, to skip karein
          if (busyDriverIds.includes(driver.id)) return;
          if (resolveFleetScope(driver, hubs) !== resolveFleetScope(booking, hubs)) return;

          const car = currentCars.find((c: any) => c.assignedDriverId === driver.id || c.id === driver.assignedCarId);
          const loc = car ? currentLocations.find((l: any) => l.carId === car.id) : null;
          const dist = distanceKm(loc, pickupPoint) ?? 8; // fallback to 8km

          if (dist < minDistance) {
            minDistance = dist;
            nearestDriver = driver;
          }
        });

        // Agar nearest driver configured radius me mil jata hai to usko assign kardo
        if (nearestDriver && minDistance <= autoAllocationRadius) {
          const bookingType = booking.b2bClientId ? 'B2B' : 'B2C';
          updateBooking(booking.id, { driverId: nearestDriver.id, carId: nearestDriver.assignedCarId || nearestDriver.car?.id || booking.carId, status: 'assigned' });
          busyDriverIds.push(nearestDriver.id); // Mark driver as busy so they don't get assigned again
          toast.success(`Auto-Engine: Assigned ${nearestDriver.name} to ${bookingType} Booking ${booking.bookingNumber}`);
        }
      });
    }, 2000); // Engine ticks every 2 seconds

    return () => clearInterval(interval);
  }, [isAutoAllocateOn, autoAllocationDelay, autoAllocationRadius, minSocThreshold, updateBooking, hubs]);

  const handleAssignDriverFromMap = (driverId: string, carId: string) => {
    if (!assigningRideId) {
      toast.error("No ride selected for assignment.");
      return;
    }
    const ride = bookings.find((b: any) => b.id === assigningRideId);
    if (!ride) {
      toast.error("Selected ride not found.");
      return;
    }
    const driver = getDriver(driverId);

    updateBooking(assigningRideId, { driverId, carId, status: 'assigned' });
    toast.success(`Assigned ${driver?.name || 'driver'} to booking ${ride.bookingNumber} from map!`);
    
    setExpandedRideId(null);
    setAssigningRideId(null);
  };

  const checkIsDelayed = (b: any) => {
    return !!getDelayInfo(b, liveMetrics[b.id]);
  };

  const isGpsOff = useCallback((b: any) => {
    if (!['dispatched', 'arrived', 'picked_up'].includes(b.status)) return false;
    const car = b.carId ? getCar(b.carId) : null;
    const carLoc = car ? carLocations.find((l: any) => l.carId === car.id) : null;
    if (!carLoc || !carLoc.lastUpdated) return true;
    
    const lastUpdateMs = new Date(carLoc.lastUpdated).getTime();
    const nowMs = Date.now();
    return (nowMs - lastUpdateMs) > 5 * 60 * 1000; // 5 mins
  }, [getCar, carLocations]);

  const isPriority = useCallback((b: any) => {
    const isAirportDrop = b.dropLocation?.toLowerCase().includes('airport');
    const hasPriorityTag = b.tags?.some((t: string) => t.toLowerCase().includes('priority'));
    const isCorp = !!b.b2bClientId;
    const isHighValue = (b.estimatedFare || b.grandTotal || 0) > 3000;
    return isAirportDrop || hasPriorityTag || isCorp || isHighValue;
  }, []);

  const delayedCount = useMemo(() => bookings.filter((b: any) => checkIsDelayed(b)).length, [bookings, liveMetrics]);
  const unassignedCount = useMemo(() => bookings.filter((b: any) => !b.driverId && ['confirmed', 'assigned'].includes(b.status)).length, [bookings]);
  const dispatchedCount = useMemo(() => bookings.filter((b: any) => b.status === 'dispatched').length, [bookings]);
  const arrivedCount = useMemo(() => bookings.filter((b: any) => b.status === 'arrived').length, [bookings]);
  const ongoingCount = useMemo(() => bookings.filter((b: any) => b.status === 'picked_up').length, [bookings]);
  const droppedCount = useMemo(() => bookings.filter((b: any) => b.status === 'dropped').length, [bookings]);
  const closedCount = useMemo(() => bookings.filter((b: any) => b.status === 'closed').length, [bookings]);
  const cancelledCount = useMemo(() => bookings.filter((b: any) => b.status === 'cancelled').length, [bookings]);
  const gpsOffCount = useMemo(() => bookings.filter((b: any) => isGpsOff(b)).length, [bookings, isGpsOff]);
  const priorityCount = useMemo(() => bookings.filter((b: any) => {
      const activeStatuses = ['confirmed', 'assigned', 'dispatched', 'arrived', 'picked_up', 'dropped'];
      return activeStatuses.includes(b.status) && isPriority(b);
  }).length, [bookings, isPriority]);
  const lowSocCount = useMemo(() => bookings.filter((b: any) => {
      const metrics = liveMetrics[b.id];
      return metrics && metrics.soc < 20;
  }).length, [bookings, liveMetrics]);
  const loginDelayCount = useMemo(() => drivers.filter((d: any) => {
      if (d.status === 'active' || !d.thirdPartyLoginAt) return false;
      const loginTime = new Date(d.thirdPartyLoginAt).getTime();
      const now = Date.now();
      // Driver has logged into 3rd party app, but not our app within 5 minutes
      return (now - loginTime) > 5 * 60 * 1000;
  }).length, [drivers]);


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
        statusFiltered = bookings.filter((b: any) => {
            if (b.status !== 'picked_up') return false;
            if (ongoingSubFilter === 'rental') return b.tripType === 'rental';
            if (ongoingSubFilter === 'outstation') return b.tripType === 'outstation';
            return true;
        });
        break;
      case 'dropped':
        statusFiltered = bookings.filter((b: any) => b.status === 'dropped');
        break;
      case 'closed':
        statusFiltered = bookings.filter((b: any) => b.status === 'closed');
        break;
      case 'cancelled':
        statusFiltered = bookings.filter((b: any) => b.status === 'cancelled');
        break;
      case 'gps_off':
        statusFiltered = bookings.filter((b: any) => isGpsOff(b));
        break;
      case 'priority':
        statusFiltered = bookings.filter((b: any) => {
            if (!activeStatuses.includes(b.status)) return false;
            if (prioritySubFilter === 'trev_biz') return !!b.b2bClientId;
            if (prioritySubFilter === 'airport') return b.dropLocation?.toLowerCase().includes('airport');
            if (prioritySubFilter === 'high_value') return (b.estimatedFare || b.grandTotal || 0) > 3000;
            return isPriority(b);
        });
        break;
      case 'low_soc':
        statusFiltered = bookings.filter((b: any) => {
            const metrics = liveMetrics[b.id];
            return activeStatuses.includes(b.status) && metrics && metrics.soc < 20;
        });
        break;
      case 'login_delay':
        const delayedDriverIds = drivers.filter((d: any) => {
            if (d.status === 'active' || !d.thirdPartyLoginAt) return false;
            const loginTime = new Date(d.thirdPartyLoginAt).getTime();
            const now = Date.now();
            return (now - loginTime) > 5 * 60 * 1000;
        }).map((d: any) => d.id);
        statusFiltered = bookings.filter((b: any) => b.driverId && delayedDriverIds.includes(b.driverId) && activeStatuses.includes(b.status));
        break;
      case 'delayed':
        statusFiltered = bookings.filter((b: any) => {
            const info = getDelayInfo(b, liveMetrics[b.id]);
            if (!info) return false;
            if (delaySubFilter !== 'all' && info.type !== delaySubFilter) return false;
            return true;
        });
        break;
      default:
        statusFiltered = bookings.filter((b: any) => activeStatuses.includes(b.status));
    }

    const query = searchQuery.trim().toLowerCase();
    return statusFiltered.filter((b: any) => {
      const pickupDate = b.pickupDate || "";
      const matchesCity = matchesCityScope(selectedCity, b, hubs);
      const matchesHub = hubFilter === 'all' || b.hubId === hubFilter;
      const matchesSearch = !query || [
        b.bookingNumber,
        b.id,
        b.customerName,
        b.customerPhone,
      ].some((value) => String(value || "").toLowerCase().includes(query));
      const matchesFrom = !dateFrom || pickupDate >= dateFrom;
      const matchesTo = !dateTo || pickupDate <= dateTo;
      return matchesCity && matchesHub && matchesSearch && matchesFrom && matchesTo;
    });
  }, [bookings, statusFilter, cityFilter, hubFilter, delaySubFilter, ongoingSubFilter, prioritySubFilter, liveMetrics, searchQuery, dateFrom, dateTo, isGpsOff, isPriority]);

  const sortedRides = useMemo(() => {
    const liveRides = filteredBookings.map((b: any) => {
      const driver = b.driverId ? getDriver(b.driverId) : null;
      const car = b.carId ? getCar(b.carId) : null;
      const carLoc = car ? carLocations.find((l: any) => l.carId === car.id) : null;

      const metrics = liveMetrics[b.id];
      const delayInfo = getDelayInfo(b, metrics);
      const isDelayed = !!delayInfo;
      const delayMins = metrics && b.pickupDate && b.pickupTime
        ? Math.max(0, Math.floor((Date.now() + metrics.eta * 60000 - new Date(`${b.pickupDate}T${b.pickupTime}`).getTime()) / 60000))
        : 0;

      const rawStatus = b.status;
      const isTerminal = ['closed', 'cancelled'].includes(rawStatus);
      
      const statusColor = rawStatus === 'cancelled' ? 'red' : 
                          rawStatus === 'closed' ? 'slate' : 
                          isDelayed ? 'amber' : 
                          !b.driverId ? 'orange' : 
                          rawStatus === 'picked_up' ? 'blue' : 'green';
                          
      const displayStatus = isTerminal ? formatStatus(rawStatus) : 
                            isDelayed ? 'Delayed' : 
                            !b.driverId ? 'Unassigned' : 
                            rawStatus === 'picked_up' ? 'Ongoing' : 
                            formatStatus(rawStatus);

      let formattedRideType = (b.tripType || '').replace(/_/g, ' ');
      if (b.tripType === 'rental') {
          const hrs = b.packageHours || 8;
          const kms = b.packageKm ? `${b.packageKm}km` : '';
          formattedRideType += ` • ${hrs}h ${kms}`.trim();
      } else if (b.tripType === 'outstation') {
          const outType = (b.outstationType || 'round_trip').replace('_', ' ');
          let days = b.days || 3;
          if (b.pickupDate && b.returnDate) {
            const start = new Date(b.pickupDate).getTime();
            const end = new Date(b.returnDate).getTime();
            if (!isNaN(start) && !isNaN(end) && end >= start) {
               days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
            }
          }
          formattedRideType += ` • ${days} Day${days > 1 ? 's' : ''} (${outType})`;
      }

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
          vehicleType: car ? `${(car as any).category || car.categoryId || ''} ${car.make || ''} ${car.model || ''}`.trim() : 'N/A',
        isEV: true,
        isDelayed,
        delayInfo,
        delayMins,
        status: displayStatus,
        statusColor,
        rideType: formattedRideType,
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
        const shiftRides = bookings.filter((b: any) => b.driverId === d.id && ['dropped', 'closed'].includes(b.status)).length;
        return {
            ...d,
            car,
            loc,
            shiftRides,
            soc: (car as any)?.soc || Math.floor(15 + Math.random() * 85) // Consistent mocking
        }
    });
  }, [drivers, cars, bookings, carLocations]);

  // Mock computation for Arrival punctuality based on booking IDs to keep percentages stable 
  // (In real life, this would compare b.arrivedAt with b.pickupTime)
  const arrivalMetrics = useMemo(() => {
      let green = 0;
      let yellow = 0;
      let red = 0;
      
      const relevantBookings = bookings.filter((b: any) => ['arrived', 'picked_up', 'dropped', 'closed', 'Completed'].includes(b.status));
      
      relevantBookings.forEach((b: any) => {
          const seed = b.id ? b.id.charCodeAt(0) + b.id.charCodeAt(b.id.length - 1) : 0;
          const pseudoRandom = (seed % 100) / 100;
          
          if (pseudoRandom < 0.65) {
              green++; // > 15m Early
          } else if (pseudoRandom < 0.90) {
              yellow++; // 0 - 15m Early
          } else {
              red++; // Late
          }
      });
      
      if (relevantBookings.length === 0) return { green: 68, yellow: 22, red: 10, total: 0 };
      
      const total = green + yellow + red;
      return { green: Math.round((green / total) * 100), yellow: Math.round((yellow / total) * 100), red: Math.round((red / total) * 100), total };
  }, [bookings]);

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

  const handleExotelCall = async (phoneNumber: string, type: string) => {
    try {
      toast.info(`Initiating call to ${type} (${phoneNumber})...`);
      const res = await fetch('/api/exotel/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phoneNumber, type })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success(`Call connecting! Your phone will ring shortly.`);
      } else {
        toast.error(`Call failed: ${data.error || 'Check Exotel configuration.'}`);
      }
    } catch (error) {
      toast.error("Failed to connect to call server.");
    }
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
    link.style.visibility = 'hidden';
    link.download = `active-rides-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Active rides exported");
  };

    const formatEventTime = (isoString: string) => {
      return new Date(isoString).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    }

  return (
    <div className="flex flex-col xl:flex-row h-screen bg-slate-50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100/40 via-purple-50/20 to-emerald-50/30 overflow-hidden relative">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-300/20 rounded-full blur-[120px] pointer-events-none mix-blend-multiply" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-300/20 rounded-full blur-[120px] pointer-events-none mix-blend-multiply" />
      
      <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto relative z-10 custom-scrollbar">
       <DashboardHeader
         isRefreshing={isRefreshing}
         handleRefresh={() => { setIsRefreshing(true); setTimeout(() => setIsRefreshing(false), 500); }}
         statusFilter={statusFilter}
         setStatusFilter={setStatusFilter}
         cityFilter={cityFilter}
         setCityFilter={handleCityFilterChange}
         hubFilter={hubFilter}
         setHubFilter={setHubFilter}
         cities={cities}
         hubs={hubs}
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
           cancelled: cancelledCount,
           gpsOff: gpsOffCount,
           priority: priorityCount,
           lowSoc: lowSocCount,
           loginDelay: loginDelayCount,
         }}
         searchQuery={searchQuery}
         setSearchQuery={setSearchQuery}
         lastAllocationTime={lastAllocationTime}
         nextAllocationTime={nextAllocationTime}
         isAutoAllocateOn={isAutoAllocateOn}
         arrivalMetrics={arrivalMetrics}
       />

       {statusFilter === 'delayed' && (
         <div className="flex items-center gap-2 mt-2 mb-4 overflow-x-auto pb-1 custom-scrollbar">
            <span className="text-xs font-bold text-slate-500 mr-1 uppercase tracking-wider">Delay Type:</span>
            <Badge variant={delaySubFilter === 'all' ? 'default' : 'outline'} onClick={() => setDelaySubFilter('all')} className={`cursor-pointer ${delaySubFilter === 'all' ? 'bg-slate-800' : 'bg-white hover:bg-slate-50'} shadow-sm`}>All Delays</Badge>
            <Badge variant={delaySubFilter === 'late_assignment' ? 'default' : 'outline'} onClick={() => setDelaySubFilter('late_assignment')} className={`cursor-pointer ${delaySubFilter === 'late_assignment' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'} shadow-sm`}>Late Assignment</Badge>
            <Badge variant={delaySubFilter === 'too_far' ? 'default' : 'outline'} onClick={() => setDelaySubFilter('too_far')} className={`cursor-pointer ${delaySubFilter === 'too_far' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200'} shadow-sm`}>Deadrun Issue</Badge>
            <Badge variant={delaySubFilter === 'delayed_dispatch' ? 'default' : 'outline'} onClick={() => setDelaySubFilter('delayed_dispatch')} className={`cursor-pointer ${delaySubFilter === 'delayed_dispatch' ? 'bg-fuchsia-600 text-white' : 'bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100 border-fuchsia-200'} shadow-sm`}>Late Dispatch</Badge>
            <Badge variant={delaySubFilter === 'delayed_pickup' ? 'default' : 'outline'} onClick={() => setDelaySubFilter('delayed_pickup')} className={`cursor-pointer ${delaySubFilter === 'delayed_pickup' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200'} shadow-sm`}>Late Pickup</Badge>
            <Badge variant={delaySubFilter === 'delayed_drop' ? 'default' : 'outline'} onClick={() => setDelaySubFilter('delayed_drop')} className={`cursor-pointer ${delaySubFilter === 'delayed_drop' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200'} shadow-sm`}>Late Drop</Badge>
         </div>
       )}

       {statusFilter === 'pickup' && (
         <div className="flex items-center gap-2 mt-2 mb-4 overflow-x-auto pb-1 custom-scrollbar">
            <span className="text-xs font-bold text-slate-500 mr-1 uppercase tracking-wider">Ride Type:</span>
            <Badge variant={ongoingSubFilter === 'all' ? 'default' : 'outline'} onClick={() => setOngoingSubFilter('all')} className={`cursor-pointer ${ongoingSubFilter === 'all' ? 'bg-slate-800' : 'bg-white hover:bg-slate-50'} shadow-sm`}>All In-Trip</Badge>
            <Badge variant={ongoingSubFilter === 'rental' ? 'default' : 'outline'} onClick={() => setOngoingSubFilter('rental')} className={`cursor-pointer ${ongoingSubFilter === 'rental' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'} shadow-sm`}>Rental</Badge>
            <Badge variant={ongoingSubFilter === 'outstation' ? 'default' : 'outline'} onClick={() => setOngoingSubFilter('outstation')} className={`cursor-pointer ${ongoingSubFilter === 'outstation' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'} shadow-sm`}>Outstation</Badge>
         </div>
       )}

       {statusFilter === 'priority' && (
         <div className="flex items-center gap-2 mt-2 mb-4 overflow-x-auto pb-1 custom-scrollbar">
            <span className="text-xs font-bold text-slate-500 mr-1 uppercase tracking-wider">Priority Type:</span>
            <Badge variant={prioritySubFilter === 'all' ? 'default' : 'outline'} onClick={() => setPrioritySubFilter('all')} className={`cursor-pointer ${prioritySubFilter === 'all' ? 'bg-slate-800' : 'bg-white hover:bg-slate-50'} shadow-sm`}>All Priority</Badge>
            <Badge variant={prioritySubFilter === 'trev_biz' ? 'default' : 'outline'} onClick={() => setPrioritySubFilter('trev_biz')} className={`cursor-pointer ${prioritySubFilter === 'trev_biz' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200'} shadow-sm`}>Trev Biz (Corporate)</Badge>
            <Badge variant={prioritySubFilter === 'airport' ? 'default' : 'outline'} onClick={() => setPrioritySubFilter('airport')} className={`cursor-pointer ${prioritySubFilter === 'airport' ? 'bg-teal-600 text-white' : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-200'} shadow-sm`}>Airport Drops</Badge>
            <Badge variant={prioritySubFilter === 'high_value' ? 'default' : 'outline'} onClick={() => setPrioritySubFilter('high_value')} className={`cursor-pointer ${prioritySubFilter === 'high_value' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200'} shadow-sm`}>High Value (&gt; ₹3000)</Badge>
         </div>
       )}

       {/* List of Active Rides */}
       <div className="space-y-3">
         {isRefreshing && (
            <>
              {[0, 1, 2].map((item) => (
                <div key={item} className="bg-white/40 backdrop-blur-xl rounded-[2rem] border border-white/60 p-5 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-28 bg-white/60" />
                      <Skeleton className="h-5 w-56 bg-white/60" />
                      <Skeleton className="h-3 w-72 max-w-full bg-white/60" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <Skeleton className="h-12 w-20 rounded-[1rem] bg-white/60" />
                      <Skeleton className="h-12 w-20 rounded-[1rem] bg-white/60" />
                      <Skeleton className="h-12 w-20 rounded-[1rem] bg-white/60" />
                    </div>
                  </div>
                </div>
              ))}
            </>
         )}
         {!isRefreshing && sortedRides.length === 0 && (
            <div className="text-center p-16 bg-white/40 backdrop-blur-2xl rounded-[3rem] shadow-[0_8px_32px_-12px_rgba(0,0,0,0.1)] border border-white/60 mt-4">
                <div className="mx-auto w-24 h-24 bg-white/60 rounded-full flex items-center justify-center mb-4 shadow-inner border border-white">
                  <Car className="h-10 w-10 text-slate-400" />
                </div>
                <p className="text-slate-800 font-black text-2xl tracking-tight">No active rides right now</p>
                <p className="text-slate-500 font-medium text-sm mt-2">Try adjusting your filters or date range.</p>
            </div>
         )}
         {!isRefreshing && sortedRides.map((ride) => {
            const isExpanded = expandedRideId === ride.id;
            const isDelayed = ride.status === 'Delayed';
            const isUnassigned = ride.driverName === 'Unassigned';
            const isClosed = ['closed', 'dropped'].includes(ride.originalBooking.status);
            
            const driver = ride.originalBooking.driverId ? getDriver(ride.originalBooking.driverId) : null;
            const b2bClient = ride.originalBooking.b2bClientId ? getB2BClient(ride.originalBooking.b2bClientId) : null;
            const rideTickets = supportTickets.filter((t: any) => t.bookingId === ride.originalBooking.id) || [];
            const activeTickets = rideTickets.filter((t: any) => t.status !== 'resolved');

            const currentReplay = replayState[ride.id];
            const isPostDispatch = ['dispatched', 'arrived', 'picked_up', 'dropped', 'closed', 'Completed'].includes(ride.originalBooking.status);
            const liveCarLocations = (isPostDispatch && ride.originalBooking.carId)
                ? carLocations.filter((loc: any) => loc.carId === ride.originalBooking.carId)
                : carLocations;

            const displayCarLocations = currentReplay?.active ? [{
                carId: ride.originalBooking.carId || 'mock-car',
                latitude: currentReplay.lat,
                longitude: currentReplay.lng,
                heading: (currentReplay.progress * 15) % 360,
                speed: 40 + (Math.random() * 10),
                lastUpdated: new Date().toISOString()
            }] : liveCarLocations;

            // Spatial Glassmorphism styling
            let borderNormal = 'border-white/60 bg-white/40 backdrop-blur-2xl shadow-[0_8px_32px_-12px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.2)] transition-all duration-500 ease-out z-10';
            let borderExpanded = 'border-indigo-500/50 ring-4 ring-indigo-500/10 bg-white/60 backdrop-blur-3xl shadow-[0_16px_60px_-16px_rgba(79,70,229,0.3)] scale-[1.01] transition-all duration-500 ease-out z-30';

            if (isDelayed && ride.delayInfo) {
                const style = delayStyles[ride.delayInfo.color] || delayStyles['red'];
                borderNormal = style.normal;
                borderExpanded = style.expanded;
            } else if (isDelayed) {
                borderNormal = 'border-rose-500/30 bg-rose-50/40 backdrop-blur-2xl shadow-[0_8px_32px_-12px_rgba(244,63,94,0.15)] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-12px_rgba(244,63,94,0.25)] transition-all duration-500 ease-out z-10';
                borderExpanded = 'border-rose-500/60 ring-4 ring-rose-500/15 bg-rose-50/60 backdrop-blur-3xl shadow-[0_16px_60px_-16px_rgba(244,63,94,0.35)] scale-[1.01] transition-all duration-500 ease-out z-30';
            } else if (isUnassigned) {
                borderNormal = 'border-amber-500/30 bg-amber-50/40 backdrop-blur-2xl shadow-[0_8px_32px_-12px_rgba(245,158,11,0.15)] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-12px_rgba(245,158,11,0.25)] transition-all duration-500 ease-out z-10';
                borderExpanded = 'border-amber-500/60 ring-4 ring-amber-500/15 bg-amber-50/60 backdrop-blur-3xl shadow-[0_16px_60px_-16px_rgba(245,158,11,0.35)] scale-[1.01] transition-all duration-500 ease-out z-30';
            } else if (isClosed) {
                borderNormal = 'border-white/40 opacity-70 bg-white/30 backdrop-blur-xl grayscale hover:grayscale-0 transition-all duration-500 ease-out z-10';
                borderExpanded = 'border-white/80 ring-2 ring-white/50 opacity-100 bg-white/80 grayscale-0 shadow-[0_16px_60px_-16px_rgba(0,0,0,0.15)] scale-[1.01] transition-all duration-500 ease-out z-30';
            }

            const rideMetrics = liveMetrics[ride.originalBooking.id] || { distance: 4.2, eta: 12, actualEta: 14, soc: 68 + Math.random() * 20 };
            const estRange = Math.floor((rideMetrics.soc / 100) * 250);

            let pickupPoint = getEstimatedPickupPoint(ride.originalBooking);
            let dropPoint = getEstimatedDropPoint(ride.originalBooking);

            if (ride.originalBooking.tripType === 'airport_pickup' && ride.originalBooking.airportId && ride.originalBooking.airportTerminalId) {
                const terminal = getAirportTerminal(ride.originalBooking.airportId, ride.originalBooking.airportTerminalId);
                if (terminal?.latitude && terminal?.longitude) {
                    pickupPoint = { latitude: terminal.latitude, longitude: terminal.longitude };
                }
            } else if (ride.originalBooking.tripType === 'airport_drop' && ride.originalBooking.airportId && ride.originalBooking.airportTerminalId) {
                const terminal = getAirportTerminal(ride.originalBooking.airportId, ride.originalBooking.airportTerminalId);
                if (terminal?.latitude && terminal?.longitude) {
                    dropPoint = { latitude: terminal.latitude, longitude: terminal.longitude };
                }
            } else if (ride.originalBooking.tripType === 'railway_pickup' && ride.originalBooking.railwayStationId && ride.originalBooking.railwayStationTerminalId) {
                const terminal = getRailwayStationTerminal(ride.originalBooking.railwayStationId, ride.originalBooking.railwayStationTerminalId);
                if (terminal?.latitude && terminal?.longitude) {
                    pickupPoint = { latitude: terminal.latitude, longitude: terminal.longitude };
                }
            } else if (ride.originalBooking.tripType === 'railway_drop' && ride.originalBooking.railwayStationId && ride.originalBooking.railwayStationTerminalId) {
                const terminal = getRailwayStationTerminal(ride.originalBooking.railwayStationId, ride.originalBooking.railwayStationTerminalId);
                if (terminal?.latitude && terminal?.longitude) {
                    dropPoint = { latitude: terminal.latitude, longitude: terminal.longitude };
                }
            }

            const stopPoints = getEstimatedStopPoints(ride.originalBooking).map((stop: any) => ({
              position: [stop.latitude, stop.longitude] as [number, number],
              label: stop.label,
              status: stop.status,
            }));

            // Planned route connecting pickup -> stops -> drop
            const plannedRoute = [
              ...(pickupPoint ? [[pickupPoint.latitude, pickupPoint.longitude]] : []),
              ...stopPoints.map((sp: any) => sp.position),
              ...(dropPoint ? [[dropPoint.latitude, dropPoint.longitude]] : [])
            ];

            let nextRide = null;
            if (ride.originalBooking.driverId) {
                const currentRideTime = new Date(`${ride.originalBooking.pickupDate}T${ride.originalBooking.pickupTime || '00:00'}`).getTime();
                const driverRides = bookings.filter((b: any) =>
                    b.driverId === ride.originalBooking.driverId &&
                    b.id !== ride.originalBooking.id &&
                    !['dropped', 'closed', 'cancelled'].includes(b.status)
                ).sort((a: any, b: any) => {
                    const timeA = new Date(`${a.pickupDate}T${a.pickupTime || '00:00'}`).getTime();
                    const timeB = new Date(`${b.pickupDate}T${b.pickupTime || '00:00'}`).getTime();
                    return timeA - timeB;
                });
                
                nextRide = driverRides.find((b: any) => {
                    const timeB = new Date(`${b.pickupDate}T${b.pickupTime || '00:00'}`).getTime();
                    return timeB >= currentRideTime;
                }) || driverRides[0];
            }

            const smartSuggestion = getSmartFleetSuggestion(
              ride.originalBooking,
              hubs,
              cities,
            );
            const currentFleet = resolveFleetScope(ride.originalBooking, hubs);
            const routeCityName =
              getCity(ride.originalBooking.cityId)?.name ||
              (dispatchCenters.find(dc => dc.id === currentFleet)?.name || (currentFleet === 'jpr' ? 'Jaipur' : currentFleet === 'ncr' ? 'Delhi-NCR' : 'Unassigned'));
            const routeHub =
              hubs.find((hub) => hub.id === ride.originalBooking.hubId) ||
              hubs.find((hub) => resolveFleetScope({ cityId: hub.cityId }) === currentFleet);

            return (
              <div key={ride.id} className={`relative bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${isExpanded ? borderExpanded : borderNormal}`}>
                
                {/* Clickable Header */}
                <div 
                   className={`group p-2 md:p-2.5 px-3 cursor-pointer select-none relative z-10`}
                   onClick={(e) => {
                       const newExpandedId = isExpanded ? null : ride.id;
                       const isUnassigned = ride.driverName === 'Unassigned';
                       
                       setExpandedRideId(newExpandedId);
                       // Set assigningRideId only if the newly expanded ride is unassigned
                       setAssigningRideId(newExpandedId && isUnassigned ? ride.id : null);
                   }}
                >
                   <div className="flex flex-col md:flex-row md:items-center text-sm w-full relative">
                       {/* Alert Pulse Background for Critical states */}
                       {isDelayed && !isClosed && <div className={`absolute inset-0 ${ride.delayInfo ? `bg-${ride.delayInfo.color}-500/10` : 'bg-red-500/10'} animate-pulse pointer-events-none rounded-xl`} />}
                       {isUnassigned && !isDelayed && !isClosed && <div className="absolute inset-0 bg-orange-500/10 animate-pulse pointer-events-none rounded-xl" />}

                       {/* Col 1: Status & Booking */}
                       <div className="w-full md:w-[12%] flex flex-col gap-0.5 pr-2 border-b md:border-b-0 md:border-r border-slate-100 py-1 md:py-0 relative z-10">
                           <div className="flex justify-between items-center">
                               <span className="font-bold text-slate-800 tracking-tight text-[12px]">{ride.displayId}</span>
                               <div className="flex items-center gap-1">
                                   <CityBadge
                                     operatingCity={ride.originalBooking.operatingCity}
                                     pickupCity={ride.originalBooking.pickupCity}
                                     cityId={ride.originalBooking.cityId}
                                     className="h-4 px-1.5 py-0 text-[9px]"
                                   />
                                   <Badge className={`bg-${ride.statusColor}-100 text-${ride.statusColor}-700 hover:bg-${ride.statusColor}-200 border-none text-[9px] font-bold h-4 py-0 px-1.5 rounded-sm shadow-sm`}>
                                       {ride.status}
                                   </Badge>
                               </div>
                           </div>
                           <div className="text-[10px] text-slate-500 font-medium leading-none">{ride.bookingId} • <span className="capitalize">{ride.rideType}</span></div>
                       </div>

                       {/* Col 2: Customer */}
                       <div className="w-full md:w-[12%] flex flex-col gap-0.5 px-0 md:px-2.5 border-b md:border-b-0 md:border-r border-slate-100 py-1 md:py-0 relative group/cust">
                           <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none">Customer</div>
                           <div className="font-bold text-slate-800 truncate text-[12px] leading-tight" title={ride.customerName}>{ride.customerName}</div>
                           <div className="text-[10px] text-slate-500 flex items-center gap-1 leading-none mb-1">
                               {ride.customerPhone}
                               {ride.customerPhone && (
                                   <Button variant="ghost" size="icon" className="h-5 w-5 bg-green-50 hover:bg-green-100 text-green-600 rounded-full shrink-0 ml-auto" onClick={(e) => { e.stopPropagation(); window.open(`tel:${ride.customerPhone}`); }}>
                                       <PhoneCall className="h-3 w-3" />
                                   </Button>
                               )}
                           </div>
                           <div className="text-[9px] text-slate-500 leading-none">Src: <span className="font-bold text-slate-700">{b2bClient ? b2bClient.companyName : ride.walletBal}</span></div>
                           <div className="text-[9px] text-slate-500 leading-none mt-0.5">By: <span className="font-bold text-slate-700">{ride.originalBooking.createdBy || 'Admin'}</span></div>
                       </div>
                       
                       {/* Col 3: Pick Time & Car Booked */}
                       <div className="w-full md:w-[12%] flex flex-col gap-0.5 px-0 md:px-2.5 border-b md:border-b-0 md:border-r border-slate-100 py-1 md:py-0">
                           <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none">Pick Time / Car Booked</div>
                           <div className="font-bold text-slate-800 truncate text-[12px] leading-tight" title={ride.time}>{ride.time}</div>
                           <div className="text-[10px] text-slate-500 leading-none mt-1">Car: <span className="font-bold text-slate-700 capitalize">{ride.originalBooking?.carCategory?.replace('_', ' ') || 'BYD / MG ZS'}</span></div>
                       </div>

                       {/* Col 4: Route */}
                       <div className="w-full md:w-[18%] flex flex-col justify-center gap-0.5 px-0 md:px-2.5 border-b md:border-b-0 md:border-r border-slate-100 py-1 md:py-0">
                           <div className="flex items-center justify-between mb-0.5">
                               <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none">Route</div>
                               <div className="flex items-center gap-1">
                                   {(ride.originalBooking.tollCharges && ride.originalBooking.tollCharges > 0) ? (
                                       <div className="text-[8px] font-bold text-orange-600 bg-orange-50 px-1 py-0.5 rounded flex items-center leading-none border border-orange-100" title={`Toll Included: ₹${ride.originalBooking.tollCharges}`}>
                                           <MapPin className="h-2 w-2 mr-0.5" /> Toll Route
                                       </div>
                                   ) : null}
                                   {(ride.originalBooking.flightNumber || ride.originalBooking.trainNumber) && (
                                       <div className="text-[9px] font-bold text-slate-600 bg-slate-100 px-1 py-0.5 rounded flex items-center leading-none">
                                           {ride.originalBooking.tripType?.includes('airport') ? <Plane className="h-2.5 w-2.5 mr-1 text-blue-500" /> : ride.originalBooking.tripType?.includes('railway') ? <Train className="h-2.5 w-2.5 mr-1 text-emerald-500" /> : null}
                                           {ride.originalBooking.flightNumber || ride.originalBooking.trainNumber}
                                       </div>
                                   )}
                               </div>
                           </div>
                           <div className="text-[10px] text-slate-800 truncate flex items-center gap-1 leading-tight" title={ride.originalBooking.pickupLocation}>
                               <div className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                               <span className="font-medium shrink-0">Pickup:</span>
                               <span className="truncate">{ride.originalBooking.pickupLocation || 'N/A'}</span>
                           </div>
                           {(ride.originalBooking.stops || []).length > 0 && (
                               <div className="pl-2.5 space-y-1 my-0.5">
                                   {(ride.originalBooking.stops || []).map((stop: any, index: number) => (
                                       <div
                                           key={stop.id || index}
                                           className="text-[10px] text-slate-600 truncate flex items-center gap-1 leading-tight"
                                           title={stop.location || stop.address}
                                       >
                                           <div className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                                           <span className="font-medium shrink-0">Stop {index + 1}:</span>
                                           <span className="truncate">{stop.location || stop.address || 'N/A'}</span>
                                       </div>
                                   ))}
                               </div>
                           )}
                           <div className="text-[10px] text-slate-800 truncate flex items-center gap-1 leading-tight" title={ride.originalBooking.dropLocation}>
                               <div className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                               <span className="font-medium shrink-0">Drop:</span>
                               <span className="truncate">{ride.originalBooking.dropLocation || 'N/A'}</span>
                           </div>
                           <div className="mt-1 grid gap-1 text-[10px] leading-tight">
                               <div
                                 className="flex min-w-0 items-center gap-1.5 rounded-md border border-indigo-100 bg-indigo-50/80 px-1.5 py-1"
                                 title={routeCityName}
                               >
                                   <Map className="h-3 w-3 shrink-0 text-indigo-600" />
                                   <span className="shrink-0 font-semibold text-indigo-500">City</span>
                                   <span className="truncate font-bold text-indigo-800">{routeCityName}</span>
                               </div>
                               <div
                                 className="flex min-w-0 items-center gap-1.5 rounded-md border border-emerald-100 bg-emerald-50/80 px-1.5 py-1"
                                 title={routeHub?.name || 'Hub not assigned'}
                               >
                                   <MapPin className="h-3 w-3 shrink-0 text-emerald-600" />
                                   <span className="shrink-0 font-semibold text-emerald-500">Hub</span>
                                   <span className="truncate font-bold text-emerald-800">
                                     {routeHub?.name || 'Not assigned'}
                                   </span>
                               </div>
                           </div>
                           {smartSuggestion && (
                             <div
                               className="mt-1 flex items-center justify-between gap-1 rounded-md border border-indigo-100 bg-indigo-50 px-1.5 py-1"
                               onClick={(event) => event.stopPropagation()}
                             >
                               <span className="min-w-0 truncate text-[9px] font-bold text-indigo-700">
                                 <Zap className="mr-0.5 inline h-2.5 w-2.5" />
                                 {smartSuggestion.preferredLabel} fleet is {smartSuggestion.minutesCloser} min closer
                               </span>
                               <Button
                                 size="sm"
                                 variant="ghost"
                                 disabled={currentFleet === smartSuggestion.preferredCity}
                                 className="h-5 shrink-0 rounded px-1.5 text-[9px] font-bold text-indigo-700 hover:bg-indigo-100"
                                 onClick={() => {
                                   const preferredHub = hubs.find(
                                     (hub) =>
                                       resolveFleetScope({ cityId: hub.cityId }) ===
                                       smartSuggestion.preferredCity,
                                   );
                                   const reassignment = ride.originalBooking.driverId
                                     ? { driverId: undefined, carId: undefined, status: 'confirmed' as const }
                                     : {};
                                   updateBooking(ride.originalBooking.id, {
                                     ...reassignment,
                                     operatingCity: smartSuggestion.preferredCity,
                                     hubId: preferredHub?.id,
                                   });
                                   toast.success(
                                     `${ride.displayId} tagged to ${smartSuggestion.preferredLabel} fleet`,
                                   );
                                 }}
                               >
                                 {currentFleet === smartSuggestion.preferredCity ? 'Tagged' : 'Use fleet'}
                               </Button>
                             </div>
                           )}
                       </div>

                       {/* Col 5: Driver & Vehicle */}
                       <div className="w-full md:w-[16%] flex flex-col gap-0.5 px-0 md:px-2.5 border-b md:border-b-0 md:border-r border-slate-100 py-1 md:py-0 relative group/driv">
                           <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none flex justify-between items-center">
                               Driver / Vehicle
                           </div>
                           
                           <div className="flex items-center gap-1">
                               {!isClosed ? (
                                   <Popover>
                                       <PopoverTrigger asChild>
                                           <div 
                                               className="flex items-center gap-1 font-bold text-slate-800 truncate cursor-pointer hover:text-blue-600 transition-colors group/driver p-0.5 -ml-0.5 rounded hover:bg-blue-50 w-fit text-[12px] leading-tight"
                                               onClick={(e) => e.stopPropagation()}
                                           >
                                               <span className={`truncate ${ride.driverName === 'Unassigned' ? 'text-orange-600' : ''}`}>{ride.driverName}</span>
                                               <ChevronDown className="h-3 w-3 shrink-0 text-slate-300 group-hover/driver:text-blue-500" />
                                           </div>
                                       </PopoverTrigger>
                                       <PopoverContent className="w-72 p-3 shadow-xl border-slate-200 rounded-xl" align="start" side="bottom">
                                           <DriverSearchDropdown ride={ride} />
                                       </PopoverContent>
                                   </Popover>
                               ) : (
                                   <div className="font-bold text-slate-800 truncate p-0.5 -ml-0.5 text-[12px] leading-tight">{ride.driverName}</div>
                               )}
                               <span className="text-[10px] text-slate-400 font-medium">({ride.driverName !== 'Unassigned' ? ride.driverId : 'N/A'})</span>
                           </div>
                           
                           <div className="text-[10px] text-slate-500 flex items-center gap-1 leading-none mb-0.5">
                               {ride.driverName !== 'Unassigned' ? ride.driverPhone : 'N/A'}
                               {ride.driverName !== 'Unassigned' && ride.driverPhone !== 'N/A' && (
                                   <Button variant="ghost" size="icon" className="h-5 w-5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full shrink-0" onClick={(e) => { e.stopPropagation(); handleExotelCall(ride.driverPhone, 'Driver'); }}>
                                       <PhoneCall className="h-3 w-3" />
                                   </Button>
                               )}
                           </div>
                           <div className="font-bold text-slate-800 truncate flex items-center gap-1 text-[11px] leading-tight mt-0.5">
                               <span className="truncate">{ride.vehicleNo}</span>
                               {ride.isEV && <Badge variant="outline" className="text-[8px] bg-green-50 text-green-700 px-1 py-0 h-3.5 flex items-center rounded-sm border-green-200 shrink-0 leading-none"><Leaf className="h-2 w-2 mr-0.5" /> EV</Badge>}
                           </div>
                           <div className="text-[10px] text-slate-500 truncate leading-none">
                               {ride.vehicleType}
                           </div>
                       </div>

                       {/* Col 6: Current Event */}
                       <div className="w-full md:w-[9%] flex flex-col justify-center gap-0.5 px-0 md:px-2.5 border-b md:border-b-0 md:border-r border-slate-100 py-1 md:py-0">
                           <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none mb-1">Event</div>
                           <Badge variant="outline" className={`w-fit border-none px-1.5 py-0 text-[9px] font-bold uppercase tracking-wider h-4 flex items-center ${
                               ride.originalBooking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                               (!ride.originalBooking.driverId && ['pending', 'confirmed'].includes(ride.originalBooking.status)) ? 'bg-amber-100 text-amber-700' :
                               ride.originalBooking.status === 'assigned' ? 'bg-blue-100 text-blue-700' :
                               ride.originalBooking.status === 'dispatched' ? 'bg-indigo-100 text-indigo-700' :
                               ride.originalBooking.status === 'arrived' ? 'bg-purple-100 text-purple-700' :
                               ride.originalBooking.status === 'picked_up' ? 'bg-emerald-100 text-emerald-700' :
                               ride.originalBooking.status === 'dropped' ? 'bg-teal-100 text-teal-700' :
                               'bg-slate-100 text-slate-700'
                           }`}>
                               {ride.originalBooking.status === 'cancelled' ? 'Cancelled' : (!ride.originalBooking.driverId && ['pending', 'confirmed'].includes(ride.originalBooking.status)) ? 'Unassigned' : ride.originalBooking.status.replace(/_/g, ' ')}
                           </Badge>
                       </div>

                       {/* Col 7: Fare & Actions */}
                       <div className="w-full md:flex-1 flex justify-between items-center pl-0 md:pl-2.5 py-1 md:py-0">
                           <div className="flex flex-col gap-0.5">
                               <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none">Fare</div>
                               <div className="font-bold text-slate-900 text-[13px] whitespace-nowrap leading-tight">{ride.fare}</div>
                               <div className="text-[10px] text-slate-500 font-medium whitespace-nowrap leading-none">{ride.originalBooking.b2bClientId ? 'Corp.' : 'Direct'}</div>
                           </div>

                           <div className="flex items-center gap-2">
                               {/* Actions Dropdown */}
                               {!isClosed && (
                                   <DropdownMenu>
                                       <DropdownMenuTrigger asChild>
                                           <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
                                               <MoreHorizontal className="h-4 w-4 text-slate-500" />
                                           </Button>
                                       </DropdownMenuTrigger>
                                       <DropdownMenuContent align="end" className="w-48 shadow-lg border-slate-100 rounded-xl" onClick={(e) => e.stopPropagation()}>
                                       {ride.originalBooking.status === 'cancelled' ? (
                                           <>
                                               <DropdownMenuItem className="cursor-pointer font-medium text-slate-700" onClick={(e) => { 
                                                   e.stopPropagation(); 
                                                   updateBooking(ride.originalBooking.id, { status: 'pending', cancellationReason: null, cancelledBy: null });
                                                   toast.success("Booking reactivated to pending state.");
                                               }}>
                                                   <RefreshCw className="h-4 w-4 mr-2 text-slate-500" /> Reactivate Booking
                                               </DropdownMenuItem>
                                               <DropdownMenuItem className="cursor-pointer font-medium text-slate-700" onClick={(e) => { 
                                                   e.stopPropagation(); 
                                                   setDutySlipRide(ride);
                                                   setIsDutySlipDialogOpen(true);
                                               }}>
                                                   <FileText className="h-4 w-4 mr-2 text-slate-500" /> View Duty Slip
                                               </DropdownMenuItem>
                                           </>
                                       ) : (
                                           <>
                                       <DropdownMenuItem className="cursor-pointer font-medium text-slate-700" onClick={(e) => { 
                                           e.stopPropagation(); 
                                           setEditRideTarget(ride);
                                           setEditRideData({ 
                                              pickupDate: ride.originalBooking.pickupDate || '',
                                              pickupTime: ride.originalBooking.pickupTime || '',
                                              remarks: ride.originalBooking.remarks || ''
                                           });
                                           setIsEditDialogOpen(true); 
                                       }}>
                                                <Edit3 className="h-4 w-4 mr-2 text-slate-500" /> Booking Edit
                                            </DropdownMenuItem>
                                            {!ride.originalBooking.driverId ? (
                                                <DropdownMenuItem className="cursor-not-allowed font-medium text-slate-400 opacity-80" onClick={(e) => { e.stopPropagation(); toast.error("Please assign a driver first"); }}>
                                                    <Clock className="h-4 w-4 mr-2 text-slate-400" /> Assign Driver First
                                                </DropdownMenuItem>
                                            ) : (
                                                <DropdownMenuItem className="cursor-pointer font-medium text-slate-700" onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    
                                                    let nStatus = null;
                                                    if (['pending', 'confirmed', 'assigned'].includes(ride.originalBooking.status)) {
                                                        nStatus = 'dispatched';
                                                    } else {
                                                        const flow = ['dispatched', 'arrived', 'picked_up', 'dropped', 'closed'];
                                                        const cIdx = flow.indexOf(ride.originalBooking.status);
                                                        nStatus = cIdx >= 0 && cIdx < flow.length - 1 ? flow[cIdx + 1] : null;
                                                    }
                                                    
                                                    if (nStatus) {
                                                        setManualEventTarget(ride);
                                                        setManualEventStatus(nStatus);
                                                        setIsManualEventDialogOpen(true); 
                                                    } else {
                                                        toast.info("No further manual events available.");
                                                    }
                                                }}>
                                                    <Clock className="h-4 w-4 mr-2 text-slate-500" /> Manual Event
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem className="cursor-pointer font-medium text-slate-700" onClick={(e) => { 
                                                e.stopPropagation(); 
                                                setDutySlipRide(ride);
                                                setIsDutySlipDialogOpen(true);
                                            }}>
                                                <FileText className="h-4 w-4 mr-2 text-slate-500" /> View Duty Slip
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="cursor-pointer font-medium text-slate-700" onClick={(e) => { 
                                                e.stopPropagation(); 
                                                setInvoiceRide(ride);
                                                setIsInvoiceDialogOpen(true);
                                            }}>
                                                <Banknote className="h-4 w-4 mr-2 text-slate-500" /> View Invoice
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator className="bg-slate-100" />
                                            <DropdownMenuItem className="cursor-pointer font-medium text-slate-700" onClick={(e) => { 
                                                e.stopPropagation(); 
                                                setVariationRideTarget(ride);
                                                setIsVariationDialogOpen(true);
                                            }}>
                                                <GitCompare className="h-4 w-4 mr-2 text-slate-500" /> Change & Variations
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="cursor-pointer font-medium text-slate-700" onClick={(e) => { 
                                                e.stopPropagation(); 
                                                setDocsRideTarget(ride);
                                                setIsDocsDialogOpen(true);
                                            }}>
                                                <Paperclip className="h-4 w-4 mr-2 text-slate-500" /> View Documents
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer font-medium" onClick={(e) => { 
                                                e.stopPropagation(); 
                                                setCancelRideTarget(ride);
                                                setCancelReason("");
                                                setIsCancelDialogOpen(true);
                                            }}>
                                                <XCircle className="h-4 w-4 mr-2" /> Cancel Booking
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator className="bg-slate-100" />
                                            <DropdownMenuItem 
                                                className="text-amber-700 focus:text-amber-700 focus:bg-amber-50 cursor-pointer font-medium"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const reason = window.prompt("Please enter the reason for breakdown:");
                                                    if (reason) {
                                                        toast.success(`Breakdown marked with reason: ${reason}`);
                                                        updateBooking(ride.originalBooking.id, { 
                                                            status: 'cancelled', 
                                                            cancellationReason: `Breakdown: ${reason}`,
                                                            cancelledBy: 'Admin'
                                                        });
                                                    }
                                                }}
                                            >
                                                <AlertTriangle className="h-4 w-4 mr-2" /> Mark Breakdown
                                            </DropdownMenuItem>
                                           </>
                                       )}
                                       </DropdownMenuContent>
                                   </DropdownMenu>
                               )}
                               {/* Chevron */}
                               <div className={`p-1 rounded-full transition-colors ${isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-transparent text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600'}`}>
                                   {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                               </div>
                           </div>
                       </div>
                   </div>

                   {/* Tags Row */}
                   {(!isClosed || (ride.tags && ride.tags.length > 0)) && (
                       <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
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
                               <div onClick={(e) => e.stopPropagation()}>
                               <Popover>
                                   <PopoverTrigger asChild>
                                       <button className="text-[10px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer bg-blue-50/50 hover:bg-blue-100 px-2 py-0.5 rounded-md border border-blue-100 border-dashed flex items-center h-5 transition-colors">+ Add Tag</button>
                                   </PopoverTrigger>
                                   <PopoverContent className="w-56 p-3 shadow-xl border-slate-200 rounded-xl" align="start" side="bottom" onClick={(e) => e.stopPropagation()}>
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
                                                           e.preventDefault();
                                                           const currentTags = ride.tags || [];
                                                           if (!currentTags.includes(tagName)) {
                                                               updateBooking(ride.originalBooking.id, { tags: [...currentTags, tagName] });
                                                               toast.success("Tag added");
                                                               document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); // Close popover safely
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
                               </div>
                           )}
                       </div>
                   )}
                </div>

                {/* ========================================================= */}
                {/* EXPANDED CONTENT AREA - ACTIVE RIDE */}
                {/* ========================================================= */}
            {isExpanded && !isClosed && (() => {
              const currentStatus = ride.originalBooking.status;
              const cancelEvent = currentStatus === 'cancelled' 
                  ? ride.originalBooking.eventLog?.slice().reverse().find((e: any) => e.event === 'cancelled' || e.toStatus === 'cancelled')
                  : null;
              const cancelFromStatus = cancelEvent?.fromStatus || 'pending';

              let timelineSteps = [
                  { 
                     id: 'assigned', title: 'Assigned', color: 'bg-blue-500', lineColor: 'bg-blue-200',
                     isActive: !!ride.originalBooking.driverId,
                     fields: [
                        { label: 'Created Time', value: new Date(ride.originalBooking.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) },
                        { label: 'Actual Assign', value: (!ride.originalBooking.driverId && ['pending', 'confirmed'].includes(ride.originalBooking.status)) ? 'Pending' : '05:45 PM' }
                     ]
                  },
                  { 
                     id: 'dispatched', title: 'Dispatched', color: 'bg-indigo-500', lineColor: 'bg-indigo-200', 
                     isActive: !['pending', 'confirmed', 'assigned'].includes(ride.originalBooking.status),
                     fields: [
                        { label: 'ETA Dispatch', value: '05:45 PM' },
                        { label: 'Actual Dispatch', value: !['pending', 'confirmed', 'assigned'].includes(ride.originalBooking.status) ? '05:46 PM' : 'Pending' }
                     ]
                  },
                  { 
                     id: 'arrived', title: 'Arrived', color: 'bg-purple-500', lineColor: 'bg-purple-200',
                     isActive: !['pending', 'confirmed', 'assigned', 'dispatched'].includes(ride.originalBooking.status),
                     fields: [
                        { label: 'Est. Arrival', value: '06:00 PM' },
                        { label: 'Actual Arrival', value: !['pending', 'confirmed', 'assigned', 'dispatched'].includes(ride.originalBooking.status) ? '06:05 PM' : 'Pending' }
                     ]
                  },
                  { 
                     id: 'picked_up', title: 'Picked Up', color: 'bg-emerald-500', lineColor: 'bg-emerald-200',
                     isActive: ['picked_up', 'dropped', 'closed', 'Completed'].includes(ride.originalBooking.status),
                     fields: [
                        { label: 'Est. Pickup', value: '06:10 PM' },
                        { label: 'Actual Pickup', value: ['picked_up', 'dropped', 'closed', 'Completed'].includes(ride.originalBooking.status) ? '06:12 PM' : 'Pending' }
                     ]
                  },
                  { 
                     id: 'dropped', title: 'Ended', color: 'bg-teal-500', lineColor: 'bg-teal-200',
                     isActive: ['dropped', 'closed', 'Completed'].includes(ride.originalBooking.status),
                     fields: [
                        { label: 'Est. Drop Off', value: '07:30 PM' },
                        { label: 'Actual Drop Off', value: ['dropped', 'closed', 'Completed'].includes(ride.originalBooking.status) ? '07:45 PM' : 'Pending' }
                     ]
                  },
                  { 
                     id: 'closed', title: 'Closed', color: 'bg-slate-700', lineColor: 'bg-slate-200',
                     isActive: ['closed', 'Completed'].includes(ride.originalBooking.status),
                     fields: [
                        { label: 'Expected Close', value: '07:50 PM' },
                        { label: 'Actual Close', value: ['closed', 'Completed'].includes(ride.originalBooking.status) ? '07:55 PM' : 'Pending' }
                     ]
                  }
              ];

              if (currentStatus === 'cancelled') {
                  const cancelIdx = timelineSteps.findIndex(s => s.id === cancelFromStatus);
                  if (cancelIdx >= 0) {
                      timelineSteps = timelineSteps.slice(0, cancelIdx + 1);
                  } else {
                      timelineSteps = [];
                  }
                  
                  const cancelledBy = cancelEvent?.performedBy || ride.originalBooking.cancelledBy || 'System';
                  const reason = ride.originalBooking.cancellationReason || cancelEvent?.notes?.replace('Cancelled: ', '') || 'No reason provided';
                  
                  timelineSteps.push({
                      id: 'cancelled', title: 'Cancelled', color: 'bg-red-500', lineColor: 'bg-red-200',
                      isActive: true,
                      fields: [
                          { label: 'Time', value: cancelEvent?.performedAt ? new Date(cancelEvent.performedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) },
                          { label: 'By', value: cancelledBy.length > 15 ? cancelledBy.substring(0,15)+'...' : cancelledBy },
                          { label: 'Reason', value: reason.length > 20 ? reason.substring(0,20)+'...' : reason }
                      ]
                  });
              }

              return (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-3 md:p-4 animate-in fade-in slide-in-from-top-2 duration-300 relative z-10 rounded-b-2xl">

                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                      
                      {/* Main Content Column (Left - 12 columns) */}
                      <div className="xl:col-span-12 space-y-4">
                         
                         {/* ADAPEC Landscape Timeline */}
                         <Card className="shadow-sm overflow-hidden rounded-2xl border-none">
                            <CardContent className="p-4 bg-white">
                               <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-3"><History className="h-4 w-4 text-blue-500" /> ADAPEC Tracker</h3>
                               <div className="flex w-full overflow-x-auto scrollbar-hide pb-2">
                       {timelineSteps.map((step, idx, arr) => {
                          const syncStatus = !['closed', 'cancelled'].includes(step.id) ? getEventSyncStatus(ride, step.id as any) : null;
                                      const isSyncSuccess = syncStatus?.push.status === 'success';
                                      
                                      return (
                                        <div key={step.id} className={`flex-1 min-w-[140px] relative ${!step.isActive ? 'opacity-50 grayscale' : ''}`}>
                                           <div className="flex items-center mb-3">
                                              <div className={`h-3.5 w-3.5 rounded-full ${step.color} border-2 border-white shadow-sm z-10 shrink-0`}></div>
                                              {idx < arr.length - 1 && (
                                                 <div className={`h-[2px] w-full ml-1 mr-1 ${step.isActive ? step.lineColor : 'bg-slate-100'}`}></div>
                                              )}
                                           </div>
                                           <div className="pr-4">
                                              <div className="flex items-center gap-1.5 mb-2">
                                                <h4 className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wide">{step.title}</h4>
                                     {step.isActive && !['closed', 'cancelled'].includes(step.id) && (
                                                  isSyncSuccess ? (
                                                    <ThumbsUp className="h-3.5 w-3.5 text-green-500" />
                                                  ) : (
                                                    <ThumbsDown className="h-3.5 w-3.5 text-red-500" />
                                                  )
                                                )}
                                              </div>
                                              <div className="space-y-1.5">
                                                 {step.fields.map((field, fIdx) => (
                                                    <div key={fIdx} className="flex flex-col justify-between">
                                                       <span className="text-[9px] text-slate-400 font-semibold">{field.label}</span>
                                                       <span className={`text-[10px] font-bold ${field.value === 'Pending' ? 'text-slate-400' : 'text-slate-700'}`}>{field.value}</span>
                                                    </div>
                                                 ))}
                                              </div>
                                           </div>
                                        </div>
                                      );
                                   })}
                               </div>
                            </CardContent>
                         </Card>

                         {/* Next Affected Ride Details */}
                    {nextRide && currentStatus !== 'cancelled' && (
                             <div className={`p-4 rounded-2xl border ${ride.isDelayed ? 'bg-amber-50 border-amber-200 shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
                                <div className="flex items-center gap-3">
                                   <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${ride.isDelayed ? 'bg-amber-100' : 'bg-slate-200'}`}>
                                       {ride.isDelayed ? <AlertTriangle className="h-5 w-5 text-amber-600" /> : <Clock className="h-5 w-5 text-slate-600" />}
                                   </div>
                                   <div className="flex-1 overflow-hidden">
                                       <div className="flex justify-between items-start mb-0.5">
                                           <p className={`text-[11px] font-bold uppercase tracking-wider ${ride.isDelayed ? 'text-amber-700' : 'text-slate-500'}`}>
                                              {ride.isDelayed ? '⚠️ Delay May Affect Next Ride' : 'Next Assigned Ride'}
                                           </p>
                                           <Badge variant="outline" className={`text-[10px] py-0 h-5 ${ride.isDelayed ? 'bg-white border-amber-200 text-amber-700' : 'bg-white border-slate-200'}`}>
                                               {formatStatus(nextRide.status)}
                                           </Badge>
                                       </div>
                                       <div className="flex items-center gap-2 text-[13px] font-medium text-slate-800 truncate">
                                          <span className="font-black text-blue-600">{(nextRide.bookingNumber || nextRide.id.substring(0,8)).toUpperCase()}</span>
                                          <span className="text-slate-300">•</span>
                                          <span className="flex items-center gap-1 font-bold whitespace-nowrap"><Clock className="h-3.5 w-3.5 text-slate-400" /> {nextRide.pickupDate} {nextRide.pickupTime}</span>
                                          <span className="text-slate-300">•</span>
                                          <span className="truncate">{nextRide.pickupLocation}</span>
                                          <span className="text-slate-400">→</span>
                                          <span className="truncate">{nextRide.dropLocation}</span>
                                       </div>
                                   </div>
                                </div>
                             </div>
                        )}

                         {/* EV Ride Metrics / Live Analytics */}
                         <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-2">
                             {[
                               { label: 'Dist', value: `${rideMetrics.distance.toFixed(1)}km`, valueClass: 'text-blue-700' },
                               { label: 'Speed', value: `${ride.speed.toFixed(0)}km/h`, valueClass: 'text-amber-600' },
                               { label: 'SOC', value: `${rideMetrics.soc.toFixed(0)}%`, valueClass: 'text-green-700' },
                               { label: 'Range', value: `${Math.floor((rideMetrics.soc / 100) * 250)}km`, valueClass: 'text-green-700' },
                             ].map((metric) => (
                               <div key={metric.label} className="rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-sm">
                                 <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none">{metric.label}</p>
                                 <p className={`mt-1 text-sm font-black leading-none ${metric.valueClass}`}>{metric.value}</p>
                               </div>
                             ))}
                         </div>

                         {/* Live Ride Status Panel */}
                         <Card className={`shadow-md overflow-hidden rounded-2xl border-none`}>
                            <CardContent className="p-0 relative">
                               {/* Real-Time Tracking System Map */}
                               <div className="h-[360px] w-full bg-slate-100 relative flex items-center justify-center overflow-hidden z-0">
                                   <div className="absolute inset-0 z-0">
                                     <MapComponent
                                       key={`map-active-${ride.id}`}
                                       trips={[ride.originalBooking]}
                                       carLocations={liveCarLocations}
                                       selectedTrip={ride.originalBooking.id}
                                       onSelectTrip={() => {}}
                                       getDriver={getDriver}
                                       getCar={getCar}
                                       showAllRoutes={true}
                                       hoveredDriverId={hoveredDriverId}
                                       assigningRideId={assigningRideId}
                                       onAssignDriver={handleAssignDriverFromMap}
                                       pickupPoint={pickupPoint ? [pickupPoint.latitude, pickupPoint.longitude] : null}
                                       dropPoint={dropPoint ? [dropPoint.latitude, dropPoint.longitude] : null}
                                       stopPoints={stopPoints}
                                         plannedRoute={plannedRoute}
                                         showPlannedRoute={true}
                                     />
                                   </div>
                                   
                                   {/* Glassmorphism Badges */}
                                   <div className="absolute top-4 left-4 flex flex-col gap-2 z-[400] pointer-events-none">
                                       <div className="flex gap-2">
                                           <Badge className="bg-white/70 text-slate-800 shadow-sm backdrop-blur-md hover:bg-white/90 pointer-events-auto rounded-lg px-3 py-1.5"><MapPin className="h-3.5 w-3.5 mr-2 text-green-600" /> Live Vehicle Location</Badge>
                                           <Badge 
                                              className={`cursor-pointer shadow-sm backdrop-blur-md pointer-events-auto rounded-lg px-3 py-1.5 transition-all ${isSimulating ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-white/70 text-slate-800 hover:bg-white/90'}`}
                                              onClick={(e) => { e.stopPropagation(); setIsSimulating(!isSimulating); }}
                                           >
                                              <Zap className={`h-3.5 w-3.5 mr-2 ${isSimulating ? 'text-yellow-300' : 'text-blue-600'}`} /> {isSimulating ? 'Simulating...' : 'Simulate Movement'}
                                           </Badge>
                                       </div>
                                       <Badge className="bg-white/70 text-slate-800 shadow-sm backdrop-blur-md hover:bg-white/90 pointer-events-auto rounded-lg px-3 py-1.5 w-fit"><Zap className="h-3.5 w-3.5 mr-2 text-blue-600" /> Route Polyline Active</Badge>
                                       {stopPoints.length > 0 && (
                                         <Badge className="bg-amber-50/90 text-amber-700 shadow-sm backdrop-blur-md hover:bg-amber-50 pointer-events-auto rounded-lg px-3 py-1.5 w-fit">
                                           <MapPin className="h-3.5 w-3.5 mr-2 text-amber-600" /> {stopPoints.length} Stop{stopPoints.length > 1 ? 's' : ''}
                                         </Badge>
                                       )}
                                   </div>
                               </div>
                            </CardContent>
                         </Card>

                         {/* Fare / Price Details Module */}
                         <Card className="shadow-sm bg-white rounded-2xl border-slate-100">
                            <CardHeader className="py-3 bg-slate-50/50 border-b border-slate-100 rounded-t-2xl px-4">
                                <CardTitle className="text-sm flex items-center gap-2 text-slate-800"><Wallet className="h-4 w-4 text-blue-500" /> Fare Estimate</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-[12px] font-medium text-slate-600">
                                    <div>
                                        <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Base</p>
                                        <p className="mt-1 font-bold text-slate-800">₹ {(ride.originalBooking.estimatedFare || 0).toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Tolls</p>
                                        <p className="mt-1 font-bold text-orange-600">+ ₹ {(ride.originalBooking.tollCharges || 0).toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Parking</p>
                                        <p className="mt-1 font-bold text-slate-800">+ ₹ {(ride.originalBooking.parkingCharges || 0).toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">GST</p>
                                        <p className="mt-1 font-bold text-slate-800">+ ₹ {(ride.originalBooking.gstAmount || 0).toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Discount</p>
                                        <p className="mt-1 font-bold text-green-600">- ₹ {(ride.originalBooking.promoDiscount || 0).toFixed(2)}</p>
                                    </div>
                                    <div className={`col-span-2 md:col-span-1 rounded-xl border px-3 py-2 ${ride.originalBooking.paymentStatus === 'paid' ? 'bg-blue-50/50 border-blue-100' : 'bg-red-50 border-red-200'}`}>
                                        <p className={`text-[9px] uppercase font-bold tracking-wider ${ride.originalBooking.paymentStatus === 'paid' ? 'text-green-600' : 'text-red-600'}`}>
                                            {ride.originalBooking.paymentStatus === 'paid' ? 'Paid' : 'Due'}
                                        </p>
                                        <p className={`mt-1 text-lg font-black leading-none ${ride.originalBooking.paymentStatus === 'paid' ? 'text-blue-700' : 'text-red-600'}`}>₹ {(ride.originalBooking.grandTotal || ride.originalBooking.estimatedFare || 0).toFixed(2)}</p>
                                    </div>
                                </div>

                                {currentStatus === 'cancelled' && (
                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        <div className="bg-amber-50/50 p-4 border border-amber-100 rounded-xl">
                                            <div className="flex justify-between items-center mb-3">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[11px] text-amber-800 uppercase font-bold tracking-wider">Refund Details</p>
                                                    <Badge className="bg-amber-100 text-amber-800 border-none px-2 py-0 h-5 text-[10px] font-bold uppercase tracking-wider">Processing</Badge>
                                                </div>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-6 w-6 text-amber-700 hover:text-amber-900 hover:bg-amber-100/50 rounded-full"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const amt = (ride.originalBooking.grandTotal || ride.originalBooking.estimatedFare || 0).toFixed(2);
                                                        const rsn = ride.originalBooking.cancellationReason?.replace('Breakdown: ', '')?.replace('Cancelled: ', '') || 'Customer Requested';
                                                        const arn = `RFND-${ride.id.substring(0, 8).toUpperCase()}`;
                                                        const rDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                                                        const estDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                                                        navigator.clipboard.writeText(`Refund Amount: ₹ ${amt}\nReason: ${rsn}\nARN Number: ${arn}\nRefund Date: ${rDate}\nEst. Credit Date: ${estDate}`);
                                                        toast.success("Refund details copied!");
                                                    }}
                                                >
                                                    <Copy className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-1">
                                                <div>
                                                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Refund Amount</span>
                                                    <p className="font-bold text-slate-800 text-sm mt-0.5">₹ {(ride.originalBooking.grandTotal || ride.originalBooking.estimatedFare || 0).toFixed(2)}</p>
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Reason</span>
                                                    <p className="font-medium text-slate-800 text-sm mt-0.5 truncate" title={ride.originalBooking.cancellationReason || 'Customer Requested'}>{ride.originalBooking.cancellationReason?.replace('Breakdown: ', '')?.replace('Cancelled: ', '') || 'Customer Requested'}</p>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-500 uppercase font-semibold">ARN Number</span>
                                                    <p className="font-mono text-slate-800 text-sm mt-0.5">RFND-{ride.id.substring(0, 8).toUpperCase()}</p>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Refund Date</span>
                                                    <p className="font-medium text-slate-800 text-sm mt-0.5">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Est. Credit Date</span>
                                                    <p className="font-bold text-green-600 text-sm mt-0.5">
                                                        {new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                         </Card>

                      </div>
                    </div>
                  </div>
                  );
                })()}

                {/* ========================================================= */}
                {/* EXPANDED CONTENT AREA - POST RIDE (CLOSED) */}
                {/* ========================================================= */}
                {isExpanded && isClosed && (() => {
                  const currentStatus = ride.originalBooking.status;
                  const cancelEvent = currentStatus === 'cancelled' 
                      ? ride.originalBooking.eventLog?.slice().reverse().find((e: any) => e.event === 'cancelled' || e.toStatus === 'cancelled')
                      : null;
                  
                  let lastValidStatusIndex = ['assigned', 'dispatched', 'arrived', 'picked_up', 'dropped', 'closed'].indexOf(
                      currentStatus === 'cancelled' ? (cancelEvent?.fromStatus || 'pending') : currentStatus
                  );
                  if (lastValidStatusIndex === -1 && ['dropped', 'closed'].includes(currentStatus)) lastValidStatusIndex = 5;

                  const showStep = (stepId: string) => {
                      const stepIdx = ['assigned', 'dispatched', 'arrived', 'picked_up', 'dropped', 'closed'].indexOf(stepId);
                      return stepIdx !== -1 && stepIdx <= lastValidStatusIndex;
                  };

                  return (
                  <div className="border-t border-slate-100/50 bg-slate-50/50 backdrop-blur-md p-4 md:p-6 animate-in fade-in slide-in-from-top-2 duration-300 relative z-10 rounded-b-3xl">
                    
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
                            <TabsTrigger value="adapec" className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none">ADAPEC</TabsTrigger>
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
                                                            <h4 className="text-[14px] font-bold text-slate-800">{ride.originalBooking.pickupLocation || 'Pickup Location'}</h4>
                                                            <p className="text-[11px] font-bold tracking-wider uppercase text-slate-400 mt-1">Pickup Location</p>
                                                        </div>
                                                        {showStep('arrived') ? (
                                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-2 py-0.5 rounded-md"><CheckCircle className="h-3 w-3 mr-1.5" /> Reached</Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 px-2 py-0.5 rounded-md"><Clock className="h-3 w-3 mr-1.5" /> Pending</Badge>
                                                        )}
                                                    </div>
                                                    {showStep('arrived') && (
                                                      <div className="flex gap-6 mt-4">
                                                          <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
                                                              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Driver Arrived</p>
                                                              <p className="text-[13px] font-bold text-slate-700">06:05 PM</p>
                                                          </div>
                                                          {showStep('picked_up') && (
                                                            <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
                                                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Ride Started</p>
                                                                <p className="text-[13px] font-bold text-slate-700">06:12 PM</p>
                                                            </div>
                                                          )}
                                                      </div>
                                                    )}
                                                </div>
                                                
                                                {currentStatus === 'cancelled' ? (
                                                    <div className="relative">
                                                        <div className="absolute -left-[31px] bg-white border-4 border-red-500 rounded-full h-4 w-4"></div>
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <h4 className="text-[14px] font-bold text-red-600">Ride Cancelled</h4>
                                                                <p className="text-[11px] font-bold tracking-wider uppercase text-slate-400 mt-1">Status</p>
                                                            </div>
                                                            <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-none px-2 py-0.5 rounded-md"><XCircle className="h-3 w-3 mr-1.5" /> Cancelled</Badge>
                                                        </div>
                                                        <div className="flex gap-6 mt-4">
                                                            <div className="bg-red-50 px-4 py-2.5 rounded-xl border border-red-100 flex-1">
                                                                <p className="text-[10px] text-red-500 uppercase font-bold tracking-wider mb-0.5">Reason</p>
                                                                <p className="text-[13px] font-bold text-red-900">{ride.originalBooking.cancellationReason || cancelEvent?.notes?.replace('Cancelled: ', '') || 'No reason provided'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="relative">
                                                        <div className="absolute -left-[31px] bg-white border-4 border-slate-800 rounded-full h-4 w-4"></div>
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <h4 className="text-[14px] font-bold text-slate-800">{ride.originalBooking.dropLocation || 'Drop Location'}</h4>
                                                                <p className="text-[11px] font-bold tracking-wider uppercase text-slate-400 mt-1">Drop Location</p>
                                                            </div>
                                                            {showStep('dropped') ? (
                                                                <Badge className="bg-slate-800 px-2 py-0.5 text-white rounded-md"><MapPin className="h-3 w-3 mr-1.5" /> Dropped Off</Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 px-2 py-0.5 rounded-md"><Clock className="h-3 w-3 mr-1.5" /> Pending</Badge>
                                                            )}
                                                        </div>
                                                        {showStep('dropped') && (
                                                            <div className="flex gap-6 mt-4">
                                                                <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
                                                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Drop Time</p>
                                                                    <p className="text-[13px] font-bold text-slate-700">07:45 PM</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
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
                                            <div className="bg-white p-4 border border-slate-200 rounded-xl flex flex-col justify-between">
                                                <div className="flex justify-between items-start mb-2">
                                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Refund Details</p>
                                                {ride.originalBooking.status === 'cancelled' && (
                                                    <div className="flex items-center gap-2">
                                                        <Badge className="bg-amber-100 text-amber-800 border-none px-2 py-0 h-5 text-[9px] font-bold">Processing</Badge>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-5 w-5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full -mr-1"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const amt = (ride.originalBooking.grandTotal || ride.originalBooking.estimatedFare || 0).toFixed(2);
                                                                const rsn = ride.originalBooking.cancellationReason?.replace('Breakdown: ', '')?.replace('Cancelled: ', '') || 'Customer Requested';
                                                                const arn = `RFND-${ride.id.substring(0, 8).toUpperCase()}`;
                                                                const rDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                                                                const estDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                                                                navigator.clipboard.writeText(`Refund Amount: ₹ ${amt}\nReason: ${rsn}\nARN Number: ${arn}\nRefund Date: ${rDate}\nEst. Credit Date: ${estDate}`);
                                                                toast.success("Refund details copied!");
                                                            }}
                                                        >
                                                            <Copy className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                )}
                                                </div>
                                                {ride.originalBooking.status === 'cancelled' ? (
                                                    <div className="space-y-1.5 mt-1">
                                                        <div className="flex justify-between text-xs">
                                                            <span className="text-slate-500">Refund Amount</span>
                                                            <span className="font-bold text-slate-800">₹ {(ride.originalBooking.grandTotal || ride.originalBooking.estimatedFare || 0).toFixed(2)}</span>
                                                        </div>
                                                        <div className="flex justify-between text-xs">
                                                            <span className="text-slate-500">Reason</span>
                                                            <span className="font-medium text-slate-800 text-right max-w-[120px] truncate" title={ride.originalBooking.cancellationReason || 'Customer Requested'}>{ride.originalBooking.cancellationReason?.replace('Breakdown: ', '')?.replace('Cancelled: ', '') || 'Customer Requested'}</span>
                                                        </div>
                                                        <div className="flex justify-between text-xs">
                                                            <span className="text-slate-500">ARN Number</span>
                                                            <span className="font-mono text-slate-700">RFND-{ride.id.substring(0, 8).toUpperCase()}</span>
                                                        </div>
                                                        <div className="flex justify-between text-xs">
                                                            <span className="text-slate-500">Date</span>
                                                            <span className="font-medium text-slate-700">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-[13px] font-bold text-slate-400 mt-1">Not Applicable</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="adapec">
                             <Card className="shadow-sm border-slate-200 bg-white rounded-2xl max-w-3xl mx-auto">
                                <CardHeader className="pb-4 border-b border-slate-100">
                                    <CardTitle className="text-md flex items-center gap-2 text-slate-800"><History className="h-5 w-5 text-blue-500" /> ADAPEC Tracker</CardTitle>
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
                                                <EventSyncLog ride={ride} eventType="support" />
                                            </div>
                                        ))}

                                        {currentStatus === 'cancelled' && (
                                            <div className="relative pl-6">
                                                <div className="absolute -left-[9px] bg-red-600 rounded-full h-4 w-4 border-4 border-white shadow-sm"></div>
                                                <h4 className="text-[14px] font-bold text-red-600">Booking Cancelled</h4>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <Badge variant="outline" className="text-[10px] border-slate-200 py-0.5">
                                                        {cancelEvent?.performedAt ? new Date(cancelEvent.performedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    </Badge>
                                                    <span className="text-[11px] text-slate-500 font-medium">By: <span className="font-bold text-slate-700">{cancelEvent?.performedBy || ride.originalBooking.cancelledBy || 'System'}</span></span>
                                                </div>
                                                <div className="mt-2 bg-red-50 p-3 rounded-xl border border-red-100">
                                                    <p className="text-[10px] text-red-500 uppercase font-bold tracking-wider mb-0.5">Cancellation Reason</p>
                                                    <p className="text-[12px] text-red-900 font-medium">{ride.originalBooking.cancellationReason || cancelEvent?.notes?.replace('Cancelled: ', '') || 'No reason provided'}</p>
                                                </div>
                                            </div>
                                        )}

                                        {showStep('closed') && currentStatus !== 'cancelled' && (
                                            <div className="relative pl-6">
                                                <div className="absolute -left-[9px] bg-slate-700 rounded-full h-4 w-4 border-4 border-white shadow-sm"></div>
                                                <h4 className="text-[14px] font-bold text-slate-800">Ride Closed</h4>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <Badge variant="outline" className="text-[10px] border-slate-200 py-0.5">07:55 PM</Badge>
                                                    <span className="text-[11px] text-slate-500 font-medium">By: <span className="font-bold text-slate-700">System / Admin</span></span>
                                                </div>
                                            </div>
                                        )}

                                        {showStep('dropped') && (
                                            <div className="relative pl-6">
                                                <div className="absolute -left-[9px] bg-teal-500 rounded-full h-4 w-4 border-4 border-white shadow-sm"></div>
                                                <h4 className="text-[14px] font-bold text-slate-800">Ride Dropped Off</h4>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <Badge variant="outline" className="text-[10px] border-slate-200 py-0.5">07:45 PM</Badge>
                                                    <span className="text-[11px] text-slate-500 font-medium">By: <span className="font-bold text-slate-700">{ride.driverName}</span> (Driver App)</span>
                                                </div>
                                                <EventSyncLog ride={ride} eventType="dropped" />
                                            </div>
                                        )}

                                        {showStep('picked_up') && (
                                            <div className="relative pl-6">
                                                <div className="absolute -left-[9px] bg-emerald-500 rounded-full h-4 w-4 border-4 border-white shadow-sm"></div>
                                                <h4 className="text-[14px] font-bold text-slate-800">Ride Started</h4>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <Badge variant="outline" className="text-[10px] border-slate-200 py-0.5">06:12 PM</Badge>
                                                    <span className="text-[11px] text-slate-500 font-medium">By: <span className="font-bold text-slate-700">{ride.driverName}</span> (OTP Verified)</span>
                                                </div>
                                                <EventSyncLog ride={ride} eventType="picked_up" />
                                            </div>
                                        )}

                                        {showStep('arrived') && (
                                            <div className="relative pl-6">
                                                <div className="absolute -left-[9px] bg-blue-500 rounded-full h-4 w-4 border-4 border-white shadow-sm"></div>
                                                <h4 className="text-[14px] font-bold text-slate-800">Driver Arrived at Pickup</h4>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <Badge variant="outline" className="text-[10px] border-slate-200 py-0.5">06:05 PM</Badge>
                                                    <span className="text-[11px] text-slate-500 font-medium">By: <span className="font-bold text-slate-700">{ride.driverName}</span> (GPS Geofence)</span>
                                                </div>
                                                <EventSyncLog ride={ride} eventType="arrived" />
                                            </div>
                                        )}
                                        
                                        {showStep('dispatched') && (
                                            <div className="relative pl-6">
                                                <div className="absolute -left-[9px] bg-amber-500 rounded-full h-4 w-4 border-4 border-white shadow-sm"></div>
                                                <h4 className="text-[14px] font-bold text-slate-800">Driver Enroute</h4>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <Badge variant="outline" className="text-[10px] border-slate-200 py-0.5">05:46 PM</Badge>
                                                    <span className="text-[11px] text-slate-500 font-medium">By: <span className="font-bold text-slate-700">{ride.driverName}</span> (Driver App)</span>
                                                </div>
                                                <EventSyncLog ride={ride} eventType="dispatched" />
                                            </div>
                                        )}

                                        {showStep('assigned') && (
                                            <div className="relative pl-6">
                                                <div className="absolute -left-[9px] bg-slate-300 rounded-full h-4 w-4 border-4 border-white shadow-sm"></div>
                                                <h4 className="text-[14px] font-bold text-slate-800">Driver Assigned</h4>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <Badge variant="outline" className="text-[10px] border-slate-200 py-0.5">05:45 PM</Badge>
                                                    <span className="text-[11px] text-slate-500 font-medium">By: <span className="font-bold text-slate-700">System Auto-Assign</span></span>
                                                </div>
                                                <EventSyncLog ride={ride} eventType="assigned" />
                                            </div>
                                        )}
                                        
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
                                             key={`map-history-${ride.id}`}
                                             trips={[ride.originalBooking]}
                                             carLocations={displayCarLocations}
                                             selectedTrip={ride.originalBooking.id}
                                             onSelectTrip={() => {}}
                                             getDriver={getDriver}
                                             getCar={getCar}
                                             showAllRoutes={true}
                                             assigningRideId={assigningRideId}
                                             onAssignDriver={handleAssignDriverFromMap}
                                             hoveredDriverId={hoveredDriverId}
                                             pickupPoint={pickupPoint ? [pickupPoint.latitude, pickupPoint.longitude] : null}
                                             dropPoint={dropPoint ? [dropPoint.latitude, dropPoint.longitude] : null}
                                             stopPoints={stopPoints}
                                             plannedRoute={plannedRoute}
                                             showPlannedRoute={true}
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
                  );
                })()}

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

       {/* Cancel Booking Dialog */}
       <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
         <DialogContent className="sm:max-w-md rounded-2xl">
           <DialogHeader>
             <DialogTitle className="text-xl text-slate-800">Cancel Booking</DialogTitle>
             <DialogDescription className="text-slate-500">
               Select a reason to cancel booking <strong className="text-slate-700">{cancelRideTarget?.bookingId}</strong>
             </DialogDescription>
           </DialogHeader>
           <div className="grid gap-5 py-4">
             <div className="space-y-2">
               <Label className="text-slate-700 font-bold text-xs uppercase tracking-wider">Cancellation Reason</Label>
               <Select value={cancelReason} onValueChange={setCancelReason}>
                 <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Select reason" /></SelectTrigger>
                 <SelectContent className="rounded-xl">
                   <SelectItem value="Customer Requested">Customer Requested</SelectItem>
                   <SelectItem value="Driver Not Available">Driver Not Available</SelectItem>
                   <SelectItem value="Vehicle Breakdown">Vehicle Breakdown</SelectItem>
                   <SelectItem value="Delayed Pickup">Delayed Pickup</SelectItem>
                   <SelectItem value="Customer No Show">Customer No Show</SelectItem>
                   <SelectItem value="Other">Other</SelectItem>
                 </SelectContent>
               </Select>
             </div>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)} className="rounded-xl">Back</Button>
             <Button variant="destructive" className="rounded-xl bg-red-600 hover:bg-red-700" onClick={() => { 
                 if (!cancelReason) { toast.error("Please select a cancellation reason"); return; } 
                 updateBooking(cancelRideTarget.originalBooking.id, { 
                     status: 'cancelled', 
                     cancellationReason: cancelReason,
                     cancelledBy: 'Admin' 
                 }); 
                 toast.success(`Booking cancelled: ${cancelReason}`); 
                 setIsCancelDialogOpen(false); 
                 setCancelRideTarget(null); 
             }}>Confirm Cancellation</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

      {/* Edit Booking Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-xl text-slate-800">Edit Booking - {editRideTarget?.bookingId}</DialogTitle>
            <DialogDescription className="text-slate-500">
              Update booking information. Fare and tax recalculations happen automatically.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
             <div className="space-y-4 mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-slate-700 font-bold text-xs uppercase tracking-wider">Pickup Date</Label>
                          <Input type="date" value={editRideData.pickupDate} onChange={(e) => setEditRideData({ ...editRideData, pickupDate: e.target.value })} className="rounded-xl" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-700 font-bold text-xs uppercase tracking-wider">Pickup Time</Label>
                          <Input type="time" value={editRideData.pickupTime} onChange={(e) => setEditRideData({ ...editRideData, pickupTime: e.target.value })} className="rounded-xl" />
                        </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-bold text-xs uppercase tracking-wider">Remarks / Notes</Label>
                      <Textarea rows={2} value={editRideData.remarks} onChange={(e) => setEditRideData({ ...editRideData, remarks: e.target.value })} className="rounded-xl resize-none" placeholder="Any special instructions..." />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-bold text-xs uppercase tracking-wider">Booking Edit History</Label>
                      <ScrollArea className="h-48 rounded-xl border p-3">
                        <div className="space-y-4">
                          {(editRideTarget?.originalBooking?.eventLog || []).length === 0 ? (
                            <p className="text-center text-slate-500 py-8 text-sm">No history found</p>
                          ) : (
                            [...(editRideTarget?.originalBooking?.eventLog || [])].reverse().map((event: any, index: number) => (
                              <div key={event.id} className="flex gap-3 relative">
                                {index < (editRideTarget?.originalBooking?.eventLog || []).length - 1 && (
                                  <div className="absolute left-[11px] top-6 w-0.5 h-full bg-slate-200" />
                                )}
                                <div className="relative z-10">
                                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                                    <Clock className="h-3 w-3 text-slate-500" />
                                  </div>
                                </div>
                                <div className="flex-1 pb-4">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-sm capitalize text-slate-700">
                                      {event.event.replace(/_/g, " ")}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                      {formatEventTime(event.performedAt)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-slate-500 mt-1">
                                    {event.fromStatus && (
                                      <span>
                                        {event.fromStatus.replace(/_/g, " ")} → {event.toStatus.replace(/_/g, " ")}
                                      </span>
                                    )}
                                    {!event.fromStatus && <span>Status: {event.toStatus.replace(/_/g, " ")}</span>}
                                  </p>
                                  <p className="text-xs text-slate-500 mt-1">
                                    By: <span className="font-medium text-slate-600">{event.performedBy}</span>
                                  </p>
                                  {event.notes && (
                                    <p className="text-xs text-slate-500 mt-1 bg-slate-100 rounded p-2">
                                      {event.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                </div>
          </div>
          
          <DialogFooter className="px-6 py-4 border-t bg-slate-50 mt-auto">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={() => {
                if (editRideTarget) {
                    updateBooking(editRideTarget.originalBooking.id, {
                        pickupDate: editRideData.pickupDate,
                        pickupTime: editRideData.pickupTime,
                        remarks: editRideData.remarks,
                    });
                    toast.success("Booking details updated successfully!");
                    setIsEditDialogOpen(false);
                    setEditRideTarget(null);
                }
            }} className="rounded-xl bg-blue-600 hover:bg-blue-700"><Save className="h-4 w-4 mr-2" /> Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Event Dialog */}
      <Dialog open={isManualEventDialogOpen} onOpenChange={setIsManualEventDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-xl text-slate-800">Advance Ride Event</DialogTitle>
            <DialogDescription className="text-slate-500">
              Move booking <strong className="text-slate-700">{manualEventTarget?.bookingId}</strong> to the next event step.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 px-6 py-4">
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Current Status</span>
                    <span className="font-bold text-slate-700 capitalize">{formatStatus(manualEventTarget?.originalBooking?.status || '')}</span>
                </div>
                <div className="text-slate-300">→</div>
                <div className="flex flex-col text-right">
                    <span className="text-[10px] text-blue-400 uppercase font-bold tracking-wider">Next Status</span>
                    <span className="font-bold text-blue-700 capitalize">{formatStatus(manualEventStatus || '')}</span>
                </div>
            </div>
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 font-medium">Manually advancing the event will bypass standard driver app checks (like OTP or GPS verification).</p>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t bg-slate-50 mt-auto">
            <Button variant="outline" onClick={() => setIsManualEventDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={() => {
                if (manualEventTarget && manualEventStatus) {
                    updateBooking(manualEventTarget.originalBooking.id, { status: manualEventStatus as any });
                    toast.success(`Status updated to ${formatStatus(manualEventStatus)} manually.`);
                    setIsManualEventDialogOpen(false);
                    setManualEventTarget(null);
                }
            }} className="rounded-xl bg-blue-600 hover:bg-blue-700">Confirm {formatStatus(manualEventStatus)}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duty Slip Dialog */}
      <Dialog open={isDutySlipDialogOpen} onOpenChange={setIsDutySlipDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-100">
          <DialogHeader className="flex-shrink-0 px-6 py-4 bg-white border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Duty Slip Preview</DialogTitle>
                <DialogDescription>Duty slip for booking {dutySlipRide?.bookingId}</DialogDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => {
                setTimeout(() => { window.print() }, 500);
              }}>
                <Printer className="mr-2 h-4 w-4" /> Print Slip
              </Button>
            </div>
          </DialogHeader>
          <ScrollArea className="flex-grow p-6">
            {dutySlipRide && (
              <div className="flex justify-center pb-8">
                <div className="shadow-lg rounded-xl overflow-hidden bg-white print:shadow-none print:rounded-none">
                  <PrintableDutySlip 
                    booking={dutySlipRide.originalBooking} 
                    dutySlip={dutySlips?.find((ds: any) => ds.bookingId === dutySlipRide.originalBooking.id) || { id: "temp", dutySlipNumber: "DS-TBD", bookingId: dutySlipRide.originalBooking.id, driverId: dutySlipRide.originalBooking.driverId || "", carId: dutySlipRide.originalBooking.carId || "", startTime: "", startKm: 0, status: "active", createdAt: dutySlipRide.originalBooking.createdAt }}
                    driver={getDriver(dutySlipRide.originalBooking.driverId)}
                    car={getCar(dutySlipRide.originalBooking.carId)}
                    city={getCity(dutySlipRide.originalBooking.cityId)}
                    b2bEmployee={dutySlipRide.originalBooking.b2bEmployeeId ? getB2BEmployee(dutySlipRide.originalBooking.b2bEmployeeId) : undefined}
                    b2bClient={dutySlipRide.originalBooking.b2bClientId ? getB2BClient(dutySlipRide.originalBooking.b2bClientId) : undefined}
                  />
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Invoice Dialog */}
      <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-100">
          <DialogHeader className="flex-shrink-0 px-6 py-4 bg-white border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Invoice Preview</DialogTitle>
                <DialogDescription>Invoice for booking {invoiceRide?.bookingId}</DialogDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => {
                setTimeout(() => { window.print() }, 500);
              }}>
                <Printer className="mr-2 h-4 w-4" /> Print Invoice
              </Button>
            </div>
          </DialogHeader>
          <ScrollArea className="flex-grow p-6">
            {invoiceRide && (
              <div className="flex justify-center pb-8">
                <div className="shadow-lg rounded-xl overflow-hidden bg-white print:shadow-none print:rounded-none">
                  <PrintableInvoice 
                    booking={invoiceRide.originalBooking} 
                    invoice={invoices?.find((inv: any) => inv.bookingId === invoiceRide.originalBooking.id) || { id: "temp", invoiceNumber: "INV-TBD", bookingId: invoiceRide.originalBooking.id, dutySlipId: "", clientType: invoiceRide.originalBooking.b2bClientId ? "b2b" : "b2c", customerName: invoiceRide.customerName, customerPhone: invoiceRide.customerPhone, customerEmail: invoiceRide.originalBooking.customerEmail, customerAddress: invoiceRide.originalBooking.customerAddress, customerGst: invoiceRide.originalBooking.b2bClientId ? getB2BClient(invoiceRide.originalBooking.b2bClientId)?.gstNumber : undefined, invoiceDate: new Date().toISOString(), dueDate: new Date().toISOString(), subtotal: invoiceRide.originalBooking.estimatedFare || 0, gstRate: gstConfig ? gstConfig.cgstRate + gstConfig.sgstRate : 5, gstAmount: invoiceRide.originalBooking.gstAmount || 0, cgst: (invoiceRide.originalBooking.gstAmount || 0) / 2, sgst: (invoiceRide.originalBooking.gstAmount || 0) / 2, totalAmount: invoiceRide.originalBooking.grandTotal || invoiceRide.originalBooking.estimatedFare || 0, status: invoiceRide.originalBooking.paymentStatus || "pending", paidAmount: invoiceRide.originalBooking.advancePaid || 0, balanceAmount: Math.max((invoiceRide.originalBooking.grandTotal || invoiceRide.originalBooking.estimatedFare || 0) - (invoiceRide.originalBooking.advancePaid || 0), 0), createdAt: invoiceRide.originalBooking.createdAt }}
                    driver={getDriver(invoiceRide.originalBooking.driverId)}
                    car={getCar(invoiceRide.originalBooking.carId)}
                    gstConfig={gstConfig}
                  />
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      {/* Variation Dialog */}
      <Dialog open={isVariationDialogOpen} onOpenChange={setIsVariationDialogOpen}>
        <DialogContent className="sm:max-w-2xl rounded-2xl">
          <style>{`
            .grid-cols-var { grid-template-columns: 1fr 1fr 1fr 0.7fr; }
            .grid-cols-var > div { padding: 0.75rem 0.5rem; }
            .grid-cols-var > div:nth-child(4n) { text-align: right; }
          `}</style>
          <DialogHeader>
            <DialogTitle className="text-xl text-slate-800">Trip Variations</DialogTitle>
            <DialogDescription className="text-slate-500">
              Estimated vs Actuals for booking <strong className="text-slate-700">{variationRideTarget?.bookingId}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
              <div className="bg-slate-50 rounded-xl border border-slate-100 text-sm">
                  <div className="grid grid-cols-var gap-x-2 p-2">
                      <div className="font-bold text-slate-500 uppercase text-[10px]">Parameter</div>
                      <div className="font-bold text-slate-500 uppercase text-[10px]">Booked</div>
                      <div className="font-bold text-slate-500 uppercase text-[10px]">Served</div>
                      <div className="font-bold text-slate-500 uppercase text-[10px]">Variation</div>
                  </div>
                  <div className="grid grid-cols-var gap-x-2 divide-y divide-slate-100">
                      {(() => {
                          const booking = variationRideTarget?.originalBooking;
                          if (!booking) return null;

                          const bookedCarCategory = carCategories.find(c => c.id === booking.carCategoryId)?.name || 'N/A';
                          const servedCar = booking.carId ? getCar(booking.carId) : null;
                          const servedCarCategory = carCategories.find(c => c.id === servedCar?.categoryId)?.name || 'N/A';

                          const pickupTime = booking.pickupTime;
                          const actualPickupTime = booking.eventLog?.find((e: any) => e.toStatus === 'picked_up')?.performedAt;
                          const pickupTimeDiff = actualPickupTime ? (new Date(actualPickupTime).getTime() - new Date(`${booking.pickupDate}T${booking.pickupTime}`).getTime()) / 60000 : 0;

                          const bookedPackage = booking.tripType === 'rental' ? `${booking.packageHours}h / ${booking.packageKm}km` : booking.tripType === 'outstation' ? `${booking.days} Days` : 'N/A';
                          const servedPackage = booking.tripType === 'rental' ? `${booking.actualHours || booking.packageHours}h / ${booking.actualKm || booking.packageKm}km` : booking.tripType === 'outstation' ? `${booking.actualDays || booking.days} Days` : 'N/A';

                          const durationDiff = booking.tripType === 'rental' ? (booking.actualHours || 0) - (booking.packageHours || 0) : (booking.actualDays || 0) - (booking.days || 0);
                          const kmDiff = (booking.actualKm || 0) - (booking.estimatedKm || 0);

                          const rows = [
                              { param: 'Pickup Time', booked: pickupTime, served: actualPickupTime ? new Date(actualPickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A', variation: `${pickupTimeDiff > 0 ? '+' : ''}${pickupTimeDiff.toFixed(0)} min`, color: pickupTimeDiff > 5 ? 'text-red-600' : 'text-green-600' },
                              { param: 'Car Category', booked: bookedCarCategory, served: servedCarCategory, variation: bookedCarCategory !== servedCarCategory ? 'Changed' : 'Same', color: bookedCarCategory !== servedCarCategory ? 'text-amber-600' : 'text-slate-500' },
                          ];

                          if (booking.tripType === 'rental') {
                              rows.push(
                                  { param: 'Package', booked: bookedPackage, served: servedPackage, variation: durationDiff !== 0 ? 'Changed' : 'Same', color: durationDiff !== 0 ? 'text-amber-600' : 'text-slate-500' },
                                  { param: 'Duration', booked: `${booking.packageHours} hrs`, served: `${booking.actualHours || booking.packageHours} hrs`, variation: `${durationDiff > 0 ? '+' : ''}${durationDiff} hrs`, color: durationDiff > 0 ? 'text-red-600' : 'text-slate-500' }
                              );
                          }

                          if (booking.tripType === 'outstation') {
                              rows.push(
                                  { param: 'Package', booked: bookedPackage, served: servedPackage, variation: durationDiff !== 0 ? 'Changed' : 'Same', color: durationDiff !== 0 ? 'text-amber-600' : 'text-slate-500' },
                                  { param: 'Duration', booked: `${booking.days} Days`, served: `${booking.actualDays || booking.days} Days`, variation: `${durationDiff > 0 ? '+' : ''}${durationDiff} Days`, color: durationDiff > 0 ? 'text-red-600' : 'text-slate-500' }
                              );
                          }

                          rows.push(
                              { param: 'Distance', booked: `${booking.estimatedKm || 0} km`, served: `${booking.actualKm || booking.estimatedKm || 0} km`, variation: `${kmDiff > 0 ? '+' : ''}${kmDiff.toFixed(1)} km`, color: kmDiff > 0 ? 'text-red-600' : 'text-slate-500' }
                          );

                          return rows.map((row, i) => (
                              <div key={i} className="contents">
                                  <div className="font-bold text-slate-700">{row.param}</div>
                                  <div className="font-medium">{row.booked}</div>
                                  <div className="font-medium">{row.served}</div>
                                  <div className={`font-bold ${row.color}`}>{row.variation}</div>
                              </div>
                          ));
                      })()}
                  </div>

                  <div className="grid grid-cols-var gap-x-2 divide-y divide-slate-100 border-t border-slate-200 mt-4">
                      {(() => {
                          const booking = variationRideTarget?.originalBooking;
                          if (!booking) return null;

                          const baseFareDiff = (booking.actualFare || booking.estimatedFare || 0) - (booking.estimatedFare || 0);
                          const extraChargesValue = (booking.extraCharges || 0) + (booking.tollCharges || 0) + (booking.parkingCharges || 0);

                          const rows = [
                              { param: 'Base Fare', booked: `₹ ${booking.estimatedFare || 0}`, served: `₹ ${booking.actualFare || booking.estimatedFare || 0}`, variation: `${baseFareDiff >= 0 ? '+' : '-'} ₹ ${Math.abs(baseFareDiff)}`, color: baseFareDiff > 0 ? 'text-red-600' : 'text-green-600' },
                              { param: 'Extra Charges', booked: '₹ 0', served: `₹ ${extraChargesValue}`, variation: `+ ₹ ${extraChargesValue}`, color: 'text-amber-600' },
                          ];

                          return rows.map((row, i) => (
                              <div key={i} className="contents">
                                  <div className="font-bold text-slate-700">{row.param}</div>
                                  <div className="font-medium">{row.booked}</div>
                                  <div className="font-medium">{row.served}</div>
                                  <div className={`font-bold ${row.color}`}>{row.variation}</div>
                              </div>
                          ));
                      })()}
                  </div>
              </div>
              
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800 font-medium">Variations are calculated automatically when the driver closes the trip and inputs actual KM and extra charges.</p>
              </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVariationDialogOpen(false)} className="rounded-xl">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Documents Dialog */}
      <Dialog open={isDocsDialogOpen} onOpenChange={setIsDocsDialogOpen}>
        <DialogContent className="sm:max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl text-slate-800">Uploaded Documents</DialogTitle>
            <DialogDescription className="text-slate-500">
              Documents uploaded by driver or team for booking <strong className="text-slate-700">{docsRideTarget?.bookingId}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
              {/* Mocking documents */}
              <div className="border border-slate-200 rounded-xl p-2 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 cursor-pointer transition-colors">
                  <div className="h-24 w-full bg-slate-100 rounded-lg flex items-center justify-center">
                      <FileImage className="h-8 w-8 text-slate-400" />
                  </div>
                  <span className="text-xs font-bold text-slate-700">Signed Duty Slip</span>
                  <span className="text-[10px] text-slate-500">Uploaded 2 hours ago</span>
              </div>
              <div className="border border-slate-200 rounded-xl p-2 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 cursor-pointer transition-colors">
                  <div className="h-24 w-full bg-slate-100 rounded-lg flex items-center justify-center">
                      <FileImage className="h-8 w-8 text-slate-400" />
                  </div>
                  <span className="text-xs font-bold text-slate-700">Toll Receipt</span>
                  <span className="text-[10px] text-slate-500">Uploaded 1 hour ago</span>
              </div>
              <div className="border border-slate-200 border-dashed rounded-xl p-2 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 cursor-pointer transition-colors opacity-70">
                  <div className="h-24 w-full rounded-lg flex items-center justify-center">
                      <Plus className="h-8 w-8 text-slate-400" />
                  </div>
                  <span className="text-xs font-bold text-slate-700">Upload Document</span>
              </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDocsDialogOpen(false)} className="rounded-xl">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}