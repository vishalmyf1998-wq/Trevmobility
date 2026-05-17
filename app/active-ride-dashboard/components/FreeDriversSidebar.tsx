import React from 'react';
import { User, Leaf, AlertCircle, BatteryCharging, Clock, MapPin, Car } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export function FreeDriversList({ freeDrivers }: { freeDrivers: any[] }) {
    return (
        <ScrollArea className="flex-1 pr-3 -mr-3">
            <div className="space-y-3 pb-6">
                {freeDrivers.map((d: any) => (
                    <div key={d.id} className="p-3.5 border border-slate-100 rounded-xl bg-slate-50/80 hover:bg-blue-50 hover:border-blue-100 transition-all duration-200 cursor-pointer group shadow-sm hover:shadow-md relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 rounded-l-xl"></div>
                        <div className="flex justify-between items-start mb-2 pl-2">
                            <div>
                                <p className="font-bold text-slate-800 text-[13px]">{d.name}</p>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-0.5">ID: {d.id.split('-')[0]}</p>
                            </div>
                            <Badge variant="outline" className="bg-white text-slate-600 border-slate-200 text-[9px] h-5 py-0 shadow-sm flex gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div> Online</Badge>
                        </div>
                        <div className="pl-2 space-y-2.5 mt-3">
                            {d.car ? (
                                <div className="flex items-center gap-2">
                                    <div className="bg-white p-1 rounded-md border border-slate-100 shadow-sm"><Car className="w-3.5 h-3.5 text-slate-500" /></div>
                                    <span className="text-[11px] font-bold text-slate-700">{d.car.registrationNumber}</span>
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
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-600 font-medium bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                                <span className="truncate">Zone 3 Hub, Near Airport</span>
                            </div>
                        </div>
                    </div>
                ))}
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
    );
}

export function FreeDriversSidebar({ freeDrivers }: { freeDrivers: any[] }) {
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
                    <FreeDriversList freeDrivers={freeDrivers} />
                </SheetContent>
            </Sheet>
        </div>
    );
}
