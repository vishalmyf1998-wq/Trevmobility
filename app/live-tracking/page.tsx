'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useAdmin } from '@/lib/admin-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Car, MapPin, Navigation, Clock, RefreshCw, Route, Maximize, Minimize, CheckCircle2, XCircle, Search } from 'lucide-react'
import FleetLiveSidebar from '@/components/fleet-live-sidebar'

import { Booking } from '@/lib/types'


// Dynamically import the map component to avoid SSR issues with Leaflet
const MapComponent = dynamic(() => import('@/components/tracking-map'), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] w-full flex items-center justify-center bg-muted rounded-lg">
      <div className="text-center">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    </div>
  )
})

const activeStatuses = ['dispatched', 'arrived', 'picked_up'] as const

export default function LiveTrackingPage() {
  const {
    bookings,
    cars,
    drivers,
    carLocations,
    updateCarLocation,
    getDriver,
    getCar,
    getCity,
  } = useAdmin()

  const [selectedBooking, setSelectedBooking] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isSimulating, setIsSimulating] = useState(true)
  const [showAllRoutes, setShowAllRoutes] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [carSearchQuery, setCarSearchQuery] = useState("")
  const [historyDate, setHistoryDate] = useState("")
  const [historyTime, setHistoryTime] = useState("")

  // Read status from URL if coming from dashboard
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const statusParam = params.get('status')
      if (statusParam) setStatusFilter(statusParam)
    }
  }, [])

  const filteredTrips = useMemo(() => {
    return bookings.filter(trip => {
      if (carSearchQuery) {
        const car = getCar(trip.carId || "");
        if (!car?.registrationNumber?.toLowerCase().includes(carSearchQuery.toLowerCase())) return false;
      }
      if (statusFilter === 'all') return activeStatuses.includes(trip.status as any)
      if (statusFilter === 'available') return false
      return trip.status === statusFilter
    })
  }, [bookings, statusFilter])

  const filteredCarLocations = useMemo(() => {
    return carLocations.filter(loc => {
      const car = getCar(loc.carId)
      if (!car) return false
      
      if (carSearchQuery && !car.registrationNumber?.toLowerCase().includes(carSearchQuery.toLowerCase())) {
        return false;
      }
      const trip = bookings.find(t => t.carId === loc.carId && ['dispatched', 'arrived', 'picked_up', 'dropped', 'cancelled'].includes(t.status))

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'available') {
          if (trip || car.status !== 'available') return false
        } else {
          if (trip?.status !== statusFilter) return false
        }
      }

      return true
    })
  }, [carLocations, bookings, statusFilter, getCar])

  // Simulate car movements for demo
  useEffect(() => {
    if (!isSimulating) return

    const interval = setInterval(() => {
      const activeOnly = bookings.filter(b => activeStatuses.includes(b.status as any))
      activeOnly.forEach(trip => {
        if (trip.carId) {
          const currentLocation = carLocations.find(l => l.carId === trip.carId)
          const baseLat = currentLocation?.latitude || 19.0760 + (Math.random() - 0.5) * 0.1
          const baseLng = currentLocation?.longitude || 72.8777 + (Math.random() - 0.5) * 0.1
          
          updateCarLocation(trip.carId, {
            latitude: baseLat + (Math.random() - 0.5) * 0.005,
            longitude: baseLng + (Math.random() - 0.5) * 0.005,
            heading: Math.random() * 360,
            speed: 20 + Math.random() * 40,
            lastUpdated: new Date().toISOString(),
          })
        }
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [isSimulating, bookings, carLocations, updateCarLocation])

  const matchesCar = useCallback((carId?: string | null) => {
    if (!carSearchQuery) return true;
    const car = getCar(carId || "");
    return !!car?.registrationNumber?.toLowerCase().includes(carSearchQuery.toLowerCase());
  }, [carSearchQuery, getCar]);

  const filterOptions = [
    { id: 'all', label: 'Active Trips', desc: 'In progress', icon: Car, count: bookings.filter(t => activeStatuses.includes(t.status as any) && matchesCar(t.carId)).length, activeColor: 'bg-primary text-primary-foreground border-primary', inactiveColor: 'text-foreground hover:bg-muted' },
    { id: 'dispatched', label: 'Dispatched', desc: 'Driver en route', icon: Navigation, count: bookings.filter(t => t.status === 'dispatched' && matchesCar(t.carId)).length, activeColor: 'bg-blue-600 text-white border-blue-600', inactiveColor: 'text-blue-600 hover:bg-blue-50/50' },
    { id: 'arrived', label: 'Arrived', desc: 'Waiting for guest', icon: Clock, count: bookings.filter(t => t.status === 'arrived' && matchesCar(t.carId)).length, activeColor: 'bg-yellow-500 text-white border-yellow-500', inactiveColor: 'text-yellow-600 hover:bg-yellow-50/50' },
    { id: 'picked_up', label: 'Pickup (In-Trip)', desc: 'Guest on board', icon: MapPin, count: bookings.filter(t => t.status === 'picked_up' && matchesCar(t.carId)).length, activeColor: 'bg-green-600 text-white border-green-600', inactiveColor: 'text-green-600 hover:bg-green-50/50' },
    { id: 'dropped', label: 'Ended (Not Closed)', desc: 'Trip finished', icon: CheckCircle2, count: bookings.filter(t => t.status === 'dropped' && matchesCar(t.carId)).length, activeColor: 'bg-teal-500 text-white border-teal-500', inactiveColor: 'text-teal-600 hover:bg-teal-50/50' },
    { id: 'cancelled', label: 'Cancelled', desc: 'Trip aborted', icon: XCircle, count: bookings.filter(t => t.status === 'cancelled' && matchesCar(t.carId)).length, activeColor: 'bg-red-500 text-white border-red-500', inactiveColor: 'text-red-600 hover:bg-red-50/50' },
    { id: 'available', label: 'Idle / Available', desc: 'Cars with no trip', icon: Car, count: cars.filter(c => c.status === 'available' && matchesCar(c.id)).length, activeColor: 'bg-slate-600 text-white border-slate-600', inactiveColor: 'text-slate-600 hover:bg-slate-50/50' }
  ];

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-5rem)] min-h-[600px] pb-4">
      {/* Header section */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Live Trip Tracking</h1>
          <p className="text-muted-foreground">Monitor active trips and car locations in real-time</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showAllRoutes ? 'default' : 'outline'}
            onClick={() => setShowAllRoutes(!showAllRoutes)}
          >
            <Route className="mr-2 h-4 w-4" />
            {showAllRoutes ? 'Hide Routes' : 'Show Routes'}
          </Button>
          <Button
            variant={isSimulating ? 'default' : 'outline'}
            onClick={() => setIsSimulating(!isSimulating)}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isSimulating ? 'animate-spin' : ''}`} />
            {isSimulating ? 'Simulating...' : 'Simulate Movement'}
          </Button>
        </div>
      </div>

      {/* Top Filters & Search */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar shrink-0 w-full">
        <div className="relative shrink-0 w-48">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search car no..." 
            value={carSearchQuery}
            onChange={(e) => setCarSearchQuery(e.target.value)}
            className="pl-8 h-9 text-xs rounded-xl bg-card border-border shadow-sm focus-visible:ring-1"
          />
        </div>
        
        {/* Past Route History Filters */}
        <div className="flex items-center gap-1 shrink-0 bg-muted/30 p-1 rounded-xl border border-border">
          <span className="text-[10px] uppercase font-bold text-muted-foreground px-2">History:</span>
          <Input 
            type="date" 
            value={historyDate} 
            onChange={e => setHistoryDate(e.target.value)} 
            className="h-7 text-xs w-32 rounded-lg bg-card shadow-sm" />
          <Input 
            type="time" 
            value={historyTime} 
            onChange={e => setHistoryTime(e.target.value)} 
            className="h-7 text-xs w-24 rounded-lg bg-card shadow-sm" />
        </div>

        <div className="w-px h-6 bg-border mx-1 shrink-0"></div>
        {filterOptions.map(opt => {
          const Icon = opt.icon;
          const isActive = statusFilter === opt.id;
          return (
            <button 
              key={opt.id}
              onClick={() => setStatusFilter(opt.id)}
              className={`flex items-center gap-2 p-1.5 px-3 rounded-xl border transition-all shrink-0 ${isActive ? opt.activeColor + ' shadow-md' : 'bg-card border-border ' + opt.inactiveColor}`}
            >
              <Icon className="h-4 w-4 opacity-90" />
              <div className="font-semibold text-[13px] leading-none">{opt.label}</div>
              <Badge variant="secondary" className={`ml-1.5 rounded-full px-1.5 py-0 min-w-[20px] h-5 flex items-center justify-center border-none ${isActive ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-muted text-muted-foreground'}`}>
                {opt.count}
              </Badge>
            </button>
          )
        })}
      </div>

      {/* Main Content Area: Live Map */}
      <Card className={isFullScreen ? "fixed inset-0 z-50 flex flex-col rounded-none bg-background" : "flex-1 flex flex-col min-h-[400px] overflow-hidden"}>
          <CardHeader className="shrink-0 pb-4 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Live Map</CardTitle>
              <CardDescription>Real-time location of all active trips</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsFullScreen(!isFullScreen)} className="shrink-0 ml-4">
              {isFullScreen ? <Minimize className="mr-2 h-4 w-4" /> : <Maximize className="mr-2 h-4 w-4" />}
              {isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
            </Button>
          </CardHeader>
          <CardContent className="p-0 flex-1 relative min-h-0 bg-muted/20">
            <div className="absolute inset-0 h-full w-full">
              <MapComponent
                trips={filteredTrips}
                carLocations={filteredCarLocations}
                selectedTrip={selectedBooking}
                onSelectTrip={setSelectedBooking}
                getDriver={getDriver}
                getCar={getCar}
                carPaths={{}}
                showAllRoutes={showAllRoutes}
              />
            </div>
          </CardContent>
      </Card>
    </div>
  )
}
