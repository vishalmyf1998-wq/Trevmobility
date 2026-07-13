'use client'

import { Building2, Check, ChevronDown, MapPinned } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAdmin } from '@/lib/admin-context'
import { CITY_SCOPE_CONFIG } from '@/lib/city-scope'
import { cn } from '@/lib/utils'

export function CitySelector() {
  const { selectedCity, setSelectedCity, dispatchCenters } = useAdmin()

  // Find currently selected dispatch center label
  const selectedDc = dispatchCenters.find(dc => dc.id === selectedCity)
  const selectedLabel = selectedCity === 'all' 
    ? 'All Cities' 
    : (selectedDc ? selectedDc.name : ((CITY_SCOPE_CONFIG as any)[selectedCity]?.label || selectedCity))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-10 gap-2 rounded-xl border-white/80 bg-white/80 px-3 shadow-sm backdrop-blur-xl hover:bg-white"
          aria-label={`Dispatch Center: ${selectedLabel}`}
        >
          <MapPinned className="h-4 w-4 text-indigo-600" />
          <span className="hidden text-xs font-medium text-slate-500 sm:inline">
            Dispatch Center
          </span>
          <span className="text-sm font-bold text-slate-900">{selectedLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Operations Dispatch Center
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* All option */}
        <DropdownMenuItem
          onSelect={() => setSelectedCity('all')}
          className="gap-3 py-2.5"
        >
          <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600')}>
            <Building2 className="h-4 w-4" />
          </span>
          <span className="flex-1 font-medium">All Dispatch Centers</span>
          {selectedCity === 'all' && <Check className="h-4 w-4 text-indigo-600" />}
        </DropdownMenuItem>

        {/* Dynamic options */}
        {dispatchCenters.filter(dc => dc.id !== 'other').map((dc) => (
          <DropdownMenuItem
            key={dc.id}
            onSelect={() => setSelectedCity(dc.id)}
            className="gap-3 py-2.5"
          >
            <span
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-lg',
                dc.id === 'ncr' && 'bg-emerald-50 text-emerald-600',
                dc.id === 'jpr' && 'bg-violet-50 text-violet-600',
                dc.id !== 'ncr' && dc.id !== 'jpr' && 'bg-blue-50 text-blue-600',
              )}
            >
              <MapPinned className="h-4 w-4" />
            </span>
            <span className="flex-1 font-medium">{dc.name}</span>
            {selectedCity === dc.id && <Check className="h-4 w-4 text-indigo-600" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

