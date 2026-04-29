'use client'

import { useState } from 'react'
import { useAdmin } from '@/lib/admin-context'
import { Hub } from '@/lib/types'
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
import { Plus, MoreHorizontal, Pencil, Trash2, MapPin, Building2, Phone, User } from 'lucide-react'
import { toast } from 'sonner'

type HubFormData = Omit<Hub, 'id' | 'createdAt'>

const initialFormData: HubFormData = {
  name: '',
  address: '',
  cityId: '',
  latitude: 0,
  longitude: 0,
  contactPerson: '',
  contactPhone: '',
  isActive: true,
}

export default function HubsPage() {
  const { hubs, cities, drivers, cars, addHub, updateHub, deleteHub, getCity } = useAdmin()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingHub, setEditingHub] = useState<Hub | null>(null)
  const [formData, setFormData] = useState<HubFormData>(initialFormData)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredHubs = hubs.filter(
    (hub) =>
      hub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hub.address.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleOpenDialog = (hub?: Hub) => {
    if (hub) {
      setEditingHub(hub)
      setFormData({
        name: hub.name,
        address: hub.address,
        cityId: hub.cityId,
        latitude: hub.latitude,
        longitude: hub.longitude,
        contactPerson: hub.contactPerson,
        contactPhone: hub.contactPhone,
        isActive: hub.isActive,
      })
    } else {
      setEditingHub(null)
      setFormData(initialFormData)
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingHub) {
      updateHub(editingHub.id, formData)
      toast.success('Hub updated successfully')
    } else {
      addHub(formData)
      toast.success('Hub created successfully')
    }
    setIsDialogOpen(false)
    setEditingHub(null)
    setFormData(initialFormData)
  }

  const handleDelete = (id: string) => {
    const hubDrivers = drivers.filter(d => d.hubId === id)
    const hubCars = cars.filter(c => c.hubId === id)
    if (hubDrivers.length > 0 || hubCars.length > 0) {
      toast.error('Cannot delete hub with assigned drivers or cars')
      return
    }
    deleteHub(id)
    toast.success('Hub deleted successfully')
  }

  const getHubStats = (hubId: string) => {
    const hubDrivers = drivers.filter(d => d.hubId === hubId)
    const hubCars = cars.filter(c => c.hubId === hubId)
    return { drivers: hubDrivers.length, cars: hubCars.length }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Hubs</h1>
          <p className="text-muted-foreground">Manage service hubs and depots</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Hub
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hubs</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hubs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Hubs</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hubs.filter(h => h.isActive).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drivers in Hubs</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{drivers.filter(d => d.hubId).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cars in Hubs</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cars.filter(c => c.hubId).length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Hubs</CardTitle>
              <CardDescription>Manage your service hubs and depots</CardDescription>
            </div>
            <Input
              placeholder="Search hubs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hub Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Drivers</TableHead>
                <TableHead>Cars</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHubs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No hubs found
                  </TableCell>
                </TableRow>
              ) : (
                filteredHubs.map((hub) => {
                  const stats = getHubStats(hub.id)
                  const city = getCity(hub.cityId)
                  return (
                    <TableRow key={hub.id}>
                      <TableCell className="font-medium">{hub.name}</TableCell>
                      <TableCell>{city?.name || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{hub.address}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">{hub.contactPerson}</span>
                          <span className="text-xs text-muted-foreground">{hub.contactPhone}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{stats.drivers}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{stats.cars}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={hub.isActive ? 'default' : 'secondary'}>
                          {hub.isActive ? 'Active' : 'Inactive'}
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
                            <DropdownMenuItem onClick={() => handleOpenDialog(hub)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(hub.id)}
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingHub ? 'Edit Hub' : 'Add New Hub'}</DialogTitle>
            <DialogDescription>
              {editingHub ? 'Update hub details' : 'Create a new service hub'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <Field>
                <FieldLabel>Hub Name</FieldLabel>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter hub name"
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

              <Field>
                <FieldLabel>Address</FieldLabel>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter full address"
                  required
                />
              </Field>

              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Latitude</FieldLabel>
                  <Input
                    type="number"
                    step="0.0001"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                    placeholder="Latitude"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>Longitude</FieldLabel>
                  <Input
                    type="number"
                    step="0.0001"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                    placeholder="Longitude"
                    required
                  />
                </Field>
              </FieldGroup>

              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Contact Person</FieldLabel>
                  <Input
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="Contact name"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>Contact Phone</FieldLabel>
                  <Input
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="Phone number"
                    required
                  />
                </Field>
              </FieldGroup>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Active Hub</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingHub ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
