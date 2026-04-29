"use client"

import { useState } from "react"
import { useAdmin } from "@/lib/admin-context"
import { CommunicationTemplate } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Plus, Search, MoreHorizontal, Pencil, Trash2, MessageSquare, Mail, Bell, Phone, Copy, Eye } from "lucide-react"

type TemplateFormData = Omit<CommunicationTemplate, 'id' | 'createdAt'>

const initialFormData: TemplateFormData = {
  name: '',
  type: 'sms',
  targetAudience: 'customer',
  event: 'booking_confirmed',
  subject: '',
  content: '',
  variables: [],
  isActive: true,
}

const templateEvents = [
  { value: 'booking_confirmed', label: 'Booking Confirmed' },
  { value: 'driver_assigned', label: 'Driver Assigned' },
  { value: 'driver_arrived', label: 'Driver Arrived' },
  { value: 'trip_started', label: 'Trip Started' },
  { value: 'trip_completed', label: 'Trip Completed' },
  { value: 'invoice_generated', label: 'Invoice Generated' },
  { value: 'payment_reminder', label: 'Payment Reminder' },
  { value: 'custom', label: 'Custom' },
]

const availableVariables = [
  '{{customer_name}}',
  '{{customer_phone}}',
  '{{booking_number}}',
  '{{driver_name}}',
  '{{driver_phone}}',
  '{{car_number}}',
  '{{car_model}}',
  '{{pickup_location}}',
  '{{drop_location}}',
  '{{pickup_time}}',
  '{{fare_amount}}',
  '{{invoice_number}}',
  '{{payment_link}}',
  '{{otp}}',
  '{{company_name}}',
]

