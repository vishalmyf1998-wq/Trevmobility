"use client"

import { useState } from "react"
import { useAdmin } from "@/lib/admin-context"
import { Airport, AirportTerminal, RailwayStation, RailwayStationTerminal } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Building2, MapPin, Pencil, Plane, Plus, Train, Trash2 } from "lucide-react"
import { toast } from "sonner"

type LocationType = 'airport' | 'railway'
type LocationFormData = { type: LocationType; cityId: string; name: string; code: string; address: string; isActive: boolean }
type TerminalFormData = { name: string; code: string; isActive: boolean; latitude?: number; longitude?: number }

const initialLocationForm: LocationFormData = {
  type: "airport",
  cityId: "",
  name: "",
  code: "",
  address: "",
  isActive: true,
}

const initialTerminalForm: TerminalFormData = {
  name: "",
  code: "",
  isActive: true,
  latitude: undefined,
  longitude: undefined,
}

export default function AirportsPage() {
  const {
    airports,
    railwayStations,
    cities,
    addAirport,
    updateAirport,
    deleteAirport,
    addAirportTerminal,
    updateAirportTerminal,
    deleteAirportTerminal,
    addRailwayStation,
    updateRailwayStation,
    deleteRailwayStation,
    addRailwayStationTerminal,
    updateRailwayStationTerminal,
    deleteRailwayStationTerminal,
    getCity,
  } = useAdmin()

  const allLocations = [
    ...airports.map(a => ({ ...a, type: "airport" as const })),
    ...railwayStations.map(r => ({ ...r, type: "railway" as const }))
  ]

  const [isLocationOpen, setIsLocationOpen] = useState(false)
  const [isTerminalOpen, setIsTerminalOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<(Airport | RailwayStation) & { type: LocationType } | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<(Airport | RailwayStation) & { type: LocationType } | null>(null)
  const [editingTerminal, setEditingTerminal] = useState<(AirportTerminal | RailwayStationTerminal) | null>(null)
  const [locationForm, setLocationForm] = useState<LocationFormData>(initialLocationForm)
  const [terminalForm, setTerminalForm] = useState<TerminalFormData>(initialTerminalForm)

  const openLocationDialog = (location?: (Airport | RailwayStation) & { type: LocationType }) => {
    if (location) {
      setEditingLocation(location)
      setLocationForm({
        type: location.type,
        cityId: location.cityId,
        name: location.name,
        code: location.code,
        address: location.address,
        isActive: location.isActive,
      })
    } else {
      setEditingLocation(null)
      setLocationForm(initialLocationForm)
    }
    setIsLocationOpen(true)
  }

  const openTerminalDialog = (location: (Airport | RailwayStation) & { type: LocationType }, terminal?: AirportTerminal | RailwayStationTerminal) => {
    setSelectedLocation(location)
    if (terminal) {
      setEditingTerminal(terminal)
      setTerminalForm({
        name: terminal.name,
        code: terminal.code,
        latitude: terminal.latitude,
        longitude: terminal.longitude,
        isActive: terminal.isActive,
      })
    } else {
      setEditingTerminal(null)
      setTerminalForm(initialTerminalForm)
    }
    setIsTerminalOpen(true)
  }

  const handleLocationSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const payload = {
      cityId: locationForm.cityId,
      name: locationForm.name,
      code: locationForm.code.toUpperCase(),
      address: locationForm.address,
      isActive: locationForm.isActive,
    }

    if (editingLocation) {
      if (editingLocation.type === 'airport') {
        updateAirport(editingLocation.id, payload)
        toast.success("Airport updated successfully")
      } else {
        updateRailwayStation(editingLocation.id, payload)
        toast.success("Railway Station updated successfully")
      }
    } else {
      if (locationForm.type === 'airport') {
        addAirport(payload)
        toast.success("Airport added successfully")
      } else {
        addRailwayStation(payload)
        toast.success("Railway Station added successfully")
      }
    }

    setIsLocationOpen(false)
    setEditingLocation(null)
    setLocationForm(initialLocationForm)
  }

  const handleTerminalSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedLocation) return

    const payload = {
      ...terminalForm,
      code: terminalForm.code.toUpperCase(),
      latitude: terminalForm.latitude || 0,
      longitude: terminalForm.longitude || 0,
    }

    if (editingTerminal) {
      if (selectedLocation.type === 'airport') {
        updateAirportTerminal(selectedLocation.id, editingTerminal.id, payload)
      } else {
        updateRailwayStationTerminal(selectedLocation.id, editingTerminal.id, payload)
      }
      toast.success("Terminal updated successfully")
    } else {
      if (selectedLocation.type === 'airport') {
        addAirportTerminal(selectedLocation.id, payload)
      } else {
        addRailwayStationTerminal(selectedLocation.id, payload)
      }
      toast.success("Terminal added successfully")
    }

    setIsTerminalOpen(false)
    setEditingTerminal(null)
    setTerminalForm(initialTerminalForm)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Transit Locations</h1>
          <p className="text-muted-foreground">Configure airports and railway stations for pickup and drop bookings</p>
        </div>
        <Button onClick={() => openLocationDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Location
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Airports</CardTitle>
            <Plane className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{airports.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Railway Stations</CardTitle>
            <Train className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{railwayStations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Locations</CardTitle>
            <Building2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allLocations.filter((l) => l.isActive).length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Locations Directory</CardTitle>
          <CardDescription>Airport and railway station records used by booking creation</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Terminals</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allLocations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No transit locations configured yet
                  </TableCell>
                </TableRow>
              ) : (
                allLocations.map((location) => (
                  <TableRow key={`${location.type}-${location.id}`}>
                    <TableCell>
                      <div className="font-medium flex items-center gap-2">
                        {location.type === 'airport' ? <Plane className="h-4 w-4 text-blue-500" /> : <Train className="h-4 w-4 text-emerald-500" />}
                        {location.name}
                      </div>
                      <div className="text-xs text-muted-foreground ml-6">
                        {location.code} · {location.address || "No address"}
                      </div>
                    </TableCell>
                    <TableCell>{getCity(location.cityId)?.name || "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {location.terminals.length === 0 ? (
                          <Badge variant="outline">No terminals</Badge>
                        ) : (
                          location.terminals.map((terminal) => (
                            <Badge key={terminal.id} variant={terminal.isActive ? "secondary" : "outline"}>
                              {terminal.name} ({terminal.code})
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={location.isActive ? "default" : "secondary"}>
                        {location.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openTerminalDialog(location)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Terminal
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openLocationDialog(location)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => {
                          if (location.type === 'airport') deleteAirport(location.id)
                          else deleteRailwayStation(location.id)
                        }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {allLocations.map((location) => (
        <Card key={`${location.type}-${location.id}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  {location.type === 'airport' ? <Plane className="h-4 w-4 text-muted-foreground" /> : <Train className="h-4 w-4 text-muted-foreground" />}
                  {location.name} Terminals
                </CardTitle>
                <CardDescription>{location.code}</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => openTerminalDialog(location)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Terminal
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Terminal</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {location.terminals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                      No terminals added
                    </TableCell>
                  </TableRow>
                ) : (
                  location.terminals.map((terminal) => (
                    <TableRow key={terminal.id}>
                      <TableCell className="font-medium">{terminal.name}</TableCell>
                      <TableCell>{terminal.code}</TableCell>
                      <TableCell>
                        <Badge variant={terminal.isActive ? "default" : "secondary"}>
                          {terminal.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openTerminalDialog(location, terminal)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => {
                          if (location.type === 'airport') deleteAirportTerminal(location.id, terminal.id)
                          else deleteRailwayStationTerminal(location.id, terminal.id)
                        }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      <Dialog open={isLocationOpen} onOpenChange={setIsLocationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLocation ? `Edit ${editingLocation.type === 'airport' ? 'Airport' : 'Railway Station'}` : "Add Location"}</DialogTitle>
            <DialogDescription>Location details are used while creating transit pickup/drop bookings.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLocationSubmit}>
            <div className="space-y-4 py-4">
              <Field>
                <FieldLabel>Location Type *</FieldLabel>
                <Select
                  value={locationForm.type}
                  onValueChange={(value) => setLocationForm({ ...locationForm, type: value as LocationType })}
                  disabled={!!editingLocation}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="airport">Airport</SelectItem>
                    <SelectItem value="railway">Railway Station</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>City *</FieldLabel>
                <Select
                  value={locationForm.cityId}
                  onValueChange={(value) => setLocationForm({ ...locationForm, cityId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.filter((city) => city.isActive).map((city) => (
                      <SelectItem key={city.id} value={city.id}>
                        {city.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>{locationForm.type === 'airport' ? 'Airport' : 'Station'} Name *</FieldLabel>
                  <Input
                    value={locationForm.name}
                    onChange={(event) => setLocationForm({ ...locationForm, name: event.target.value })}
                    placeholder={locationForm.type === 'airport' ? "e.g., Indira Gandhi Airport" : "e.g., New Delhi Railway Station"}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>{locationForm.type === 'airport' ? 'Airport' : 'Station'} Code *</FieldLabel>
                  <Input
                    value={locationForm.code}
                    onChange={(event) => setLocationForm({ ...locationForm, code: event.target.value.toUpperCase() })}
                    placeholder={locationForm.type === 'airport' ? "e.g., DEL" : "e.g., NDLS"}
                    required
                  />
                </Field>
              </FieldGroup>
              <Field>
                <FieldLabel>Address</FieldLabel>
                <Input
                  value={locationForm.address}
                  onChange={(event) => setLocationForm({ ...locationForm, address: event.target.value })}
                  placeholder="Full address"
                />
              </Field>
              <div className="flex items-center gap-2">
                <Switch
                  id="location-active"
                  checked={locationForm.isActive}
                  onCheckedChange={(checked) => setLocationForm({ ...locationForm, isActive: checked })}
                />
                <Label htmlFor="location-active">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsLocationOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!locationForm.cityId || !locationForm.name || !locationForm.code}>
                {editingLocation ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isTerminalOpen} onOpenChange={setIsTerminalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTerminal ? "Edit Terminal/Entrance" : "Add Terminal/Entrance"}</DialogTitle>
            <DialogDescription>{selectedLocation?.name}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTerminalSubmit}>
            <div className="space-y-4 py-4">
              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>{selectedLocation?.type === 'airport' ? 'Terminal' : 'Entrance'} Name *</FieldLabel>
                  <Input
                    value={terminalForm.name}
                    onChange={(event) => setTerminalForm({ ...terminalForm, name: event.target.value })}
                    placeholder={selectedLocation?.type === 'airport' ? "e.g., Terminal 3" : "e.g., Ajmeri Gate"}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>Code *</FieldLabel>
                  <Input
                    value={terminalForm.code}
                    onChange={(event) => setTerminalForm({ ...terminalForm, code: event.target.value.toUpperCase() })}
                    placeholder={selectedLocation?.type === 'airport' ? "e.g., T3" : "e.g., GATE-1"}
                    required
                  />
                </Field>
              </FieldGroup>
              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Latitude</FieldLabel>
                  <Input
                    type="number"
                    step="0.000001"
                    value={terminalForm.latitude || ''}
                    onChange={(event) => setTerminalForm({ ...terminalForm, latitude: parseFloat(event.target.value) || undefined })}
                    placeholder="e.g., 19.0760"
                  />
                </Field>
                <Field>
                  <FieldLabel>Longitude</FieldLabel>
                  <Input
                    type="number"
                    step="0.000001"
                    value={terminalForm.longitude || ''}
                    onChange={(event) => setTerminalForm({ ...terminalForm, longitude: parseFloat(event.target.value) || undefined })}
                    placeholder="e.g., 72.8777"
                  />
                </Field>
              </FieldGroup>
              <div className="flex items-center gap-2">
                <Switch
                  id="terminal-active"
                  checked={terminalForm.isActive}
                  onCheckedChange={(checked) => setTerminalForm({ ...terminalForm, isActive: checked })}
                />
                <Label htmlFor="terminal-active">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsTerminalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!terminalForm.name || !terminalForm.code}>
                {editingTerminal ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
