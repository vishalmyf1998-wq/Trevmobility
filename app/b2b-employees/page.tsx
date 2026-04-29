"use client"

import { useState, useRef } from "react"
import { useAdmin } from "@/lib/admin-context"
import { B2BEmployee } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { PhoneInput } from "@/components/ui/phone-input"
import { toast } from "sonner"
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Upload, Download, CheckCircle, XCircle, Clock, Users, FileSpreadsheet, UserCheck, Building2 } from "lucide-react"

type EmployeeFormData = Omit<B2BEmployee, 'id' | 'createdAt' | 'approvedBy' | 'approvedAt'>

const initialFormData: EmployeeFormData = {
  b2bClientId: '',
  name: '',
  phone: '',
  officeEmail: '',
  employeeId: '',
  approverEmail: '',
  costCentre: '',
  entity: '',
  status: 'pending_approval',
  canLogin: false,
}

export default function B2BEmployeesPage() {
  const { 
    b2bEmployees, b2bClients, 
    addB2BEmployee, updateB2BEmployee, deleteB2BEmployee, bulkAddB2BEmployees,
    getB2BClient
  } = useAdmin()
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [isSelectClientDialogOpen, setIsSelectClientDialogOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<B2BEmployee | null>(null)
  const [formData, setFormData] = useState<EmployeeFormData>(initialFormData)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClient, setSelectedClient] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [uploadData, setUploadData] = useState<Omit<B2BEmployee, 'id' | 'createdAt'>[]>([])
  const [uploadClientId, setUploadClientId] = useState<string>('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const filteredEmployees = b2bEmployees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          employee.officeEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          employee.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesClient = selectedClient === 'all' || employee.b2bClientId === selectedClient
    const matchesStatus = selectedStatus === 'all' || employee.status === selectedStatus
    return matchesSearch && matchesClient && matchesStatus
  })
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (editingEmployee) {
      updateB2BEmployee(editingEmployee.id, formData)
      toast.success('Employee updated successfully')
    } else {
      addB2BEmployee(formData)
      toast.success('Employee added successfully')
    }
    
    setIsDialogOpen(false)
    setEditingEmployee(null)
    setFormData(initialFormData)
  }
  
  const handleEdit = (employee: B2BEmployee) => {
    setEditingEmployee(employee)
    setFormData({
      b2bClientId: employee.b2bClientId,
      name: employee.name,
      phone: employee.phone,
      officeEmail: employee.officeEmail,
      employeeId: employee.employeeId,
      approverEmail: employee.approverEmail,
      costCentre: employee.costCentre,
      entity: employee.entity,
      status: employee.status,
      canLogin: employee.canLogin,
    })
    setIsDialogOpen(true)
  }
  
  const handleDelete = (id: string) => {
    deleteB2BEmployee(id)
    toast.success('Employee deleted successfully')
  }
  
  const handleApprove = (employee: B2BEmployee) => {
    updateB2BEmployee(employee.id, { 
      status: 'approved', 
      approvedBy: 'Admin User',
      approvedAt: new Date().toISOString(),
      canLogin: true
    })
    toast.success(`${employee.name} approved and can now login`)
  }
  
  const handleReject = (employee: B2BEmployee) => {
    updateB2BEmployee(employee.id, { 
      status: 'rejected',
      canLogin: false
    })
    toast.success(`${employee.name} has been rejected`)
  }
  
  // When user clicks upload, first show the client selection dialog
  const handleUploadClick = () => {
    if (b2bClients.length === 0) {
      toast.error('Please add a B2B client first before uploading employees')
      return
    }
    setUploadClientId('')
    setIsSelectClientDialogOpen(true)
  }
  
  // After client is selected, open file picker
  const handleClientSelected = () => {
    if (!uploadClientId) {
      toast.error('Please select a B2B client')
      return
    }
    setIsSelectClientDialogOpen(false)
    fileInputRef.current?.click()
  }
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !uploadClientId) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      
      const employees: Omit<B2BEmployee, 'id' | 'createdAt'>[] = []
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        const employee: Omit<B2BEmployee, 'id' | 'createdAt'> = {
          b2bClientId: uploadClientId,
          name: values[headers.indexOf('name')] || '',
          phone: values[headers.indexOf('phone')] || values[headers.indexOf('number')] || '',
          officeEmail: values[headers.indexOf('office email')] || values[headers.indexOf('email')] || '',
          employeeId: values[headers.indexOf('employee id')] || values[headers.indexOf('employeeid')] || '',
          approverEmail: values[headers.indexOf('approver email')] || values[headers.indexOf('approveremail')] || '',
          costCentre: values[headers.indexOf('cost centre')] || values[headers.indexOf('costcentre')] || '',
          entity: values[headers.indexOf('entity')] || '',
          status: 'pending_approval',
          canLogin: false,
        }
        
        if (employee.name && employee.officeEmail) {
          employees.push(employee)
        }
      }
      
      setUploadData(employees)
      setIsUploadDialogOpen(true)
    }
    reader.readAsText(file)
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  
  const handleBulkUpload = () => {
    if (uploadData.length > 0) {
      bulkAddB2BEmployees(uploadData)
      toast.success(`${uploadData.length} employees uploaded successfully`)
      setIsUploadDialogOpen(false)
      setUploadData([])
      setUploadClientId('')
    }
  }
  
  const downloadTemplate = () => {
    const headers = ['Name', 'Phone', 'Office Email', 'Employee ID', 'Approver Email', 'Cost Centre', 'Entity']
    const csvContent = headers.join(',') + '\n' + 'John Doe,9876543210,john@company.com,EMP001,manager@company.com,CC001,Entity A'
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'employee_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }
  
  const getStatusBadge = (status: B2BEmployee['status']) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-600 border-green-200">Approved</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      case 'suspended':
        return <Badge variant="secondary">Suspended</Badge>
      default:
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200">Pending Approval</Badge>
    }
  }
  
  const pendingCount = b2bEmployees.filter(e => e.status === 'pending_approval').length
  const approvedCount = b2bEmployees.filter(e => e.status === 'approved').length
  
  // Get entities for selected client in employee form
  const selectedClientForForm = b2bClients.find(c => c.id === formData.b2bClientId)
  const clientEntities = selectedClientForForm?.entities || []
  
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">B2B Employees</h1>
          <p className="text-muted-foreground">Manage B2B client employees with app access permissions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Download Template
          </Button>
          <Button variant="outline" onClick={handleUploadClick}>
            <Upload className="mr-2 h-4 w-4" />
            Upload CSV
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button onClick={() => {
            setEditingEmployee(null)
            setFormData(initialFormData)
            setIsDialogOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{b2bEmployees.length}</p>
                <p className="text-sm text-muted-foreground">Total Employees</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pending Approval</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{approvedCount}</p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <UserCheck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{b2bEmployees.filter(e => e.canLogin).length}</p>
                <p className="text-sm text-muted-foreground">Can Login</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email or employee ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {b2bClients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.companyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending_approval">Pending Approval</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {/* Employees Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Cost Centre</TableHead>
                <TableHead>Approver</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No employees found
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((employee) => {
                  const client = getB2BClient(employee.b2bClientId)
                  return (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{employee.name}</p>
                          <p className="text-sm text-muted-foreground">{employee.officeEmail}</p>
                          <p className="text-xs text-muted-foreground">{employee.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {client ? (
                          <Badge variant="outline">{client.companyName}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{employee.employeeId}</TableCell>
                      <TableCell>{employee.entity || '-'}</TableCell>
                      <TableCell>{employee.costCentre || '-'}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{employee.approverEmail}</p>
                          {employee.approvedBy && (
                            <p className="text-xs text-muted-foreground">
                              Approved by: {employee.approvedBy}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(employee.status)}</TableCell>
                      <TableCell>
                        {employee.canLogin ? (
                          <Badge className="bg-green-500/10 text-green-600 border-green-200">Yes</Badge>
                        ) : (
                          <Badge variant="secondary">No</Badge>
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
                            <DropdownMenuItem onClick={() => handleEdit(employee)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            {employee.status === 'pending_approval' && (
                              <>
                                <DropdownMenuItem onClick={() => handleApprove(employee)}>
                                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                  Approve (on behalf)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleReject(employee)}>
                                  <XCircle className="mr-2 h-4 w-4 text-red-600" />
                                  Reject
                                </DropdownMenuItem>
                              </>
                            )}
                            {employee.status === 'approved' && (
                              <DropdownMenuItem onClick={() => updateB2BEmployee(employee.id, { status: 'suspended', canLogin: false })}>
                                <XCircle className="mr-2 h-4 w-4" />
                                Suspend
                              </DropdownMenuItem>
                            )}
                            {employee.status === 'suspended' && (
                              <DropdownMenuItem onClick={() => updateB2BEmployee(employee.id, { status: 'approved', canLogin: true })}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Reactivate
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(employee.id)}
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
      
      {/* Select Client Dialog for CSV Upload */}
      <Dialog open={isSelectClientDialogOpen} onOpenChange={setIsSelectClientDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Select B2B Client
            </DialogTitle>
            <DialogDescription>
              Choose which B2B client these employees belong to. All employees in the CSV will be assigned to this client.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Field>
              <FieldLabel>B2B Client *</FieldLabel>
              <Select value={uploadClientId} onValueChange={setUploadClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a B2B client" />
                </SelectTrigger>
                <SelectContent>
                  {b2bClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {client.companyName}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                All uploaded employees will be associated with this client
              </p>
            </Field>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSelectClientDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleClientSelected} disabled={!uploadClientId}>
              <Upload className="mr-2 h-4 w-4" />
              Continue to Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
            <DialogDescription>
              {editingEmployee ? 'Update employee details' : 'Add a new B2B employee with app access'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field>
              <FieldLabel>B2B Client *</FieldLabel>
              <Select
                value={formData.b2bClientId}
                onValueChange={(value) => setFormData({ ...formData, b2bClientId: value, entity: '' })}
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
            
            <FieldGroup className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Name *</FieldLabel>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Employee name"
                  required
                />
              </Field>
              <Field>
                <FieldLabel>Phone *</FieldLabel>
                <PhoneInput
                  value={formData.phone}
                  onChange={(value) => setFormData({ ...formData, phone: value })}
                  placeholder="Phone number"
                  required
                />
              </Field>
            </FieldGroup>
            
            <FieldGroup className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Office Email *</FieldLabel>
                <Input
                  type="email"
                  value={formData.officeEmail}
                  onChange={(e) => setFormData({ ...formData, officeEmail: e.target.value })}
                  placeholder="employee@company.com"
                  required
                />
              </Field>
              <Field>
                <FieldLabel>Employee ID *</FieldLabel>
                <Input
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  placeholder="e.g., EMP001"
                  required
                />
              </Field>
            </FieldGroup>
            
            <FieldGroup className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Entity</FieldLabel>
                {clientEntities.length > 0 ? (
                  <Select
                    value={formData.entity}
                    onValueChange={(value) => setFormData({ ...formData, entity: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an entity" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientEntities.map((entity) => (
                        <SelectItem key={entity.id} value={entity.name}>
                          {entity.name} ({entity.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={formData.entity}
                    onChange={(e) => setFormData({ ...formData, entity: e.target.value })}
                    placeholder="Entity name"
                  />
                )}
              </Field>
              <Field>
                <FieldLabel>Cost Centre</FieldLabel>
                <Input
                  value={formData.costCentre}
                  onChange={(e) => setFormData({ ...formData, costCentre: e.target.value })}
                  placeholder="e.g., CC001"
                />
              </Field>
            </FieldGroup>
            
            <Field>
              <FieldLabel>Approver Email *</FieldLabel>
              <Input
                type="email"
                value={formData.approverEmail}
                onChange={(e) => setFormData({ ...formData, approverEmail: e.target.value })}
                placeholder="manager@company.com"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                This email will receive approval requests for this employee
              </p>
            </Field>
            
            {editingEmployee && (
              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Status</FieldLabel>
                  <Select
                    value={formData.status}
                    onValueChange={(value: B2BEmployee['status']) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending_approval">Pending Approval</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Can Login</FieldLabel>
                  <Select
                    value={formData.canLogin ? 'yes' : 'no'}
                    onValueChange={(value) => setFormData({ ...formData, canLogin: value === 'yes' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            )}
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!formData.b2bClientId}>
                {editingEmployee ? 'Update Employee' : 'Add Employee'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Upload Preview Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Review Upload Data
            </DialogTitle>
            <DialogDescription>
              {uploadData.length} employees found in the CSV file for{' '}
              <strong>{b2bClients.find(c => c.id === uploadClientId)?.companyName}</strong>. 
              Please review before uploading.
            </DialogDescription>
          </DialogHeader>
          
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Approver</TableHead>
                  <TableHead>Cost Centre</TableHead>
                  <TableHead>Entity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploadData.map((employee, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>{employee.phone}</TableCell>
                    <TableCell>{employee.officeEmail}</TableCell>
                    <TableCell>{employee.employeeId}</TableCell>
                    <TableCell>{employee.approverEmail}</TableCell>
                    <TableCell>{employee.costCentre || '-'}</TableCell>
                    <TableCell>{employee.entity || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsUploadDialogOpen(false)
              setUploadData([])
              setUploadClientId('')
            }}>
              Cancel
            </Button>
            <Button onClick={handleBulkUpload}>
              <Upload className="mr-2 h-4 w-4" />
              Upload {uploadData.length} Employees
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
