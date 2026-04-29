"use client"

import { useState } from "react"
import { useAdmin } from "@/lib/admin-context"
import { CancellationPolicy, CancellationRule } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { Plus, MoreHorizontal, Pencil, Trash2, XCircle, Clock, DollarSign, Percent, AlertTriangle } from "lucide-react"

type PolicyFormData = Omit<CancellationPolicy, 'id' | 'createdAt'>

const tripTypes = [
  { value: 'all', label: 'All Trip Types' },
  { value: 'airport_pickup', label: 'Airport Pickup' },
  { value: 'airport_drop', label: 'Airport Drop' },
  { value: 'rental', label: 'Rental' },
  { value: 'city_ride', label: 'City Ride' },
  { value: 'outstation', label: 'Outstation' },
]

const initialFormData: PolicyFormData = {
  name: '',
  description: '',
  tripType: 'all',
  rules: [{ id: '1', beforeMinutes: 60, refundPercentage: 100, cancellationFee: 0 }],
  isActive: true,
}

export default function CancellationPolicyPage() {
  const { 
    cancellationPolicies, 
    addCancellationPolicy, 
    updateCancellationPolicy, 
    deleteCancellationPolicy 
  } = useAdmin()
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<CancellationPolicy | null>(null)
  const [formData, setFormData] = useState<PolicyFormData>(initialFormData)
  
  const generateRuleId = () => Math.random().toString(36).substring(2, 11)
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate rules
    if (formData.rules.length === 0) {
      toast.error('Please add at least one cancellation rule')
      return
    }
    
    // Sort rules by beforeMinutes descending
    const sortedRules = [...formData.rules].sort((a, b) => b.beforeMinutes - a.beforeMinutes)
    const policyData = { ...formData, rules: sortedRules }
    
    if (editingPolicy) {
      updateCancellationPolicy(editingPolicy.id, policyData)
      toast.success('Policy updated successfully')
    } else {
      addCancellationPolicy(policyData)
      toast.success('Policy created successfully')
    }
    
    setIsDialogOpen(false)
    setEditingPolicy(null)
    setFormData(initialFormData)
  }
  
  const handleEdit = (policy: CancellationPolicy) => {
    setEditingPolicy(policy)
    setFormData({
      name: policy.name,
      description: policy.description,
      tripType: policy.tripType,
      rules: policy.rules,
      isActive: policy.isActive,
    })
    setIsDialogOpen(true)
  }
  
  const handleDelete = (id: string) => {
    deleteCancellationPolicy(id)
    toast.success('Policy deleted successfully')
  }
  
  const addRule = () => {
    setFormData({
      ...formData,
      rules: [...formData.rules, { id: generateRuleId(), beforeMinutes: 30, refundPercentage: 50, cancellationFee: 0 }]
    })
  }
  
  const updateRule = (ruleId: string, updates: Partial<CancellationRule>) => {
    setFormData({
      ...formData,
      rules: formData.rules.map(rule => rule.id === ruleId ? { ...rule, ...updates } : rule)
    })
  }
  
  const removeRule = (ruleId: string) => {
    if (formData.rules.length <= 1) {
      toast.error('At least one rule is required')
      return
    }
    setFormData({
      ...formData,
      rules: formData.rules.filter(rule => rule.id !== ruleId)
    })
  }
  
  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${minutes} minutes`
    if (minutes < 1440) return `${Math.floor(minutes / 60)} hour${minutes >= 120 ? 's' : ''}`
    return `${Math.floor(minutes / 1440)} day${minutes >= 2880 ? 's' : ''}`
  }
  
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cancellation & Refund Policy</h1>
          <p className="text-muted-foreground">Configure cancellation rules and refund percentages</p>
        </div>
        <Button onClick={() => {
          setEditingPolicy(null)
          setFormData(initialFormData)
          setIsDialogOpen(true)
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Policy
        </Button>
      </div>
      
      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">How Cancellation Policies Work</p>
              <p className="text-sm text-blue-700 mt-1">
                Define time-based rules that determine refund percentages. For example: &quot;100% refund if cancelled 24 hours before pickup, 50% if cancelled 2 hours before, and no refund within 1 hour.&quot;
                Policies can be specific to trip types or apply to all bookings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Policies Grid */}
      {cancellationPolicies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <XCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No policies configured</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your first cancellation policy to define refund rules
            </p>
            <Button 
              className="mt-4"
              onClick={() => {
                setEditingPolicy(null)
                setFormData(initialFormData)
                setIsDialogOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Policy
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {cancellationPolicies.map((policy) => (
            <Card key={policy.id} className={!policy.isActive ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{policy.name}</CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">
                        {tripTypes.find(t => t.value === policy.tripType)?.label}
                      </Badge>
                      {policy.isActive ? (
                        <Badge className="bg-green-500/10 text-green-600 border-green-200">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(policy)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(policy.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                {policy.description && (
                  <p className="text-sm text-muted-foreground mb-4">{policy.description}</p>
                )}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Refund Rules:</p>
                  {policy.rules.map((rule, index) => (
                    <div key={rule.id} className="flex items-center gap-3 text-sm bg-muted/50 p-2 rounded-lg">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span>
                          {index === 0 ? `More than ${formatMinutes(rule.beforeMinutes)} before` : 
                           index === policy.rules.length - 1 ? `Less than ${formatMinutes(policy.rules[index - 1]?.beforeMinutes || rule.beforeMinutes)} before` :
                           `${formatMinutes(rule.beforeMinutes)} - ${formatMinutes(policy.rules[index - 1]?.beforeMinutes || rule.beforeMinutes)} before`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 ml-auto">
                        <Percent className="h-3 w-3 text-green-600" />
                        <span className="font-medium text-green-600">{rule.refundPercentage}% refund</span>
                      </div>
                      {rule.cancellationFee > 0 && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-orange-600" />
                          <span className="text-orange-600">Rs. {rule.cancellationFee} fee</span>
                        </div>
                      )}
                    </div>
                  ))}
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
            <DialogTitle>{editingPolicy ? 'Edit Policy' : 'Create Policy'}</DialogTitle>
            <DialogDescription>
              Configure cancellation rules with time-based refund percentages
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <FieldGroup className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Policy Name *</FieldLabel>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Standard Cancellation Policy"
                  required
                />
              </Field>
              <Field>
                <FieldLabel>Trip Type</FieldLabel>
                <Select
                  value={formData.tripType}
                  onValueChange={(value: CancellationPolicy['tripType']) => setFormData({ ...formData, tripType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tripTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
            
            <Field>
              <FieldLabel>Description</FieldLabel>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the policy"
                rows={2}
              />
            </Field>
            
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">Cancellation Rules</p>
                <Button type="button" variant="outline" size="sm" onClick={addRule}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add Rule
                </Button>
              </div>
              
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cancellation Window</TableHead>
                      <TableHead>Refund %</TableHead>
                      <TableHead>Cancellation Fee (Rs.)</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.rules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Before</span>
                            <Input
                              type="number"
                              min="0"
                              value={rule.beforeMinutes}
                              onChange={(e) => updateRule(rule.id, { beforeMinutes: parseInt(e.target.value) || 0 })}
                              className="w-20"
                            />
                            <Select
                              value={rule.beforeMinutes >= 1440 ? 'days' : rule.beforeMinutes >= 60 ? 'hours' : 'minutes'}
                              onValueChange={(unit) => {
                                let value = rule.beforeMinutes
                                if (unit === 'days') value = Math.floor(rule.beforeMinutes / 1440) * 1440 || 1440
                                else if (unit === 'hours') value = Math.floor(rule.beforeMinutes / 60) * 60 || 60
                                updateRule(rule.id, { beforeMinutes: value })
                              }}
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="minutes">mins</SelectItem>
                                <SelectItem value="hours">hours</SelectItem>
                                <SelectItem value="days">days</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={rule.refundPercentage}
                              onChange={(e) => updateRule(rule.id, { refundPercentage: parseInt(e.target.value) || 0 })}
                              className="w-20"
                            />
                            <span className="text-muted-foreground">%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            value={rule.cancellationFee}
                            onChange={(e) => updateRule(rule.id, { cancellationFee: parseInt(e.target.value) || 0 })}
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeRule(rule.id)}
                            className="h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Rules are applied based on how much time remains before the pickup. Add multiple rules for different time windows.
              </p>
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
                  {editingPolicy ? 'Update' : 'Create'} Policy
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
