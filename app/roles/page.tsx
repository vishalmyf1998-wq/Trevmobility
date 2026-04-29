"use client"

import { useState } from "react"
import { useAdmin } from "@/lib/admin-context"
import { AdminRole } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Field, FieldLabel } from "@/components/ui/field"
import { toast } from "sonner"
import { Plus, MoreHorizontal, Pencil, Trash2, Shield, Users, Check, X } from "lucide-react"

type RoleFormData = Omit<AdminRole, 'id' | 'createdAt'>

const allPermissions = [
  { id: 'dashboard', label: 'Dashboard', category: 'General' },
  { id: 'drivers', label: 'Manage Drivers', category: 'Fleet' },
  { id: 'cars', label: 'Manage Cars', category: 'Fleet' },
  { id: 'car_categories', label: 'Manage Car Categories', category: 'Fleet' },
  { id: 'hubs', label: 'Manage Hubs', category: 'Fleet' },
  { id: 'cities', label: 'Manage Cities', category: 'Configuration' },
  { id: 'city_polygons', label: 'Manage City Polygons', category: 'Configuration' },
  { id: 'fare_groups', label: 'Manage Fare Groups', category: 'Configuration' },
  { id: 'promo_codes', label: 'Manage Promo Codes', category: 'Configuration' },
  { id: 'bookings', label: 'Manage Bookings', category: 'Operations' },
  { id: 'dispatch', label: 'Dispatch Operations', category: 'Operations' },
  { id: 'live_tracking', label: 'Live Tracking', category: 'Operations' },
  { id: 'b2b_clients', label: 'Manage B2B Clients', category: 'B2B' },
  { id: 'b2b_employees', label: 'Manage B2B Employees', category: 'B2B' },
  { id: 'duty_slips', label: 'Manage Duty Slips', category: 'Billing' },
  { id: 'invoices', label: 'Manage Invoices', category: 'Billing' },
  { id: 'payments', label: 'Manage Payments', category: 'Billing' },
  { id: 'reports', label: 'View Reports', category: 'Reports' },
  { id: 'gst_config', label: 'GST Configuration', category: 'Settings' },
  { id: 'templates', label: 'Communication Templates', category: 'Settings' },
  { id: 'cancellation_policy', label: 'Cancellation Policy', category: 'Settings' },
  { id: 'roles', label: 'Manage Roles', category: 'Admin' },
  { id: 'admin_users', label: 'Manage Admin Users', category: 'Admin' },
  { id: 'all', label: 'Full Access (All Permissions)', category: 'Super' },
]

const permissionCategories = [...new Set(allPermissions.map(p => p.category))]

const initialFormData: RoleFormData = {
  name: '',
  description: '',
  permissions: [],
  isActive: true,
}

export default function RolesPage() {
  const { 
    adminRoles, adminUsers,
    addAdminRole, updateAdminRole, deleteAdminRole 
  } = useAdmin()
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null)
  const [formData, setFormData] = useState<RoleFormData>(initialFormData)
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (editingRole) {
      updateAdminRole(editingRole.id, formData)
      toast.success('Role updated successfully')
    } else {
      addAdminRole(formData)
      toast.success('Role created successfully')
    }
    
    setIsDialogOpen(false)
    setEditingRole(null)
    setFormData(initialFormData)
  }
  
  const handleEdit = (role: AdminRole) => {
    setEditingRole(role)
    setFormData({
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      isActive: role.isActive,
    })
    setIsDialogOpen(true)
  }
  
  const handleDelete = (id: string) => {
    const usersWithRole = adminUsers.filter(u => u.roleId === id)
    if (usersWithRole.length > 0) {
      toast.error('Cannot delete role with assigned users')
      return
    }
    deleteAdminRole(id)
    toast.success('Role deleted successfully')
  }
  
  const togglePermission = (permissionId: string) => {
    if (permissionId === 'all') {
      if (formData.permissions.includes('all')) {
        setFormData({ ...formData, permissions: [] })
      } else {
        setFormData({ ...formData, permissions: ['all'] })
      }
    } else {
      if (formData.permissions.includes(permissionId)) {
        setFormData({ 
          ...formData, 
          permissions: formData.permissions.filter(p => p !== permissionId && p !== 'all')
        })
      } else {
        setFormData({ 
          ...formData, 
          permissions: [...formData.permissions.filter(p => p !== 'all'), permissionId]
        })
      }
    }
  }
  
  const getUserCountForRole = (roleId: string) => {
    return adminUsers.filter(u => u.roleId === roleId).length
  }
  
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Roles & Permissions</h1>
          <p className="text-muted-foreground">Configure access control for admin users</p>
        </div>
        <Button onClick={() => {
          setEditingRole(null)
          setFormData(initialFormData)
          setIsDialogOpen(true)
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Role
        </Button>
      </div>
      
      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {adminRoles.map((role) => (
          <Card key={role.id} className={!role.isActive ? 'opacity-60' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{role.name}</CardTitle>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{getUserCountForRole(role.id)} users</span>
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(role)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDelete(role.id)}
                      className="text-destructive"
                      disabled={role.name === 'Super Admin'}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">{role.description}</p>
              <div className="flex flex-wrap gap-1">
                {role.permissions.includes('all') ? (
                  <Badge className="bg-primary/10 text-primary">Full Access</Badge>
                ) : (
                  role.permissions.slice(0, 4).map((permission) => (
                    <Badge key={permission} variant="outline" className="text-xs">
                      {allPermissions.find(p => p.id === permission)?.label || permission}
                    </Badge>
                  ))
                )}
                {!role.permissions.includes('all') && role.permissions.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{role.permissions.length - 4} more
                  </Badge>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2">
                {role.isActive ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-200">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Role' : 'Create Role'}</DialogTitle>
            <DialogDescription>
              Define role permissions and access levels
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field>
              <FieldLabel>Role Name *</FieldLabel>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Operations Manager"
                required
              />
            </Field>
            
            <Field>
              <FieldLabel>Description</FieldLabel>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the role and its responsibilities"
                rows={2}
              />
            </Field>
            
            <div>
              <p className="text-sm font-medium mb-3">Permissions</p>
              
              <div className="space-y-4 border rounded-lg p-4">
                {permissionCategories.map((category) => (
                  <div key={category}>
                    <p className="text-sm font-medium text-muted-foreground mb-2">{category}</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {allPermissions
                        .filter(p => p.category === category)
                        .map((permission) => (
                          <label
                            key={permission.id}
                            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                              formData.permissions.includes(permission.id) || 
                              (permission.id !== 'all' && formData.permissions.includes('all'))
                                ? 'bg-primary/5 border-primary'
                                : 'hover:bg-muted'
                            }`}
                          >
                            <Checkbox
                              checked={
                                formData.permissions.includes(permission.id) || 
                                (permission.id !== 'all' && formData.permissions.includes('all'))
                              }
                              onCheckedChange={() => togglePermission(permission.id)}
                              disabled={permission.id !== 'all' && formData.permissions.includes('all')}
                            />
                            <span className="text-sm">{permission.label}</span>
                          </label>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <span className="text-sm">Active</span>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingRole ? 'Update' : 'Create'} Role
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
