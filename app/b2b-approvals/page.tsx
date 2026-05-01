"use client"

import { useState } from "react"
import { useAdmin } from "@/lib/admin-context"
import { B2BApprovalRule, Booking } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Field, FieldLabel } from "@/components/ui/field"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { Plus, MoreHorizontal, Pencil, Trash2, CheckCircle, XCircle, ShieldCheck } from "lucide-react"

type RuleFormData = Omit<B2BApprovalRule, 'id' | 'createdAt'>

const initialFormData: RuleFormData = {
  clientId: '',
  approverEmployeeId: '',
  maxApprovalAmount: undefined,
  isActive: true,
}

export default function B2BApprovalsPage() {
  const { 
    b2bApprovalRules, b2bClients, b2bEmployees, bookings,
    addB2BApprovalRule, updateB2BApprovalRule, deleteB2BApprovalRule,
    updateBooking, getB2BClient, getB2BEmployee, getCity
  } = useAdmin()
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<B2BApprovalRule | null>(null)
  const [formData, setFormData] = useState<RuleFormData>(initialFormData)
  
  // Pending Bookings
  const pendingBookings = bookings.filter(b => b.approvalStatus === 'pending_approval')
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (editingRule) {
      updateB2BApprovalRule(editingRule.id, formData)
      toast.success('Approval rule updated successfully')
    } else {
      addB2BApprovalRule(formData)
      toast.success('Approval rule added successfully')
    }
    
    setIsDialogOpen(false)
    setEditingRule(null)
    setFormData(initialFormData)
  }
  
  const handleEdit = (rule: B2BApprovalRule) => {
    setEditingRule(rule)
    setFormData({
      clientId: rule.clientId,
      approverEmployeeId: rule.approverEmployeeId,
      maxApprovalAmount: rule.maxApprovalAmount,
      isActive: rule.isActive,
    })
    setIsDialogOpen(true)
  }
  
  const handleDelete = (id: string) => {
    deleteB2BApprovalRule(id)
    toast.success('Approval rule deleted successfully')
  }

  const handleApproveBooking = (booking: Booking) => {
    updateBooking(booking.id, { 
      approvalStatus: 'approved',
      status: 'confirmed'
    })
    toast.success(`Booking ${booking.bookingNumber} approved successfully`)
  }

  const handleRejectBooking = (booking: Booking) => {
    updateBooking(booking.id, { 
      approvalStatus: 'rejected',
      status: 'cancelled'
    })
    toast.success(`Booking ${booking.bookingNumber} rejected`)
  }
  
  // Available employees for the selected client
  const availableEmployees = b2bEmployees.filter(e => e.b2bClientId === formData.clientId)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">B2B Approvals</h1>
          <p className="text-muted-foreground">Manage booking approvals and hierarchy rules</p>
        </div>
        <Button onClick={() => {
          setEditingRule(null)
          setFormData(initialFormData)
          setIsDialogOpen(true)
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Approval Rule
        </Button>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-[400px] grid-cols-2">
          <TabsTrigger value="pending">Pending Approvals ({pendingBookings.length})</TabsTrigger>
          <TabsTrigger value="rules">Approval Rules</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>Bookings waiting for B2B client approval</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking ID</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>City & Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingBookings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No pending approvals
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingBookings.map((booking) => {
                      const client = booking.b2bClientId ? getB2BClient(booking.b2bClientId) : null
                      const city = getCity(booking.cityId)
                      return (
                        <TableRow key={booking.id}>
                          <TableCell className="font-medium">{booking.bookingNumber}</TableCell>
                          <TableCell>{client?.companyName || '-'}</TableCell>
                          <TableCell>
                            <div>
                              <p>{booking.customerName}</p>
                              <p className="text-xs text-muted-foreground">{booking.customerPhone}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p>{city?.name || '-'}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(booking.pickupDate).toLocaleDateString()} {booking.pickupTime}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>₹{booking.estimatedFare}</TableCell>
                          <TableCell>
                            <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200">
                              Pending
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" className="text-green-600 border-green-200 bg-green-50 hover:bg-green-100" onClick={() => handleApproveBooking(booking)}>
                                <CheckCircle className="mr-1 h-4 w-4" />
                                Approve
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-600 border-red-200 bg-red-50 hover:bg-red-100" onClick={() => handleRejectBooking(booking)}>
                                <XCircle className="mr-1 h-4 w-4" />
                                Reject
                              </Button>
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
        </TabsContent>

        <TabsContent value="rules" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Approval Hierarchy Rules</CardTitle>
              <CardDescription>Configure which employees can approve bookings for specific clients</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Approver Employee</TableHead>
                    <TableHead>Max Approval Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {b2bApprovalRules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No approval rules found
                      </TableCell>
                    </TableRow>
                  ) : (
                    b2bApprovalRules.map((rule) => {
                      const client = getB2BClient(rule.clientId)
                      const employee = getB2BEmployee(rule.approverEmployeeId)
                      return (
                        <TableRow key={rule.id}>
                          <TableCell className="font-medium">{client?.companyName || 'Unknown Client'}</TableCell>
                          <TableCell>
                            {employee ? (
                              <div>
                                <p>{employee.name}</p>
                                <p className="text-xs text-muted-foreground">{employee.officeEmail}</p>
                              </div>
                            ) : (
                              'Unknown Employee'
                            )}
                          </TableCell>
                          <TableCell>
                            {rule.maxApprovalAmount ? `Up to ₹${rule.maxApprovalAmount}` : 'Unlimited'}
                          </TableCell>
                          <TableCell>
                            {rule.isActive ? (
                              <Badge className="bg-green-500/10 text-green-600 border-green-200">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(rule)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => updateB2BApprovalRule(rule.id, { isActive: !rule.isActive })}
                                >
                                  <ShieldCheck className="mr-2 h-4 w-4" />
                                  {rule.isActive ? 'Deactivate' : 'Activate'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(rule.id)}
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
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Approval Rule' : 'Add Approval Rule'}</DialogTitle>
            <DialogDescription>
              {editingRule ? 'Update existing rule' : 'Configure a new approval rule for a B2B client'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field>
              <FieldLabel>B2B Client *</FieldLabel>
              <Select
                value={formData.clientId}
                onValueChange={(value) => setFormData({ ...formData, clientId: value, approverEmployeeId: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {b2bClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Approver Employee *</FieldLabel>
              <Select
                value={formData.approverEmployeeId}
                onValueChange={(value) => setFormData({ ...formData, approverEmployeeId: value })}
                disabled={!formData.clientId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.clientId ? "Select an employee" : "Select client first"} />
                </SelectTrigger>
                <SelectContent>
                  {availableEmployees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name} ({employee.employeeId})
                    </SelectItem>
                  ))}
                  {availableEmployees.length === 0 && formData.clientId && (
                    <SelectItem value="none" disabled>No employees found for this client</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </Field>
            
            <Field>
              <FieldLabel>Max Approval Amount (₹)</FieldLabel>
              <Input
                type="number"
                value={formData.maxApprovalAmount || ''}
                onChange={(e) => setFormData({ ...formData, maxApprovalAmount: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="Leave blank for unlimited"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Bookings above this amount will require higher level approval (leave blank for unlimited)
              </p>
            </Field>
            
            {editingRule && (
              <Field>
                <FieldLabel>Status</FieldLabel>
                <Select
                  value={formData.isActive ? 'active' : 'inactive'}
                  onValueChange={(value) => setFormData({ ...formData, isActive: value === 'active' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!formData.clientId || !formData.approverEmployeeId}>
                {editingRule ? 'Update Rule' : 'Add Rule'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
