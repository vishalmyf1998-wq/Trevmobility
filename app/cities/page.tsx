'use client'

import { useState } from 'react'
import { useAdmin } from '@/lib/admin-context'
import { City } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { Plus, Pencil, Trash2, Search, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

type CityFormData = Omit<City, 'id' | 'createdAt'>

const initialFormData: CityFormData = {
  name: '',
  state: '',
  isActive: true,
  boundaryType: 'polygon',
  coverageArea: undefined,
  latitude: undefined,
  longitude: undefined,
}

export default function CitiesPage() {
  const { cities, addCity, updateCity, deleteCity } = useAdmin()
  const [searchQuery, setSearchQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCity, setEditingCity] = useState<City | null>(null)
  const [formData, setFormData] = useState<CityFormData>(initialFormData)

  const filteredCities = cities.filter(
    (city) =>
      city.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      city.state.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    let submitData = { ...formData }
    if (submitData.boundaryType === 'polygon') {
      submitData.coverageArea = undefined
      submitData.latitude = undefined
      submitData.longitude = undefined
    }

    if (editingCity) {
      updateCity(editingCity.id, submitData)
      toast.success('City updated successfully')
    } else {
      addCity(submitData)
      toast.success('City added successfully')
    }

    if (submitData.boundaryType === 'polygon') {
      toast.warning('City will be active only after creating a polygon.')
    }

    handleCloseDialog()
  }

  const handleEdit = (city: City) => {
    setEditingCity(city)
    setFormData({
      name: city.name,
      state: city.state,
      isActive: city.isActive,
      boundaryType: city.boundaryType || 'polygon',
      coverageArea: city.coverageArea,
      latitude: city.latitude,
      longitude: city.longitude,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    deleteCity(id)
    toast.success('City deleted successfully')
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingCity(null)
    setFormData(initialFormData)
  }

  const handleToggleActive = (city: City) => {
    updateCity(city.id, { isActive: !city.isActive })
    toast.success(`City ${city.isActive ? 'deactivated' : 'activated'} successfully`)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Cities</h1>
          <p className="text-muted-foreground">Manage cities for fare configuration</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setFormData(initialFormData)}>
              <Plus className="mr-2 h-4 w-4" />
              Add City
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCity ? 'Edit City' : 'Add New City'}</DialogTitle>
              <DialogDescription>
                {editingCity ? 'Update city information' : 'Enter the city details'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <Field>
                  <FieldLabel>City Name</FieldLabel>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Mumbai"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>State</FieldLabel>
                  <Input
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="e.g., Maharashtra"
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel>Boundary Type</FieldLabel>
                  <RadioGroup
                    value={formData.boundaryType}
                    onValueChange={(val) => setFormData({ ...formData, boundaryType: val as 'polygon' | 'latlong' })}
                    className="flex flex-row gap-4 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="polygon" id="polygon" />
                      <Label htmlFor="polygon">Polygon Base</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="latlong" id="latlong" />
                      <Label htmlFor="latlong">Lat/Long Base</Label>
                    </div>
                  </RadioGroup>
                </Field>

                {formData.boundaryType === 'latlong' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <Field>
                        <FieldLabel>Latitude</FieldLabel>
                        <Input
                          type="number"
                          step="any"
                          value={formData.latitude || ''}
                          onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || undefined })}
                          placeholder="e.g., 19.0760"
                          required
                        />
                      </Field>
                      <Field>
                        <FieldLabel>Longitude</FieldLabel>
                        <Input
                          type="number"
                          step="any"
                          value={formData.longitude || ''}
                          onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || undefined })}
                          placeholder="e.g., 72.8777"
                          required
                        />
                      </Field>
                    </div>
                    <Field>
                      <FieldLabel>Coverage Area (in km)</FieldLabel>
                      <Input
                        type="number"
                        min="1"
                        value={formData.coverageArea || ''}
                        onChange={(e) => setFormData({ ...formData, coverageArea: parseFloat(e.target.value) || undefined })}
                        placeholder="e.g., 50"
                        required
                      />
                    </Field>
                  </>
                )}

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-sm">Active Status</p>
                    <p className="text-xs text-muted-foreground">Enable this city for fare configuration</p>
                  </div>
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingCity ? 'Update City' : 'Add City'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>All Cities</CardTitle>
              <CardDescription>{cities.length} total cities, {cities.filter(c => c.isActive).length} active</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search cities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>City</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No cities found matching your search' : 'No cities added yet'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCities.map((city) => (
                  <TableRow key={city.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <MapPin className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium">{city.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{city.state}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={city.isActive}
                          onCheckedChange={() => handleToggleActive(city)}
                        />
                        <Badge
                          variant="outline"
                          className={city.isActive ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground'}
                        >
                          {city.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(city.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(city)}
                        >
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
                              <AlertDialogTitle>Delete City</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {city.name}? This will also remove all fare configurations for this city.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(city.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
