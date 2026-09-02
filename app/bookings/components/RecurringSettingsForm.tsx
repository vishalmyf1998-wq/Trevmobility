'use client'

import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

type RecurringSettings = {
  frequency: 'daily' | 'weekly' | 'custom'
  selectedDays: string[]
  startDate: Date
  endDate: Date
}

export default function RecurringSettingsForm({ onSettingsChange }: { onSettingsChange: (settings: RecurringSettings) => void }) {
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'custom'>('weekly')
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  const allDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const handleDayClick = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  const handleSettingsUpdate = () => {
    if (startDate && endDate) {
      onSettingsChange({
        frequency,
        selectedDays,
        startDate,
        endDate,
      })
    }
  }

  return (
    <div className="space-y-6 p-4 border rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label>Frequency</Label>
          <Select value={frequency} onValueChange={(value: 'daily' | 'weekly' | 'custom') => setFrequency(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {frequency === 'weekly' && (
          <div>
            <Label>On these days</Label>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" onClick={() => setSelectedDays(weekdays)}>Weekdays</Button>
              <Button variant="outline" onClick={() => setSelectedDays(allDays)}>All Week</Button>
            </div>
          </div>
        )}
      </div>

      {frequency !== 'daily' && (
        <div>
          <Label>Select Days</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {allDays.map(day => (
              <Button
                key={day}
                variant={selectedDays.includes(day) ? 'default' : 'outline'}
                onClick={() => handleDayClick(day)}
              >
                {day}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label>Start Date</Label>
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
                {startDate ? format(startDate, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <Label>End Date</Label>
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
                {endDate ? format(endDate, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <Button onClick={handleSettingsUpdate} className="w-full">
        Apply Recurring Settings
      </Button>
    </div>
  )
}
