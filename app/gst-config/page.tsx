'use client'

import { useState, useEffect } from 'react'
import { useAdmin } from '@/lib/admin-context'
import { GSTConfig } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Receipt, Building, Calculator, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'

const indianStates = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
]

export default function GSTConfigPage() {
  const { gstConfig, updateGSTConfig } = useAdmin()
  const [formData, setFormData] = useState<GSTConfig>(gstConfig)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    setFormData(gstConfig)
  }, [gstConfig])

  useEffect(() => {
    const isChanged = JSON.stringify(formData) !== JSON.stringify(gstConfig)
    setHasChanges(isChanged)
  }, [formData, gstConfig])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate GST number format
    if (formData.gstNumber && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gstNumber)) {
      toast.error('Please enter a valid GST number')
      return
    }

    updateGSTConfig(formData)
    toast.success('GST configuration saved successfully')
    setHasChanges(false)
  }

  const handleStateChange = (stateCode: string) => {
    const selectedState = indianStates.find(s => s.code === stateCode)
    if (selectedState) {
      setFormData({
        ...formData,
        state: selectedState.name,
        stateCode: selectedState.code,
      })
    }
  }

  const isConfigComplete = 
    formData.gstNumber && 
    formData.legalName && 
    formData.address && 
    formData.state

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">GST Configuration</h1>
          <p className="text-muted-foreground">Configure your business GST details for invoicing</p>
        </div>
        <div className="flex items-center gap-2">
          {isConfigComplete ? (
            <Badge className="bg-success/10 text-success border-success/20">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Configured
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
              <AlertCircle className="mr-1 h-3 w-3" />
              Incomplete
            </Badge>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Configuration Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                <CardTitle>Business Details</CardTitle>
              </div>
              <CardDescription>Enter your registered business information</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <Field>
                <FieldLabel>GST Identification Number (GSTIN)</FieldLabel>
                <Input
                  value={formData.gstNumber}
                  onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                  placeholder="e.g., 27AABCU9603R1ZM"
                  maxLength={15}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  15-character GST number issued by the government
                </p>
              </Field>

              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Legal Name</FieldLabel>
                  <Input
                    value={formData.legalName}
                    onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                    placeholder="Registered business name"
                  />
                </Field>
                <Field>
                  <FieldLabel>Trade Name</FieldLabel>
                  <Input
                    value={formData.tradeName}
                    onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                    placeholder="Brand/trade name (optional)"
                  />
                </Field>
              </FieldGroup>

              <Field>
                <FieldLabel>Registered Address</FieldLabel>
                <Textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Complete registered business address"
                  rows={3}
                />
              </Field>

              <Field>
                <FieldLabel>State</FieldLabel>
                <Select
                  value={formData.stateCode}
                  onValueChange={handleStateChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {indianStates.map((state) => (
                      <SelectItem key={state.code} value={state.code}>
                        {state.code} - {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Separator />

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Active Status</p>
                  <p className="text-sm text-muted-foreground">Enable GST for all invoices</p>
                </div>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Tax Rates Card */}
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  <CardTitle>Tax Rates</CardTitle>
                </div>
                <CardDescription>Configure GST tax rates</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <Field>
                  <FieldLabel>CGST Rate (%)</FieldLabel>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    max="50"
                    value={formData.cgstRate}
                    onChange={(e) => setFormData({ ...formData, cgstRate: parseFloat(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Central GST</p>
                </Field>
                <Field>
                  <FieldLabel>SGST Rate (%)</FieldLabel>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    max="50"
                    value={formData.sgstRate}
                    onChange={(e) => setFormData({ ...formData, sgstRate: parseFloat(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">State GST</p>
                </Field>
                <Field>
                  <FieldLabel>IGST Rate (%)</FieldLabel>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    max="50"
                    value={formData.igstRate}
                    onChange={(e) => setFormData({ ...formData, igstRate: parseFloat(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Integrated GST (Inter-state)</p>
                </Field>

                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm font-medium">Total GST (Intra-state)</p>
                  <p className="text-2xl font-bold text-primary">
                    {(formData.cgstRate + formData.sgstRate).toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    CGST ({formData.cgstRate}%) + SGST ({formData.sgstRate}%)
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />
                  <CardTitle>SAC Code</CardTitle>
                </div>
                <CardDescription>Services Accounting Code</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm font-medium text-muted-foreground">Default SAC for Transport Services</p>
                  <p className="text-lg font-mono font-semibold mt-1">996519</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Local transportation of passengers (taxi, cabs)
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => setFormData(gstConfig)}
            disabled={!hasChanges}
          >
            Reset
          </Button>
          <Button type="submit" disabled={!hasChanges}>
            Save Configuration
          </Button>
        </div>
      </form>
    </div>
  )
}