export default function CommunicationTemplatesPage() {
  const { 
    communicationTemplates, 
    addCommunicationTemplate, 
    updateCommunicationTemplate, 
    deleteCommunicationTemplate 
  } = useAdmin()
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<CommunicationTemplate | null>(null)
  const [formData, setFormData] = useState<TemplateFormData>(initialFormData)
  const [previewContent, setPreviewContent] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  
  const filteredTemplates = communicationTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = selectedType === 'all' || template.type === selectedType
    return matchesSearch && matchesType
  })
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Extract variables from content
    const variableRegex = /\{\{[^}]+\}\}/g
    const foundVariables = formData.content.match(variableRegex) || []
    const templateData = { ...formData, variables: foundVariables }
    
    if (editingTemplate) {
      updateCommunicationTemplate(editingTemplate.id, templateData)
      toast.success('Template updated successfully')
    } else {
      addCommunicationTemplate(templateData)
      toast.success('Template created successfully')
    }
    
    setIsDialogOpen(false)
    setEditingTemplate(null)
    setFormData(initialFormData)
  }
  
  const handleEdit = (template: CommunicationTemplate) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      type: template.type,
      targetAudience: template.targetAudience,
      event: template.event,
      subject: template.subject || '',
      content: template.content,
      variables: template.variables,
      isActive: template.isActive,
    })
    setIsDialogOpen(true)
  }
  
  const handleDelete = (id: string) => {
    deleteCommunicationTemplate(id)
    toast.success('Template deleted successfully')
  }
  
  const handlePreview = (template: CommunicationTemplate) => {
    // Replace variables with sample data
    let preview = template.content
    preview = preview.replace(/\{\{customer_name\}\}/g, 'John Doe')
    preview = preview.replace(/\{\{customer_phone\}\}/g, '9876543210')
    preview = preview.replace(/\{\{booking_number\}\}/g, 'BKG-001234')
    preview = preview.replace(/\{\{driver_name\}\}/g, 'Rajesh Kumar')
    preview = preview.replace(/\{\{driver_phone\}\}/g, '9876543211')
    preview = preview.replace(/\{\{car_number\}\}/g, 'MH01AB1234')
    preview = preview.replace(/\{\{car_model\}\}/g, 'Maruti Dzire')
    preview = preview.replace(/\{\{pickup_location\}\}/g, 'Mumbai Airport T2')
    preview = preview.replace(/\{\{drop_location\}\}/g, 'Andheri West')
    preview = preview.replace(/\{\{pickup_time\}\}/g, '10:30 AM')
    preview = preview.replace(/\{\{fare_amount\}\}/g, '850')
    preview = preview.replace(/\{\{invoice_number\}\}/g, 'INV-001234')
    preview = preview.replace(/\{\{payment_link\}\}/g, 'https://pay.keen.com/abc123')
    preview = preview.replace(/\{\{otp\}\}/g, '123456')
    preview = preview.replace(/\{\{company_name\}\}/g, 'KEEN')
    
    setPreviewContent(preview)
    setIsPreviewDialogOpen(true)
  }
  
  const insertVariable = (variable: string) => {
    setFormData({ ...formData, content: formData.content + variable })
  }
  
  const getTypeIcon = (type: CommunicationTemplate['type']) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />
      case 'whatsapp':
        return <MessageSquare className="h-4 w-4" />
      case 'push':
        return <Bell className="h-4 w-4" />
      default:
        return <Phone className="h-4 w-4" />
    }
  }
  
  const getTypeBadge = (type: CommunicationTemplate['type']) => {
    switch (type) {
      case 'email':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">Email</Badge>
      case 'whatsapp':
        return <Badge className="bg-green-500/10 text-green-600 border-green-200">WhatsApp</Badge>
      case 'push':
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-200">Push</Badge>
      default:
        return <Badge variant="outline">SMS</Badge>
    }
  }
  
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Communication Templates</h1>
          <p className="text-muted-foreground">Configure message templates for customers and drivers</p>
        </div>
        <Button onClick={() => {
          setEditingTemplate(null)
          setFormData(initialFormData)
          setIsDialogOpen(true)
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Template
        </Button>
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="push">Push Notification</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No templates found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your first communication template to get started
            </p>
            <Button 
              className="mt-4"
              onClick={() => {
                setEditingTemplate(null)
                setFormData(initialFormData)
                setIsDialogOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className={!template.isActive ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(template.type)}
                    <CardTitle className="text-base">{template.name}</CardTitle>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handlePreview(template)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(template)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(template.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex gap-2 mt-2">
                  {getTypeBadge(template.type)}
                  <Badge variant="outline">
                    {template.targetAudience === 'customer' ? 'Customer' : template.targetAudience === 'driver' ? 'Driver' : 'Both'}
                  </Badge>
                  <Badge variant="secondary">
                    {templateEvents.find(e => e.value === template.event)?.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">{template.content}</p>
                {template.variables.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {template.variables.slice(0, 3).map((variable, index) => (
                      <Badge key={index} variant="outline" className="text-xs font-mono">
                        {variable}
                      </Badge>
                    ))}
                    {template.variables.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.variables.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <span className={`text-xs ${template.isActive ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {template.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
            <DialogDescription>
              Configure communication template with dynamic variables
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <FieldGroup className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Template Name *</FieldLabel>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Booking Confirmation SMS"
                  required
                />
              </Field>
              <Field>
                <FieldLabel>Type *</FieldLabel>
                <Select
                  value={formData.type}
                  onValueChange={(value: CommunicationTemplate['type']) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="push">Push Notification</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
            
            <FieldGroup className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Target Audience *</FieldLabel>
                <Select
                  value={formData.targetAudience}
                  onValueChange={(value: CommunicationTemplate['targetAudience']) => setFormData({ ...formData, targetAudience: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="driver">Driver</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Event *</FieldLabel>
                <Select
                  value={formData.event}
                  onValueChange={(value: CommunicationTemplate['event']) => setFormData({ ...formData, event: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {templateEvents.map((event) => (
                      <SelectItem key={event.value} value={event.value}>
                        {event.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
            
            {formData.type === 'email' && (
              <Field>
                <FieldLabel>Subject *</FieldLabel>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Email subject line"
                  required={formData.type === 'email'}
                />
              </Field>
            )}
            
            <Field>
              <FieldLabel>Message Content *</FieldLabel>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter your message with {{variables}}"
                rows={6}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use double curly braces for variables, e.g., {"{{customer_name}}"}
              </p>
            </Field>
            
            <div>
              <p className="text-sm font-medium mb-2">Available Variables</p>
              <div className="flex flex-wrap gap-2">
                {availableVariables.map((variable) => (
                  <Button
                    key={variable}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs font-mono"
                    onClick={() => insertVariable(variable)}
                  >
                    {variable}
                  </Button>
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
                  {editingTemplate ? 'Update' : 'Create'} Template
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message Preview</DialogTitle>
            <DialogDescription>
              Preview with sample data
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm whitespace-pre-wrap">{previewContent}</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsPreviewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
