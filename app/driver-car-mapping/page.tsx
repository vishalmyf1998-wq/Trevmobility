// @ts-nocheck
'use client'

import { useState, useMemo } from 'react'
import { useAdmin } from '@/lib/admin-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  Search,
  Link2,
  Unlink,
  Car,
  User,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react'

export default function DriverCarMappingPage() {
  const {
    drivers,
    cars,
    carCategories,
    getCarCategory,
    getDriver,
    getCar,
    mapDriverToCar,
    unmapDriverFromCar,
    bookings,
  } = useAdmin()

  const [searchQuery, setSearchQuery] = useState('')
  const [isMapDialogOpen, setIsMapDialogOpen] = useState(false)
  const [isUnmapDialogOpen, setIsUnmapDialogOpen] = useState(false)
  const [selectedDriverId, setSelectedDriverId] = useState<string>('')
  const [selectedCarId, setSelectedCarId] = useState<string>('')
  const [unmappingDriver, setUnmappingDriver] = useState<{ id: string; name: string; carNumber: string } | null>(null)

  // Get mapped and unmapped drivers/cars
  const mappedDrivers = useMemo(() => {
    return drivers.filter(d => d.assignedCarId)
  }, [drivers])

  const unmappedDrivers = useMemo(() => {
    return drivers.filter(d => !d.assignedCarId && d.status === 'active')
  }, [drivers])

  const unmappedCars = useMemo(() => {
    return cars.filter(c => !c.assignedDriverId && c.status !== 'maintenance')
  }, [cars])

  // Filter based on search
  const filteredMappings = useMemo(() => {
    return mappedDrivers.filter(driver => {
      const car = getCar(driver.assignedCarId!)
      const searchLower = searchQuery.toLowerCase()
      return (
        driver.name.toLowerCase().includes(searchLower) ||
        driver.driverId.toLowerCase().includes(searchLower) ||
        driver.phone.includes(searchQuery) ||
        car?.registrationNumber.toLowerCase().includes(searchLower)
      )
    })
  }, [mappedDrivers, searchQuery, getCar])

  // Check if driver is currently on a trip
  const isDriverOnTrip = (driverId: string) => {
    return bookings.some(b => 
      b.driverId === driverId && 
      ['dispatched', 'arrived', 'picked_up'].includes(b.status)
    )
  }

  const handleMapDriver = () => {
    if (!selectedDriverId || !selectedCarId) {
      toast.error('Please select both driver and car')
      return
    }

    const result = mapDriverToCar(selectedDriverId, selectedCarId)
    
    if (result.success) {
      const driver = getDriver(selectedDriverId)
      const car = getCar(selectedCarId)
      toast.success(`Successfully mapped ${driver?.name} to ${car?.registrationNumber}`)
      setIsMapDialogOpen(false)
      setSelectedDriverId('')
      setSelectedCarId('')
    } else {
      toast.error(result.error || 'Failed to map driver to car')
    }
  }

  const handleUnmapDriver = () => {
    if (!unmappingDriver) return

    if (isDriverOnTrip(unmappingDriver.id)) {
      toast.error('Cannot unmap driver while on an active trip')
      return
    }

    unmapDriverFromCar(unmappingDriver.id)
    toast.success(`Successfully unmapped ${unmappingDriver.name} from ${unmappingDriver.carNumber}`)
    setIsUnmapDialogOpen(false)
    setUnmappingDriver(null)
  }

  const openUnmapDialog = (driverId: string) => {
    const driver = getDriver(driverId)
    const car = driver?.assignedCarId ? getCar(driver.assignedCarId) : null
    
    if (driver && car) {
      setUnmappingDriver({
        id: driver.id,
        name: driver.name,
        carNumber: car.registrationNumber
      })
      setIsUnmapDialogOpen(true)
    }
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Driver-Car Mapping</h1>
          <p className="text-muted-foreground">
            Manage driver and car assignments. Each driver can only be mapped to one car at a time.
          </p>
        </div>
        <Button onClick={() => setIsMapDialogOpen(true)}>
          <Link2 className="mr-2 h-4 w-4" />
          Create Mapping
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Mappings</p>
                <p className="text-2xl font-bold">{mappedDrivers.length}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Link2 className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unmapped Drivers</p>
                <p className="text-2xl font-bold">{unmappedDrivers.length}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <User className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unmapped Cars</p>
                <p className="text-2xl font-bold">{unmappedCars.length}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Car className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Drivers On Trip</p>
                <p className="text-2xl font-bold">
                  {mappedDrivers.filter(d => isDriverOnTrip(d.id)).length}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Mapped and Unmapped */}
      <Tabs defaultValue="mapped" className="space-y-4">
        <TabsList>
          <TabsTrigger value="mapped">
            Mapped ({mappedDrivers.length})
          </TabsTrigger>
          <TabsTrigger value="unmapped-drivers">
            Unmapped Drivers ({unmappedDrivers.length})
          </TabsTrigger>
          <TabsTrigger value="unmapped-cars">
            Unmapped Cars ({unmappedCars.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mapped">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Current Mappings</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search mappings..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver ID</TableHead>
                    <TableHead>Driver Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Car Number</TableHead>
                    <TableHead>Car Category</TableHead>
                    <TableHead>Car Model</TableHead>
                    <TableHead>Trip Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMappings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No mappings found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMappings.map((driver) => {
                      const car = getCar(driver.assignedCarId!)
                      const category = car ? getCarCategory(car.categoryId) : null
                      const onTrip = isDriverOnTrip(driver.id)

                      return (
                        <TableRow key={driver.id}>
                          <TableCell>
                            <span className="font-mono text-sm font-medium">{driver.driverId}</span>
                          </TableCell>
                          <TableCell className="font-medium">{driver.name}</TableCell>
                          <TableCell>{driver.phone}</TableCell>
                          <TableCell>
                            <span className="font-mono">{car?.registrationNumber}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{category?.name || 'N/A'}</Badge>
                          </TableCell>
                          <TableCell>
                            {car?.make} {car?.model}
                          </TableCell>
                          <TableCell>
                            {onTrip ? (
                              <Badge variant="default" className="bg-emerald-500">
                                <Car className="mr-1 h-3 w-3" />
                                On Trip
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Available
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openUnmapDialog(driver.id)}
                              disabled={onTrip}
                              className="text-destructive hover:text-destructive"
                            >
                              <Unlink className="mr-1 h-4 w-4" />
                              Unmap
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
        </TabsContent>

        <TabsContent value="unmapped-drivers">
          <Card>
            <CardHeader>
              <CardTitle>Unmapped Drivers</CardTitle>
              <CardDescription>
                Active drivers without an assigned car
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>License Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unmappedDrivers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        All active drivers are mapped
                      </TableCell>
                    </TableRow>
                  ) : (
                    unmappedDrivers.map((driver) => (
                      <TableRow key={driver.id}>
                        <TableCell>
                          <span className="font-mono text-sm font-medium">{driver.driverId}</span>
                        </TableCell>
                        <TableCell className="font-medium">{driver.name}</TableCell>
                        <TableCell>{driver.phone}</TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{driver.licenseNumber}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {driver.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedDriverId(driver.id)
                              setIsMapDialogOpen(true)
                            }}
                          >
                            <Link2 className="mr-1 h-4 w-4" />
                            Map to Car
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unmapped-cars">
          <Card>
            <CardHeader>
              <CardTitle>Unmapped Cars</CardTitle>
              <CardDescription>
                Cars without an assigned driver
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Registration</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Make / Model</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unmappedCars.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        All cars are mapped
                      </TableCell>
                    </TableRow>
                  ) : (
                    unmappedCars.map((car) => {
                      const category = getCarCategory(car.categoryId)
                      return (
                        <TableRow key={car.id}>
                          <TableCell>
                            <span className="font-mono font-medium">{car.registrationNumber}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{category?.name || 'N/A'}</Badge>
                          </TableCell>
                          <TableCell>
                            {car.make} {car.model}
                          </TableCell>
                          <TableCell>{car.year}</TableCell>
                          <TableCell>
                            <Badge
                              variant={car.status === 'available' ? 'secondary' : 'destructive'}
                            >
                              {car.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedCarId(car.id)
                                setIsMapDialogOpen(true)
                              }}
                              disabled={car.status === 'maintenance'}
                            >
                              <Link2 className="mr-1 h-4 w-4" />
                              Map to Driver
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
        </TabsContent>
      </Tabs>

      {/* Create Mapping Dialog */}
      <Dialog open={isMapDialogOpen} onOpenChange={setIsMapDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Driver-Car Mapping</DialogTitle>
            <DialogDescription>
              Select a driver and a car to create a mapping. Each driver can only be mapped to one car.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Driver</label>
              <Select
                value={selectedDriverId}
                onValueChange={setSelectedDriverId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an unmapped driver" />
                </SelectTrigger>
                <SelectContent>
                  {unmappedDrivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      <div className="flex flex-col">
                        <span>{driver.driverId} - {driver.name}</span>
                        <span className="text-xs text-muted-foreground">
                          Phone: {driver.phone}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                  {unmappedDrivers.length === 0 && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No unmapped drivers available
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Select Car</label>
              <Select
                value={selectedCarId}
                onValueChange={setSelectedCarId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an unmapped car" />
                </SelectTrigger>
                <SelectContent>
                  {unmappedCars.map((car) => {
                    const category = getCarCategory(car.categoryId)
                    return (
                      <SelectItem key={car.id} value={car.id}>
                        <div className="flex flex-col">
                          <span>{car.registrationNumber} - {car.make} {car.model}</span>
                          <span className="text-xs text-muted-foreground">
                            Category: {category?.name || 'N/A'}
                          </span>
                        </div>
                      </SelectItem>
                    )
                  })}
                  {unmappedCars.length === 0 && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No unmapped cars available
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Preview */}
            {selectedDriverId && selectedCarId && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Mapping Preview
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Driver</p>
                    <p className="font-medium">{getDriver(selectedDriverId)?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {getDriver(selectedDriverId)?.driverId}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Car</p>
                    <p className="font-medium">{getCar(selectedCarId)?.registrationNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {getCar(selectedCarId)?.make} {getCar(selectedCarId)?.model}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsMapDialogOpen(false)
                setSelectedDriverId('')
                setSelectedCarId('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMapDriver}
              disabled={!selectedDriverId || !selectedCarId}
            >
              <Link2 className="mr-2 h-4 w-4" />
              Create Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unmap Confirmation Dialog */}
      <AlertDialog open={isUnmapDialogOpen} onOpenChange={setIsUnmapDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Unmap
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unmap <strong>{unmappingDriver?.name}</strong> from{' '}
              <strong>{unmappingDriver?.carNumber}</strong>?
              <br /><br />
              This will remove the driver-car assignment. The driver will need to be mapped to a car again before they can be assigned to bookings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUnmappingDriver(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnmapDriver}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Unlink className="mr-2 h-4 w-4" />
              Unmap
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
