'use client'

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useAdmin } from '@/lib/admin-context'
import { Driver } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { CalendarDays, Clock, Database, Download, MapPin, Pencil, Plus, Search, Trash2, Upload, UserCheck } from 'lucide-react'
import { toast } from 'sonner'

type DriverShift = {
  id: string
  driverId: string
  shiftStart: string
  shiftEnd: string
  hubId?: string
  hubLocation: string
  createdAt: string
}

type ShiftFormData = Omit<DriverShift, 'id' | 'createdAt'>

const STORAGE_KEY = 'driverShifts'
const CUSTOM_HUB_VALUE = '__custom__'

const initialFormData: ShiftFormData = {
  driverId: '',
  shiftStart: '',
  shiftEnd: '',
  hubId: undefined,
  hubLocation: '',
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })

const getMonthValue = (date = new Date()) => {
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  return `${date.getFullYear()}-${month}`
}

const getDateKey = (value: string) => {
  const date = new Date(value)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}`
}

const getDaysInMonth = (monthValue: string) => {
  const [year, month] = monthValue.split('-').map(Number)
  const totalDays = new Date(year, month, 0).getDate()

  return Array.from({ length: totalDays }, (_, index) => {
    const day = (index + 1).toString().padStart(2, '0')
    return `${year}-${month.toString().padStart(2, '0')}-${day}`
  })
}

const formatDateKey = (dateKey: string) =>
  new Date(`${dateKey}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

const formatDayName = (dateKey: string) =>
  new Date(`${dateKey}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'long',
  })

const getShiftHours = (shift: DriverShift) => {
  const start = new Date(shift.shiftStart).getTime()
  const end = new Date(shift.shiftEnd).getTime()
  const diffHours = Math.max(0, (end - start) / (1000 * 60 * 60))
  return diffHours.toFixed(diffHours % 1 === 0 ? 0 : 1)
}

const getShiftBucket = (value: string) => {
  const hour = new Date(value).getHours()

  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'day'
  if (hour >= 17 && hour < 22) return 'evening'
  return 'night'
}

const getShiftBucketLabel = (bucket: string) => {
  switch (bucket) {
    case 'morning':
      return 'Morning'
    case 'day':
      return 'Day'
    case 'evening':
      return 'Evening'
    case 'night':
      return 'Night'
    default:
      return 'All Shifts'
  }
}

const toDateTimeLocalValue = (date: Date) => {
  const pad = (value: number) => value.toString().padStart(2, '0')

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + `T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const csvHeaders = ['driver_id', 'driver_name', 'shift_start', 'shift_end', 'hub_location']

const escapeCsvValue = (value: string) => {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }

  return value
}

const parseCsvLine = (line: string) => {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const nextChar = line[index + 1]

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"'
      index += 1
    } else if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  values.push(current.trim())
  return values
}

const parseCsv = (csvText: string) => {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) return []

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase())

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    return headers.reduce<Record<string, string>>((row, header, index) => {
      row[header] = values[index] || ''
      return row
    }, {})
  })
}

