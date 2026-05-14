// @ts-nocheck
'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useAdmin, DriverPayout } from '@/lib/admin-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Plus, Pencil, Trash2, Search, Wallet, IndianRupee, Clock, CheckCircle, User, Upload, Download, FileText, Printer } from 'lucide-react'
import { toast } from 'sonner'

type PayoutFormData = Omit<DriverPayout, 'id' | 'createdAt'>

const initialFormData: PayoutFormData = {
  payoutNumber: '',
  driverId: '',
  hub: '',
  doj: '',
  monthYear: '',
  monthDays: 0,
  workedDays: 0,
  totalLeaves: 0,
  shiftPay: 0,
  extraHoursPay: 0,
  daPay: 0,
  carWashing: 0,
  attendanceBonus: 0,
  customerRatingBonus: 0,
  onTimeReportingBonus: 0,
  overSpeeding: 0,
  lateLoginEarlyCheckout: 0,
  carNotClean: 0,
  amenitiesMissing: 0,
  customerComplaints: 0,
  emergencyLeave: 0,
  rideMissed: 0,
  minorDents: 0,
  majorAccident: 0,
  cameraTyreDamage: 0,
  challan: 0,
  totalPenalty: 0,
  totalIncentive: 0,
  advanceMinus: 0,
  cashInHand: 0,
  arrear: 0,
  healthInsurance: 0,
  specialAllowance: 0,
  finalPayout: 0,
  status: 'pending',
  remarks: '',
}

