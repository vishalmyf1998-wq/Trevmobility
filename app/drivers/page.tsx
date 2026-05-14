// @ts-nocheck
'use client'

import { useState } from 'react'
import { useAdmin } from '@/lib/admin-context'
import { Driver } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  DialogTrigger,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { PhoneInput } from '@/components/ui/phone-input'

type DriverFormData = Omit<Driver, 'id' | 'createdAt'>

const initialFormData: DriverFormData = {
  driverId: '',
  name: '',
  phone: '',
  email: '',
  licenseNumber: '',
  licenseExpiry: '',
  address: '',
  status: 'active',
  hubId: undefined,
}

export default function DriversPage() {
  const { drivers, addDriver, updateDriver, deleteDriver, cars, hubs, getHub } = useAdmin()
  const [searchQuery, setSearchQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)
  const [formData, setFormData] = useState<DriverFormData>(initialFormData)

  const filteredDrivers = drivers.filter(
    (driver) =>
      driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.phone.includes(searchQuery) ||
      driver.driverId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.licenseNumber.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingDriver) {
      updateDriver(editingDriver.id, formData)
      toast.success('Driver updated successfully')
    } else {
      addDriver(formData)
      toast.success('Driver added successfully')
    }
    handleCloseDialog()
  }

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver)
    setFormData({
      driverId: driver.driverId,
      name: driver.name,
      phone: driver.phone,
      email: driver.email,
      licenseNumber: driver.licenseNumber,
      licenseExpiry: driver.licenseExpiry,
      address: driver.address,
      status: driver.status,
      assignedCarId: driver.assignedCarId,
      hubId: driver.hubId,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    deleteDriver(id)
    toast.success('Driver deleted successfully')
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingDriver(null)
    setFormData(initialFormData)
  }

  const getStatusColor = (status: Driver['status']) => {
    switch (status) {
      case 'active':
        return 'bg-success/10 text-success border-success/20'
      case 'inactive':
        return 'bg-muted text-muted-foreground border-muted'
      case 'suspended':
        return 'bg-destructive/10 text-destructive border-destructive/20'
    }
  }

  const getAssignedCar = (driverId: string) => {
    return cars.find(car => car.assignedDriverId === driverId)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Drivers</h1>
          <p className="text-muted-foreground">Manage your fleet drivers</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setFormData(initialFormData)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Driver
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingDriver ? 'Edit Driver' : 'Add New Driver'}</DialogTitle>
              <DialogDescription>
                {editingDriver ? 'Update driver information' : 'Enter the details of the new driver'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <FieldGroup className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Driver ID</FieldLabel>
                    <Input
                      value={formData.driverId}
                      onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                      placeholder="Enter driver ID (e.g., DRV001)"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Full Name</FieldLabel>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter full name"
                      required
                    />
                  </Field>
                </FieldGroup>

                <FieldGroup className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Phone Number</FieldLabel>
                    <PhoneInput
                      value={formData.phone}
                      onChange={(value) => setFormData({ ...formData, phone: value })}
                      placeholder="Enter phone number"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Email</FieldLabel>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Enter email"
                      required
                    />
                  </Field>
                </FieldGroup>

                <Field>
                  <FieldLabel>Status</FieldLabel>
                  <Select
                    value={formData.status}
                    onValueChange={(value: Driver['status']) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <FieldGroup className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>License Number</FieldLabel>
                    <Input
                      value={formData.licenseNumber}
                      onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                      placeholder="Enter license number"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel>License Expiry</FieldLabel>
                    <Input
                      type="date"
                      value={formData.licenseExpiry}
                      onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                      required
                    />
                  </Field>
                </FieldGroup>

                <Field>
                  <FieldLabel>Address</FieldLabel>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter address"
                    required
                  />
                </Field>

                <FieldGroup className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Assign Hub</FieldLabel>
                    <Select
                      value={formData.hubId || 'none'}
                      onValueChange={(value) =>
                        setFormData({ ...formData, hubId: value === 'none' ? undefined : value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a hub" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No hub assigned</SelectItem>
                        {hubs.filter(h => h.isActive).map((hub) => (
                          <SelectItem key={hub.id} value={hub.id}>
                            {hub.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel>Assign Car (Optional)</FieldLabel>
                    <Select
                      value={formData.assignedCarId || 'none'}
                      onValueChange={(value) =>
                        setFormData({ ...formData, assignedCarId: value === 'none' ? undefined : value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a car" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No car assigned</SelectItem>
                        {cars
                          .filter(car => !car.assignedDriverId || car.assignedDriverId === editingDriver?.id)
                          .map((car) => (
                            <SelectItem key={car.id} value={car.id}>
                              {car.registrationNumber} - {car.make} {car.model}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingDriver ? 'Update Driver' : 'Add Driver'}
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
              <CardTitle>All Drivers</CardTitle>
              <CardDescription>{drivers.length} total drivers</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search drivers..."
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
                <TableHead>Driver ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>License</TableHead>
                <TableHead>Hub</TableHead>
                <TableHead>Assigned Car</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDrivers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No drivers found matching your search' : 'No drivers added yet'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredDrivers.map((driver) => {
                  const assignedCar = getAssignedCar(driver.id)
                  return (
                    <TableRow key={driver.id}>
                      <TableCell>
                        <span className="font-mono text-sm font-medium">{driver.driverId}</span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{driver.name}</p>
                          <p className="text-sm text-muted-foreground">{driver.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{driver.phone}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-mono text-sm">{driver.licenseNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            Exp: {new Date(driver.licenseExpiry).toLocaleDateString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {driver.hubId ? (
                          <Badge variant="outline">{getHub(driver.hubId)?.name}</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {assignedCar ? (
                          <span className="text-sm">
                            {assignedCar.registrationNumber}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(driver.status)}>
                          {driver.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(driver)}
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
                                <AlertDialogTitle>Delete Driver</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {driver.name}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(driver.id)}
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
