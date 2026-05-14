'use client'

import { useState, useEffect, useMemo } from 'react'
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
import { Car, MapPin, Navigation, Clock, Phone, User, RefreshCw, Search, Route } from 'lucide-react'
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
  ),
})

const activeStatuses = ['dispatched', 'arrived', 'picked_up', 'dropped'] as const

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
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isSimulating, setIsSimulating] = useState(false)
  const [showAllRoutes, setShowAllRoutes] = useState(false)
  const [historyFrom, setHistoryFrom] = useState('')
  const [historyTo, setHistoryTo] = useState('')
  const [carPathsRaw, setCarPathsRaw] = useState<Record<string, {lat: number, lng: number, timestamp: string}[]>>({})

  // Get base trips (include closed/past ones if history filter is applied)
  const baseTrips = useMemo(() => {
    if (historyFrom || historyTo) {
      return bookings;
    }
    return bookings.filter(b => activeStatuses.includes(b.status as typeof activeStatuses[number]))
  }, [bookings, historyFrom, historyTo])

  const filteredTrips = useMemo(() => {
    return baseTrips.filter(trip => {
      const matchesSearch = 
        trip.bookingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getDriver(trip.driverId || '')?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getCar(trip.carId || '')?.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || trip.status === statusFilter
      
      let matchesDate = true
      if (historyFrom || historyTo) {
        const tripDateTime = `${trip.pickupDate}T${trip.pickupTime || '00:00'}`
        if (historyFrom && tripDateTime < historyFrom) matchesDate = false
        if (historyTo && tripDateTime > historyTo) matchesDate = false
      }
      
      return matchesSearch && matchesStatus && matchesDate
    })
  }, [baseTrips, searchQuery, statusFilter, historyFrom, historyTo, getDriver, getCar])

  const filteredCarLocations = useMemo(() => {
    return carLocations.filter(loc => {
      const car = getCar(loc.carId)
      if (!car) return false
      const driver = car.assignedDriverId ? getDriver(car.assignedDriverId) : null
      const trip = baseTrips.find(t => t.carId === loc.carId)

      // Date filter (hide idle cars if viewing history)
      if (historyFrom || historyTo) {
        if (!trip) return false
        const tripDateTime = `${trip.pickupDate}T${trip.pickupTime || '00:00'}`
        if (historyFrom && tripDateTime < historyFrom) return false
        if (historyTo && tripDateTime > historyTo) return false
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'available') {
          if (trip || car.status !== 'available') return false
        } else {
          if (trip?.status !== statusFilter) return false
        }
      }

      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase()
        const matches = 
          car.registrationNumber.toLowerCase().includes(searchLower) ||
          (driver?.name?.toLowerCase().includes(searchLower)) ||
          (trip?.bookingNumber.toLowerCase().includes(searchLower)) ||
          (trip?.customerName.toLowerCase().includes(searchLower))
        if (!matches) return false
      }

      return true
    })
  }, [carLocations, baseTrips, searchQuery, statusFilter, historyFrom, historyTo, getCar, getDriver])

  // Record Car Paths for Route History
  useEffect(() => {
    setCarPathsRaw(prev => {
      const next = { ...prev }
      carLocations.forEach(loc => {
        if (!next[loc.carId]) next[loc.carId] = []
        const path = next[loc.carId]
        const lastPoint = path[path.length - 1]
        // Only push new coordinates if they have changed
        if (!lastPoint || lastPoint.lat !== loc.latitude || lastPoint.lng !== loc.longitude) {
          next[loc.carId] = [...path, { lat: loc.latitude, lng: loc.longitude, timestamp: new Date().toISOString() }]
        }
      })
      return next
    })
  }, [carLocations])

  const displayPaths = useMemo(() => {
    const paths: Record<string, [number, number][]> = {}
    const fromTime = historyFrom ? new Date(historyFrom).getTime() : 0
    const toTime = historyTo ? new Date(historyTo).getTime() : Infinity
    
    Object.keys(carPathsRaw).forEach(carId => {
      const filtered = carPathsRaw[carId].filter(p => {
        const t = new Date(p.timestamp).getTime()
        return t >= fromTime && t <= toTime
      })
      if (filtered.length > 0) {
        paths[carId] = filtered.map(p => [p.lat, p.lng])
      }
    })
    return paths
  }, [carPathsRaw, historyFrom, historyTo])

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

  const getStatusBadge = (status: Booking['status']) => {
    const styles: Record<string, string> = {
      dispatched: 'bg-blue-100 text-blue-700 border-blue-200',
      arrived: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      picked_up: 'bg-green-100 text-green-700 border-green-200',
      dropped: 'bg-purple-100 text-purple-700 border-purple-200',
    }
    return styles[status] || 'bg-muted text-muted-foreground'
  }

  const formatStatus = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  const getDelayInfo = (trip: any) => {
    if (!['confirmed', 'assigned', 'dispatched'].includes(trip.status)) return null;
    if (!trip.pickupDate || !trip.pickupTime) return null;
    const pickupDateTime = new Date(`${trip.pickupDate}T${trip.pickupTime}`);
    if (isNaN(pickupDateTime.getTime())) return null;
    const now = new Date();
    const diffInMins = Math.floor((now.getTime() - pickupDateTime.getTime()) / 60000);
    return diffInMins > 0 ? diffInMins : null;
  }

  const selectedTripData = selectedBooking ? bookings.find(b => b.id === selectedBooking) : null
  const delayMins = selectedTripData ? getDelayInfo(selectedTripData) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
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

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Trips</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookings.filter(t => activeStatuses.includes(t.status as any)).length}</div>
            <p className="text-xs text-muted-foreground">Currently in progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dispatched</CardTitle>
            <Navigation className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookings.filter(t => t.status === 'dispatched').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Route</CardTitle>
            <MapPin className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookings.filter(t => t.status === 'picked_up').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Arrived</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookings.filter(t => t.status === 'arrived').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Idle / Available</CardTitle>
            <Car className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cars.filter(c => c.status === 'available').length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Map */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Live Map</CardTitle>
            <CardDescription>Real-time location of all active trips</CardDescription>
          </CardHeader>
          <CardContent>
            <MapComponent
              trips={filteredTrips}
              carLocations={filteredCarLocations}
              selectedTrip={selectedBooking}
              onSelectTrip={setSelectedBooking}
              getDriver={getDriver}
              getCar={getCar}
              carPaths={displayPaths}
              showAllRoutes={showAllRoutes}
            />
          </CardContent>
        </Card>

        {/* Selected Trip Details */}
        <Card>
          <CardHeader>
            <CardTitle>Trip Details</CardTitle>
            <CardDescription>
              {selectedTripData ? `Booking #${selectedTripData.bookingNumber}` : 'Select a trip to view details'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedTripData ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getStatusBadge(selectedTripData.status)}>
                      {formatStatus(selectedTripData.status)}
                    </Badge>
                    {delayMins && (
                      <Badge variant="destructive" className="bg-red-500 hover:bg-red-600">
                        Delayed by {delayMins} mins
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {selectedTripData.tripType.split('_').join(' ').toUpperCase()}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{selectedTripData.customerName}</p>
                      <p className="text-xs text-muted-foreground">{selectedTripData.customerPhone}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 mt-1 text-green-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Pickup</p>
                      <p className="text-sm">{selectedTripData.pickupLocation}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 mt-1 text-red-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Drop</p>
                      <p className="text-sm">{selectedTripData.dropLocation}</p>
                    </div>
                  </div>

                  {selectedTripData.driverId && (
                    <div className="flex items-start gap-3">
                      <User className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Driver</p>
                        <p className="text-sm font-medium">{getDriver(selectedTripData.driverId)?.name}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs">{getDriver(selectedTripData.driverId)?.phone}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedTripData.carId && (
                    <div className="flex items-start gap-3">
                      <Car className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Vehicle</p>
                        <p className="text-sm font-medium">{getCar(selectedTripData.carId)?.registrationNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {getCar(selectedTripData.carId)?.make} {getCar(selectedTripData.carId)?.model}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedTripData.carId && carLocations.find(l => l.carId === selectedTripData.carId) && (
                    <div className="flex items-start gap-3">
                      <Navigation className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Current Speed</p>
                        <p className="text-sm font-medium">
                          {carLocations.find(l => l.carId === selectedTripData.carId)?.speed.toFixed(0)} km/h
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Estimated Fare</span>
                    <span className="text-lg font-semibold">₹{selectedTripData.estimatedFare.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MapPin className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Select a trip from the map or list to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Trips Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
            <div>
              <CardTitle>{historyFrom || historyTo ? 'Filtered Trips' : 'Active Trips'}</CardTitle>
              <CardDescription>{filteredTrips.length} trips found</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by car, driver, customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-72"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Idle / Available</SelectItem>
                  <SelectItem value="dispatched">Dispatched</SelectItem>
                  <SelectItem value="arrived">Arrived</SelectItem>
                  <SelectItem value="picked_up">Picked Up</SelectItem>
                  <SelectItem value="dropped">Dropped</SelectItem>
                  {(historyFrom || historyTo) && <SelectItem value="closed">Closed</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">History Route From:</span>
              <Input type="datetime-local" value={historyFrom} onChange={e => setHistoryFrom(e.target.value)} className="w-auto h-9" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">To:</span>
              <Input type="datetime-local" value={historyTo} onChange={e => setHistoryTo(e.target.value)} className="w-auto h-9" />
            </div>
            {(historyFrom || historyTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setHistoryFrom(''); setHistoryTo(''); }}>Clear Time</Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTrips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {historyFrom || historyTo ? 'No trips found for this time range' : 'No active trips found'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTrips.map((trip) => {
                  const driver = getDriver(trip.driverId || '')
                  const car = getCar(trip.carId || '')
                  return (
                    <TableRow
                      key={trip.id}
                      className={`cursor-pointer ${selectedBooking === trip.id ? 'bg-muted/50' : ''}`}
                      onClick={() => setSelectedBooking(trip.id)}
                    >
                      <TableCell className="font-mono font-medium">{trip.bookingNumber}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{trip.customerName}</p>
                          <p className="text-xs text-muted-foreground">{trip.customerPhone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {driver ? (
                          <div>
                            <p className="text-sm">{driver.name}</p>
                            <p className="text-xs text-muted-foreground">{driver.phone}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {car ? (
                          <span className="font-mono text-sm">{car.registrationNumber}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="text-xs truncate">{trip.pickupLocation}</p>
                          <p className="text-xs text-muted-foreground truncate">→ {trip.dropLocation}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusBadge(trip.status)}>
                          {formatStatus(trip.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedBooking(trip.id)}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
