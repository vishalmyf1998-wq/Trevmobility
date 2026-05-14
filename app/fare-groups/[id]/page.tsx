'use client'

import { useState, use, useEffect } from 'react'
import { useAdmin, defaultPeakHour, defaultNightCharge } from '@/lib/admin-context'
import { 
  AirportFareConfig, RentalFareConfig, CityRideFareConfig, OutstationFareConfig,
  FareCalculationType, SlabConfig, PeakHourConfig, NightChargeConfig, ChargeType, RentalType, OutstationType,
  RouteConfig, PreBookingCharges
} from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Plus, Pencil, Trash2, Plane, Car, MapPin, Navigation, X, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const defaultPreBookingCharges: PreBookingCharges = {
  tollEnabled: false,
  tollAmount: 0,
  parkingEnabled: false,
  parkingAmount: 0,
  miscEnabled: false,
  miscDescription: '',
  miscAmount: 0,
}

const defaultShortNoticeCharge = {
  enabled: false,
  withinHours: 2,
  chargeType: 'flat' as ChargeType,
  chargeValue: 0
}

function FareGroupSettingsTab({ fareGroup, cities, onUpdate }: { fareGroup: any, cities: any[], onUpdate: (data: any) => void }) {
  const [cityHours, setCityHours] = useState<Record<string, number>>(fareGroup.cityAdvanceHours || {})
  const [globalHours, setGlobalHours] = useState<number | ''>(fareGroup.minAdvanceBookingHours ?? '')

  const handleSave = () => {
    onUpdate({ cityAdvanceHours: cityHours, minAdvanceBookingHours: globalHours === '' ? 0 : globalHours })
  }

  return (
    <Card>
      <CardHeader>
         <CardTitle>Advance Booking Rules</CardTitle>
         <CardDescription>Set global or city-wise minimum advance booking hours for this fare group. Specific fare configurations can override these.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
         <FieldGroup>
           <Field>
             <FieldLabel>Default Global Advance Booking (Hours)</FieldLabel>
             <Input type="number" placeholder="e.g. 2" value={globalHours} onChange={e => setGlobalHours(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)} className="w-64" />
           </Field>
         </FieldGroup>
         
         <div>
           <h3 className="text-sm font-medium mb-3">City-wise Overrides</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {cities.map(city => (
               <div key={city.id} className="flex items-center gap-3 bg-muted/50 p-3 rounded-lg border">
                 <span className="flex-1 text-sm font-medium">{city.name}</span>
                 <Input 
                   type="number" 
                   className="w-24 h-8" 
                   placeholder="Default"
                   value={cityHours[city.id] !== undefined ? cityHours[city.id] : ''} 
                   onChange={e => setCityHours(prev => { 
                     const val = e.target.value; 
                     const next = { ...prev };
                     if (val === '') delete next[city.id];
                     else next[city.id] = parseFloat(val) || 0;
                     return next;
                   })} 
                 />
                 <span className="text-xs text-muted-foreground">hrs</span>
               </div>
             ))}
           </div>
         </div>
         
         <Button onClick={handleSave}>Save Settings</Button>
      </CardContent>
    </Card>
  )
}

export default function FareConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { fareGroups, updateFareGroup, cities, airports, carCategories, getCity, getAirport, getAirportTerminal, getCarCategory } = useAdmin()
  
  const fareGroup = fareGroups.find(g => g.id === id)
  
  const [activeTab, setActiveTab] = useState('airport')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState<'airport' | 'rental' | 'city' | 'outstation'>('airport')
  const [editingFare, setEditingFare] = useState<AirportFareConfig | RentalFareConfig | CityRideFareConfig | OutstationFareConfig | null>(null)

  if (!fareGroup) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-muted-foreground">Fare group not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/fare-groups')}>
          Back to Fare Groups
        </Button>
      </div>
    )
  }

  const activeCities = cities.filter(c => c.isActive)
  const activeCategories = carCategories.filter(c => c.isActive)

  const handleAddFare = (type: 'airport' | 'rental' | 'city' | 'outstation') => {
    setDialogType(type)
    setEditingFare(null)
    setIsDialogOpen(true)
  }

  const handleEditFare = (fare: AirportFareConfig | RentalFareConfig | CityRideFareConfig | OutstationFareConfig, type: 'airport' | 'rental' | 'city' | 'outstation') => {
    setDialogType(type)
    setEditingFare(fare)
    setIsDialogOpen(true)
  }

  const handleDeleteFare = (fareId: string, type: 'airport' | 'rental' | 'city' | 'outstation') => {
    let updatedFares
    switch (type) {
      case 'airport':
        updatedFares = { airportFares: fareGroup.airportFares.filter(f => f.id !== fareId) }
        break
      case 'rental':
        updatedFares = { rentalFares: fareGroup.rentalFares.filter(f => f.id !== fareId) }
        break
      case 'city':
        updatedFares = { cityRideFares: fareGroup.cityRideFares.filter(f => f.id !== fareId) }
        break
      case 'outstation':
        updatedFares = { outstationFares: fareGroup.outstationFares.filter(f => f.id !== fareId) }
        break
    }
    updateFareGroup(fareGroup.id, updatedFares)
    toast.success('Fare configuration deleted')
  }

  const handleSaveFare = (fare: AirportFareConfig | RentalFareConfig | CityRideFareConfig | OutstationFareConfig) => {
    let updatedFares
    
    switch (dialogType) {
      case 'airport':
        const airportFare = fare as AirportFareConfig
        if (editingFare) {
          updatedFares = { airportFares: fareGroup.airportFares.map(f => f.id === editingFare.id ? airportFare : f) }
        } else {
          updatedFares = { airportFares: [...fareGroup.airportFares, airportFare] }
        }
        break
      case 'rental':
        const rentalFare = fare as RentalFareConfig
        if (editingFare) {
          updatedFares = { rentalFares: fareGroup.rentalFares.map(f => f.id === editingFare.id ? rentalFare : f) }
        } else {
          updatedFares = { rentalFares: [...fareGroup.rentalFares, rentalFare] }
        }
        break
      case 'city':
        const cityFare = fare as CityRideFareConfig
        if (editingFare) {
          updatedFares = { cityRideFares: fareGroup.cityRideFares.map(f => f.id === editingFare.id ? cityFare : f) }
        } else {
          updatedFares = { cityRideFares: [...fareGroup.cityRideFares, cityFare] }
        }
        break
      case 'outstation':
        const outstationFare = fare as OutstationFareConfig
        if (editingFare) {
          updatedFares = { outstationFares: fareGroup.outstationFares.map(f => f.id === editingFare.id ? outstationFare : f) }
        } else {
          updatedFares = { outstationFares: [...fareGroup.outstationFares, outstationFare] }
        }
        break
    }
    
    updateFareGroup(fareGroup.id, updatedFares)
    toast.success(editingFare ? 'Fare configuration updated' : 'Fare configuration added')
    setIsDialogOpen(false)
    setEditingFare(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/fare-groups">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground">{fareGroup.name}</h1>
            <Badge variant={fareGroup.type === 'B2C' ? 'default' : 'secondary'}>{fareGroup.type}</Badge>
          </div>
          <p className="text-muted-foreground">{fareGroup.description || 'Configure fares for this group'}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 max-w-3xl">
          <TabsTrigger value="airport" className="flex items-center gap-2">
            <Plane className="h-4 w-4" />
            Airport
          </TabsTrigger>
          <TabsTrigger value="rental" className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            Rentals
          </TabsTrigger>
          <TabsTrigger value="city" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            City Ride
          </TabsTrigger>
          <TabsTrigger value="outstation" className="flex items-center gap-2">
            <Navigation className="h-4 w-4" />
            Outstation
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="airport" className="mt-6">
          <AirportFaresTab
            fares={fareGroup.airportFares}
            cities={activeCities}
            categories={activeCategories}
            getCity={getCity}
            getAirport={getAirport}
            getAirportTerminal={getAirportTerminal}
            getCarCategory={getCarCategory}
            onAdd={() => handleAddFare('airport')}
            onEdit={(fare) => handleEditFare(fare, 'airport')}
            onDelete={(id) => handleDeleteFare(id, 'airport')}
          />
        </TabsContent>

        <TabsContent value="rental" className="mt-6">
          <RentalFaresTab
            fares={fareGroup.rentalFares}
            cities={activeCities}
            categories={activeCategories}
            getCity={getCity}
            getCarCategory={getCarCategory}
            onAdd={() => handleAddFare('rental')}
            onEdit={(fare) => handleEditFare(fare, 'rental')}
            onDelete={(id) => handleDeleteFare(id, 'rental')}
          />
        </TabsContent>

        <TabsContent value="city" className="mt-6">
          <CityRideFaresTab
            fares={fareGroup.cityRideFares}
            cities={activeCities}
            categories={activeCategories}
            getCity={getCity}
            getCarCategory={getCarCategory}
            onAdd={() => handleAddFare('city')}
            onEdit={(fare) => handleEditFare(fare, 'city')}
            onDelete={(id) => handleDeleteFare(id, 'city')}
          />
        </TabsContent>

        <TabsContent value="outstation" className="mt-6">
          <OutstationFaresTab
            fares={fareGroup.outstationFares}
            cities={activeCities}
            categories={activeCategories}
            getCity={getCity}
            getCarCategory={getCarCategory}
            onAdd={() => handleAddFare('outstation')}
            onEdit={(fare) => handleEditFare(fare, 'outstation')}
            onDelete={(id) => handleDeleteFare(id, 'outstation')}
          />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <FareGroupSettingsTab fareGroup={fareGroup} cities={activeCities} onUpdate={(updates) => updateFareGroup(fareGroup.id, updates)} />
        </TabsContent>
      </Tabs>

      {/* Fare Configuration Dialog */}
      <FareConfigDialog
        isOpen={isDialogOpen}
        onClose={() => { setIsDialogOpen(false); setEditingFare(null) }}
        type={dialogType}
        cities={activeCities}
        categories={activeCategories}
        airports={airports.filter(airport => airport.isActive)}
        editingFare={editingFare}
        onSave={handleSaveFare}
      />
    </div>
  )
}

