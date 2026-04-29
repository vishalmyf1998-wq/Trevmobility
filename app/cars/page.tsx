'use client'

import { useState } from 'react'
import { useAdmin } from '@/lib/admin-context'
import { Car } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

type CarFormData = Omit<Car, 'id' | 'createdAt'>

const initialFormData: CarFormData = {
  registrationNumber: '',
  categoryId: '',
  make: '',
  model: '',
  year: new Date().getFullYear(),
  color: '',
  fuelType: 'electric',
  seatingCapacity: 5,
  status: 'available',
  hubId: undefined,
}

export default function CarsPage() {
  const { cars, addCar, updateCar, deleteCar, carCategories, drivers, hubs, getCarCategory, getHub } = useAdmin()
  const [searchQuery, setSearchQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCar, setEditingCar] = useState<Car | null>(null)
  const [formData, setFormData] = useState<CarFormData>(initialFormData)

  const filteredCars = cars.filter(
    (car) =>
      car.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      car.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
      car.model.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingCar) {
      updateCar(editingCar.id, formData)
      toast.success('Car updated successfully')
    } else {
      addCar(formData)
      toast.success('Car added successfully')
    }
    handleCloseDialog()
  }

  const handleEdit = (car: Car) => {
    setEditingCar(car)
    setFormData({
      registrationNumber: car.registrationNumber,
      categoryId: car.categoryId,
      make: car.make,
      model: car.model,
      year: car.year,
      color: car.color,
      fuelType: car.fuelType,
      seatingCapacity: car.seatingCapacity,
      status: car.status,
      assignedDriverId: car.assignedDriverId,
      hubId: car.hubId,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    deleteCar(id)
    toast.success('Car deleted successfully')
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingCar(null)
    setFormData(initialFormData)
  }

  const getStatusColor = (status: Car['status']) => {
    switch (status) {
      case 'available':
        return 'bg-success/10 text-success border-success/20'
      case 'on_trip':
        return 'bg-primary/10 text-primary border-primary/20'
      case 'maintenance':
        return 'bg-warning/10 text-warning border-warning/20'
      case 'inactive':
        return 'bg-muted text-muted-foreground border-muted'
      default:
        return 'bg-muted text-muted-foreground border-muted'
    }
  }

  const getAssignedDriver = (driverId?: string) => {
    if (!driverId) return null
    return drivers.find(d => d.id === driverId)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Cars</h1>
          <p className="text-muted-foreground">Manage your fleet vehicles</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setFormData(initialFormData)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Car
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingCar ? 'Edit Car' : 'Add New Car'}</DialogTitle>
              <DialogDescription>
                {editingCar ? 'Update car information' : 'Enter the details of the new car'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <FieldGroup className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Registration Number</FieldLabel>
                    <Input
                      value={formData.registrationNumber}
                      onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value.toUpperCase() })}
                      placeholder="e.g., MH01AB1234"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Category</FieldLabel>
                    <Select
                      value={formData.categoryId}
                      onValueChange={(value) => setFormData({ ...formData, categoryId: value, make: '', model: '' })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {carCategories.filter(c => c.isActive).map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>

                <FieldGroup className="grid grid-cols-1 gap-4">
                  <Field>
                    <FieldLabel>Make & Model</FieldLabel>
                    {(() => {
                      const selectedCat = carCategories.find(c => c.id === formData.categoryId)
                      const modelsList = selectedCat?.supportedModels
                        ? selectedCat.supportedModels.split(',').map(s => s.trim()).filter(Boolean)
                        : []

                      if (!formData.categoryId) {
                        return (
                          <Input disabled placeholder="Please select a category first to view models" />
                        )
                      }

                      // Agar category mein models defined nahi hain, toh purana manual input dikhayenge
                      if (modelsList.length === 0) {
                        return (
                          <div className="grid grid-cols-2 gap-4">
                            <Input
                              value={formData.make}
                              onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                              placeholder="Make (e.g., Toyota)"
                              required
                            />
                            <Input
                              value={formData.model}
                              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                              placeholder="Model (e.g., Innova)"
                              required
                            />
                          </div>
                        )
                      }

                      const combinedValue = `${formData.make} ${formData.model}`.trim()
                      const matchedValue = modelsList.find(m => m.toLowerCase() === combinedValue.toLowerCase())

                      return (
                        <Select
                          value={matchedValue || ''}
                          onValueChange={(value) => {
                            const parts = value.split(' ')
                            const make = parts[0] || ''
                            const model = parts.slice(1).join(' ') || value
                            setFormData({ ...formData, make, model })
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a supported model" />
                          </SelectTrigger>
                          <SelectContent>
                            {modelsList.map((modelName, idx) => (
                              <SelectItem key={idx} value={modelName}>
                                {modelName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )
                    })()}
                  </Field>
                </FieldGroup>

                <FieldGroup className="grid grid-cols-3 gap-4">
                  <Field>
                    <FieldLabel>Year</FieldLabel>
                    <Input
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                      min={2000}
                      max={new Date().getFullYear() + 1}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Color</FieldLabel>
                    <Input
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="e.g., White"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Seating Capacity</FieldLabel>
                    <Input
                      type="number"
                      value={formData.seatingCapacity}
                      onChange={(e) => setFormData({ ...formData, seatingCapacity: parseInt(e.target.value) })}
                      min={2}
                      max={12}
                      required
                    />
                  </Field>
                </FieldGroup>

                <FieldGroup className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Fuel Type</FieldLabel>
                    <Select
                      value={formData.fuelType}
                      onValueChange={(value: Car['fuelType']) => setFormData({ ...formData, fuelType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="petrol">Petrol</SelectItem>
                        <SelectItem value="diesel">Diesel</SelectItem>
                        <SelectItem value="cng">CNG</SelectItem>
                        <SelectItem value="electric">Electric</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel>Status</FieldLabel>
                    <Select
                      value={formData.status}
                      onValueChange={(value: Car['status']) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="on_trip">On Trip</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>

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
                    <FieldLabel>Assign Driver (Optional)</FieldLabel>
                    <Select
                      value={formData.assignedDriverId || 'none'}
                      onValueChange={(value) =>
                        setFormData({ ...formData, assignedDriverId: value === 'none' ? undefined : value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a driver" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No driver assigned</SelectItem>
                        {drivers
                          .filter(d => d.status === 'active')
                          .map((driver) => (
                            <SelectItem key={driver.id} value={driver.id}>
                              {driver.name} - {driver.phone}
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
                  {editingCar ? 'Update Car' : 'Add Car'}
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
              <CardTitle>All Cars</CardTitle>
              <CardDescription>{cars.length} total vehicles</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search cars..."
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
                <TableHead>Registration</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Hub</TableHead>
                <TableHead>Assigned Driver</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCars.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No cars found matching your search' : 'No cars added yet'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCars.map((car) => {
                  const category = getCarCategory(car.categoryId)
                  const assignedDriver = getAssignedDriver(car.assignedDriverId)
                  return (
                    <TableRow key={car.id}>
                      <TableCell>
                        <span className="font-mono font-medium">{car.registrationNumber}</span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{car.make} {car.model}</p>
                          <p className="text-sm text-muted-foreground">
                            {car.year} | {car.color} | {car.fuelType} | {car.seatingCapacity} seats
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {category ? (
                          <Badge variant="outline">{category.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {car.hubId ? (
                          <Badge variant="outline">{getHub(car.hubId)?.name}</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {assignedDriver ? (
                          <span className="text-sm">{assignedDriver.name}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(car.status)}>
                          {car.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(car)}
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
                                <AlertDialogTitle>Delete Car</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {car.registrationNumber}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(car.id)}
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