export default function DriverPayoutsPage() {
  const {
    drivers,
    driverPayouts,
    bookings,
    addDriverPayout,
    updateDriverPayout,
    deleteDriverPayout,
    getDriver,
  } = useAdmin()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPayout, setEditingPayout] = useState<DriverPayout | null>(null)
  const [formData, setFormData] = useState<PayoutFormData>(initialFormData)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Auto-calculate final payout
  const calculatedTotals = useMemo(() => {
    const totalIncentive =
      (formData.attendanceBonus || 0) +
      (formData.customerRatingBonus || 0) +
      (formData.onTimeReportingBonus || 0)

    const totalPenalty =
      (formData.overSpeeding || 0) +
      (formData.lateLoginEarlyCheckout || 0) +
      (formData.carNotClean || 0) +
      (formData.amenitiesMissing || 0) +
      (formData.customerComplaints || 0) +
      (formData.emergencyLeave || 0) +
      (formData.rideMissed || 0) +
      (formData.minorDents || 0) +
      (formData.majorAccident || 0) +
      (formData.cameraTyreDamage || 0) +
      (formData.challan || 0)

    const earnings =
      (formData.shiftPay || 0) +
      (formData.extraHoursPay || 0) +
      (formData.daPay || 0) +
      (formData.carWashing || 0) +
      totalIncentive +
      (formData.arrear || 0) +
      (formData.specialAllowance || 0)

    const deductions =
      totalPenalty +
      (formData.advanceMinus || 0) +
      (formData.cashInHand || 0) +
      (formData.healthInsurance || 0)

    const finalPayout = earnings - deductions

    return { totalIncentive, totalPenalty, finalPayout }
  }, [
    formData.attendanceBonus, formData.customerRatingBonus, formData.onTimeReportingBonus,
    formData.overSpeeding, formData.lateLoginEarlyCheckout, formData.carNotClean,
    formData.amenitiesMissing, formData.customerComplaints, formData.emergencyLeave,
    formData.rideMissed, formData.minorDents, formData.majorAccident, formData.cameraTyreDamage,
    formData.challan, formData.shiftPay, formData.extraHoursPay, formData.daPay,
    formData.carWashing, formData.arrear, formData.specialAllowance, formData.advanceMinus,
    formData.cashInHand, formData.healthInsurance
  ])

  const filteredPayouts = driverPayouts.filter((payout) => {
    const driver = getDriver(payout.driverId)
    const matchesSearch =
      payout.payoutNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver?.driverId.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus =
      statusFilter === 'all' || payout.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: driverPayouts.length,
    pending: driverPayouts.filter((p) => p.status === 'pending').length,
    paid: driverPayouts.filter((p) => p.status === 'paid').length,
    totalPendingAmount: driverPayouts
      .filter((p) => p.status === 'pending')
      .reduce((sum, p) => sum + p.finalPayout, 0),
    totalPaidAmount: driverPayouts
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + p.finalPayout, 0),
  }

  const handleOpenCreate = () => {
    setEditingPayout(null)
    setFormData({
      ...initialFormData,
      payoutNumber: `PYT-${new Date().getFullYear()}-${String(driverPayouts.length + 1).padStart(4, '0')}`,
    })
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (payout: DriverPayout) => {
    setEditingPayout(payout)
    setFormData({
      payoutNumber: payout.payoutNumber,
      driverId: payout.driverId,
      hub: payout.hub || '',
      doj: payout.doj || '',
      monthYear: payout.monthYear || '',
      monthDays: payout.monthDays || 0,
      workedDays: payout.workedDays || 0,
      totalLeaves: payout.totalLeaves || 0,
      shiftPay: payout.shiftPay || 0,
      extraHoursPay: payout.extraHoursPay || 0,
      daPay: payout.daPay || 0,
      carWashing: payout.carWashing || 0,
      attendanceBonus: payout.attendanceBonus || 0,
      customerRatingBonus: payout.customerRatingBonus || 0,
      onTimeReportingBonus: payout.onTimeReportingBonus || 0,
      overSpeeding: payout.overSpeeding || 0,
      lateLoginEarlyCheckout: payout.lateLoginEarlyCheckout || 0,
      carNotClean: payout.carNotClean || 0,
      amenitiesMissing: payout.amenitiesMissing || 0,
      customerComplaints: payout.customerComplaints || 0,
      emergencyLeave: payout.emergencyLeave || 0,
      rideMissed: payout.rideMissed || 0,
      minorDents: payout.minorDents || 0,
      majorAccident: payout.majorAccident || 0,
      cameraTyreDamage: payout.cameraTyreDamage || 0,
      challan: payout.challan || 0,
      totalPenalty: payout.totalPenalty || 0,
      totalIncentive: payout.totalIncentive || 0,
      advanceMinus: payout.advanceMinus || 0,
      cashInHand: payout.cashInHand || 0,
      arrear: payout.arrear || 0,
      healthInsurance: payout.healthInsurance || 0,
      specialAllowance: payout.specialAllowance || 0,
      finalPayout: payout.finalPayout || 0,
      status: payout.status,
      remarks: payout.remarks || '',
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.driverId) {
      toast.error('Please select a driver')
      return
    }
    if (!formData.monthYear) {
      toast.error('Please select month-year')
      return
    }

    const payload = { 
      ...formData, 
      totalIncentive: calculatedTotals.totalIncentive,
      totalPenalty: calculatedTotals.totalPenalty,
      finalPayout: calculatedTotals.finalPayout
    }

    if (editingPayout) {
      updateDriverPayout(editingPayout.id, payload)
      toast.success('Payout updated successfully')
    } else {
      addDriverPayout(payload)
      toast.success('Payout created successfully')
    }
    setIsDialogOpen(false)
    setFormData(initialFormData)
    setEditingPayout(null)
  }

  const handleDelete = (id: string) => {
    deleteDriverPayout(id)
    toast.success('Payout deleted successfully')
  }

  const handleMarkPaid = (id: string) => {
    updateDriverPayout(id, { status: 'paid' })
    toast.success('Payout marked as paid')
  }

  const getStatusBadge = (status: DriverPayout['status']) => {
    const styles: Record<string, string> = {
      pending: 'bg-warning/10 text-warning border-warning/20',
      paid: 'bg-success/10 text-success border-success/20',
    }
    return (
      <Badge variant="outline" className={styles[status]}>
        {status}
      </Badge>
    )
  }

  const handleNumChange = (field: keyof PayoutFormData, value: string) => {
    const num = parseFloat(value)
    setFormData(prev => ({
      ...prev,
      [field]: isNaN(num) ? 0 : num
    }))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const rows = text.split('\n').filter(row => row.trim())
      if (rows.length < 2) {
        toast.error('CSV file is empty or invalid')
        return
      }

      const headers = rows[0].split(',').map(h => h.trim().replace(/"/g, ''))
      let addedCount = 0

      for (let i = 1; i < rows.length; i++) {
        const values = rows[i].split(',').map(v => v.trim().replace(/"/g, ''))
        const rowData: Record<string, string> = {}
        headers.forEach((h, index) => {
          rowData[h] = values[index]
        })

        // Match Driver ID from CSV (e.g., DRV001 or UUID) to actual driver
        const driver = drivers.find(d => d.driverId === rowData.DriverID || d.id === rowData.DriverID)
        if (!driver) continue

        const payload = {
          payoutNumber: rowData.PayoutNumber || `PYT-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
          driverId: driver.id,
          hub: rowData.Hub || '',
          doj: rowData.DOJ || '',
          monthYear: rowData.MonthYear || '',
          monthDays: parseFloat(rowData.MonthDays) || 0,
          workedDays: parseFloat(rowData.WorkedDays) || 0,
          totalLeaves: parseFloat(rowData.TotalLeaves) || 0,
          shiftPay: parseFloat(rowData.ShiftPay) || 0,
          extraHoursPay: parseFloat(rowData.ExtraHoursPay) || 0,
          daPay: parseFloat(rowData.DAPay) || 0,
          carWashing: parseFloat(rowData.CarWashing) || 0,
          attendanceBonus: parseFloat(rowData.AttendanceBonus) || 0,
          customerRatingBonus: parseFloat(rowData.CustomerRatingBonus) || 0,
          onTimeReportingBonus: parseFloat(rowData.OnTimeReportingBonus) || 0,
          overSpeeding: parseFloat(rowData.OverSpeeding) || 0,
          lateLoginEarlyCheckout: parseFloat(rowData.LateLoginEarlyCheckout) || 0,
          carNotClean: parseFloat(rowData.CarNotClean) || 0,
          amenitiesMissing: parseFloat(rowData.AmenitiesMissing) || 0,
          customerComplaints: parseFloat(rowData.CustomerComplaints) || 0,
          emergencyLeave: parseFloat(rowData.EmergencyLeave) || 0,
          rideMissed: parseFloat(rowData.RideMissed) || 0,
          minorDents: parseFloat(rowData.MinorDents) || 0,
          majorAccident: parseFloat(rowData.MajorAccident) || 0,
          cameraTyreDamage: parseFloat(rowData.CameraTyreDamage) || 0,
          challan: parseFloat(rowData.Challan) || 0,
          advanceMinus: parseFloat(rowData.AdvanceMinus) || 0,
          cashInHand: parseFloat(rowData.CashInHand) || 0,
          arrear: parseFloat(rowData.Arrear) || 0,
          healthInsurance: parseFloat(rowData.HealthInsurance) || 0,
          specialAllowance: parseFloat(rowData.SpecialAllowance) || 0,
          status: rowData.Status?.toLowerCase() === 'paid' ? 'paid' : 'pending' as any,
          remarks: rowData.Remarks || ''
        }

        const totalIncentive = payload.attendanceBonus + payload.customerRatingBonus + payload.onTimeReportingBonus
        const totalPenalty = payload.overSpeeding + payload.lateLoginEarlyCheckout + payload.carNotClean + payload.amenitiesMissing + payload.customerComplaints + payload.emergencyLeave + payload.rideMissed + payload.minorDents + payload.majorAccident + payload.cameraTyreDamage + payload.challan
        const earnings = payload.shiftPay + payload.extraHoursPay + payload.daPay + payload.carWashing + totalIncentive + payload.arrear + payload.specialAllowance
        const deductions = totalPenalty + payload.advanceMinus + payload.cashInHand + payload.healthInsurance

        addDriverPayout({
          ...payload,
          totalIncentive,
          totalPenalty,
          finalPayout: earnings - deductions
        })
        addedCount++
      }

      if (addedCount > 0) {
        toast.success(`Successfully imported ${addedCount} payouts`)
      } else {
        toast.error('No valid records found. Make sure DriverID matches.')
      }
    } catch (error) {
      toast.error('Error parsing CSV file')
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Please allow popups to generate PDF')
      return
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Driver Settlements Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; font-size: 24px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f3f4f6; }
            .text-right { text-align: right; }
            .text-success { color: #16a34a; }
            .text-destructive { color: #dc2626; }
            @media print {
              @page { margin: 10mm; size: landscape; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <h1>Driver Settlements Report</h1>
          <p>Date: ${new Date().toLocaleDateString()}</p>
          <table>
            <thead>
              <tr>
                <th>Payout #</th>
                <th>Driver Name</th>
                <th>ID</th>
                <th>Month</th>
                <th>Worked</th>
                <th class="text-right">Shift Pay</th>
                <th class="text-right">Incentives</th>
                <th class="text-right">Penalties</th>
                <th class="text-right">Final Payout</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredPayouts.map(p => {
                const driver = getDriver(p.driverId)
                return `
                  <tr>
                    <td>${p.payoutNumber}</td>
                    <td>${driver?.name || 'Unknown'}</td>
                    <td>${driver?.driverId || '-'}</td>
                    <td>${p.monthYear}</td>
                    <td>${p.workedDays}</td>
                    <td class="text-right">${p.shiftPay.toLocaleString()}</td>
                    <td class="text-right text-success">${p.totalIncentive > 0 ? '+' + p.totalIncentive.toLocaleString() : '-'}</td>
                    <td class="text-right text-destructive">${p.totalPenalty > 0 ? '-' + p.totalPenalty.toLocaleString() : '-'}</td>
                    <td class="text-right font-bold">${p.finalPayout.toLocaleString()}</td>
                    <td>${p.status.toUpperCase()}</td>
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            }
          </script>
        </body>
      </html>
    `
    
    printWindow.document.write(html)
    printWindow.document.close()
  }

  const handleDownloadTemplate = () => {
    const headers = [
      'DriverID', 'PayoutNumber', 'Hub', 'DOJ', 'MonthYear', 'MonthDays', 'WorkedDays',
      'TotalLeaves', 'ShiftPay', 'ExtraHoursPay', 'DAPay', 'CarWashing',
      'AttendanceBonus', 'CustomerRatingBonus', 'OnTimeReportingBonus',
      'OverSpeeding', 'LateLoginEarlyCheckout', 'CarNotClean', 'AmenitiesMissing',
      'CustomerComplaints', 'EmergencyLeave', 'RideMissed', 'MinorDents',
      'MajorAccident', 'CameraTyreDamage', 'Challan', 'AdvanceMinus',
      'CashInHand', 'Arrear', 'HealthInsurance', 'SpecialAllowance',
      'Status', 'Remarks'
    ].join(',')

    const sampleRow = [
      'DRV001', 'PYT-2024-0001', 'Mumbai Central', '2024-01-15', '2024-01', '31', '26',
      '2', '15000', '2000', '1000', '500',
      '1000', '500', '500',
      '0', '0', '200', '0',
      '0', '0', '0', '0',
      '0', '0', '0', '1000',
      '5000', '0', '500', '0',
      'pending', 'Sample remarks'
    ].join(',')

    const csvContent = `${headers}\n${sampleRow}\n`
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'driver_settlements_template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDownloadSlip = (payout: DriverPayout) => {
    const driver = getDriver(payout.driverId)
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Please allow popups to generate slip')
      return
    }

    const grossEarnings = payout.shiftPay + payout.extraHoursPay + payout.daPay + payout.carWashing + payout.arrear + payout.specialAllowance + payout.totalIncentive
    const totalDeductions = payout.totalPenalty + payout.advanceMinus + payout.cashInHand + payout.healthInsurance

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Settlement Slip - ${payout.payoutNumber}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
            .header h1 { margin: 0 0 5px 0; color: #1a365d; font-size: 28px; letter-spacing: 1px; }
            .header p { margin: 0; color: #666; font-size: 14px; text-transform: uppercase; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .info-box { border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; background: #f8fafc; }
            .info-box p { margin: 5px 0; font-size: 14px; }
            .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
            .section-title { font-size: 16px; font-weight: bold; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 15px; color: #1e293b; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th, td { padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
            th { text-align: left; font-weight: 600; color: #64748b; }
            .text-right { text-align: right; }
            .text-success { color: #16a34a; }
            .text-destructive { color: #dc2626; }
            .font-bold { font-weight: bold; }
            .total-row td { border-top: 2px solid #cbd5e1; border-bottom: none; padding-top: 15px; font-size: 15px; }
            .final-payout { margin-top: 30px; background-color: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #cbd5e1; }
            .final-payout h2 { margin: 0; font-size: 26px; color: #0f172a; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr; margin-top: 60px; text-align: center; }
            .sig-line { border-top: 1px solid #94a3b8; width: 200px; margin: 0 auto; padding-top: 10px; color: #64748b; font-size: 14px; }
            @media print {
              body { padding: 0; }
              .final-payout { -webkit-print-color-adjust: exact; background-color: #f1f5f9 !important; }
              .info-box { -webkit-print-color-adjust: exact; background-color: #f8fafc !important; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>TREV MOBILITY</h1>
            <p>Tech Private Limited</p>
            <h2 style="margin: 15px 0 0 0; font-size: 18px; color: #333;">DRIVER SETTLEMENT SLIP</h2>
            <p style="margin-top: 5px;">Month: <strong style="color: #000;">${payout.monthYear}</strong> | Slip No: <strong style="color: #000;">${payout.payoutNumber}</strong></p>
          </div>

          <div class="info-grid">
            <div class="info-box">
              <p><strong>Driver Name:</strong> ${driver?.name || 'Unknown'}</p>
              <p><strong>Driver ID:</strong> ${driver?.driverId || 'N/A'}</p>
              <p><strong>Hub:</strong> ${payout.hub || 'N/A'}</p>
              <p><strong>Date of Joining:</strong> ${payout.doj || 'N/A'}</p>
            </div>
            <div class="info-box">
              <p><strong>Month Days:</strong> ${payout.monthDays || 0}</p>
              <p><strong>Worked Days:</strong> ${payout.workedDays || 0}</p>
              <p><strong>Total Leaves:</strong> ${payout.totalLeaves || 0}</p>
              <p><strong>Status:</strong> ${payout.status.toUpperCase()}</p>
            </div>
          </div>

          <div class="details-grid">
            <div>
              <div class="section-title">Earnings & Incentives</div>
              <table>
                <tbody>
                  <tr><td>Shift Pay</td><td class="text-right">Rs. ${payout.shiftPay.toLocaleString()}</td></tr>
                  ${payout.extraHoursPay ? `<tr><td>Extra Hours Pay</td><td class="text-right">Rs. ${payout.extraHoursPay.toLocaleString()}</td></tr>` : ''}
                  ${payout.daPay ? `<tr><td>DA Pay</td><td class="text-right">Rs. ${payout.daPay.toLocaleString()}</td></tr>` : ''}
                  ${payout.carWashing ? `<tr><td>Car Washing</td><td class="text-right">Rs. ${payout.carWashing.toLocaleString()}</td></tr>` : ''}
                  ${payout.arrear ? `<tr><td>Arrear</td><td class="text-right">Rs. ${payout.arrear.toLocaleString()}</td></tr>` : ''}
                  ${payout.specialAllowance ? `<tr><td>Special Allowance</td><td class="text-right">Rs. ${payout.specialAllowance.toLocaleString()}</td></tr>` : ''}
                  ${payout.attendanceBonus ? `<tr><td>Attendance Bonus</td><td class="text-right text-success">+Rs. ${payout.attendanceBonus.toLocaleString()}</td></tr>` : ''}
                  ${payout.customerRatingBonus ? `<tr><td>Customer Rating Bonus</td><td class="text-right text-success">+Rs. ${payout.customerRatingBonus.toLocaleString()}</td></tr>` : ''}
                  ${payout.onTimeReportingBonus ? `<tr><td>On-Time Reporting Bonus</td><td class="text-right text-success">+Rs. ${payout.onTimeReportingBonus.toLocaleString()}</td></tr>` : ''}
                  <tr class="total-row">
                    <td class="font-bold text-success">Total Gross Earnings</td>
                    <td class="text-right font-bold text-success">Rs. ${grossEarnings.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <div class="section-title">Penalties & Deductions</div>
              <table>
                <tbody>
                  ${payout.advanceMinus ? `<tr><td>Advance Minus</td><td class="text-right text-destructive">-Rs. ${payout.advanceMinus.toLocaleString()}</td></tr>` : ''}
                  ${payout.cashInHand ? `<tr><td>Cash in Hand</td><td class="text-right text-destructive">-Rs. ${payout.cashInHand.toLocaleString()}</td></tr>` : ''}
                  ${payout.healthInsurance ? `<tr><td>Health Insurance</td><td class="text-right text-destructive">-Rs. ${payout.healthInsurance.toLocaleString()}</td></tr>` : ''}
                  ${payout.totalPenalty > 0 ? `<tr><td>Total Operational Penalties<br/><span style="font-size:10px;color:#94a3b8;">(Speeding, Cleaning, Damage, etc.)</span></td><td class="text-right text-destructive">-Rs. ${payout.totalPenalty.toLocaleString()}</td></tr>` : ''}
                  ${totalDeductions === 0 ? '<tr><td colspan="2" style="text-align: center; color: #94a3b8; font-style: italic; padding: 20px 0;">No deductions for this period</td></tr>' : ''}
                  <tr class="total-row">
                    <td class="font-bold text-destructive">Total Deductions</td>
                    <td class="text-right font-bold text-destructive">Rs. ${totalDeductions.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="final-payout">
            <p style="margin: 0 0 5px 0; color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 14px;">Net Final Payout</p>
            <h2>Rs. ${payout.finalPayout.toLocaleString()}</h2>
          </div>

          <div class="signatures">
            <div>
              <div class="sig-line">Driver Signature</div>
            </div>
            <div>
              <div class="sig-line">Authorized Signatory</div>
            </div>
          </div>

          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            }
          </script>
        </body>
      </html>
    `
    
    printWindow.document.write(html)
    printWindow.document.close()
  }

  if (!isMounted) return null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Driver Settlements</h1>
          <p className="text-muted-foreground">Manage driver payouts and salary settlements</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleDownloadTemplate} title="Download CSV Template">
            <FileText className="mr-2 h-4 w-4" />
            Template
          </Button>
          <input 
            type="file" 
            ref={fileInputRef} 
            accept=".csv" 
            className="hidden" 
            onChange={handleFileUpload} 
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Upload CSV
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Create Payout
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPayout ? 'Edit Payout' : 'Create Driver Payout'}
              </DialogTitle>
              <DialogDescription>
                {editingPayout
                  ? 'Update payout details'
                  : 'Enter driver payout details for the selected period'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <h3 className="text-lg font-semibold border-b pb-2">Basic Details</h3>
                <FieldGroup className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Payout Number</FieldLabel>
                    <Input
                      value={formData.payoutNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, payoutNumber: e.target.value })
                      }
                      placeholder="e.g., PYT-2024-0001"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Driver</FieldLabel>
                    <Select
                      value={formData.driverId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, driverId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select driver" />
                      </SelectTrigger>
                      <SelectContent>
                        {drivers.map((driver) => (
                          <SelectItem key={driver.id} value={driver.id}>
                            {driver.name} ({driver.driverId})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>

                <FieldGroup className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Hub</FieldLabel>
                    <Input
                      value={formData.hub}
                      onChange={(e) => setFormData({ ...formData, hub: e.target.value })}
                      placeholder="e.g., Mumbai Central"
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Date of Joining (DOJ)</FieldLabel>
                    <Input
                      type="date"
                      value={formData.doj}
                      onChange={(e) => setFormData({ ...formData, doj: e.target.value })}
                    />
                  </Field>
                </FieldGroup>

                <h3 className="text-lg font-semibold border-b pb-2 mt-4">Work Summary</h3>
                <FieldGroup className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Field>
                    <FieldLabel>Month-Year</FieldLabel>
                    <Input
                      type="month"
                      value={formData.monthYear}
                      onChange={(e) => setFormData({ ...formData, monthYear: e.target.value })}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Month Days</FieldLabel>
                    <Input
                      type="number"
                      value={formData.monthDays || ''}
                      onChange={(e) => handleNumChange('monthDays', e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Worked Days</FieldLabel>
                    <Input
                      type="number"
                      value={formData.workedDays || ''}
                      onChange={(e) => handleNumChange('workedDays', e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Total Leaves</FieldLabel>
                    <Input
                      type="number"
                      value={formData.totalLeaves || ''}
                      onChange={(e) => handleNumChange('totalLeaves', e.target.value)}
                    />
                  </Field>
                </FieldGroup>

                <h3 className="text-lg font-semibold border-b pb-2 mt-4">Earnings</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Field>
                    <FieldLabel>Shift Pay (Rs.)</FieldLabel>
                    <Input
                      type="number"
                      value={formData.shiftPay || ''}
                      onChange={(e) => handleNumChange('shiftPay', e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Extra Hours (Rs.)</FieldLabel>
                    <Input
                      type="number"
                      value={formData.extraHoursPay || ''}
                      onChange={(e) => handleNumChange('extraHoursPay', e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>DA Pay (Rs.)</FieldLabel>
                    <Input
                      type="number"
                      value={formData.daPay || ''}
                      onChange={(e) => handleNumChange('daPay', e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Car Washing (Rs.)</FieldLabel>
                    <Input
                      type="number"
                      value={formData.carWashing || ''}
                      onChange={(e) => handleNumChange('carWashing', e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Arrear (Rs.)</FieldLabel>
                    <Input
                      type="number"
                      value={formData.arrear || ''}
                      onChange={(e) => handleNumChange('arrear', e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Special Allowance (Rs.)</FieldLabel>
                    <Input
                      type="number"
                      value={formData.specialAllowance || ''}
                      onChange={(e) => handleNumChange('specialAllowance', e.target.value)}
                    />
                  </Field>
                </div>

                <h3 className="text-lg font-semibold border-b pb-2 mt-4">Incentives</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <Field>
                    <FieldLabel>Attendance (Rs.)</FieldLabel>
                    <Input
                      type="number"
                      value={formData.attendanceBonus || ''}
                      onChange={(e) => handleNumChange('attendanceBonus', e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Customer Rating (Rs.)</FieldLabel>
                    <Input
                      type="number"
                      value={formData.customerRatingBonus || ''}
                      onChange={(e) => handleNumChange('customerRatingBonus', e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>On Time Reporting (Rs.)</FieldLabel>
                    <Input
                      type="number"
                      value={formData.onTimeReportingBonus || ''}
                      onChange={(e) => handleNumChange('onTimeReportingBonus', e.target.value)}
                    />
                  </Field>
                </div>

                <h3 className="text-lg font-semibold border-b pb-2 mt-4">Penalties</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Field>
                    <FieldLabel>Over Speeding</FieldLabel>
                    <Input type="number" value={formData.overSpeeding || ''} onChange={(e) => handleNumChange('overSpeeding', e.target.value)} />
                  </Field>
                  <Field>
                    <FieldLabel>Late Login/Early Checkout</FieldLabel>
                    <Input type="number" value={formData.lateLoginEarlyCheckout || ''} onChange={(e) => handleNumChange('lateLoginEarlyCheckout', e.target.value)} />
                  </Field>
                  <Field>
                    <FieldLabel>Car Not Clean</FieldLabel>
                    <Input type="number" value={formData.carNotClean || ''} onChange={(e) => handleNumChange('carNotClean', e.target.value)} />
                  </Field>
                  <Field>
                    <FieldLabel>Amenities Missing</FieldLabel>
                    <Input type="number" value={formData.amenitiesMissing || ''} onChange={(e) => handleNumChange('amenitiesMissing', e.target.value)} />
                  </Field>
                  <Field>
                    <FieldLabel>Customer Complaints</FieldLabel>
                    <Input type="number" value={formData.customerComplaints || ''} onChange={(e) => handleNumChange('customerComplaints', e.target.value)} />
                  </Field>
                  <Field>
                    <FieldLabel>Emergency Leave</FieldLabel>
                    <Input type="number" value={formData.emergencyLeave || ''} onChange={(e) => handleNumChange('emergencyLeave', e.target.value)} />
                  </Field>
                  <Field>
                    <FieldLabel>Ride Missed</FieldLabel>
                    <Input type="number" value={formData.rideMissed || ''} onChange={(e) => handleNumChange('rideMissed', e.target.value)} />
                  </Field>
                  <Field>
                    <FieldLabel>Minor Dents</FieldLabel>
                    <Input type="number" value={formData.minorDents || ''} onChange={(e) => handleNumChange('minorDents', e.target.value)} />
                  </Field>
                  <Field>
                    <FieldLabel>Major Accident</FieldLabel>
                    <Input type="number" value={formData.majorAccident || ''} onChange={(e) => handleNumChange('majorAccident', e.target.value)} />
                  </Field>
                  <Field>
                    <FieldLabel>Camera-Tyre Damage</FieldLabel>
                    <Input type="number" value={formData.cameraTyreDamage || ''} onChange={(e) => handleNumChange('cameraTyreDamage', e.target.value)} />
                  </Field>
                  <Field>
                    <FieldLabel>Challan</FieldLabel>
                    <Input type="number" value={formData.challan || ''} onChange={(e) => handleNumChange('challan', e.target.value)} />
                  </Field>
                </div>

                <h3 className="text-lg font-semibold border-b pb-2 mt-4">Deductions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <Field>
                    <FieldLabel>Advance Minus (Rs.)</FieldLabel>
                    <Input
                      type="number"
                      value={formData.advanceMinus || ''}
                      onChange={(e) => handleNumChange('advanceMinus', e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Cash in Hand (Rs.)</FieldLabel>
                    <Input
                      type="number"
                      value={formData.cashInHand || ''}
                      onChange={(e) => handleNumChange('cashInHand', e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Health Insurance (Rs.)</FieldLabel>
                    <Input
                      type="number"
                      value={formData.healthInsurance || ''}
                      onChange={(e) => handleNumChange('healthInsurance', e.target.value)}
                    />
                  </Field>
                </div>

                <h3 className="text-lg font-semibold border-b pb-2 mt-4">Status</h3>
                <Field>
                  <FieldLabel>Status</FieldLabel>
                  <Select
                    value={formData.status}
                    onValueChange={(value: DriverPayout['status']) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel>Remarks</FieldLabel>
                  <Input
                    value={formData.remarks}
                    onChange={(e) =>
                      setFormData({ ...formData, remarks: e.target.value })
                    }
                    placeholder="Any additional notes..."
                  />
                </Field>

                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <span className="font-medium text-success">Total Incentives: Rs. {calculatedTotals.totalIncentive.toLocaleString()}</span>
                  <span className="font-medium text-destructive">Total Penalties: Rs. {calculatedTotals.totalPenalty.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
                  <span className="font-medium">Calculated Final Payout</span>
                  <span className="text-xl font-bold text-primary">
                    Rs. {calculatedTotals.finalPayout.toLocaleString()}
                  </span>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false)
                    setFormData(initialFormData)
                    setEditingPayout(null)
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPayout ? 'Update Payout' : 'Create Payout'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Rs. {stats.totalPendingAmount.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.paid}</div>
            <p className="text-xs text-muted-foreground">
              Rs. {stats.totalPaidAmount.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <IndianRupee className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rs. {(stats.totalPendingAmount + stats.totalPaidAmount).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payouts Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>All Settlements</CardTitle>
              <CardDescription>{filteredPayouts.length} payouts found</CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search payouts..."
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
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="list">
            <TabsList className="mb-4">
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="driver">Driver Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="list">
              {filteredPayouts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No payouts found</p>
                  <p className="text-sm">Create your first driver payout</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payout #</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Worked Days</TableHead>
                      <TableHead>Shift Pay</TableHead>
                      <TableHead>Incentives</TableHead>
                      <TableHead>Penalties</TableHead>
                      <TableHead>Final Payout</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayouts.map((payout) => {
                      const driver = getDriver(payout.driverId)
                      return (
                        <TableRow key={payout.id}>
                          <TableCell className="font-mono font-medium">
                            {payout.payoutNumber}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{driver?.name || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">
                                  {driver?.driverId}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{payout.monthYear}</span>
                          </TableCell>
                          <TableCell>{payout.workedDays}</TableCell>
                          <TableCell>
                            Rs. {payout.shiftPay.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-success">
                            {payout.totalIncentive > 0 ? `+ Rs. ${payout.totalIncentive.toLocaleString()}` : '-'}
                          </TableCell>
                          <TableCell className="text-destructive">
                            {payout.totalPenalty > 0 ? `- Rs. ${payout.totalPenalty.toLocaleString()}` : '-'}
                          </TableCell>
                          <TableCell className="font-semibold">
                            Rs. {payout.finalPayout.toLocaleString()}
                          </TableCell>
                          <TableCell>{getStatusBadge(payout.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDownloadSlip(payout)}
                                title="Print Payslip"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEdit(payout)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {payout.status === 'pending' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMarkPaid(payout.id)}
                                >
                                  Mark Paid
                                </Button>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Payout</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete payout{' '}
                                      {payout.payoutNumber}? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(payout.id)}
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
            </TabsContent>

            <TabsContent value="driver">
              <DriverSummaryTab
                drivers={drivers}
                driverPayouts={driverPayouts}
                getDriver={getDriver}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function DriverSummaryTab({
  drivers,
  driverPayouts,
  getDriver,
}: {
  drivers: ReturnType<typeof useAdmin>['drivers']
  driverPayouts: DriverPayout[]
  getDriver: ReturnType<typeof useAdmin>['getDriver']
}) {
  const driverSummary = useMemo(() => {
    return drivers.map((driver) => {
      const payouts = driverPayouts.filter((p) => p.driverId === driver.id)
      const totalEarnings = payouts.reduce((sum, p) => sum + p.finalPayout, 0)
      const pendingAmount = payouts
        .filter((p) => p.status === 'pending')
        .reduce((sum, p) => sum + p.finalPayout, 0)
      const totalWorkedDays = payouts.reduce((sum, p) => sum + p.workedDays, 0)
      return {
        driver,
        totalPayouts: payouts.length,
        totalEarnings,
        pendingAmount,
        totalWorkedDays,
      }
    })
  }, [drivers, driverPayouts])

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Driver</TableHead>
          <TableHead>Total Payouts</TableHead>
          <TableHead>Total Worked Days</TableHead>
          <TableHead>Total Earnings</TableHead>
          <TableHead>Pending Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {driverSummary.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
              No driver data available
            </TableCell>
          </TableRow>
        ) : (
          driverSummary.map(({ driver, totalPayouts, totalEarnings, pendingAmount, totalWorkedDays }) => (
            <TableRow key={driver.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{driver.name}</p>
                    <p className="text-xs text-muted-foreground">{driver.driverId}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>{totalPayouts}</TableCell>
              <TableCell>{totalWorkedDays}</TableCell>
              <TableCell className="font-semibold">
                Rs. {totalEarnings.toLocaleString()}
              </TableCell>
              <TableCell>
                {pendingAmount > 0 ? (
                  <Badge variant="outline" className="bg-warning/10 text-warning">
                    Rs. {pendingAmount.toLocaleString()}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
