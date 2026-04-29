'use client'

import { useState } from 'react'
import { useAdmin } from '@/lib/admin-context'
import { FareGroup } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
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
import { Plus, Pencil, Trash2, Settings2, Users, Building2, Star } from 'lucide-react'
import { toast } from 'sonner'
import { Field, FieldLabel } from '@/components/ui/field'
import Link from 'next/link'

type FareGroupFormData = {
  name: string
  description: string
  type: 'B2C' | 'B2B'
  isDefault: boolean
}

const initialFormData: FareGroupFormData = {
  name: '',
  description: '',
  type: 'B2C',
  isDefault: false,
}

export default function FareGroupsPage() {
  const { fareGroups, addFareGroup, updateFareGroup, deleteFareGroup, b2bClients } = useAdmin()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<FareGroup | null>(null)
  const [formData, setFormData] = useState<FareGroupFormData>(initialFormData)

  const b2cGroups = fareGroups.filter(g => g.type === 'B2C')
  const b2bGroups = fareGroups.filter(g => g.type === 'B2B')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingGroup) {
      updateFareGroup(editingGroup.id, formData)
      toast.success('Fare group updated successfully')
    } else {
      addFareGroup({
        ...formData,
        airportFares: [],
        rentalFares: [],
        cityRideFares: [],
        outstationFares: [],
      })
      toast.success('Fare group created successfully')
    }
    handleCloseDialog()
  }

  const handleEdit = (group: FareGroup) => {
    setEditingGroup(group)
    setFormData({
      name: group.name,
      description: group.description,
      type: group.type,
      isDefault: group.isDefault,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    const clientsUsingGroup = b2bClients.filter(c => c.fareGroupId === id)
    if (clientsUsingGroup.length > 0) {
      toast.error('Cannot delete fare group assigned to B2B clients')
      return
    }
    deleteFareGroup(id)
    toast.success('Fare group deleted successfully')
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingGroup(null)
    setFormData(initialFormData)
  }

  const getClientsCount = (groupId: string) => {
    return b2bClients.filter(c => c.fareGroupId === groupId).length
  }

  const getFaresCount = (group: FareGroup) => {
    return (
      group.airportFares.length +
      group.rentalFares.length +
      group.cityRideFares.length +
      group.outstationFares.length
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Fare Groups</h1>
          <p className="text-muted-foreground">Create and manage fare groups for B2C and B2B clients</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setFormData(initialFormData)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Fare Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingGroup ? 'Edit Fare Group' : 'Create New Fare Group'}</DialogTitle>
              <DialogDescription>
                {editingGroup ? 'Update fare group details' : 'Create a new fare group for B2C or B2B pricing'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <Field>
                  <FieldLabel>Group Name</FieldLabel>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Corporate Premium Rates"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>Description</FieldLabel>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this fare group"
                    rows={2}
                  />
                </Field>
                <Field>
                  <FieldLabel>Group Type</FieldLabel>
                  <Select
                    value={formData.type}
                    onValueChange={(value: 'B2C' | 'B2B') => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="B2C">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>B2C (Direct Customers)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="B2B">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span>B2B (Corporate Clients)</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingGroup ? 'Update Group' : 'Create Group'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* B2C Groups */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">B2C Fare Groups</h2>
          <Badge variant="secondary">{b2cGroups.length}</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {b2cGroups.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Users className="h-12 w-12 text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">No B2C fare groups yet</p>
                <p className="text-sm text-muted-foreground">Create one to configure pricing for direct customers</p>
              </CardContent>
            </Card>
          ) : (
            b2cGroups.map((group) => (
              <FareGroupCard
                key={group.id}
                group={group}
                faresCount={getFaresCount(group)}
                clientsCount={0}
                onEdit={() => handleEdit(group)}
                onDelete={() => handleDelete(group.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* B2B Groups */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold">B2B Fare Groups</h2>
          <Badge variant="secondary">{b2bGroups.length}</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {b2bGroups.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Building2 className="h-12 w-12 text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">No B2B fare groups yet</p>
                <p className="text-sm text-muted-foreground">Create one to configure special pricing for corporate clients</p>
              </CardContent>
            </Card>
          ) : (
            b2bGroups.map((group) => (
              <FareGroupCard
                key={group.id}
                group={group}
                faresCount={getFaresCount(group)}
                clientsCount={getClientsCount(group.id)}
                onEdit={() => handleEdit(group)}
                onDelete={() => handleDelete(group.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function FareGroupCard({
  group,
  faresCount,
  clientsCount,
  onEdit,
  onDelete,
}: {
  group: FareGroup
  faresCount: number
  clientsCount: number
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {group.isDefault && (
              <Star className="h-4 w-4 text-warning fill-warning" />
            )}
            <CardTitle className="text-base">{group.name}</CardTitle>
          </div>
          <Badge variant={group.type === 'B2C' ? 'default' : 'secondary'}>
            {group.type}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2">
          {group.description || 'No description'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <span>{faresCount} fare config{faresCount !== 1 ? 's' : ''}</span>
          {group.type === 'B2B' && (
            <span>{clientsCount} client{clientsCount !== 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href={`/fare-groups/${group.id}`}>
              <Settings2 className="mr-2 h-4 w-4" />
              Configure Fares
            </Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" disabled={clientsCount > 0 || group.isDefault}>
                <Trash2 className={`h-4 w-4 ${clientsCount > 0 || group.isDefault ? 'text-muted-foreground' : 'text-destructive'}`} />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Fare Group</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {group.name}? This will remove all fare configurations in this group.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}
