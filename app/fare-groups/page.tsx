'use client'

import { useState, type ComponentType, type FormEvent } from 'react'
import Link from 'next/link'
import { Building2, Pencil, Plus, Settings2, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useAdmin } from '@/lib/admin-context'
import type { FareGroup } from '@/lib/types'
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
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

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

const makeFareGroupCode = (fareGroup: FareGroup) =>
  fareGroup.name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || fareGroup.id

export default function FareGroupsPage() {
  const { fareGroups, addFareGroup, updateFareGroup, deleteFareGroup, b2bClients } = useAdmin()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingFareGroup, setEditingFareGroup] = useState<FareGroup | null>(null)
  const [formData, setFormData] = useState<FareGroupFormData>(initialFormData)

  const b2cGroups = fareGroups.filter((group) => group.type === 'B2C')
  const b2bGroups = fareGroups.filter((group) => group.type === 'B2B')

  const openCreateDialog = () => {
    setEditingFareGroup(null)
    setFormData(initialFormData)
    setIsDialogOpen(true)
  }

  const openEditDialog = (fareGroup: FareGroup) => {
    setEditingFareGroup(fareGroup)
    setFormData({
      name: fareGroup.name,
      description: fareGroup.description,
      type: fareGroup.type === 'B2B' ? 'B2B' : 'B2C',
      isDefault: fareGroup.isDefault,
    })
    setIsDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingFareGroup(null)
    setFormData(initialFormData)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    if (editingFareGroup) {
      updateFareGroup(editingFareGroup.id, formData)
      toast.success('Fare group updated successfully')
    } else {
      addFareGroup({
        ...formData,
        airportFares: [],
        railwayFares: [],
        rentalFares: [],
        cityRideFares: [],
        outstationFares: [],
      })
      toast.success('Fare group created successfully')
    }

    closeDialog()
  }

  const handleDelete = (fareGroup: FareGroup) => {
    const clientsUsingGroup = b2bClients.filter((client) => client.fareGroupId === fareGroup.id)
    if (clientsUsingGroup.length > 0) {
      toast.error('Cannot delete fare group assigned to B2B clients')
      return
    }
    if (fareGroup.isDefault) {
      toast.error('Default fare group cannot be deleted')
      return
    }

    deleteFareGroup(fareGroup.id)
    toast.success('Fare group deleted successfully')
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] -m-6 p-6 font-sans text-gray-900 antialiased sm:p-8">
      <div className="mx-auto max-w-[1400px] space-y-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-950">Fare Groups</h1>
            <p className="mt-1 text-xs text-gray-500 sm:text-sm">
              Create and manage fare groups for B2C and B2B clients.
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                onClick={openCreateDialog}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#22C55E] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#16A34A] active:bg-[#15803D] sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Create Fare Group
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingFareGroup ? 'Edit Fare Group' : 'Create Fare Group'}</DialogTitle>
                <DialogDescription>
                  Create and manage fare groups for B2C and B2B clients.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <Field>
                    <FieldLabel>Group Name</FieldLabel>
                    <Input
                      value={formData.name}
                      onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                      placeholder="e.g., MMT"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Description</FieldLabel>
                    <Textarea
                      value={formData.description}
                      onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                      placeholder="Brief description of this fare group"
                      rows={2}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Group Type</FieldLabel>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value as FareGroupFormData['type'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="B2C">B2C</SelectItem>
                        <SelectItem value="B2B">B2B</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={closeDialog}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingFareGroup ? 'Update Group' : 'Create Group'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-8">
          <FareGroupSection
            title="B2C Fare Groups"
            icon={Users}
            count={b2cGroups.length}
            fareGroups={b2cGroups}
            onEdit={openEditDialog}
            onDelete={handleDelete}
          />

          <FareGroupSection
            title="B2B Fare Groups"
            icon={Building2}
            count={b2bGroups.length}
            fareGroups={b2bGroups}
            onEdit={openEditDialog}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  )
}

function FareGroupSection({
  title,
  icon: Icon,
  count,
  fareGroups,
  onEdit,
  onDelete,
}: {
  title: string
  icon: ComponentType<{ className?: string }>
  count: number
  fareGroups: FareGroup[]
  onEdit: (fareGroup: FareGroup) => void
  onDelete: (fareGroup: FareGroup) => void
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 text-gray-600" />
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        <span className="ml-0.5 text-xs font-medium text-gray-500">{count}</span>
      </div>

      {fareGroups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center">
          <p className="text-sm text-gray-500">No {title.toLowerCase()} yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {fareGroups.map((fareGroup) => (
            <FareGroupCard
              key={fareGroup.id}
              fareGroup={fareGroup}
              onEdit={() => onEdit(fareGroup)}
              onDelete={() => onDelete(fareGroup)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function FareGroupCard({
  fareGroup,
  onEdit,
  onDelete,
}: {
  fareGroup: FareGroup
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex min-h-[160px] flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-bold tracking-wide text-gray-900">{fareGroup.name}</h3>
            <p className="mt-0.5 truncate font-mono text-[11px] text-gray-500">
              {makeFareGroupCode(fareGroup)}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[10px] font-semibold text-gray-600">
            {fareGroup.type}
          </span>
        </div>

        <div className="mt-3">
          {fareGroup.description ? (
            <p className="line-clamp-2 text-xs text-gray-600">{fareGroup.description}</p>
          ) : (
            <p className="text-xs italic text-gray-400">No description</p>
          )}
        </div>
      </div>

      <div className="mt-auto flex items-center gap-2 pt-4">
        <Link
          href={`/fare-groups/${fareGroup.id}`}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-800 transition-colors hover:bg-gray-50"
        >
          <Settings2 className="h-4 w-4" />
          Configure Fares
        </Link>

        <button
          type="button"
          onClick={onEdit}
          className="rounded-full p-2.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          title="Edit"
        >
          <Pencil className="h-4 w-4" />
        </button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="rounded-full p-2.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Fare Group</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{fareGroup.name}"?
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
    </div>
  )
}
