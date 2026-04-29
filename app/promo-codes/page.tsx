'use client'

import { useState } from 'react'
import { useAdmin } from '@/lib/admin-context'
import { PromoCode } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Plus, MoreHorizontal, Pencil, Trash2, Tag, Percent, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

const tripTypes = [
  { value: 'airport_pickup', label: 'Airport Pickup' },
  { value: 'airport_drop', label: 'Airport Drop' },
  { value: 'rental', label: 'Rental' },
  { value: 'city_ride', label: 'City Ride' },
  { value: 'outstation', label: 'Outstation' },
] as const

type PromoFormData = Omit<PromoCode, 'id' | 'createdAt' | 'usedCount'>

const initialFormData: PromoFormData = {
  code: '',
  description: '',
  discountType: 'percentage',
  discountValue: 10,
  maxDiscount: undefined,
  minOrderValue: 0,
  usageLimit: 100,
  validFrom: new Date().toISOString().split('T')[0],
  validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  applicableTripTypes: [],
  applicableCities: [],
  isActive: true,
}

export default function PromoCodesPage() {
  const { promoCodes, cities, addPromoCode, updatePromoCode, deletePromoCode, getCity } = useAdmin()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null)
  const [formData, setFormData] = useState<PromoFormData>(initialFormData)
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const filteredPromos = promoCodes.filter(
    (promo) =>
      promo.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      promo.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleOpenDialog = (promo?: PromoCode) => {
    if (promo) {
      setEditingPromo(promo)
      setFormData({
        code: promo.code,
        description: promo.description,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        maxDiscount: promo.maxDiscount,
        minOrderValue: promo.minOrderValue,
        usageLimit: promo.usageLimit,
        validFrom: promo.validFrom.split('T')[0],
        validTo: promo.validTo.split('T')[0],
        applicableTripTypes: promo.applicableTripTypes,
        applicableCities: promo.applicableCities,
        isActive: promo.isActive,
      })
    } else {
      setEditingPromo(null)
      setFormData(initialFormData)
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const promoData = {
      ...formData,
      validFrom: new Date(formData.validFrom).toISOString(),
      validTo: new Date(formData.validTo).toISOString(),
    }

    if (editingPromo) {
      updatePromoCode(editingPromo.id, promoData)
      toast.success('Promo code updated successfully')
    } else {
      addPromoCode({ ...promoData, usedCount: 0 })
      toast.success('Promo code created successfully')
    }
    setIsDialogOpen(false)
    setEditingPromo(null)
    setFormData(initialFormData)
  }

  const handleDelete = (id: string) => {
    deletePromoCode(id)
    toast.success('Promo code deleted successfully')
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success('Code copied to clipboard')
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleTripTypeToggle = (tripType: typeof tripTypes[number]['value']) => {
    const current = formData.applicableTripTypes
    const updated = current.includes(tripType)
      ? current.filter(t => t !== tripType)
      : [...current, tripType]
    setFormData({ ...formData, applicableTripTypes: updated })
  }

  const handleCityToggle = (cityId: string) => {
    const current = formData.applicableCities
    const updated = current.includes(cityId)
      ? current.filter(c => c !== cityId)
      : [...current, cityId]
    setFormData({ ...formData, applicableCities: updated })
  }

  const isExpired = (validTo: string) => new Date(validTo) < new Date()
  const isUpcoming = (validFrom: string) => new Date(validFrom) > new Date()

  const getStatusBadge = (promo: PromoCode) => {
    if (!promo.isActive) return <Badge variant="secondary">Inactive</Badge>
    if (isExpired(promo.validTo)) return <Badge variant="destructive">Expired</Badge>
    if (isUpcoming(promo.validFrom)) return <Badge variant="outline">Upcoming</Badge>
    if (promo.usedCount >= promo.usageLimit) return <Badge variant="secondary">Exhausted</Badge>
    return <Badge className="bg-success text-success-foreground">Active</Badge>
  }

  const activePromos = promoCodes.filter(p => p.isActive && !isExpired(p.validTo) && p.usedCount < p.usageLimit)
  const totalRedemptions = promoCodes.reduce((sum, p) => sum + p.usedCount, 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Promo Codes</h1>
          <p className="text-muted-foreground">Create and manage promotional discount codes</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Create Promo Code
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Codes</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{promoCodes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Codes</CardTitle>
            <Tag className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePromos.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Redemptions</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRedemptions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <Tag className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{promoCodes.filter(p => isExpired(p.validTo)).length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Promo Codes Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Promo Codes</CardTitle>
              <CardDescription>Manage your promotional offers</CardDescription>
            </div>
            <Input
              placeholder="Search codes..."
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
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Valid Period</TableHead>
                <TableHead>Trip Types</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPromos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No promo codes found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPromos.map((promo) => (
                  <TableRow key={promo.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-primary">{promo.code}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleCopyCode(promo.code)}
                        >
                          {copiedCode === promo.code ? (
                            <Check className="h-3 w-3 text-success" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{promo.description}</p>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">
                          {promo.discountType === 'percentage' ? `${promo.discountValue}%` : `₹${promo.discountValue}`}
                        </span>
                        {promo.maxDiscount && promo.discountType === 'percentage' && (
                          <p className="text-xs text-muted-foreground">Max: ₹{promo.maxDiscount}</p>
                        )}
                        {promo.minOrderValue > 0 && (
                          <p className="text-xs text-muted-foreground">Min: ₹{promo.minOrderValue}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{promo.usedCount} / {promo.usageLimit}</span>
                        <div className="w-16 h-1.5 bg-muted rounded-full mt-1">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.min((promo.usedCount / promo.usageLimit) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{new Date(promo.validFrom).toLocaleDateString()}</p>
                        <p className="text-muted-foreground">to {new Date(promo.validTo).toLocaleDateString()}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {promo.applicableTripTypes.length === 0 ? (
                          <Badge variant="outline" className="text-xs">All</Badge>
                        ) : (
                          promo.applicableTripTypes.slice(0, 2).map((type) => (
                            <Badge key={type} variant="outline" className="text-xs">
                              {type.split('_').join(' ')}
                            </Badge>
                          ))
                        )}
                        {promo.applicableTripTypes.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{promo.applicableTripTypes.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(promo)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDialog(promo)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(promo.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPromo ? 'Edit Promo Code' : 'Create Promo Code'}</DialogTitle>
            <DialogDescription>
              {editingPromo ? 'Update promo code details' : 'Create a new promotional discount code'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Promo Code</FieldLabel>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., SAVE20"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>Description</FieldLabel>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g., 20% off on first ride"
                    required
                  />
                </Field>
              </FieldGroup>

              <FieldGroup className="grid grid-cols-3 gap-4">
                <Field>
                  <FieldLabel>Discount Type</FieldLabel>
                  <Select
                    value={formData.discountType}
                    onValueChange={(value: 'percentage' | 'flat') =>
                      setFormData({ ...formData, discountType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="flat">Flat Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Discount Value</FieldLabel>
                  <Input
                    type="number"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) })}
                    min={0}
                    required
                  />
                </Field>
                {formData.discountType === 'percentage' && (
                  <Field>
                    <FieldLabel>Max Discount (₹)</FieldLabel>
                    <Input
                      type="number"
                      value={formData.maxDiscount || ''}
                      onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="Optional"
                      min={0}
                    />
                  </Field>
                )}
              </FieldGroup>

              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Min Order Value (₹)</FieldLabel>
                  <Input
                    type="number"
                    value={formData.minOrderValue}
                    onChange={(e) => setFormData({ ...formData, minOrderValue: parseFloat(e.target.value) })}
                    min={0}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>Usage Limit</FieldLabel>
                  <Input
                    type="number"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: parseInt(e.target.value) })}
                    min={1}
                    required
                  />
                </Field>
              </FieldGroup>

              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Valid From</FieldLabel>
                  <Input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>Valid To</FieldLabel>
                  <Input
                    type="date"
                    value={formData.validTo}
                    onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                    required
                  />
                </Field>
              </FieldGroup>

              <Field>
                <FieldLabel>Applicable Trip Types</FieldLabel>
                <p className="text-xs text-muted-foreground mb-2">Leave empty to apply to all trip types</p>
                <div className="flex flex-wrap gap-3">
                  {tripTypes.map((type) => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={type.value}
                        checked={formData.applicableTripTypes.includes(type.value)}
                        onCheckedChange={() => handleTripTypeToggle(type.value)}
                      />
                      <Label htmlFor={type.value} className="text-sm">{type.label}</Label>
                    </div>
                  ))}
                </div>
              </Field>

              <Field>
                <FieldLabel>Applicable Cities</FieldLabel>
                <p className="text-xs text-muted-foreground mb-2">Leave empty to apply to all cities</p>
                <div className="flex flex-wrap gap-3">
                  {cities.map((city) => (
                    <div key={city.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`city-${city.id}`}
                        checked={formData.applicableCities.includes(city.id)}
                        onCheckedChange={() => handleCityToggle(city.id)}
                      />
                      <Label htmlFor={`city-${city.id}`} className="text-sm">{city.name}</Label>
                    </div>
                  ))}
                </div>
              </Field>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingPromo ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