export default function DriverShiftsPage() {
  const { drivers, hubs } = useAdmin()
  const [shifts, setShifts] = useState<DriverShift[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [dayFilter, setDayFilter] = useState('')
  const [hubFilter, setHubFilter] = useState('all')
  const [shiftFilter, setShiftFilter] = useState('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingShift, setEditingShift] = useState<DriverShift | null>(null)
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [formData, setFormData] = useState<ShiftFormData>(initialFormData)
  const [reportMonth, setReportMonth] = useState(getMonthValue())
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        setShifts(JSON.parse(saved))
      }
    } catch {
      setShifts([])
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shifts))
  }, [shifts])

  const activeDrivers = useMemo(
    () => drivers.filter((driver) => driver.status === 'active'),
    [drivers]
  )

  const hubFilterOptions = useMemo(() => {
    const options = new Map<string, string>()

    hubs.forEach((hub) => {
      options.set(hub.id, hub.name)
    })

    shifts.forEach((shift) => {
      if (!shift.hubId && shift.hubLocation) {
        options.set(`location:${shift.hubLocation}`, shift.hubLocation)
      }
    })

    return Array.from(options.entries()).map(([value, label]) => ({ value, label }))
  }, [hubs, shifts])

  const filteredShifts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return shifts
      .filter((shift) => {
        const driver = drivers.find((item) => item.id === shift.driverId)
        const matchesSearch =
          !query ||
          driver?.name.toLowerCase().includes(query) ||
          driver?.driverId?.toLowerCase().includes(query) ||
          shift.hubLocation.toLowerCase().includes(query)
        const matchesDay = !dayFilter || getDateKey(shift.shiftStart) === dayFilter
        const matchesHub =
          hubFilter === 'all' ||
          shift.hubId === hubFilter ||
          (!shift.hubId && `location:${shift.hubLocation}` === hubFilter)
        const matchesShift =
          shiftFilter === 'all' || getShiftBucket(shift.shiftStart) === shiftFilter

        return matchesSearch && matchesDay && matchesHub && matchesShift
      })
      .sort((a, b) => new Date(b.shiftStart).getTime() - new Date(a.shiftStart).getTime())
  }, [dayFilter, drivers, hubFilter, searchQuery, shiftFilter, shifts])

  const selectedDriverShifts = useMemo(() => {
    if (!selectedDriver) return []
    return shifts
      .filter((shift) => shift.driverId === selectedDriver.id)
      .sort((a, b) => new Date(b.shiftStart).getTime() - new Date(a.shiftStart).getTime())
  }, [selectedDriver, shifts])

  const attendanceDays = useMemo(
    () => new Set(selectedDriverShifts.map((shift) => getDateKey(shift.shiftStart))).size,
    [selectedDriverShifts]
  )

  const totalAttendanceDays = useMemo(
    () => new Set(shifts.map((shift) => `${shift.driverId}:${getDateKey(shift.shiftStart)}`)).size,
    [shifts]
  )

  const handleOpenDialog = (shift?: DriverShift) => {
    if (shift) {
      setEditingShift(shift)
      setFormData({
        driverId: shift.driverId,
        shiftStart: shift.shiftStart,
        shiftEnd: shift.shiftEnd,
        hubId: shift.hubId,
        hubLocation: shift.hubLocation,
      })
    } else {
      setEditingShift(null)
      setFormData(initialFormData)
    }

    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingShift(null)
    setFormData(initialFormData)
  }

  const handleHubChange = (value: string) => {
    if (value === CUSTOM_HUB_VALUE) {
      setFormData({ ...formData, hubId: undefined, hubLocation: '' })
      return
    }

    const hub = hubs.find((item) => item.id === value)
    setFormData({
      ...formData,
      hubId: value,
      hubLocation: hub?.address || hub?.name || '',
    })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!formData.driverId || !formData.shiftStart || !formData.shiftEnd || !formData.hubLocation.trim()) {
      toast.error('Please fill all shift details')
      return
    }

    if (new Date(formData.shiftEnd) <= new Date(formData.shiftStart)) {
      toast.error('End time must be after shift start time')
      return
    }

    if (editingShift) {
      setShifts((current) =>
        current.map((shift) =>
          shift.id === editingShift.id
            ? { ...shift, ...formData, hubLocation: formData.hubLocation.trim() }
            : shift
        )
      )
      toast.success('Driver shift updated successfully')
    } else {
      setShifts((current) => [
        {
          id: `shift-${Date.now()}`,
          ...formData,
          hubLocation: formData.hubLocation.trim(),
          createdAt: new Date().toISOString(),
        },
        ...current,
      ])
      toast.success('Driver shift created successfully')
    }

    handleCloseDialog()
  }

  const handleDelete = (id: string) => {
    setShifts((current) => current.filter((shift) => shift.id !== id))
    toast.success('Driver shift deleted successfully')
  }

  const handleCreateDummyData = () => {
    if (drivers.length === 0) {
      toast.error('Please add drivers first, then create dummy shifts')
      return
    }

    const demoDrivers = drivers.slice(0, Math.min(3, drivers.length))
    const today = new Date()
    const demoShifts: DriverShift[] = []

    demoDrivers.forEach((driver, driverIndex) => {
      for (let dayOffset = 0; dayOffset < 5; dayOffset += 1) {
        const shiftDate = new Date(today)
        shiftDate.setDate(today.getDate() - dayOffset)

        const startDate = new Date(shiftDate)
        startDate.setHours(8 + driverIndex, driverIndex * 10, 0, 0)

        const endDate = new Date(shiftDate)
        endDate.setHours(17 + driverIndex, driverIndex * 10, 0, 0)

        const hub = hubs[(driverIndex + dayOffset) % Math.max(1, hubs.length)]
        const driverHub = driver.hubId ? hubs.find((item) => item.id === driver.hubId) : undefined

        demoShifts.push({
          id: `demo-shift-${Date.now()}-${driver.id}-${dayOffset}`,
          driverId: driver.id,
          shiftStart: toDateTimeLocalValue(startDate),
          shiftEnd: toDateTimeLocalValue(endDate),
          hubId: driverHub?.id || hub?.id,
          hubLocation:
            driverHub?.address ||
            driverHub?.name ||
            hub?.address ||
            hub?.name ||
            ['Trev Delhi Hub', 'Airport Parking Hub', 'Corporate Dispatch Hub'][dayOffset % 3],
          createdAt: new Date().toISOString(),
        })
      }
    })

    setShifts((current) => [...demoShifts, ...current])
    toast.success(`Created ${demoShifts.length} dummy driver shifts`)
  }

  const handleDownloadTemplate = () => {
    const sampleDriver = drivers[0]
    const sampleHub = hubs[0]
    const sampleRow = [
      sampleDriver?.driverId || 'DRV001',
      sampleDriver?.name || 'Ramesh Kumar',
      '2026-05-14 09:00',
      '2026-05-14 18:00',
      sampleHub?.address || sampleHub?.name || 'Trev Hub Delhi',
    ]

    const csvContent = [
      csvHeaders.join(','),
      sampleRow.map(escapeCsvValue).join(','),
    ].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.setAttribute('download', 'driver_shifts_template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const downloadCsv = (filename: string, rows: string[][]) => {
    const csvContent = rows
      .map((row) => row.map((value) => escapeCsvValue(value)).join(','))
      .join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const getDayShifts = (driverId: string, dateKey: string) =>
    shifts
      .filter((shift) => shift.driverId === driverId && getDateKey(shift.shiftStart) === dateKey)
      .sort((a, b) => new Date(a.shiftStart).getTime() - new Date(b.shiftStart).getTime())

  const getDriversForReport = () => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) return drivers

    return drivers.filter(
      (driver) =>
        driver.name.toLowerCase().includes(query) ||
        driver.driverId?.toLowerCase().includes(query) ||
        driver.phone.includes(query)
    )
  }

  const buildMonthlyReportRows = (reportDrivers: Driver[], monthValue: string) => {
    const monthDays = getDaysInMonth(monthValue)
    const rows: string[][] = [
      [
        'driver_name',
        'driver_id',
        'phone',
        'driver_status',
        'date',
        'day',
        'attendance_status',
        'first_login',
        'last_logout',
        'all_login_times',
        'all_logout_times',
        'hub_locations',
        'shift_count',
        'total_hours',
      ],
    ]

    reportDrivers.forEach((driver) => {
      monthDays.forEach((dateKey) => {
        const dayShifts = getDayShifts(driver.id, dateKey)
        const totalHours = dayShifts
          .reduce((sum, shift) => sum + Number(getShiftHours(shift)), 0)
          .toFixed(1)
        const hubLocations = Array.from(new Set(dayShifts.map((shift) => shift.hubLocation))).join(' | ')

        rows.push([
          driver.name,
          driver.driverId || 'N/A',
          driver.phone || 'N/A',
          driver.status,
          formatDateKey(dateKey),
          formatDayName(dateKey),
          dayShifts.length > 0 ? 'Present' : 'Absent',
          dayShifts[0] ? formatTime(dayShifts[0].shiftStart) : '',
          dayShifts[dayShifts.length - 1] ? formatTime(dayShifts[dayShifts.length - 1].shiftEnd) : '',
          dayShifts.map((shift) => formatTime(shift.shiftStart)).join(' | '),
          dayShifts.map((shift) => formatTime(shift.shiftEnd)).join(' | '),
          hubLocations,
          String(dayShifts.length),
          dayShifts.length > 0 ? totalHours : '0',
        ])
      })
    })

    return rows
  }

  const handleDownloadReport = () => {
    const reportDrivers = getDriversForReport()

    if (reportDrivers.length === 0) {
      toast.error('No drivers available for this report')
      return
    }

    downloadCsv(`driver_attendance_${reportMonth}.csv`, buildMonthlyReportRows(reportDrivers, reportMonth))
    toast.success('Monthly attendance report downloaded')
  }

  const handleDownloadDriverReport = () => {
    if (!selectedDriver) {
      toast.error('Please select a driver first')
      return
    }

    const safeName = selectedDriver.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    const monthShifts = selectedDriverShifts.filter((shift) => getDateKey(shift.shiftStart).startsWith(reportMonth))
    const monthAttendanceDays = new Set(monthShifts.map((shift) => getDateKey(shift.shiftStart))).size
    const summaryRows = [
      ['driver_name', selectedDriver.name],
      ['driver_id', selectedDriver.driverId || 'N/A'],
      ['report_month', reportMonth],
      ['total_attendance_days', String(monthAttendanceDays)],
      ['total_absent_days', String(getDaysInMonth(reportMonth).length - monthAttendanceDays)],
      ['total_shifts', String(monthShifts.length)],
      [],
    ]

    downloadCsv(
      `${safeName || 'driver'}_attendance_${reportMonth}.csv`,
      [...summaryRows, ...buildMonthlyReportRows([selectedDriver], reportMonth)]
    )
    toast.success('Monthly driver attendance report downloaded')
  }

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const csvText = await file.text()
      const rows = parseCsv(csvText)

      if (rows.length === 0) {
        toast.error('CSV is empty. Please use the downloaded template.')
        return
      }

      const newShifts: DriverShift[] = []
      const errors: string[] = []

      rows.forEach((row, index) => {
        const rowNumber = index + 2
        const driverCode = row.driver_id?.trim().toLowerCase()
        const driverName = row.driver_name?.trim().toLowerCase()
        const shiftStart = row.shift_start?.trim()
        const shiftEnd = row.shift_end?.trim()
        const hubLocation = row.hub_location?.trim()
        const driver = drivers.find(
          (item) =>
            item.driverId?.toLowerCase() === driverCode ||
            item.name.toLowerCase() === driverName
        )

        if (!driver) {
          errors.push(`Row ${rowNumber}: driver not found`)
          return
        }

        if (!shiftStart || !shiftEnd || !hubLocation) {
          errors.push(`Row ${rowNumber}: missing shift start, end, or hub location`)
          return
        }

        const startDate = new Date(shiftStart)
        const endDate = new Date(shiftEnd)

        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
          errors.push(`Row ${rowNumber}: invalid date/time`)
          return
        }

        if (endDate <= startDate) {
          errors.push(`Row ${rowNumber}: end time must be after start time`)
          return
        }

        const matchedHub = hubs.find(
          (hub) =>
            hub.name.toLowerCase() === hubLocation.toLowerCase() ||
            hub.address?.toLowerCase() === hubLocation.toLowerCase()
        )

        newShifts.push({
          id: `shift-${Date.now()}-${index}`,
          driverId: driver.id,
          shiftStart: toDateTimeLocalValue(startDate),
          shiftEnd: toDateTimeLocalValue(endDate),
          hubId: matchedHub?.id,
          hubLocation,
          createdAt: new Date().toISOString(),
        })
      })

      if (newShifts.length === 0) {
        toast.error(errors[0] || 'No valid shifts found in CSV')
        return
      }

      setShifts((current) => [...newShifts, ...current])

      if (errors.length > 0) {
        toast.warning(`Uploaded ${newShifts.length} shifts. ${errors.length} rows skipped.`)
      } else {
        toast.success(`Uploaded ${newShifts.length} driver shifts successfully`)
      }
    } catch {
      toast.error('Could not read CSV file')
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const getDriver = (driverId: string) => drivers.find((driver) => driver.id === driverId)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Driver Shifts</h1>
          <p className="text-muted-foreground">Create shifts and track driver attendance by day</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            type="month"
            value={reportMonth}
            onChange={(event) => setReportMonth(event.target.value || getMonthValue())}
            className="w-[155px]"
            aria-label="Report month"
          />
          <Button variant="outline" onClick={handleDownloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Template
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Bulk Upload
          </Button>
          <Button variant="outline" onClick={handleDownloadReport}>
            <Download className="mr-2 h-4 w-4" />
            Report
          </Button>
          <Button variant="outline" onClick={handleCreateDummyData}>
            <Database className="mr-2 h-4 w-4" />
            Dummy Data
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Create Shift
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shifts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Days</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAttendanceDays}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Drivers</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeDrivers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hubs</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hubs.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Shift Roster</CardTitle>
              <CardDescription>Click a driver name to view full attendance details</CardDescription>
            </div>
            <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:grid-cols-[220px_155px_180px_160px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search driver, ID, or hub..."
                  className="pl-9"
                />
              </div>
              <Input
                type="date"
                value={dayFilter}
                onChange={(event) => setDayFilter(event.target.value)}
                aria-label="Filter by day"
              />
              <Select value={hubFilter} onValueChange={setHubFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter hub" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Hubs</SelectItem>
                  {hubFilterOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={shiftFilter} onValueChange={setShiftFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shifts</SelectItem>
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="evening">Evening</SelectItem>
                  <SelectItem value="night">Night</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {(dayFilter || hubFilter !== 'all' || shiftFilter !== 'all') && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>Active filters:</span>
              {dayFilter && <Badge variant="outline">Day: {formatDateKey(dayFilter)}</Badge>}
              {hubFilter !== 'all' && (
                <Badge variant="outline">
                  Hub: {hubFilterOptions.find((option) => option.value === hubFilter)?.label || hubFilter}
                </Badge>
              )}
              {shiftFilter !== 'all' && <Badge variant="outline">Shift: {getShiftBucketLabel(shiftFilter)}</Badge>}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDayFilter('')
                  setHubFilter('all')
                  setShiftFilter('all')
                }}
              >
                Clear
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead>Driver ID</TableHead>
                  <TableHead>Shift Start</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Hub Location</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShifts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No driver shifts found. Create a shift to start attendance tracking.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredShifts.map((shift) => {
                    const driver = getDriver(shift.driverId)

                    return (
                      <TableRow key={shift.id}>
                        <TableCell>
                          <Button
                            variant="link"
                            className="h-auto p-0 font-medium"
                            onClick={() => driver && setSelectedDriver(driver)}
                            disabled={!driver}
                          >
                            {driver?.name || 'Unknown Driver'}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{driver?.driverId || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span>{formatDate(shift.shiftStart)}</span>
                            <span className="text-xs text-muted-foreground">{formatTime(shift.shiftStart)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span>{formatDate(shift.shiftEnd)}</span>
                            <span className="text-xs text-muted-foreground">{formatTime(shift.shiftEnd)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[280px]">
                          <div className="flex items-start gap-2">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="line-clamp-2">{shift.hubLocation}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10">
                            {getShiftHours(shift)} hrs
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(shift)}>
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
                                  <AlertDialogTitle>Delete shift?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will remove the shift and update attendance totals.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(shift.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (open) {
            setIsDialogOpen(true)
          } else {
            handleCloseDialog()
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingShift ? 'Edit Driver Shift' : 'Create Driver Shift'}</DialogTitle>
            <DialogDescription>
              Add driver name, driver ID, start/end time, and hub location.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <Field>
                <FieldLabel>Driver</FieldLabel>
                <Select
                  value={formData.driverId || undefined}
                  onValueChange={(value) => setFormData({ ...formData, driverId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name} ({driver.driverId || 'No ID'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>Shift Start Time</FieldLabel>
                  <Input
                    type="datetime-local"
                    value={formData.shiftStart}
                    onChange={(event) => setFormData({ ...formData, shiftStart: event.target.value })}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>End Time</FieldLabel>
                  <Input
                    type="datetime-local"
                    value={formData.shiftEnd}
                    onChange={(event) => setFormData({ ...formData, shiftEnd: event.target.value })}
                    required
                  />
                </Field>
              </FieldGroup>

              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>Hub</FieldLabel>
                  <Select
                    value={formData.hubId || CUSTOM_HUB_VALUE}
                    onValueChange={handleHubChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select hub" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CUSTOM_HUB_VALUE}>Custom location</SelectItem>
                      {hubs.map((hub) => (
                        <SelectItem key={hub.id} value={hub.id}>
                          {hub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Hub Location</FieldLabel>
                  <Input
                    value={formData.hubLocation}
                    onChange={(event) => setFormData({ ...formData, hubLocation: event.target.value })}
                    placeholder="Enter hub location"
                    required
                  />
                </Field>
              </FieldGroup>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit">{editingShift ? 'Update Shift' : 'Create Shift'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedDriver} onOpenChange={(open) => !open && setSelectedDriver(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <DialogTitle>{selectedDriver?.name || 'Driver'} Attendance</DialogTitle>
                <DialogDescription>
                  {selectedDriver?.driverId || 'N/A'} - total attendance {attendanceDays} day{attendanceDays === 1 ? '' : 's'}
                </DialogDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadDriverReport}>
                <Download className="mr-2 h-4 w-4" />
                Download Report
              </Button>
            </div>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{attendanceDays}</div>
                <p className="text-xs text-muted-foreground">unique days present</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{selectedDriverShifts.length}</div>
                <p className="text-xs text-muted-foreground">shift entries</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Default Hub</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="truncate text-sm font-medium">
                  {hubs.find((hub) => hub.id === selectedDriver?.hubId)?.name || 'Not assigned'}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="max-h-[420px] overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Arrived</TableHead>
                  <TableHead>Left</TableHead>
                  <TableHead>Hub Location</TableHead>
                  <TableHead>Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedDriverShifts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No attendance found for this driver.
                    </TableCell>
                  </TableRow>
                ) : (
                  selectedDriverShifts.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell>{formatDate(shift.shiftStart)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {formatTime(shift.shiftStart)}
                        </div>
                      </TableCell>
                      <TableCell>{formatTime(shift.shiftEnd)}</TableCell>
                      <TableCell className="max-w-[320px]">
                        <span className="line-clamp-2">{shift.hubLocation}</span>
                      </TableCell>
                      <TableCell>{getShiftHours(shift)} hrs</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
