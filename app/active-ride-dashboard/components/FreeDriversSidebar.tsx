import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Car, Clock, Filter, LogIn, LogOut, MapPin, Phone, Search, User, Zap } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type AvailabilityFilter = 'all' | '2h' | '4h';

function getRideTime(ride: any) {
  if (!ride?.pickupDate && !ride?.dropDate) return null;
  const date = ride.pickupDate || ride.dropDate;
  const time = ride.pickupTime || ride.dropTime || '00:00';
  const value = new Date(`${date}T${time}`).getTime();
  return Number.isNaN(value) ? null : value;
}

function formatRideTime(ride: any) {
  const rideTime = getRideTime(ride);
  if (!ride || !rideTime) return 'N/A';

  return new Date(rideTime).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function FreeDriversSidebar({
  freeDrivers,
  isAutoAllocateOn,
  setIsAutoAllocateOn,
  setHoveredDriverId,
}: any) {
  const [searchQuery, setSearchQuery] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => searchInputRef.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, []);

  const filteredDrivers = useMemo(() => {
    const now = Date.now();
    const windowHours = availabilityFilter === '2h' ? 2 : availabilityFilter === '4h' ? 4 : null;
    const lowerQuery = searchQuery.trim().toLowerCase();

    return freeDrivers.filter((driver: any) => {
      if (lowerQuery) {
        const matchesSearch =
          driver.name?.toLowerCase().includes(lowerQuery) ||
          driver.phone?.toLowerCase().includes(lowerQuery) ||
          driver.car?.registrationNumber?.toLowerCase().includes(lowerQuery) ||
          driver.driverId?.toLowerCase().includes(lowerQuery);

        if (!matchesSearch) return false;
      }

      if (!windowHours) return true;

      const nextRideTime = getRideTime(driver.nextRide);
      return !nextRideTime || nextRideTime - now >= windowHours * 60 * 60 * 1000;
    });
  }, [availabilityFilter, freeDrivers, searchQuery]);

  const filterOptions: { value: AvailabilityFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: '2h', label: 'Free 2h' },
    { value: '4h', label: 'Free 4h' },
  ];

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <Sheet>
        <SheetTrigger asChild>
          <Button className="h-11 rounded-full bg-blue-600 px-3.5 text-white shadow-xl hover:bg-blue-700">
            <User className="mr-2 h-4 w-4" />
            Fleet
            <Badge className="ml-2 border-none bg-green-500 px-1.5 py-0 text-[10px] text-white hover:bg-green-600">
              {freeDrivers.length} Free
            </Badge>
          </Button>
        </SheetTrigger>

        <SheetContent side="right" className="flex w-[320px] flex-col gap-3 p-4 sm:w-[380px] sm:max-w-md">
          <SheetHeader className="border-b border-slate-100 pb-3 text-left">
            <div className="flex items-center justify-between gap-3">
              <SheetTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
                <User className="h-4 w-4 text-blue-500" />
                Free Drivers
              </SheetTitle>
              <Badge className="border-none bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700 hover:bg-green-100">
                {filteredDrivers.length}/{freeDrivers.length}
              </Badge>
            </div>
          </SheetHeader>

          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <Input
              ref={searchInputRef}
              placeholder="Search by name, phone, vehicle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 rounded-lg border-slate-200 bg-white pl-8 text-xs shadow-sm focus-visible:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
              <span className="text-xs font-bold text-slate-700">Auto-allocation</span>
              <Button
                variant={isAutoAllocateOn ? "default" : "outline"}
                size="sm"
                className={`h-7 rounded-lg px-2 text-[11px] font-bold ${isAutoAllocateOn ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'border-slate-200 bg-white text-slate-600'}`}
                onClick={() => setIsAutoAllocateOn(!isAutoAllocateOn)}
              >
                <Zap className={`mr-1.5 h-3.5 w-3.5 ${isAutoAllocateOn ? 'text-yellow-300' : 'text-slate-400'}`} />
                {isAutoAllocateOn ? 'On' : 'Off'}
              </Button>
            </div>

            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              {filterOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={availabilityFilter === option.value ? "default" : "outline"}
                  size="sm"
                  className={`h-7 rounded-lg px-2.5 text-[11px] font-bold ${availabilityFilter === option.value ? 'bg-slate-900 text-white hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                  onClick={() => setAvailabilityFilter(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1 pr-2">
            <div className="space-y-2 pb-3">
              {filteredDrivers.map((driver: any) => (
                <div
                  key={driver.id}
                  className="rounded-lg border border-slate-100 bg-white p-2.5 shadow-sm transition-colors hover:border-blue-100 hover:bg-blue-50/50"
                  onMouseEnter={() => setHoveredDriverId?.(driver.id)}
                  onMouseLeave={() => setHoveredDriverId?.(null)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-bold text-slate-800">{driver.name}</span>
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      </div>
                      <div className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        DriverID: {driver.driverId || 'N/A'} · {driver.rating || '4.8'} rating
                      </div>
                    </div>
                    <Badge variant="outline" className="h-5 shrink-0 border-green-200 bg-green-50 px-1.5 py-0 text-[9px] font-bold text-green-700">
                      Online
                    </Badge>
                  </div>

                  <div className="mt-2 grid gap-1.5 text-[11px] font-medium text-slate-600">
                    {driver.car ? (
                      <div className="flex min-w-0 items-center gap-1.5">
                        <Car className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate font-bold text-slate-700">
                          {driver.car.registrationNumber} · {driver.car.model || driver.car.category || 'Vehicle'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-orange-600">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>No vehicle assigned</span>
                      </div>
                    )}

                    <div className="flex min-w-0 items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{driver.phone || 'N/A'}</span>
                    </div>

                    <div className="flex min-w-0 items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{driver.lastLocation || 'N/A'}</span>
                    </div>

                    <div className="flex min-w-0 flex-col gap-1 rounded-md bg-slate-50 px-2 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <LogOut className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                        <span className="truncate font-semibold text-slate-600">Last: {driver.lastRide?.bookingNumber || 'N/A'}</span>
                      </div>
                      {driver.lastRide && (
                        <p className="mt-0.5 truncate pl-[22px] text-[10px] font-medium text-slate-500">
                          {driver.lastRide.dropLocation} at {formatRideTime(driver.lastRide)}
                        </p>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-col gap-1 rounded-md bg-slate-50 px-2 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <LogIn className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        <span className="truncate font-semibold text-slate-600">Next: {driver.nextRide?.bookingNumber || 'No upcoming'}</span>
                      </div>
                      {driver.nextRide && (
                        <p className="mt-0.5 truncate pl-[22px] text-[10px] font-medium text-slate-500">
                          {driver.nextRide.pickupLocation} at {formatRideTime(driver.nextRide)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {filteredDrivers.length === 0 && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-6 text-center">
                  <User className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                  <p className="text-sm font-bold text-slate-600">No drivers found</p>
                  <p className="mt-1 text-[11px] font-medium text-slate-400">Try another search or availability filter.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
