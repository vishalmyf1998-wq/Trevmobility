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
import { CITY_SCOPE_CONFIG, CITY_SCOPES } from '@/lib/city-scope'
import { cn } from '@/lib/utils'

export function CitySelector() {
  const { selectedCity, setSelectedCity } = useAdmin()
  const selected = CITY_SCOPE_CONFIG[selectedCity]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-10 gap-2 rounded-xl border-white/80 bg-white/80 px-3 shadow-sm backdrop-blur-xl hover:bg-white"
          aria-label={`Fleet city: ${selected.label}`}
        >
          <MapPinned className="h-4 w-4 text-indigo-600" />
          <span className="hidden text-xs font-medium text-slate-500 sm:inline">
            Fleet
          </span>
          <span className="text-sm font-bold text-slate-900">{selected.label}</span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Operations city
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {CITY_SCOPES.map((scope) => {
          const config = CITY_SCOPE_CONFIG[scope]
          return (
            <DropdownMenuItem
              key={scope}
              onSelect={() => setSelectedCity(scope)}
              className="gap-3 py-2.5"
            >
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-lg',
                  scope === 'all' && 'bg-indigo-50 text-indigo-600',
                  scope === 'ncr' && 'bg-emerald-50 text-emerald-600',
                  scope === 'jpr' && 'bg-violet-50 text-violet-600',
                )}
              >
                {scope === 'all' ? (
                  <Building2 className="h-4 w-4" />
                ) : (
                  <MapPinned className="h-4 w-4" />
                )}
              </span>
              <span className="flex-1 font-medium">{config.label}</span>
              {selectedCity === scope && <Check className="h-4 w-4 text-indigo-600" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