// Airport Fares Tab Component
function AirportFaresTab({
  fares, cities, categories, getCity, getAirport, getAirportTerminal, getCarCategory, onAdd, onEdit, onDelete
}: {
  fares: AirportFareConfig[]
  cities: { id: string; name: string }[]
  categories: { id: string; name: string }[]
  getCity: (id: string) => { name: string } | undefined
  getAirport: (id: string) => { name: string; code: string } | undefined
  getAirportTerminal: (airportId: string, terminalId: string) => { name: string; code: string } | undefined
  getCarCategory: (id: string) => { name: string } | undefined
  onAdd: () => void
  onEdit: (fare: AirportFareConfig) => void
  onDelete: (id: string) => void
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Airport Pickup & Drop Fares</CardTitle>
            <CardDescription>Configure airport and terminal specific fares for pickup, drop, or both</CardDescription>
          </div>
          <Button onClick={onAdd} disabled={cities.length === 0 || categories.length === 0}>
            <Plus className="mr-2 h-4 w-4" />
            Add Airport Fare
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {cities.length === 0 || categories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Please add cities and car categories first
          </div>
        ) : fares.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No airport fares configured yet
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>City</TableHead>
                <TableHead>Airport / Terminal</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Calculation</TableHead>
                <TableHead>Base Fare</TableHead>
                <TableHead>Pre-Booking</TableHead>
                <TableHead>Peak/Night</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fares.map((fare) => (
                <TableRow key={fare.id}>
                  <TableCell>{getCity(fare.cityId)?.name || '-'}</TableCell>
                  <TableCell>
                    {fare.airportId ? (
                      <div>
                        <div className="font-medium">{getAirport(fare.airportId)?.code || '-'}</div>
                        <div className="text-xs text-muted-foreground">
                          {fare.airportTerminalIds?.length
                            ? fare.airportTerminalIds
                                .map((terminalId) => getAirportTerminal(fare.airportId!, terminalId)?.code || terminalId)
                                .join(', ')
                            : fare.airportTerminalId
                              ? getAirportTerminal(fare.airportId, fare.airportTerminalId)?.name || '-'
                              : 'All terminals'}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Any airport</span>
                    )}
                  </TableCell>
                  <TableCell>{getCarCategory(fare.carCategoryId)?.name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {fare.type === 'pickup' ? 'Pickup' : fare.type === 'drop' ? 'Drop' : 'Both'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{fare.calculationType}</Badge>
                  </TableCell>
                  <TableCell>
                    {fare.calculationType === 'fixed' && `Rs. ${fare.fixedFare}`}
                    {fare.calculationType === 'per_km' && `Rs. ${fare.perKmRate}/km`}
                    {fare.calculationType === 'slab' && `${fare.slabs?.length || 0} slabs`}
                  </TableCell>
                  <TableCell>
                    {fare.preBookingCharges && (fare.preBookingCharges.tollEnabled || fare.preBookingCharges.parkingEnabled || fare.preBookingCharges.miscEnabled) ? (
                      <span className="text-xs text-muted-foreground">
                        {[
                          fare.preBookingCharges.tollEnabled && `Toll: Rs.${fare.preBookingCharges.tollAmount}`,
                          fare.preBookingCharges.parkingEnabled && `Park: Rs.${fare.preBookingCharges.parkingAmount}`,
                          fare.preBookingCharges.miscEnabled && `Misc: Rs.${fare.preBookingCharges.miscAmount}`,
                        ].filter(Boolean).join(', ')}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      {fare.peakHour.enabled && (
                        <span className="text-xs">Peak: {fare.peakHour.chargeValue}{fare.peakHour.chargeType === 'percentage' ? '%' : ' Rs.'}</span>
                      )}
                      {fare.nightCharge.enabled && (
                        <span className="text-xs">Night: {fare.nightCharge.chargeValue}{fare.nightCharge.chargeType === 'percentage' ? '%' : ' Rs.'}</span>
                      )}
                      {(fare as any).shortNoticeCharge?.enabled && (
                        <span className="text-xs">Urgent: {(fare as any).shortNoticeCharge.chargeValue}{(fare as any).shortNoticeCharge.chargeType === 'percentage' ? '%' : ' Rs.'}</span>
                      )}
                      {!fare.peakHour.enabled && !fare.nightCharge.enabled && (
                        <span className="text-muted-foreground text-xs">Off</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(fare)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Fare</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this fare configuration?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(fare.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

// Rental Fares Tab Component
function RentalFaresTab({
  fares, cities, categories, getCity, getCarCategory, onAdd, onEdit, onDelete
}: {
  fares: RentalFareConfig[]
  cities: { id: string; name: string }[]
  categories: { id: string; name: string }[]
  getCity: (id: string) => { name: string } | undefined
  getCarCategory: (id: string) => { name: string } | undefined
  onAdd: () => void
  onEdit: (fare: RentalFareConfig) => void
  onDelete: (id: string) => void
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Rental Fares</CardTitle>
            <CardDescription>Configure hourly/km package fares with optional capping</CardDescription>
          </div>
          <Button onClick={onAdd} disabled={cities.length === 0 || categories.length === 0}>
            <Plus className="mr-2 h-4 w-4" />
            Add Rental Fare
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {cities.length === 0 || categories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Please add cities and car categories first
          </div>
        ) : fares.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No rental fares configured yet
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>City</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Package Fare</TableHead>
                <TableHead>Extra Rates</TableHead>
                <TableHead>KM Capping</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fares.map((fare) => (
                <TableRow key={fare.id}>
                  <TableCell>{getCity(fare.cityId)?.name || '-'}</TableCell>
                  <TableCell>{getCarCategory(fare.carCategoryId)?.name || '-'}</TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {fare.rentalType === 'with_capping'
                        ? `${fare.packageHours}h / ${fare.packageKm || 0}km`
                        : `${fare.packageHours}h`}
                    </span>
                  </TableCell>
                  <TableCell>Rs. {fare.packageFare}</TableCell>
                  <TableCell>
                    <span className="text-xs">Rs. {fare.extraKmRate}/km, Rs. {fare.extraHourRate}/hr</span>
                  </TableCell>
                  <TableCell>
                    {fare.rentalType === 'with_capping' ? (
                      <Badge variant="outline">{fare.kmCapping} km cap</Badge>
                    ) : (
                      <Badge variant="secondary">No cap</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(fare)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Fare</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this fare configuration?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(fare.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

// City Ride Fares Tab Component
function CityRideFaresTab({
  fares, cities, categories, getCity, getCarCategory, onAdd, onEdit, onDelete
}: {
  fares: CityRideFareConfig[]
  cities: { id: string; name: string }[]
  categories: { id: string; name: string }[]
  getCity: (id: string) => { name: string } | undefined
  getCarCategory: (id: string) => { name: string } | undefined
  onAdd: () => void
  onEdit: (fare: CityRideFareConfig) => void
  onDelete: (id: string) => void
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>City Ride Fares</CardTitle>
            <CardDescription>Configure fares for within-city rides</CardDescription>
          </div>
          <Button onClick={onAdd} disabled={cities.length === 0 || categories.length === 0}>
            <Plus className="mr-2 h-4 w-4" />
            Add City Ride Fare
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {cities.length === 0 || categories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Please add cities and car categories first
          </div>
        ) : fares.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No city ride fares configured yet
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>City</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Calculation</TableHead>
                <TableHead>Fare Details</TableHead>
                <TableHead>Per Min Rate</TableHead>
                <TableHead>Peak Hour</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fares.map((fare) => (
                <TableRow key={fare.id}>
                  <TableCell>{getCity(fare.cityId)?.name || '-'}</TableCell>
                  <TableCell>{getCarCategory(fare.carCategoryId)?.name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{fare.calculationType}</Badge>
                  </TableCell>
                  <TableCell>
                    {fare.calculationType === 'fixed' && `Rs. ${fare.fixedFare}`}
                    {fare.calculationType === 'per_km' && `Rs. ${fare.perKmRate}/km`}
                    {fare.calculationType === 'slab' && `${fare.slabs?.length || 0} slabs`}
                  </TableCell>
                  <TableCell>Rs. {fare.perMinuteRate}</TableCell>
                  <TableCell>
                    {fare.peakHour.enabled ? (
                      <span className="text-xs">{fare.peakHour.chargeValue}{fare.peakHour.chargeType === 'percentage' ? '%' : ' Rs.'}</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">Off</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(fare)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Fare</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this fare configuration?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(fare.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

// Outstation Fares Tab Component
function OutstationFaresTab({
  fares, cities, categories, getCity, getCarCategory, onAdd, onEdit, onDelete
}: {
  fares: OutstationFareConfig[]
  cities: { id: string; name: string }[]
  categories: { id: string; name: string }[]
  getCity: (id: string) => { name: string } | undefined
  getCarCategory: (id: string) => { name: string } | undefined
  onAdd: () => void
  onEdit: (fare: OutstationFareConfig) => void
  onDelete: (id: string) => void
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Outstation Fares</CardTitle>
            <CardDescription>Configure fares for inter-city travel (one-way, round trip, route-wise)</CardDescription>
          </div>
          <Button onClick={onAdd} disabled={cities.length === 0 || categories.length === 0}>
            <Plus className="mr-2 h-4 w-4" />
            Add Outstation Fare
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {cities.length === 0 || categories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Please add cities and car categories first
          </div>
        ) : fares.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No outstation fares configured yet
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>City</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Rates</TableHead>
                <TableHead>Driver Allowance</TableHead>
                <TableHead>Min KM/Day</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fares.map((fare) => (
                <TableRow key={fare.id}>
                  <TableCell>{getCity(fare.cityId)?.name || '-'}</TableCell>
                  <TableCell>{getCarCategory(fare.carCategoryId)?.name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{fare.outstationType.replace('_', ' ')}</Badge>
                  </TableCell>
                  <TableCell>
                    {fare.outstationType === 'one_way' && `${fare.slabs?.length || 0} slabs`}
                    {fare.outstationType === 'round_trip' && `Rs. ${fare.roundTripPerKmRate}/km`}
                    {fare.outstationType === 'route_wise' && `${fare.routes?.length || 0} routes`}
                  </TableCell>
                  <TableCell>Rs. {fare.driverAllowancePerDay}/day</TableCell>
                  <TableCell>{fare.minimumKmPerDay} km</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(fare)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Fare</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this fare configuration?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(fare.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

// Fare Configuration Dialog
function FareConfigDialog({
  isOpen, onClose, type, cities, categories, airports, editingFare, onSave
}: {
  isOpen: boolean
  onClose: () => void
  type: 'airport' | 'rental' | 'city' | 'outstation'
  cities: { id: string; name: string }[]
  categories: { id: string; name: string }[]
  airports: { id: string; cityId: string; name: string; code: string; terminals: { id: string; name: string; code: string; isActive: boolean }[] }[]
  editingFare: AirportFareConfig | RentalFareConfig | CityRideFareConfig | OutstationFareConfig | null
  onSave: (fare: AirportFareConfig | RentalFareConfig | CityRideFareConfig | OutstationFareConfig) => void
}) {
  const { cities: allCities, getCity } = useAdmin()
  const generateId = () => Math.random().toString(36).substring(2, 11)
  
  // Airport fare state
  const [airportForm, setAirportForm] = useState<Partial<AirportFareConfig>>({
    cityId: '',
    airportId: undefined,
    airportTerminalId: undefined,
    airportTerminalIds: [],
    carCategoryId: '',
    type: 'pickup',
    calculationType: 'fixed',
    fixedFare: 500,
    perKmRate: 15,
    baseFare: 50,
    minimumFare: 200,
    waitingChargePerMin: 2,
    freeWaitingMinutes: 0,
    peakHour: { ...defaultPeakHour },
    nightCharge: { ...defaultNightCharge },
    shortNoticeCharge: { ...defaultShortNoticeCharge },
    slabs: [],
    preBookingCharges: { ...defaultPreBookingCharges },
    minAdvanceBookingHours: undefined as number | undefined,
  })
  const airportOptions = airports.filter(airport => airport.cityId === airportForm.cityId)
  const selectedAirport = airports.find(airport => airport.id === airportForm.airportId)
  const terminalOptions = selectedAirport?.terminals.filter(terminal => terminal.isActive) || []

  // Rental fare state
  const [rentalForm, setRentalForm] = useState<Partial<RentalFareConfig> & { minAdvanceBookingHours?: number }>({
    cityId: '',
    carCategoryId: '',
    rentalType: 'without_capping',
    packageHours: 4,
    packageKm: undefined,
    packageFare: 1500,
    extraKmRate: 15,
    extraHourRate: 150,
    freeWaitingMinutes: 0,
    kmCapping: 100,
    peakHour: { ...defaultPeakHour },
    nightCharge: { ...defaultNightCharge },
    shortNoticeCharge: { ...defaultShortNoticeCharge },
    preBookingCharges: { ...defaultPreBookingCharges },
    minAdvanceBookingHours: undefined,
  })

  // City ride fare state
  const [cityForm, setCityForm] = useState<Partial<CityRideFareConfig> & { minAdvanceBookingHours?: number }>({
    cityId: '',
    carCategoryId: '',
    calculationType: 'per_km',
    fixedFare: 500,
    perKmRate: 12,
    baseFare: 50,
    minimumFare: 100,
    perMinuteRate: 1,
    freeWaitingMinutes: 0,
    peakHour: { ...defaultPeakHour },
    nightCharge: { ...defaultNightCharge },
    shortNoticeCharge: { ...defaultShortNoticeCharge },
    slabs: [],
    preBookingCharges: { ...defaultPreBookingCharges },
    minAdvanceBookingHours: undefined,
  })

  // Outstation fare state
  const [outstationForm, setOutstationForm] = useState<Partial<OutstationFareConfig> & { minAdvanceBookingHours?: number }>({
    cityId: '',
    carCategoryId: '',
    outstationType: 'one_way',
    oneWayPerKmRate: 12,
    roundTripPerKmRate: 10,
    driverAllowancePerDay: 400,
    nightHaltCharge: 700,
    minimumKmPerDay: 250,
    freeWaitingMinutes: 0,
    peakHour: { ...defaultPeakHour },
    nightCharge: { ...defaultNightCharge },
    shortNoticeCharge: { ...defaultShortNoticeCharge },
    routes: [],
    slabs: [],
    preBookingCharges: { ...defaultPreBookingCharges },
    minAdvanceBookingHours: undefined,
  })

  // Reset forms when dialog opens with editing data
  useEffect(() => {
    if (isOpen) {
      if (editingFare) {
        switch (type) {
          case 'airport':
            setAirportForm({
              ...(editingFare as AirportFareConfig),
              airportTerminalIds:
                (editingFare as AirportFareConfig).airportTerminalIds ||
                ((editingFare as AirportFareConfig).airportTerminalId ? [(editingFare as AirportFareConfig).airportTerminalId!] : []),
              freeWaitingMinutes: (editingFare as AirportFareConfig).freeWaitingMinutes || 0,
              preBookingCharges: (editingFare as AirportFareConfig).preBookingCharges || { ...defaultPreBookingCharges },
              shortNoticeCharge: (editingFare as any).shortNoticeCharge || { ...defaultShortNoticeCharge },
              minAdvanceBookingHours: (editingFare as any).minAdvanceBookingHours,
            })
            break
          case 'rental':
            setRentalForm({
              ...(editingFare as RentalFareConfig),
              packageKm: (editingFare as RentalFareConfig).rentalType === 'with_capping' ? (editingFare as RentalFareConfig).packageKm : undefined,
              freeWaitingMinutes: (editingFare as RentalFareConfig).freeWaitingMinutes || 0,
              preBookingCharges: (editingFare as RentalFareConfig).preBookingCharges || { ...defaultPreBookingCharges },
              shortNoticeCharge: (editingFare as any).shortNoticeCharge || { ...defaultShortNoticeCharge },
              minAdvanceBookingHours: (editingFare as any).minAdvanceBookingHours,
            })
            break
          case 'city':
            setCityForm({
              ...(editingFare as CityRideFareConfig),
              freeWaitingMinutes: (editingFare as CityRideFareConfig).freeWaitingMinutes || 0,
              preBookingCharges: (editingFare as CityRideFareConfig).preBookingCharges || { ...defaultPreBookingCharges },
              shortNoticeCharge: (editingFare as any).shortNoticeCharge || { ...defaultShortNoticeCharge },
              minAdvanceBookingHours: (editingFare as any).minAdvanceBookingHours,
            })
            break
          case 'outstation':
            setOutstationForm({
              ...(editingFare as OutstationFareConfig),
              freeWaitingMinutes: (editingFare as OutstationFareConfig).freeWaitingMinutes || 0,
              preBookingCharges: (editingFare as OutstationFareConfig).preBookingCharges || { ...defaultPreBookingCharges },
              slabs: (editingFare as OutstationFareConfig).slabs || [],
              shortNoticeCharge: (editingFare as any).shortNoticeCharge || { ...defaultShortNoticeCharge },
              minAdvanceBookingHours: (editingFare as any).minAdvanceBookingHours,
            })
            break
        }
      } else {
        // Reset to defaults for new fare
        setAirportForm({
          cityId: '',
          airportId: undefined,
          airportTerminalId: undefined,
          airportTerminalIds: [],
          carCategoryId: '',
          type: 'pickup',
          calculationType: 'fixed',
          fixedFare: 500,
          perKmRate: 15,
          baseFare: 50,
          minimumFare: 200,
          waitingChargePerMin: 2,
          freeWaitingMinutes: 0,
          peakHour: { ...defaultPeakHour },
          nightCharge: { ...defaultNightCharge },
          shortNoticeCharge: { ...defaultShortNoticeCharge },
          slabs: [],
          preBookingCharges: { ...defaultPreBookingCharges },
          minAdvanceBookingHours: undefined,
        })
        setRentalForm({
          cityId: '',
          carCategoryId: '',
          rentalType: 'without_capping',
          packageHours: 4,
          packageKm: undefined,
          packageFare: 1500,
          extraKmRate: 15,
          extraHourRate: 150,
          freeWaitingMinutes: 0,
          kmCapping: 100,
          peakHour: { ...defaultPeakHour },
          nightCharge: { ...defaultNightCharge },
          shortNoticeCharge: { ...defaultShortNoticeCharge },
          preBookingCharges: { ...defaultPreBookingCharges },
          minAdvanceBookingHours: undefined,
        })
        setCityForm({
          cityId: '',
          carCategoryId: '',
          calculationType: 'per_km',
          fixedFare: 500,
          perKmRate: 12,
          baseFare: 50,
          minimumFare: 100,
          perMinuteRate: 1,
          freeWaitingMinutes: 0,
          peakHour: { ...defaultPeakHour },
          nightCharge: { ...defaultNightCharge },
          shortNoticeCharge: { ...defaultShortNoticeCharge },
          slabs: [],
          preBookingCharges: { ...defaultPreBookingCharges },
          minAdvanceBookingHours: undefined,
        })
        setOutstationForm({
          cityId: '',
          carCategoryId: '',
          outstationType: 'one_way',
          oneWayPerKmRate: 12,
          roundTripPerKmRate: 10,
          driverAllowancePerDay: 400,
          nightHaltCharge: 700,
          minimumKmPerDay: 250,
          freeWaitingMinutes: 0,
          peakHour: { ...defaultPeakHour },
          nightCharge: { ...defaultNightCharge },
          shortNoticeCharge: { ...defaultShortNoticeCharge },
          routes: [],
          slabs: [],
          preBookingCharges: { ...defaultPreBookingCharges },
          minAdvanceBookingHours: undefined,
        })
      }
    }
  }, [isOpen, editingFare, type])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    switch (type) {
      case 'airport':
        if (!airportForm.airportId || !airportForm.airportTerminalIds?.length) {
          toast.error('Please select airport and at least one terminal')
          return
        }
        onSave({
          ...airportForm,
          airportTerminalId: airportForm.airportTerminalIds[0],
          id: editingFare?.id || generateId(),
        } as AirportFareConfig)
        break
      case 'rental':
        onSave({
          ...rentalForm,
          packageKm: rentalForm.rentalType === 'with_capping' ? rentalForm.packageKm : undefined,
          id: editingFare?.id || generateId(),
        } as RentalFareConfig)
        break
      case 'city':
        onSave({
          ...cityForm,
          id: editingFare?.id || generateId(),
        } as CityRideFareConfig)
        break
      case 'outstation':
        onSave({
          ...outstationForm,
          id: editingFare?.id || generateId(),
        } as OutstationFareConfig)
        break
    }
  }

  // Slab configuration helper
  const renderSlabConfig = (
    slabs: SlabConfig[],
    onChange: (slabs: SlabConfig[]) => void
  ) => (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-medium text-sm">Slab Configuration</p>
          <p className="text-xs text-muted-foreground">Define distance-based fare slabs</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const lastSlab = slabs[slabs.length - 1]
            const newSlab: SlabConfig = {
              id: generateId(),
              fromKm: lastSlab ? lastSlab.toKm : 0,
              toKm: lastSlab ? lastSlab.toKm + 5 : 5,
              farePerKm: 15,
            }
            onChange([...slabs, newSlab])
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Slab
        </Button>
      </div>
      {slabs.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-4">No slabs configured. Add a slab to define distance-based pricing.</p>
      ) : (
        <div className="space-y-3">
          {slabs.map((slab, index) => (
            <div key={slab.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex-1 grid grid-cols-3 gap-3">
                <Field>
                  <FieldLabel className="text-xs">From (KM)</FieldLabel>
                  <Input
                    type="number"
                    value={slab.fromKm}
                    onChange={(e) => {
                      const updated = [...slabs]
                      updated[index] = { ...slab, fromKm: parseFloat(e.target.value) }
                      onChange(updated)
                    }}
                  />
                </Field>
                <Field>
                  <FieldLabel className="text-xs">To (KM)</FieldLabel>
                  <Input
                    type="number"
                    value={slab.toKm}
                    onChange={(e) => {
                      const updated = [...slabs]
                      updated[index] = { ...slab, toKm: parseFloat(e.target.value) }
                      onChange(updated)
                    }}
                  />
                </Field>
                <Field>
                  <FieldLabel className="text-xs">Fare/KM (Rs.)</FieldLabel>
                  <Input
                    type="number"
                    value={slab.farePerKm}
                    onChange={(e) => {
                      const updated = [...slabs]
                      updated[index] = { ...slab, farePerKm: parseFloat(e.target.value) }
                      onChange(updated)
                    }}
                  />
                </Field>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => onChange(slabs.filter((_, i) => i !== index))}
              >
                <X className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // Route configuration helper
  const renderRouteConfig = (
    routes: RouteConfig[],
    onChange: (routes: RouteConfig[]) => void,
    originCityId: string
  ) => (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-medium text-sm">Route Configuration</p>
          <p className="text-xs text-muted-foreground">Define specific routes with fixed fares</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const newRoute: RouteConfig = {
              id: generateId(),
              fromCityId: originCityId,
              toCityId: '',
              distanceKm: 0,
              fare: 0,
            }
            onChange([...routes, newRoute])
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Route
        </Button>
      </div>
      {routes.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-4">No routes configured. Add routes to define city-to-city pricing.</p>
      ) : (
        <div className="space-y-3">
          {routes.map((route, index) => (
            <div key={route.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex-1 grid grid-cols-4 gap-3">
                <Field>
                  <FieldLabel className="text-xs">From City</FieldLabel>
                  <Input
                    value={getCity(route.fromCityId)?.name || 'Origin City'}
                    disabled
                    className="bg-muted"
                  />
                </Field>
                <Field>
                  <FieldLabel className="text-xs">To City</FieldLabel>
                  <Select
                    value={route.toCityId}
                    onValueChange={(value) => {
                      const updated = [...routes]
                      updated[index] = { ...route, toCityId: value }
                      onChange(updated)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCities.filter(c => c.isActive && c.id !== originCityId).map(city => (
                        <SelectItem key={city.id} value={city.id}>{city.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel className="text-xs">Distance (KM)</FieldLabel>
                  <Input
                    type="number"
                    value={route.distanceKm}
                    onChange={(e) => {
                      const updated = [...routes]
                      updated[index] = { ...route, distanceKm: parseFloat(e.target.value) }
                      onChange(updated)
                    }}
                  />
                </Field>
                <Field>
                  <FieldLabel className="text-xs">Fare (Rs.)</FieldLabel>
                  <Input
                    type="number"
                    value={route.fare}
                    onChange={(e) => {
                      const updated = [...routes]
                      updated[index] = { ...route, fare: parseFloat(e.target.value) }
                      onChange(updated)
                    }}
                  />
                </Field>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => onChange(routes.filter((_, i) => i !== index))}
              >
                <X className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // Pre-booking charges helper
  const renderPreBookingCharges = (
    charges: PreBookingCharges,
    onChange: (charges: PreBookingCharges) => void
  ) => (
    <div className="rounded-lg border p-4">
      <div className="mb-4">
        <p className="font-medium text-sm">Pre-Booking Charges (Optional)</p>
        <p className="text-xs text-muted-foreground">Add toll, parking, or miscellaneous charges</p>
      </div>
      <div className="space-y-4">
        {/* Toll Charges */}
        <div className="flex items-center gap-4">
          <Switch
            checked={charges.tollEnabled}
            onCheckedChange={(checked) => onChange({ ...charges, tollEnabled: checked })}
          />
          <div className="flex-1">
            <p className="text-sm font-medium">Toll Charges</p>
          </div>
          {charges.tollEnabled && (
            <div className="w-32">
              <Input
                type="number"
                placeholder="Amount"
                value={charges.tollAmount || ''}
                onChange={(e) => onChange({ ...charges, tollAmount: parseFloat(e.target.value) || 0 })}
              />
            </div>
          )}
        </div>

        {/* Parking Charges */}
        <div className="flex items-center gap-4">
          <Switch
            checked={charges.parkingEnabled}
            onCheckedChange={(checked) => onChange({ ...charges, parkingEnabled: checked })}
          />
          <div className="flex-1">
            <p className="text-sm font-medium">Parking Charges</p>
          </div>
          {charges.parkingEnabled && (
            <div className="w-32">
              <Input
                type="number"
                placeholder="Amount"
                value={charges.parkingAmount || ''}
                onChange={(e) => onChange({ ...charges, parkingAmount: parseFloat(e.target.value) || 0 })}
              />
            </div>
          )}
        </div>

        {/* Misc Charges */}
        <div className="flex items-center gap-4">
          <Switch
            checked={charges.miscEnabled}
            onCheckedChange={(checked) => onChange({ ...charges, miscEnabled: checked })}
          />
          <div className="flex-1">
            <p className="text-sm font-medium">Miscellaneous Charges</p>
          </div>
          {charges.miscEnabled && (
            <div className="flex gap-2 w-64">
              <Input
                placeholder="Description"
                value={charges.miscDescription}
                onChange={(e) => onChange({ ...charges, miscDescription: e.target.value })}
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="Amount"
                value={charges.miscAmount || ''}
                onChange={(e) => onChange({ ...charges, miscAmount: parseFloat(e.target.value) || 0 })}
                className="w-24"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderPeakHourConfig = (
    config: PeakHourConfig,
    onChange: (config: PeakHourConfig) => void
  ) => (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-medium text-sm">Peak Hour Charges</p>
          <p className="text-xs text-muted-foreground">Extra charges during busy hours</p>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={(checked) => onChange({ ...config, enabled: checked })}
        />
      </div>
      {config.enabled && (
        <div className="grid gap-4">
          <FieldGroup className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Start Time</FieldLabel>
              <Input
                type="time"
                value={config.startTime}
                onChange={(e) => onChange({ ...config, startTime: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel>End Time</FieldLabel>
              <Input
                type="time"
                value={config.endTime}
                onChange={(e) => onChange({ ...config, endTime: e.target.value })}
              />
            </Field>
          </FieldGroup>
          <FieldGroup className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Charge Type</FieldLabel>
              <Select
                value={config.chargeType}
                onValueChange={(value: ChargeType) => onChange({ ...config, chargeType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat Amount</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Charge Value</FieldLabel>
              <Input
                type="number"
                value={config.chargeValue}
                onChange={(e) => onChange({ ...config, chargeValue: parseFloat(e.target.value) })}
              />
            </Field>
          </FieldGroup>
        </div>
      )}
    </div>
  )

  const renderNightChargeConfig = (
    config: NightChargeConfig,
    onChange: (config: NightChargeConfig) => void
  ) => (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-medium text-sm">Night Charges</p>
          <p className="text-xs text-muted-foreground">Extra charges during night hours</p>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={(checked) => onChange({ ...config, enabled: checked })}
        />
      </div>
      {config.enabled && (
        <div className="grid gap-4">
          <FieldGroup className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Start Time</FieldLabel>
              <Input
                type="time"
                value={config.startTime}
                onChange={(e) => onChange({ ...config, startTime: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel>End Time</FieldLabel>
              <Input
                type="time"
                value={config.endTime}
                onChange={(e) => onChange({ ...config, endTime: e.target.value })}
              />
            </Field>
          </FieldGroup>
          <FieldGroup className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Charge Type</FieldLabel>
              <Select
                value={config.chargeType}
                onValueChange={(value: ChargeType) => onChange({ ...config, chargeType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat Amount</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Charge Value</FieldLabel>
              <Input
                type="number"
                value={config.chargeValue}
                onChange={(e) => onChange({ ...config, chargeValue: parseFloat(e.target.value) })}
              />
            </Field>
          </FieldGroup>
        </div>
      )}
    </div>
  )

  const renderShortNoticeChargeConfig = (
    config: any,
    onChange: (config: any) => void
  ) => (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-medium text-sm">Urgent / Short-Notice Booking Charges</p>
          <p className="text-xs text-muted-foreground">Extra charges for last-minute bookings</p>
        </div>
        <Switch
          checked={config?.enabled || false}
          onCheckedChange={(checked) => onChange({ ...(config || defaultShortNoticeCharge), enabled: checked })}
        />
      </div>
      {config?.enabled && (
        <div className="grid gap-4">
          <FieldGroup className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Within Time (Hours)</FieldLabel>
              <Input
                type="number"
                value={config.withinHours || 2}
                onChange={(e) => onChange({ ...config, withinHours: parseFloat(e.target.value) || 0 })}
              />
            </Field>
            <Field>
              <FieldLabel>Charge Type</FieldLabel>
              <Select
                value={config.chargeType || 'flat'}
                onValueChange={(value: ChargeType) => onChange({ ...config, chargeType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat Amount</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
          <FieldGroup className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Charge Value</FieldLabel>
              <Input
                type="number"
                value={config.chargeValue || 0}
                onChange={(e) => onChange({ ...config, chargeValue: parseFloat(e.target.value) || 0 })}
              />
            </Field>
          </FieldGroup>
        </div>
      )}
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingFare ? 'Edit' : 'Add'} {type === 'airport' ? 'Airport' : type === 'rental' ? 'Rental' : type === 'city' ? 'City Ride' : 'Outstation'} Fare
          </DialogTitle>
          <DialogDescription>
            Configure fare settings for this service type
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Common city and category selection */}
            <FieldGroup className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>City</FieldLabel>
                <Select
                  value={type === 'airport' ? airportForm.cityId : type === 'rental' ? rentalForm.cityId : type === 'city' ? cityForm.cityId : outstationForm.cityId}
                  onValueChange={(value) => {
                    switch (type) {
                      case 'airport': setAirportForm(f => ({ ...f, cityId: value, airportId: undefined, airportTerminalId: undefined })); break
                      case 'rental': setRentalForm(f => ({ ...f, cityId: value })); break
                      case 'city': setCityForm(f => ({ ...f, cityId: value })); break
                      case 'outstation': setOutstationForm(f => ({ ...f, cityId: value })); break
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map(city => (
                      <SelectItem key={city.id} value={city.id}>{city.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Car Category</FieldLabel>
                <Select
                  value={type === 'airport' ? airportForm.carCategoryId : type === 'rental' ? rentalForm.carCategoryId : type === 'city' ? cityForm.carCategoryId : outstationForm.carCategoryId}
                  onValueChange={(value) => {
                    switch (type) {
                      case 'airport': setAirportForm(f => ({ ...f, carCategoryId: value })); break
                      case 'rental': setRentalForm(f => ({ ...f, carCategoryId: value })); break
                      case 'city': setCityForm(f => ({ ...f, carCategoryId: value })); break
                      case 'outstation': setOutstationForm(f => ({ ...f, carCategoryId: value })); break
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>

            {type === 'airport' && (
              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Airport</FieldLabel>
                  <Select
                    value={airportForm.airportId || ''}
                    onValueChange={(value) => setAirportForm(f => ({ ...f, airportId: value, airportTerminalId: undefined, airportTerminalIds: [] }))}
                    disabled={!airportForm.cityId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select airport" />
                    </SelectTrigger>
                    <SelectContent>
                      {airportOptions.map(airport => (
                        <SelectItem key={airport.id} value={airport.id}>
                          {airport.name} ({airport.code})
                        </SelectItem>
                      ))}
                      {airportForm.cityId && airportOptions.length === 0 && (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No active airports configured for this city
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Terminals</FieldLabel>
                  <div className="rounded-md border p-3">
                    {!airportForm.airportId ? (
                      <p className="text-sm text-muted-foreground">Select an airport first</p>
                    ) : terminalOptions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No active terminals configured for this airport</p>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {terminalOptions.map(terminal => {
                          const checked = airportForm.airportTerminalIds?.includes(terminal.id) || false
                          return (
                            <label key={terminal.id} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(isChecked) => {
                                  setAirportForm(f => {
                                    const current = f.airportTerminalIds || []
                                    const next = isChecked
                                      ? [...current, terminal.id]
                                      : current.filter(id => id !== terminal.id)
                                    return {
                                      ...f,
                                      airportTerminalIds: next,
                                      airportTerminalId: next[0],
                                    }
                                  })
                                }}
                              />
                              <span>{terminal.name} ({terminal.code})</span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </Field>
              </FieldGroup>
            )}

            <Separator />

            {/* Type-specific fields */}
            {type === 'airport' && (
              <>
                <FieldGroup className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Transfer Type</FieldLabel>
                    <Select
                      value={airportForm.type}
                      onValueChange={(value: 'pickup' | 'drop' | 'both') => setAirportForm(f => ({ ...f, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pickup">Airport Pickup</SelectItem>
                        <SelectItem value="drop">Airport Drop</SelectItem>
                        <SelectItem value="both">Both (Pickup & Drop)</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel>Calculation Type</FieldLabel>
                    <Select
                      value={airportForm.calculationType}
                      onValueChange={(value: FareCalculationType) => setAirportForm(f => ({ ...f, calculationType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Fare</SelectItem>
                        <SelectItem value="per_km">Per KM</SelectItem>
                        <SelectItem value="slab">Slab-wise</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>

                {airportForm.calculationType === 'fixed' && (
                  <Field>
                    <FieldLabel>Fixed Fare (Rs.)</FieldLabel>
                    <Input
                      type="number"
                      value={airportForm.fixedFare}
                      onChange={(e) => setAirportForm(f => ({ ...f, fixedFare: parseFloat(e.target.value) }))}
                    />
                  </Field>
                )}

                {airportForm.calculationType === 'per_km' && (
                  <FieldGroup className="grid grid-cols-3 gap-4">
                    <Field>
                      <FieldLabel>Per KM Rate (Rs.)</FieldLabel>
                      <Input
                        type="number"
                        value={airportForm.perKmRate}
                        onChange={(e) => setAirportForm(f => ({ ...f, perKmRate: parseFloat(e.target.value) }))}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Base Fare (Rs.)</FieldLabel>
                      <Input
                        type="number"
                        value={airportForm.baseFare}
                        onChange={(e) => setAirportForm(f => ({ ...f, baseFare: parseFloat(e.target.value) }))}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Minimum Fare (Rs.)</FieldLabel>
                      <Input
                        type="number"
                        value={airportForm.minimumFare}
                        onChange={(e) => setAirportForm(f => ({ ...f, minimumFare: parseFloat(e.target.value) }))}
                      />
                    </Field>
                  </FieldGroup>
                )}

                {airportForm.calculationType === 'slab' && (
                  renderSlabConfig(airportForm.slabs || [], (slabs) => setAirportForm(f => ({ ...f, slabs })))
                )}

                <FieldGroup className="grid grid-cols-3 gap-4">
                  <Field>
                    <FieldLabel>Free Waiting Time (min)</FieldLabel>
                    <Input
                      type="number"
                      value={airportForm.freeWaitingMinutes}
                      onChange={(e) => setAirportForm(f => ({ ...f, freeWaitingMinutes: parseInt(e.target.value) || 0 }))}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Waiting Charge (Rs./min)</FieldLabel>
                    <Input
                      type="number"
                      value={airportForm.waitingChargePerMin}
                      onChange={(e) => setAirportForm(f => ({ ...f, waitingChargePerMin: parseFloat(e.target.value) || 0 }))}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Min Advance Booking (Hrs)</FieldLabel>
                    <Input
                      type="number"
                      placeholder="Inherit"
                      value={(airportForm as any).minAdvanceBookingHours ?? ''}
                      onChange={(e) => setAirportForm(f => ({ ...f, minAdvanceBookingHours: e.target.value === '' ? undefined : parseFloat(e.target.value) }))}
                    />
                  </Field>
                </FieldGroup>

                {renderPreBookingCharges(airportForm.preBookingCharges!, (charges) => setAirportForm(f => ({ ...f, preBookingCharges: charges })))}
                {renderPeakHourConfig(airportForm.peakHour!, (config) => setAirportForm(f => ({ ...f, peakHour: config })))}
                {renderNightChargeConfig(airportForm.nightCharge!, (config) => setAirportForm(f => ({ ...f, nightCharge: config })))}
                {renderShortNoticeChargeConfig(airportForm.shortNoticeCharge, (config) => setAirportForm(f => ({ ...f, shortNoticeCharge: config })))}
              </>
            )}

            {type === 'rental' && (
              <>
                <Field>
                  <FieldLabel>Rental Type</FieldLabel>
                  <Select
                    value={rentalForm.rentalType}
                    onValueChange={(value: RentalType) => setRentalForm(f => ({ ...f, rentalType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="without_capping">Without KM Capping</SelectItem>
                      <SelectItem value="with_capping">With KM Capping</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <FieldGroup className={rentalForm.rentalType === 'with_capping' ? "grid grid-cols-3 gap-4" : "grid grid-cols-2 gap-4"}>
                  <Field>
                    <FieldLabel>Package Hours</FieldLabel>
                    <Input
                      type="number"
                      value={rentalForm.packageHours}
                      onChange={(e) => setRentalForm(f => ({ ...f, packageHours: parseInt(e.target.value) }))}
                    />
                  </Field>
                  {rentalForm.rentalType === 'with_capping' && (
                    <Field>
                      <FieldLabel>Package KM</FieldLabel>
                      <Input
                        type="number"
                        value={rentalForm.packageKm || 0}
                        onChange={(e) => setRentalForm(f => ({ ...f, packageKm: parseInt(e.target.value) || 0 }))}
                      />
                    </Field>
                  )}
                  <Field>
                    <FieldLabel>Package Fare (Rs.)</FieldLabel>
                    <Input
                      type="number"
                      value={rentalForm.packageFare}
                      onChange={(e) => setRentalForm(f => ({ ...f, packageFare: parseFloat(e.target.value) }))}
                    />
                  </Field>
                </FieldGroup>

                <FieldGroup className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Free Waiting Time (min)</FieldLabel>
                    <Input
                      type="number"
                      value={rentalForm.freeWaitingMinutes}
                      onChange={(e) => setRentalForm(f => ({ ...f, freeWaitingMinutes: parseInt(e.target.value) || 0 }))}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Min Advance Booking (Hrs)</FieldLabel>
                    <Input
                      type="number"
                      placeholder="Inherit"
                      value={(rentalForm as any).minAdvanceBookingHours ?? ''}
                      onChange={(e) => setRentalForm(f => ({ ...f, minAdvanceBookingHours: e.target.value === '' ? undefined : parseFloat(e.target.value) }))}
                    />
                  </Field>
                </FieldGroup>

                <FieldGroup className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Extra KM Rate (Rs.)</FieldLabel>
                    <Input
                      type="number"
                      value={rentalForm.extraKmRate}
                      onChange={(e) => setRentalForm(f => ({ ...f, extraKmRate: parseFloat(e.target.value) }))}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Extra Hour Rate (Rs.)</FieldLabel>
                    <Input
                      type="number"
                      value={rentalForm.extraHourRate}
                      onChange={(e) => setRentalForm(f => ({ ...f, extraHourRate: parseFloat(e.target.value) }))}
                    />
                  </Field>
                </FieldGroup>

                {rentalForm.rentalType === 'with_capping' && (
                  <Field>
                    <FieldLabel>KM Capping</FieldLabel>
                    <Input
                      type="number"
                      value={rentalForm.kmCapping}
                      onChange={(e) => setRentalForm(f => ({ ...f, kmCapping: parseInt(e.target.value) }))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Maximum KM allowed in the rental package</p>
                  </Field>
                )}

                {renderPreBookingCharges(rentalForm.preBookingCharges!, (charges) => setRentalForm(f => ({ ...f, preBookingCharges: charges })))}
                {renderPeakHourConfig(rentalForm.peakHour!, (config) => setRentalForm(f => ({ ...f, peakHour: config })))}
                {renderNightChargeConfig(rentalForm.nightCharge!, (config) => setRentalForm(f => ({ ...f, nightCharge: config })))}
                {renderShortNoticeChargeConfig(rentalForm.shortNoticeCharge, (config) => setRentalForm(f => ({ ...f, shortNoticeCharge: config })))}
              </>
            )}

            {type === 'city' && (
              <>
                <Field>
                  <FieldLabel>Calculation Type</FieldLabel>
                  <Select
                    value={cityForm.calculationType}
                    onValueChange={(value: FareCalculationType) => setCityForm(f => ({ ...f, calculationType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Fare</SelectItem>
                      <SelectItem value="per_km">Per KM</SelectItem>
                      <SelectItem value="slab">Slab-wise</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                {cityForm.calculationType === 'fixed' && (
                  <Field>
                    <FieldLabel>Fixed Fare (Rs.)</FieldLabel>
                    <Input
                      type="number"
                      value={cityForm.fixedFare}
                      onChange={(e) => setCityForm(f => ({ ...f, fixedFare: parseFloat(e.target.value) }))}
                    />
                  </Field>
                )}

                {cityForm.calculationType === 'per_km' && (
                  <FieldGroup className="grid grid-cols-3 gap-4">
                    <Field>
                      <FieldLabel>Per KM Rate (Rs.)</FieldLabel>
                      <Input
                        type="number"
                        value={cityForm.perKmRate}
                        onChange={(e) => setCityForm(f => ({ ...f, perKmRate: parseFloat(e.target.value) }))}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Base Fare (Rs.)</FieldLabel>
                      <Input
                        type="number"
                        value={cityForm.baseFare}
                        onChange={(e) => setCityForm(f => ({ ...f, baseFare: parseFloat(e.target.value) }))}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Minimum Fare (Rs.)</FieldLabel>
                      <Input
                        type="number"
                        value={cityForm.minimumFare}
                        onChange={(e) => setCityForm(f => ({ ...f, minimumFare: parseFloat(e.target.value) }))}
                      />
                    </Field>
                  </FieldGroup>
                )}

                {cityForm.calculationType === 'slab' && (
                  renderSlabConfig(cityForm.slabs || [], (slabs) => setCityForm(f => ({ ...f, slabs })))
                )}

                <FieldGroup className="grid grid-cols-3 gap-4">
                  <Field>
                    <FieldLabel>Per Minute Rate (Rs.)</FieldLabel>
                    <Input
                      type="number"
                      step="0.1"
                      value={cityForm.perMinuteRate}
                      onChange={(e) => setCityForm(f => ({ ...f, perMinuteRate: parseFloat(e.target.value) }))}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Free Waiting Time (min)</FieldLabel>
                    <Input
                      type="number"
                      value={cityForm.freeWaitingMinutes}
                      onChange={(e) => setCityForm(f => ({ ...f, freeWaitingMinutes: parseInt(e.target.value) || 0 }))}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Min Advance Booking (Hrs)</FieldLabel>
                    <Input
                      type="number"
                      placeholder="Inherit"
                      value={(cityForm as any).minAdvanceBookingHours ?? ''}
                      onChange={(e) => setCityForm(f => ({ ...f, minAdvanceBookingHours: e.target.value === '' ? undefined : parseFloat(e.target.value) }))}
                    />
                  </Field>
                </FieldGroup>

                {renderPreBookingCharges(cityForm.preBookingCharges!, (charges) => setCityForm(f => ({ ...f, preBookingCharges: charges })))}
                {renderPeakHourConfig(cityForm.peakHour!, (config) => setCityForm(f => ({ ...f, peakHour: config })))}
                {renderNightChargeConfig(cityForm.nightCharge!, (config) => setCityForm(f => ({ ...f, nightCharge: config })))}
                {renderShortNoticeChargeConfig(cityForm.shortNoticeCharge, (config) => setCityForm(f => ({ ...f, shortNoticeCharge: config })))}
              </>
            )}

            {type === 'outstation' && (
              <>
                <Field>
                  <FieldLabel>Outstation Type</FieldLabel>
                  <Select
                    value={outstationForm.outstationType}
                    onValueChange={(value: OutstationType) => setOutstationForm(f => ({ ...f, outstationType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_way">One Way</SelectItem>
                      <SelectItem value="round_trip">Round Trip</SelectItem>
                      <SelectItem value="route_wise">Route Wise</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                {outstationForm.outstationType === 'one_way' && (
                  renderSlabConfig(outstationForm.slabs || [], (slabs) => setOutstationForm(f => ({ ...f, slabs })))
                )}

                {outstationForm.outstationType === 'round_trip' && (
                  <Field>
                    <FieldLabel>Round Trip Rate (Rs./km)</FieldLabel>
                    <Input
                      type="number"
                      value={outstationForm.roundTripPerKmRate}
                      onChange={(e) => setOutstationForm(f => ({ ...f, roundTripPerKmRate: parseFloat(e.target.value) }))}
                    />
                  </Field>
                )}

                {outstationForm.outstationType === 'route_wise' && outstationForm.cityId && (
                  renderRouteConfig(
                    outstationForm.routes || [],
                    (routes) => setOutstationForm(f => ({ ...f, routes })),
                    outstationForm.cityId
                  )
                )}

                {outstationForm.outstationType === 'route_wise' && !outstationForm.cityId && (
                  <div className="rounded-lg border p-4 text-center text-muted-foreground">
                    Please select a city first to configure routes
                  </div>
                )}

                <FieldGroup className="grid grid-cols-3 gap-4">
                  <Field>
                    <FieldLabel>Driver Allowance/Day (Rs.)</FieldLabel>
                    <Input
                      type="number"
                      value={outstationForm.driverAllowancePerDay}
                      onChange={(e) => setOutstationForm(f => ({ ...f, driverAllowancePerDay: parseFloat(e.target.value) }))}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Night Halt Charge (Rs.)</FieldLabel>
                    <Input
                      type="number"
                      value={outstationForm.nightHaltCharge}
                      onChange={(e) => setOutstationForm(f => ({ ...f, nightHaltCharge: parseFloat(e.target.value) }))}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Min KM/Day</FieldLabel>
                    <Input
                      type="number"
                      value={outstationForm.minimumKmPerDay}
                      onChange={(e) => setOutstationForm(f => ({ ...f, minimumKmPerDay: parseInt(e.target.value) }))}
                    />
                  </Field>
                </FieldGroup>

                <FieldGroup className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Free Waiting Time (min)</FieldLabel>
                    <Input
                      type="number"
                      value={outstationForm.freeWaitingMinutes}
                      onChange={(e) => setOutstationForm(f => ({ ...f, freeWaitingMinutes: parseInt(e.target.value) || 0 }))}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Min Advance Booking (Hrs)</FieldLabel>
                    <Input
                      type="number"
                      placeholder="Inherit"
                      value={(outstationForm as any).minAdvanceBookingHours ?? ''}
                      onChange={(e) => setOutstationForm(f => ({ ...f, minAdvanceBookingHours: e.target.value === '' ? undefined : parseFloat(e.target.value) }))}
                    />
                  </Field>
                </FieldGroup>

                {renderPreBookingCharges(outstationForm.preBookingCharges!, (charges) => setOutstationForm(f => ({ ...f, preBookingCharges: charges })))}
                {renderPeakHourConfig(outstationForm.peakHour!, (config) => setOutstationForm(f => ({ ...f, peakHour: config })))}
                {renderNightChargeConfig(outstationForm.nightCharge!, (config) => setOutstationForm(f => ({ ...f, nightCharge: config })))}
                {renderShortNoticeChargeConfig(outstationForm.shortNoticeCharge, (config) => setOutstationForm(f => ({ ...f, shortNoticeCharge: config })))}
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {editingFare ? 'Update Fare' : 'Add Fare'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
