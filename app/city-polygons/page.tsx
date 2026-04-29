'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useAdmin } from '@/lib/admin-context'
import { CityPolygon } from '@/lib/types'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Plus, MoreHorizontal, Pencil, Trash2, MapPin, Map, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

// Dynamically import the map component
const PolygonMap = dynamic(() => import('@/components/polygon-map'), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] w-full flex items-center justify-center bg-muted rounded-lg">
      <div className="text-center">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    </div>
  ),
})

const colorOptions = [
  { value: '#3b82f6', label: 'Blue' },
  { value: '#22c55e', label: 'Green' },
  { value: '#ef4444', label: 'Red' },
  { value: '#f59e0b', label: 'Orange' },
  { value: '#a855f7', label: 'Purple' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#ec4899', label: 'Pink' },
]

type PolygonFormData = Omit<CityPolygon, 'id' | 'createdAt'>

const initialFormData: PolygonFormData = {
  cityId: '',
  name: '',
  coordinates: [],
  color: '#3b82f6',
  isActive: true,
}

export default function CityPolygonsPage() {
  const { cityPolygons, cities, addCityPolygon, updateCityPolygon, deleteCityPolygon, getCity } = useAdmin()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPolygon, setEditingPolygon] = useState<CityPolygon | null>(null)
  const [formData, setFormData] = useState<PolygonFormData>(initialFormData)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('all')
  const [isDrawing, setIsDrawing] = useState(false)

  const filteredPolygons = cityPolygons.filter((polygon) => {
    const matchesSearch = polygon.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCity = selectedCityFilter === 'all' || polygon.cityId === selectedCityFilter
    return matchesSearch && matchesCity
  })

  const handleOpenDialog = (polygon?: CityPolygon) => {
    if (polygon) {
      setEditingPolygon(polygon)
      setFormData({
        cityId: polygon.cityId,
        name: polygon.name,
        coordinates: polygon.coordinates,
        color: polygon.color,
        isActive: polygon.isActive,
      })
    } else {
      setEditingPolygon(null)
      setFormData(initialFormData)
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.coordinates.length < 3) {
      toast.error('Please draw a polygon with at least 3 points')
      return
    }

    if (editingPolygon) {
      updateCityPolygon(editingPolygon.id, formData)
      toast.success('Polygon updated successfully')
    } else {
      addCityPolygon(formData)
      toast.success('Polygon created successfully')
    }
    setIsDialogOpen(false)
    setEditingPolygon(null)
    setFormData(initialFormData)
    setIsDrawing(false)
  }

  const handleDelete = (id: string) => {
    deleteCityPolygon(id)
    toast.success('Polygon deleted successfully')
  }

  const handlePolygonDrawn = (coordinates: { lat: number; lng: number }[]) => {
    setFormData({ ...formData, coordinates })
    setIsDrawing(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">City Polygons</h1>
          <p className="text-muted-foreground">Define service areas and zones for each city</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Polygon
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Polygons</CardTitle>
            <Map className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cityPolygons.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Zones</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cityPolygons.filter(p => p.isActive).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cities with Zones</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(cityPolygons.map(p => p.cityId)).size}</div>
          </CardContent>
        </Card>
      </div>

      {/* Map Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Zone Map</CardTitle>
          <CardDescription>Visual overview of all defined service zones</CardDescription>
        </CardHeader>
        <CardContent>
          <PolygonMap
            polygons={filteredPolygons}
            cities={cities}
            getCity={getCity}
            mode="view"
          />
        </CardContent>
      </Card>

      {/* Polygons Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Polygons</CardTitle>
              <CardDescription>Manage your service area zones</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search zones..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48"
              />
              <Select value={selectedCityFilter} onValueChange={setSelectedCityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by city" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zone Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPolygons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No polygons found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPolygons.map((polygon) => {
                  const city = getCity(polygon.cityId)
                  return (
                    <TableRow key={polygon.id}>
                      <TableCell className="font-medium">{polygon.name}</TableCell>
                      <TableCell>{city?.name || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-4 w-4 rounded"
                            style={{ backgroundColor: polygon.color }}
                          />
                          <span className="text-sm text-muted-foreground">{polygon.color}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{polygon.coordinates.length} points</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={polygon.isActive ? 'default' : 'secondary'}>
                          {polygon.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(polygon)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(polygon.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPolygon ? 'Edit Polygon' : 'Create New Polygon'}</DialogTitle>
            <DialogDescription>
              {editingPolygon ? 'Update the zone details' : 'Draw a polygon to define a service zone'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Zone Name</FieldLabel>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Airport Zone, Downtown Area"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>City</FieldLabel>
                  <Select
                    value={formData.cityId}
                    onValueChange={(value) => setFormData({ ...formData, cityId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={city.id} value={city.id}>
                          {city.name}, {city.state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>

              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Zone Color</FieldLabel>
                  <div className="flex gap-2">
                    {colorOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: option.value })}
                        className={`h-8 w-8 rounded-full border-2 transition-all ${
                          formData.color === option.value
                            ? 'border-foreground scale-110'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: option.value }}
                        title={option.label}
                      />
                    ))}
                  </div>
                </Field>
                <div className="flex items-center space-x-2 self-end pb-1">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="isActive">Active Zone</Label>
                </div>
              </FieldGroup>

              <Field>
                <FieldLabel>Draw Polygon</FieldLabel>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">
                    {formData.coordinates.length > 0
                      ? `${formData.coordinates.length} points defined`
                      : 'Click on the map to draw polygon points'}
                  </p>
                  <div className="flex gap-2">
                    {!isDrawing ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsDrawing(true)}
                      >
                        {formData.coordinates.length > 0 ? 'Redraw' : 'Start Drawing'}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsDrawing(false)}
                      >
                        Cancel Drawing
                      </Button>
                    )}
                    {formData.coordinates.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFormData({ ...formData, coordinates: [] })}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
                <PolygonMap
                  polygons={formData.coordinates.length > 0 ? [{
                    id: 'preview',
                    cityId: formData.cityId,
                    name: formData.name || 'New Zone',
                    coordinates: formData.coordinates,
                    color: formData.color,
                    isActive: true,
                    createdAt: new Date().toISOString(),
                  }] : []}
                  cities={cities}
                  getCity={getCity}
                  mode={isDrawing ? 'draw' : 'view'}
                  onPolygonDrawn={handlePolygonDrawn}
                  selectedCity={formData.cityId}
                />
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={formData.coordinates.length < 3}>
                {editingPolygon ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
