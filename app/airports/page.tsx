"use client"

import { useState } from "react"
import { useAdmin } from "@/lib/admin-context"
import { Airport, AirportTerminal } from "@/lib/types"
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
import { Building2, Pencil, Plane, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

type AirportFormData = Omit<Airport, "id" | "createdAt" | "terminals">
type TerminalFormData = Omit<AirportTerminal, "id" | "airportId" | "createdAt">

const initialAirportForm: AirportFormData = {
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
}

export default function AirportsPage() {
  const {
    airports,
    cities,
    addAirport,
    updateAirport,
    deleteAirport,
    addAirportTerminal,
    updateAirportTerminal,
    deleteAirportTerminal,
    getCity,
  } = useAdmin()

  const [isAirportOpen, setIsAirportOpen] = useState(false)
  const [isTerminalOpen, setIsTerminalOpen] = useState(false)
  const [editingAirport, setEditingAirport] = useState<Airport | null>(null)
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null)
  const [editingTerminal, setEditingTerminal] = useState<AirportTerminal | null>(null)
  const [airportForm, setAirportForm] = useState<AirportFormData>(initialAirportForm)
  const [terminalForm, setTerminalForm] = useState<TerminalFormData>(initialTerminalForm)

  const openAirportDialog = (airport?: Airport) => {
    if (airport) {
      setEditingAirport(airport)
      setAirportForm({
        cityId: airport.cityId,
        name: airport.name,
        code: airport.code,
        address: airport.address,
        isActive: airport.isActive,
      })
    } else {
      setEditingAirport(null)
      setAirportForm(initialAirportForm)
    }
    setIsAirportOpen(true)
  }

  const openTerminalDialog = (airport: Airport, terminal?: AirportTerminal) => {
    setSelectedAirport(airport)
    if (terminal) {
      setEditingTerminal(terminal)
      setTerminalForm({
        name: terminal.name,
        code: terminal.code,
        isActive: terminal.isActive,
      })
    } else {
      setEditingTerminal(null)
      setTerminalForm(initialTerminalForm)
    }
    setIsTerminalOpen(true)
  }

  const handleAirportSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const payload = {
      ...airportForm,
      code: airportForm.code.toUpperCase(),
    }

    if (editingAirport) {
      updateAirport(editingAirport.id, payload)
      toast.success("Airport updated successfully")
    } else {
      addAirport(payload)
      toast.success("Airport added successfully")
    }

    setIsAirportOpen(false)
    setEditingAirport(null)
    setAirportForm(initialAirportForm)
  }

  const handleTerminalSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedAirport) return

    const payload = {
      ...terminalForm,
      code: terminalForm.code.toUpperCase(),
    }

    if (editingTerminal) {
      updateAirportTerminal(selectedAirport.id, editingTerminal.id, payload)
      toast.success("Terminal updated successfully")
    } else {
      addAirportTerminal(selectedAirport.id, payload)
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
          <h1 className="text-2xl font-semibold text-foreground">Airports</h1>
          <p className="text-muted-foreground">Configure airport terminals for airport pickup and drop bookings</p>
        </div>
        <Button onClick={() => openAirportDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Airport
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
            <CardTitle className="text-sm font-medium">Active Airports</CardTitle>
            <Building2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{airports.filter((airport) => airport.isActive).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Terminals</CardTitle>
            <Plane className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {airports.reduce((sum, airport) => sum + airport.terminals.length, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Airport Directory</CardTitle>
          <CardDescription>Airport and terminal records used by booking creation</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Airport</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Terminals</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {airports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No airports configured yet
                  </TableCell>
                </TableRow>
              ) : (
                airports.map((airport) => (
                  <TableRow key={airport.id}>
                    <TableCell>
                      <div className="font-medium">{airport.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {airport.code} · {airport.address || "No address"}
                      </div>
                    </TableCell>
                    <TableCell>{getCity(airport.cityId)?.name || "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {airport.terminals.length === 0 ? (
                          <Badge variant="outline">No terminals</Badge>
                        ) : (
                          airport.terminals.map((terminal) => (
                            <Badge key={terminal.id} variant={terminal.isActive ? "secondary" : "outline"}>
                              {terminal.name} ({terminal.code})
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={airport.isActive ? "default" : "secondary"}>
                        {airport.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openTerminalDialog(airport)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Terminal
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openAirportDialog(airport)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteAirport(airport.id)}>
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

      {airports.map((airport) => (
        <Card key={airport.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{airport.name} Terminals</CardTitle>
                <CardDescription>{airport.code}</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => openTerminalDialog(airport)}>
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
                {airport.terminals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                      No terminals added
                    </TableCell>
                  </TableRow>
                ) : (
                  airport.terminals.map((terminal) => (
                    <TableRow key={terminal.id}>
                      <TableCell className="font-medium">{terminal.name}</TableCell>
                      <TableCell>{terminal.code}</TableCell>
                      <TableCell>
                        <Badge variant={terminal.isActive ? "default" : "secondary"}>
                          {terminal.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openTerminalDialog(airport, terminal)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteAirportTerminal(airport.id, terminal.id)}>
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

      <Dialog open={isAirportOpen} onOpenChange={setIsAirportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAirport ? "Edit Airport" : "Add Airport"}</DialogTitle>
            <DialogDescription>Airport details are used while creating airport pickup/drop bookings.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAirportSubmit}>
            <div className="space-y-4 py-4">
              <Field>
                <FieldLabel>City *</FieldLabel>
                <Select
                  value={airportForm.cityId}
                  onValueChange={(value) => setAirportForm({ ...airportForm, cityId: value })}
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
                  <FieldLabel>Airport Name *</FieldLabel>
                  <Input
                    value={airportForm.name}
                    onChange={(event) => setAirportForm({ ...airportForm, name: event.target.value })}
                    placeholder="e.g., Indira Gandhi International Airport"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>Airport Code *</FieldLabel>
                  <Input
                    value={airportForm.code}
                    onChange={(event) => setAirportForm({ ...airportForm, code: event.target.value.toUpperCase() })}
                    placeholder="e.g., DEL"
                    required
                  />
                </Field>
              </FieldGroup>
              <Field>
                <FieldLabel>Address</FieldLabel>
                <Input
                  value={airportForm.address}
                  onChange={(event) => setAirportForm({ ...airportForm, address: event.target.value })}
                  placeholder="Airport address"
                />
              </Field>
              <div className="flex items-center gap-2">
                <Switch
                  id="airport-active"
                  checked={airportForm.isActive}
                  onCheckedChange={(checked) => setAirportForm({ ...airportForm, isActive: checked })}
                />
                <Label htmlFor="airport-active">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAirportOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!airportForm.cityId || !airportForm.name || !airportForm.code}>
                {editingAirport ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isTerminalOpen} onOpenChange={setIsTerminalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTerminal ? "Edit Terminal" : "Add Terminal"}</DialogTitle>
            <DialogDescription>{selectedAirport?.name}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTerminalSubmit}>
            <div className="space-y-4 py-4">
              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Terminal Name *</FieldLabel>
                  <Input
                    value={terminalForm.name}
                    onChange={(event) => setTerminalForm({ ...terminalForm, name: event.target.value })}
                    placeholder="e.g., Terminal 3"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>Terminal Code *</FieldLabel>
                  <Input
                    value={terminalForm.code}
                    onChange={(event) => setTerminalForm({ ...terminalForm, code: event.target.value.toUpperCase() })}
                    placeholder="e.g., T3"
                    required
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
