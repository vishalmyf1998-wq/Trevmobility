import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Leaf, AlertCircle, BatteryCharging, Clock, MapPin, Car, Zap, Search } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export function FreeDriversList({ freeDrivers, setHoveredDriverId }: { freeDrivers: any[], setHoveredDriverId?: (id: string | null) => void }) {
    const [searchQuery, setSearchQuery] = useState("");
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            searchInputRef.current?.focus();
        }, 150); // slight delay to allow sheet animation to finish
        return () => clearTimeout(timer);
    }, []);

    const filteredDrivers = useMemo(() => {
        if (!searchQuery.trim()) return freeDrivers;
        const lowerQuery = searchQuery.toLowerCase();
        return freeDrivers.filter((d: any) => 
            d.name?.toLowerCase().includes(lowerQuery) || 
            d.car?.registrationNumber?.toLowerCase().includes(lowerQuery) ||
            d.id?.toLowerCase().includes(lowerQuery)
        );
    }, [freeDrivers, searchQuery]);

    return (
        <>
            <div className="relative mb-2 shrink-0">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
                <Input 
                    ref={searchInputRef}
                    placeholder="Search name or vehicle no..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs bg-white border-slate-200 rounded-lg shadow-sm focus-visible:ring-blue-500"
                />
            </div>
        <ScrollArea className="flex-1 pr-3 -mr-3">
            <div className="space-y-3 pb-6">
                {filteredDrivers.map((d: any) => (
                    <div 
                        key={d.id} 
                        className="p-3.5 border border-slate-100 rounded-xl bg-slate-50/80 hover:bg-blue-50 hover:border-blue-100 transition-all duration-200 cursor-pointer group shadow-sm hover:shadow-md relative overflow-hidden"
                        onMouseEnter={() => setHoveredDriverId && setHoveredDriverId(d.id)}
                        onMouseLeave={() => setHoveredDriverId && setHoveredDriverId(null)}
                    >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 rounded-l-xl"></div>
                        <div className="flex justify-between items-start mb-2 pl-2">
                            <div>
                                <p className="font-bold text-slate-800 text-[13px]">{d.name}</p>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-0.5">ID: {d.id.split('-')[0]} • ⭐ {d.rating || '4.8'}</p>
                            </div>
                            <Badge variant="outline" className="bg-white text-slate-600 border-slate-200 text-[9px] h-5 py-0 shadow-sm flex gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div> Online</Badge>
                        </div>
                        <div className="pl-2 space-y-2.5 mt-3">
                            {d.car ? (
                                <div className="flex items-center gap-2">
                                    <div className="bg-white p-1 rounded-md border border-slate-100 shadow-sm"><Car className="w-3.5 h-3.5 text-slate-500" /></div>
                                    <span className="text-[11px] font-bold text-slate-700">{d.car.registrationNumber} • {`${d.car.category || ''} ${d.car.make || ''} ${d.car.model || ''}`.trim() || 'No Type'}</span>
                                    <Badge variant="outline" className="text-[9px] bg-green-50 text-green-700 border-green-200 h-4 py-0 ml-auto shrink-0"><Leaf className="h-2 w-2 mr-0.5" /> EV</Badge>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 text-[11px] text-orange-600 font-medium bg-orange-50 p-1.5 rounded-lg border border-orange-100">
                                    <AlertCircle className="w-3.5 h-3.5" /> No Vehicle Assigned
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                                    <BatteryCharging className={`w-4 h-4 ${d.soc > 20 ? 'text-green-500' : 'text-red-500'}`} /> {d.soc}% SOC
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                                    <Clock className="w-4 h-4 text-blue-500" /> 08:00 - 18:00
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 bg-white p-2 rounded-lg border border-slate-100 shadow-sm col-span-2">
                                    <span className="w-4 h-4 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full font-bold">{d.shiftRides || 0}</span> Rides in Shift
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-600 font-medium bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                                <span className="truncate">Zone 3 Hub, Near Airport</span>
                            </div>
                        </div>
                    </div>
                ))}

                {/* State when search returns no result */}
                {filteredDrivers.length === 0 && freeDrivers.length > 0 && (
                    <div className="text-center p-8 bg-slate-50 rounded-xl border border-slate-100 mt-4">
                        <Search className="w-6 h-6 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm font-bold text-slate-600">No matches found</p>
                        <p className="text-[11px] text-slate-400 font-medium mt-1">Try a different name or number.</p>
                    </div>
                )}

                {freeDrivers.length === 0 && (
                    <div className="text-center p-8 bg-slate-50 rounded-xl border border-slate-100 mt-4">
                        <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <User className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="text-sm font-bold text-slate-600">No Free Drivers</p>
                        <p className="text-[11px] text-slate-400 font-medium mt-1">All fleet units are currently dispatched or offline.</p>
                    </div>
                )}
            </div>
        </ScrollArea>
        </>
    );
}

export function FreeDriversSidebar({ freeDrivers, isAutoAllocateOn, setIsAutoAllocateOn, autoAllocationRadius, setAutoAllocationRadius, autoAllocationDelay, setAutoAllocationDelay, minSocThreshold, setMinSocThreshold, setHoveredDriverId }: any) {
    return (
        <div className="fixed bottom-6 right-6 z-50">
            <Sheet>
                <SheetTrigger asChild>
                    <Button className="h-12 rounded-full bg-blue-600 px-4 text-white shadow-2xl hover:bg-blue-700">
                        <User className="mr-2 h-5 w-5" />
                        Fleet
                        <Badge className="ml-2 bg-green-500 px-1.5 py-0 text-[10px] text-white hover:bg-green-600">{freeDrivers.length}</Badge>
                    </Button>
                </SheetTrigger>
                <SheetContent side="right" className="flex w-[300px] flex-col gap-4 p-5 sm:w-[360px] sm:max-w-md">
                    <SheetHeader className="border-b border-slate-100 pb-3 text-left">
                        <div className="flex items-center justify-between">
                            <SheetTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
                                <User className="h-5 w-5 text-blue-500" /> Fleet Availability
                            </SheetTitle>
                            <Badge className="border-none bg-green-100 font-bold text-green-700 shadow-sm hover:bg-green-200">{freeDrivers.length} Free</Badge>
                        </div>
                    </SheetHeader>
                    {/* Auto Allocation Controls */}
                    <div className="border-b border-slate-100 pb-4">
                        <div className="flex items-center justify-between mb-3">
                            <Label className="text-sm font-bold text-slate-700">Auto-Allocation</Label>
                            <Button
                                variant={isAutoAllocateOn ? "default" : "outline"}
                                size="sm"
                                className={`rounded-xl shadow-sm transition-all duration-300 h-8 ${isAutoAllocateOn ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-white text-slate-700 border-slate-200'}`}
                                onClick={() => setIsAutoAllocateOn(!isAutoAllocateOn)}
                            >
                                <Zap className={`h-4 w-4 mr-2 ${isAutoAllocateOn ? 'text-yellow-300 animate-pulse' : 'text-slate-400'}`} />
                                {isAutoAllocateOn ? 'Active' : 'Enable'}
                            </Button>
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="alloc-radius-sidebar" className="text-xs font-medium text-slate-600">Search Radius (km)</Label>
                            <Input
                                id="alloc-radius-sidebar"
                                type="number"
                                value={autoAllocationRadius}
                                onChange={(e) => setAutoAllocationRadius(Number(e.target.value))}
                                className="h-8 w-20 text-sm font-bold rounded-lg border-slate-200 bg-white shadow-sm text-center"
                            />
                        </div>
                        <div className="flex items-center justify-between mt-3">
                            <Label htmlFor="alloc-delay-sidebar" className="text-xs font-medium text-slate-600">Hold Delay (sec)</Label>
                            <Input
                                id="alloc-delay-sidebar"
                                type="number"
                                value={autoAllocationDelay}
                                onChange={(e) => setAutoAllocationDelay(Number(e.target.value))}
                                className="h-8 w-20 text-sm font-bold rounded-lg border-slate-200 bg-white shadow-sm text-center"
                            />
                        </div>
                        <div className="flex items-center justify-between mt-3">
                            <Label htmlFor="alloc-soc-sidebar" className="text-xs font-medium text-slate-600">Min. SOC (%)</Label>
                            <Input
                                id="alloc-soc-sidebar"
                                type="number"
                                value={minSocThreshold}
                                onChange={(e) => setMinSocThreshold(Number(e.target.value))}
                                className="h-8 w-20 text-sm font-bold rounded-lg border-slate-200 bg-white shadow-sm text-center"
                            />
                        </div>
                    </div>

                    <FreeDriversList freeDrivers={freeDrivers} setHoveredDriverId={setHoveredDriverId} />
                </SheetContent>
            </Sheet>
        </div>
    );
}
