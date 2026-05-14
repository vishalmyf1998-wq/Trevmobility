// @ts-nocheck
'use client'

import { useState } from 'react'
import { useAdmin } from '@/lib/admin-context'
import { B2BClient, B2BEntity } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Plus, Pencil, Trash2, Search, Building2, Users, CreditCard, IndianRupee, Briefcase } from 'lucide-react'
import { toast } from 'sonner'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { PhoneInput } from '@/components/ui/phone-input'

type ClientFormData = Omit<B2BClient, 'id' | 'createdAt' | 'entities' | 'currentBalance'>

const initialFormData: ClientFormData = {
  companyName: '',
  orgId: '',
  webhookUrl: '',
  contactPerson: '',
  email: '',
  phone: '',
  gstNumber: '',
  billingAddress: '',
  fareGroupId: '',
  creditLimit: 0,
  creditDays: 0,
  status: 'active',
  isGSTEnabled: false,
  billingType: 'garage_to_garage',
}

export default function B2BClientsPage() {
  const {
    b2bClients,
    fareGroups,
    addB2BClient,
    updateB2BClient,
    deleteB2BClient,
    addB2BEntity,
    updateB2BEntity,
    deleteB2BEntity,
    getB2BEntities,
    getFareGroup,
  } = useAdmin()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEntityDialogOpen, setIsEntityDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<B2BClient | null>(null)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [formData, setFormData] = useState<ClientFormData>(initialFormData)

  const [entityForm, setEntityForm] = useState<Partial<B2BEntity>>({
    name: '',
    code: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    isActive: true,
  })
  const [editingEntity, setEditingEntity] = useState<B2BEntity | null>(null)

  const filteredClients = b2bClients.filter((client) => {
    const matchesSearch =
      client.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone.includes(searchQuery) ||
      client.gstNumber.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: b2bClients.length,
    active: b2bClients.filter((c) => c.status === 'active').length,
    suspended: b2bClients.filter((c) => c.status === 'suspended').length,
    totalOutstanding: b2bClients.reduce((sum, c) => sum + (c.currentBalance || 0), 0),
  }

  const handleOpenCreate = () => {
    setEditingClient(null)
    setFormData(initialFormData)
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (client: B2BClient) => {
    setEditingClient(client)
    setFormData({
      companyName: client.companyName,
      orgId: client.orgId || '',
      webhookUrl: client.webhookUrl || '',
      contactPerson: client.contactPerson,
      email: client.email,
      phone: client.phone,
      gstNumber: client.gstNumber,
      billingAddress: client.billingAddress,
      fareGroupId: client.fareGroupId,
      creditLimit: client.creditLimit,
      creditDays: client.creditDays,
      status: client.status,
      isGSTEnabled: client.isGSTEnabled,
      billingType: client.billingType,
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.companyName || !formData.contactPerson || !formData.phone) {
      toast.error('Please fill required fields')
      return
    }
    if (editingClient) {
      updateB2BClient(editingClient.id, formData)
      toast.success('Client updated successfully')
    } else {
      addB2BClient({ ...formData, currentBalance: 0 })
      toast.success('Client added successfully')
    }
    setIsDialogOpen(false)
    setFormData(initialFormData)
    setEditingClient(null)
  }

  const handleDeleteClient = (id: string) => {
    deleteB2BClient(id)
    toast.success('Client deleted successfully')
  }

  const openEntityDialog = (clientId: string) => {
    setSelectedClientId(clientId)
    setEditingEntity(null)
    setEntityForm({ name: '', code: '', contactPerson: '', email: '', phone: '', address: '', isActive: true })
    setIsEntityDialogOpen(true)
  }

  const openEditEntity = (clientId: string, entity: B2BEntity) => {
    setSelectedClientId(clientId)
    setEditingEntity(entity)
    setEntityForm({
      name: entity.name,
      code: entity.code,
      contactPerson: entity.contactPerson,
      email: entity.email,
      phone: entity.phone,
      address: entity.address,
      isActive: entity.isActive,
    })
    setIsEntityDialogOpen(true)
  }

  const handleSaveEntity = () => {
    if (!selectedClientId || !entityForm.name || !entityForm.code) {
      toast.error('Please fill entity name and code')
      return
    }
    if (editingEntity) {
      updateB2BEntity(selectedClientId, editingEntity.id, entityForm)
      toast.success('Entity updated successfully')
    } else {
      addB2BEntity(selectedClientId, entityForm as Omit<B2BEntity, 'id' | 'createdAt' | 'b2bClientId'>)
      toast.success('Entity added successfully')
    }
    setIsEntityDialogOpen(false)
  }

  const handleDeleteEntity = (clientId: string, entityId: string) => {
    deleteB2BEntity(clientId, entityId)
    toast.success('Entity deleted successfully')
  }

  const getStatusBadge = (status: B2BClient['status']) => {
    const styles: Record<string, string> = {
      active: 'bg-success/10 text-success border-success/20',
      inactive: 'bg-muted text-muted-foreground border-muted',
      suspended: 'bg-destructive/10 text-destructive border-destructive/20',
    }
    return (
      <Badge variant="outline" className={styles[status]}>
        {status}
      </Badge>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">B2B Clients</h1>
          <p className="text-muted-foreground">Manage business clients and their billing profiles</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingClient ? 'Edit Client' : 'Add B2B Client'}</DialogTitle>
              <DialogDescription>
                {editingClient ? 'Update client details' : 'Enter details of the new business client'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <FieldGroup className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Company Name *</FieldLabel>
                    <Input
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      placeholder="e.g., Acme Corp"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Org ID (External API)</FieldLabel>
                    <Input
                      value={formData.orgId}
                      onChange={(e) => setFormData({ ...formData, orgId: e.target.value })}
                      placeholder="e.g., PARTNER-123"
                    />
                  </Field>
                </FieldGroup>

                <Field>
                  <FieldLabel>Webhook URL (Optional)</FieldLabel>
                  <Input
                    type="url"
                    value={formData.webhookUrl}
                    onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                    placeholder="https://partner-domain.com/webhooks/trev-cabs"
                  />
                </Field>

                <FieldGroup className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Contact Person *</FieldLabel>
                    <Input
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      placeholder="e.g., John Doe"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Email</FieldLabel>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@company.com"
                    />
                  </Field>
                </FieldGroup>

                <FieldGroup className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Phone *</FieldLabel>
                    <PhoneInput
                      value={formData.phone}
                      onChange={(value) => setFormData({ ...formData, phone: value })}
                      placeholder="9876543210"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel>GST Number</FieldLabel>
                    <Input
                      value={formData.gstNumber}
                      onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                      placeholder="GSTIN"
                    />
                  </Field>
                </FieldGroup>

                <FieldGroup className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Fare Group</FieldLabel>
                    <Select
                      value={formData.fareGroupId || 'none'}
                      onValueChange={(value) =>
                        setFormData({ ...formData, fareGroupId: value === 'none' ? '' : value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select fare group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No fare group</SelectItem>
                        {fareGroups.map((fg) => (
                          <SelectItem key={fg.id} value={fg.id}>
                            {fg.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel>Billing Address</FieldLabel>
                    <Input
                      value={formData.billingAddress}
                      onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                      placeholder="Full billing address"
                    />
                  </Field>
                </FieldGroup>

                <FieldGroup className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Credit Limit (Rs.)</FieldLabel>
                    <Input
                      type="number"
                      value={formData.creditLimit}
                      onChange={(e) =>
                        setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Credit Days</FieldLabel>
                    <Input
                      type="number"
                      value={formData.creditDays}
                      onChange={(e) =>
                        setFormData({ ...formData, creditDays: parseInt(e.target.value) || 0 })
                      }
                    />
                  </Field>
                </FieldGroup>

                <FieldGroup className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Status</FieldLabel>
                    <Select
                      value={formData.status}
                      onValueChange={(value: B2BClient['status']) =>
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
                  <Field>
                    <FieldLabel>Billing Type</FieldLabel>
                    <Select
                      value={formData.billingType}
                      onValueChange={(value: 'garage_to_garage' | 'point_to_point') =>
                        setFormData({ ...formData, billingType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="garage_to_garage">Garage to Garage</SelectItem>
                        <SelectItem value="point_to_point">Point to Point</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>

                <div className="flex items-center gap-3 pt-2">
                  <Switch
                    id="gst-enabled"
                    checked={formData.isGSTEnabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isGSTEnabled: checked })
                    }
                  />
                  <label htmlFor="gst-enabled" className="text-sm font-medium cursor-pointer">
                    GST Enabled
                  </label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingClient ? 'Update Client' : 'Add Client'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Users className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <Users className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.suspended}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <IndianRupee className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              Rs. {(stats.totalOutstanding || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>All Clients</CardTitle>
              <CardDescription>{filteredClients.length} clients found</CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No clients found</p>
              <p className="text-sm">Add your first B2B client</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>GST</TableHead>
                  <TableHead>Fare Group</TableHead>
                  <TableHead>Credit Limit</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => {
                  const entities = getB2BEntities(client.id)
                  const utilization = client.creditLimit > 0 ? ((client.currentBalance || 0) / client.creditLimit) * 100 : 0
                  return (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{client.companyName}</p>
                            {client.orgId && <p className="text-xs text-muted-foreground font-mono mt-0.5">Org ID: {client.orgId}</p>}
                            <p className="text-xs text-muted-foreground">{client.billingAddress}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{client.contactPerson}</p>
                          <p className="text-xs text-muted-foreground">{client.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{client.gstNumber || '-'}</p>
                          <p className="text-xs text-muted-foreground">
                            {client.isGSTEnabled ? 'GST Enabled' : 'No GST'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getFareGroup(client.fareGroupId)?.name || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>Rs. {(client.creditLimit || 0).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{client.creditDays} days</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-destructive">
                            Rs. {(client.currentBalance || 0).toLocaleString()}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-16 h-2 bg-muted rounded-full">
                              <div
                                className={`h-full rounded-full ${
                                  utilization > 80
                                    ? 'bg-destructive'
                                    : utilization > 50
                                    ? 'bg-warning'
                                    : 'bg-success'
                                }`}
                                style={{ width: `${Math.min(utilization, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {utilization.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(client.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(client)}
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
                                <AlertDialogTitle>Delete Client</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {client.companyName}? This action
                                  cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteClient(client.id)}
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
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Entities Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Sub-Entities
          </CardTitle>
          <CardDescription>Manage cost centers and departments under each client</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={filteredClients[0]?.id || 'none'}>
            <TabsList className="mb-4 flex-wrap h-auto">
              {filteredClients.map((client) => (
                <TabsTrigger key={client.id} value={client.id}>
                  {client.companyName}
                </TabsTrigger>
              ))}
              {filteredClients.length === 0 && (
                <TabsTrigger value="none" disabled>
                  No clients
                </TabsTrigger>
              )}
            </TabsList>
            {filteredClients.map((client) => {
              const entities = getB2BEntities(client.id)
              return (
                <TabsContent key={client.id} value={client.id}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{client.companyName}</h3>
                    <Button size="sm" onClick={() => openEntityDialog(client.id)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Entity
                    </Button>
                  </div>
                  {entities.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No entities for this client</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Address</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entities.map((entity) => (
                          <TableRow key={entity.id}>
                            <TableCell className="font-medium">{entity.name}</TableCell>
                            <TableCell>
                              <span className="font-mono text-sm">{entity.code}</span>
                            </TableCell>
                            <TableCell>{entity.contactPerson}</TableCell>
                            <TableCell>{entity.phone}</TableCell>
                            <TableCell className="max-w-xs truncate">
                              {entity.address}
                            </TableCell>
                            <TableCell>
                              <Badge variant={entity.isActive ? 'default' : 'secondary'}>
                                {entity.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditEntity(client.id, entity)}
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
                                      <AlertDialogTitle>Delete Entity</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Delete {entity.name}? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteEntity(client.id, entity.id)}
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
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              )
            })}
          </Tabs>
        </CardContent>
      </Card>

      {/* Entity Dialog */}
      <Dialog open={isEntityDialogOpen} onOpenChange={setIsEntityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEntity ? 'Edit Entity' : 'Add Entity'}</DialogTitle>
            <DialogDescription>
              {editingEntity ? 'Update entity details' : 'Add a new sub-entity to this client'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <FieldGroup className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Entity Name *</FieldLabel>
                <Input
                  value={entityForm.name}
                  onChange={(e) => setEntityForm({ ...entityForm, name: e.target.value })}
                  placeholder="e.g., Marketing Dept"
                />
              </Field>
              <Field>
                <FieldLabel>Code *</FieldLabel>
                <Input
                  value={entityForm.code}
                  onChange={(e) => setEntityForm({ ...entityForm, code: e.target.value })}
                  placeholder="e.g., MKT"
                />
              </Field>
            </FieldGroup>
            <FieldGroup className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Contact Person</FieldLabel>
                <Input
                  value={entityForm.contactPerson}
                  onChange={(e) => setEntityForm({ ...entityForm, contactPerson: e.target.value })}
                  placeholder="Name"
                />
              </Field>
              <Field>
                <FieldLabel>Email</FieldLabel>
                <Input
                  type="email"
                  value={entityForm.email}
                  onChange={(e) => setEntityForm({ ...entityForm, email: e.target.value })}
                  placeholder="email@company.com"
                />
              </Field>
            </FieldGroup>
            <Field>
              <FieldLabel>Phone</FieldLabel>
              <PhoneInput
                value={entityForm.phone || ''}
                onChange={(value) => setEntityForm({ ...entityForm, phone: value })}
                placeholder="Phone number"
              />
            </Field>
            <Field>
              <FieldLabel>Address</FieldLabel>
              <Input
                value={entityForm.address}
                onChange={(e) => setEntityForm({ ...entityForm, address: e.target.value })}
                placeholder="Address"
              />
            </Field>
            <div className="flex items-center gap-3">
              <Switch
                id="entity-active"
                checked={entityForm.isActive}
                onCheckedChange={(checked) =>
                  setEntityForm({ ...entityForm, isActive: checked })
                }
              />
              <label htmlFor="entity-active" className="text-sm font-medium cursor-pointer">
                Active
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEntityDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEntity}>
              {editingEntity ? 'Update Entity' : 'Add Entity'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
