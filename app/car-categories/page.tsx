'use client'

import { useState } from 'react'
import { useAdmin } from '@/lib/admin-context'
import { CarCategory } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
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
import { Plus, Pencil, Trash2, Search, Car, Crown, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'

type CarCategoryFormData = Omit<CarCategory, 'id'>

const initialFormData: CarCategoryFormData = {
  name: '',
  description: '',
  supportedModels: '',
  icon: 'car',
  isActive: true,
}

const iconOptions = [
  { value: 'car', label: 'Car', icon: Car },
  { value: 'truck', label: 'SUV', icon: Truck },
  { value: 'crown', label: 'Luxury', icon: Crown },
]

export default function CarCategoriesPage() {
  const { carCategories, addCarCategory, updateCarCategory, deleteCarCategory, cars } = useAdmin()
  const [searchQuery, setSearchQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CarCategory | null>(null)
  const [formData, setFormData] = useState<CarCategoryFormData>(initialFormData)

  const filteredCategories = carCategories.filter(
    (category) =>
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (category.supportedModels && category.supportedModels.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingCategory) {
      updateCarCategory(editingCategory.id, formData)
      toast.success('Category updated successfully')
    } else {
      addCarCategory(formData)
      toast.success('Category added successfully')
    }
    handleCloseDialog()
  }

  const handleEdit = (category: CarCategory) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description,
      supportedModels: category.supportedModels || '',
      icon: category.icon,
      isActive: category.isActive,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    const carsInCategory = cars.filter(car => car.categoryId === id)
    if (carsInCategory.length > 0) {
      toast.error('Cannot delete category with assigned cars')
      return
    }
    deleteCarCategory(id)
    toast.success('Category deleted successfully')
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingCategory(null)
    setFormData(initialFormData)
  }

  const handleToggleActive = (category: CarCategory) => {
    updateCarCategory(category.id, { isActive: !category.isActive })
    toast.success(`Category ${category.isActive ? 'deactivated' : 'activated'} successfully`)
  }

  const getCarsCount = (categoryId: string) => {
    return cars.filter(car => car.categoryId === categoryId).length
  }

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'truck':
        return Truck
      case 'crown':
        return Crown
      default:
        return Car
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Car Categories</h1>
          <p className="text-muted-foreground">Manage vehicle categories for your fleet</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setFormData(initialFormData)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
              <DialogDescription>
                {editingCategory ? 'Update category information' : 'Enter the category details'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <Field>
                  <FieldLabel>Category Name</FieldLabel>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Sedan"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>Description</FieldLabel>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this category"
                    rows={2}
                  />
                </Field>
                <Field>
                  <FieldLabel>Supported Cars & Models</FieldLabel>
                  <Input
                    value={formData.supportedModels || ''}
                    onChange={(e) => setFormData({ ...formData, supportedModels: e.target.value })}
                    placeholder="e.g., Toyota Innova, Maruti Ertiga"
                  />
                </Field>
                <Field>
                  <FieldLabel>Icon</FieldLabel>
                  <div className="flex gap-2">
                    {iconOptions.map((option) => {
                      const Icon = option.icon
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, icon: option.value })}
                          className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
                            formData.icon === option.value
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-input hover:bg-muted'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </button>
                      )
                    })}
                  </div>
                </Field>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-sm">Active Status</p>
                    <p className="text-xs text-muted-foreground">Enable this category for fare configuration</p>
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
                  {editingCategory ? 'Update Category' : 'Add Category'}
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
              <CardTitle>All Categories</CardTitle>
              <CardDescription>{carCategories.length} total categories, {carCategories.filter(c => c.isActive).length} active</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
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
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                  <TableHead>Supported Models</TableHead>
                <TableHead>Cars</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No categories found matching your search' : 'No categories added yet'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategories.map((category) => {
                  const Icon = getIconComponent(category.icon)
                  const carsCount = getCarsCount(category.id)
                  return (
                    <TableRow key={category.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <span className="font-medium">{category.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {category.description || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {category.supportedModels || '-'}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{carsCount} vehicle{carsCount !== 1 ? 's' : ''}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={category.isActive}
                            onCheckedChange={() => handleToggleActive(category)}
                          />
                          <Badge
                            variant="outline"
                            className={category.isActive ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground'}
                          >
                            {category.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(category)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" disabled={carsCount > 0}>
                                <Trash2 className={`h-4 w-4 ${carsCount > 0 ? 'text-muted-foreground' : 'text-destructive'}`} />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {category.name}? This will also remove all fare configurations for this category.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(category.id)}
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
