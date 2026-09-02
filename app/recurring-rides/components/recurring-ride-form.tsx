'use client'

import { useState } from 'react'
import { useAdmin } from '@/lib/admin-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Field, FieldLabel } from '@/components/ui/field'
import { toast } from 'sonner'
import { Calendar as CalendarIcon, User, Star, Repeat, Calendar, ChevronsRight } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { Calendar as DatePickerCalendar } from '@/components/ui/calendar'

const daysOfWeek = [
  { id: 'sunday', label: 'Sun' },
  { id: 'monday', label: 'Mon' },
  { id: 'tuesday', label: 'Tue' },
  { id: 'wednesday', label: 'Wed' },
  { id: 'thursday', label: 'Thu' },
  { id: 'friday', label: 'Fri' },
  { id: 'saturday', label: 'Sat' },
]

export default function RecurringRideForm() {
  const { b2cCustomers, fareGroups } = useAdmin()
  const recurringFareGroups = fareGroups.filter(fg => fg.type === 'Recurring')

  const [customerId, setCustomerId] = useState('')
  const [fareGroupId, setFareGroupId] = useState('')
  const [recurrenceType, setRecurrenceType] = useState('daily')
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()

  const handleDaySelect = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!customerId || !fareGroupId || !startDate || !endDate) {
      toast.error('Please fill all required fields.')
      return
    }

    if (recurrenceType === 'weekly' && selectedDays.length === 0) {
      toast.error('Please select at least one day for weekly recurrence.')
      return
    }

    const formData = {
      customerId,
      fareGroupId,
      recurrence: {
        type: recurrenceType,
        days: selectedDays,
        startDate: startDate ? format(startDate, 'yyyy-MM-dd') : null,
        endDate: endDate ? format(endDate, 'yyyy-MM-dd') : null,
      },
    }
    console.log('Recurring Ride Data:', formData)
    toast.success('Recurring ride created successfully (check console for data).')
    // Here you would typically call a function to save the data
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Column 1 */}
            <div className="flex flex-col gap-4">
              <Field>
                <FieldLabel>Customer</FieldLabel>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {b2cCustomers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{customer.name} ({customer.phone})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Fare Group</FieldLabel>
                <Select value={fareGroupId} onValueChange={setFareGroupId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a recurring fare group" />
                  </SelectTrigger>
                  <SelectContent>
                    {recurringFareGroups.map(group => (
                      <SelectItem key={group.id} value={group.id}>
                         <div className="flex items-center gap-2">
                          <Star className="h-4 w-4" />
                          <span>{group.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Recurrence Period</FieldLabel>
                <div className="flex items-center gap-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !startDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'PPP') : <span>Pick a start date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <DatePickerCalendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <ChevronsRight className="h-4 w-4 text-muted-foreground" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !endDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'PPP') : <span>Pick an end date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <DatePickerCalendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </Field>
            </div>

            {/* Column 2 */}
            <div className="flex flex-col gap-4">
              <Field>
                <FieldLabel>Recurrence Type</FieldLabel>
                <Select value={recurrenceType} onValueChange={setRecurrenceType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekdays">Weekdays (Mon-Fri)</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="custom">Custom Days</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              {(recurrenceType === 'weekly' || recurrenceType === 'custom') && (
                <Field>
                  <FieldLabel>Select Days</FieldLabel>
                  <div className="flex items-center gap-4 pt-2">
                    {daysOfWeek.map(day => (
                      <div key={day.id} className="flex items-center gap-2">
                        <Checkbox
                          id={day.id}
                          checked={selectedDays.includes(day.id)}
                          onCheckedChange={() => handleDaySelect(day.id)}
                        />
                        <Label htmlFor={day.id}>{day.label}</Label>
                      </div>
                    ))}
                  </div>
                </Field>
              )}
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button type="submit">Create Recurring Ride</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
