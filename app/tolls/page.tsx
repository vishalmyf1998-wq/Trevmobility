"use client"

import { useState } from "react"
import { useAdmin } from "@/lib/admin-context"
import { TollLocation } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

type TollLocationFormData = Omit<TollLocation, "id" | "createdAt">

const initialFormData: TollLocationFormData = {
  name: "",
  amount: 0,
  coordinates: [],
  isActive: true,
}

export default function TollsPage() {
  const { tollLocations = [], addTollLocation, updateTollLocation, deleteTollLocation } = useAdmin()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingToll, setEditingToll] = useState<TollLocation | null>(null)
  const [formData, setFormData] = useState<TollLocationFormData>(initialFormData)

  const openDialog = (toll?: TollLocation) => {
    if (toll) {
      setEditingToll(toll)
      setFormData({
        name: toll.name,
        amount: toll.amount,
        coordinates: toll.coordinates || [],
        isActive: toll.isActive,
      })
    } else {
      setEditingToll(null)
      setFormData(initialFormData)
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    
    if (formData.coordinates.length < 3) {
      toast.error("Please add at least 3 coordinates for a valid polygon")
      return
    }

    if (editingToll) {
      updateTollLocation(editingToll.id, formData)
      toast.success("Toll updated successfully")
    } else {
      addTollLocation(formData)
      toast.success("Toll added successfully")
    }

    setIsDialogOpen(false)
    setEditingToll(null)
    setFormData(initialFormData)
  }

  const addCoordinate = () => {
    setFormData(prev => ({
      ...prev,
      coordinates: [...prev.coordinates, { lat: 0, lng: 0 }]
    }))
  }

  const updateCoordinate = (index: number, field: 'lat' | 'lng', value: string) => {
    const newCoords = [...formData.coordinates]
    newCoords[index] = { ...newCoords[index], [field]: parseFloat(value) || 0 }
    setFormData(prev => ({ ...prev, coordinates: newCoords }))
  }

  const removeCoordinate = (index: number) => {
    setFormData(prev => ({
      ...prev,
      coordinates: prev.coordinates.filter((_, i) => i !== index)
    }))
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Toll Plazas</h1>
          <p className="text-muted-foreground">Configure toll locations, amounts, and geofence polygons</p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Toll
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tolls Directory</CardTitle>
          <CardDescription>Manage toll amounts and geofence points used during trips</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Toll Name</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Polygon Points</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tollLocations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No tolls configured yet
                  </TableCell>
                </TableRow>
              ) : (
                tollLocations.map((toll) => (
                  <TableRow key={toll.id}>
                    <TableCell className="font-medium">{toll.name}</TableCell>
                    <TableCell>₹ {toll.amount.toFixed(2)}</TableCell>
                    <TableCell>{toll.coordinates?.length || 0} points</TableCell>
                    <TableCell>
                      <Badge variant={toll.isActive ? "default" : "secondary"}>
                        {toll.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openDialog(toll)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteTollLocation(toll.id)}>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingToll ? "Edit Toll" : "Add Toll"}</DialogTitle>
            <DialogDescription>Configure toll geofence polygon and charges.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Toll Name *</FieldLabel>
                  <Input
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    placeholder="e.g., Bandra Worli Sea Link"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>Toll Amount (₹) *</FieldLabel>
                  <Input
                    type="number"
                    value={formData.amount || ""}
                    onChange={(event) => setFormData({ ...formData, amount: parseFloat(event.target.value) || 0 })}
                    placeholder="e.g., 100"
                    required
                  />
                </Field>
              </FieldGroup>
              
              <div className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-sm text-slate-800">Geofence Polygon Coordinates</h4>
                    <p className="text-xs text-slate-500">Add latitude and longitude points to define the toll zone.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addCoordinate}>
                    <Plus className="h-4 w-4 mr-1" /> Add Point
                  </Button>
                </div>
                
                {formData.coordinates.length === 0 ? (
                  <p className="text-sm text-slate-500 italic text-center py-4">No coordinates added. Click "Add Point" to define the polygon.</p>
                ) : (
                  <div className="space-y-3">
                    {formData.coordinates.map((coord, index) => (
                      <div key={index} className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-xs font-bold text-slate-400 w-6">#{index + 1}</span>
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <Input 
                            type="number" 
                            step="0.000001" 
                            placeholder="Latitude" 
                            value={coord.lat || ''} 
                            onChange={(e) => updateCoordinate(index, 'lat', e.target.value)}
                            required
                          />
                          <Input 
                            type="number" 
                            step="0.000001" 
                            placeholder="Longitude" 
                            value={coord.lng || ''} 
                            onChange={(e) => updateCoordinate(index, 'lng', e.target.value)}
                            required
                          />
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => removeCoordinate(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="toll-active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="toll-active">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!formData.name || formData.coordinates.length < 3}>
                {editingToll ? "Update Toll" : "Add Toll"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}