import React from 'react';
import { Download, Search, Zap, RefreshCw, Leaf, Clock, History } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DashboardHeaderProps {
  isRefreshing: boolean;
  handleRefresh: () => void;
  statusFilter: string;
  setStatusFilter: (val: any) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  dateFrom: string;
  setDateFrom: (val: string) => void;
  dateTo: string;
  setDateTo: (val: string) => void;
  onExport: () => void;
  resultCount: number;
  counts: {
    delayed: number;
    unassigned: number;
    dispatched: number;
    arrived: number;
    ongoing: number;
    dropped: number;
    closed: number;
    cancelled: number;
    gpsOff: number;
    priority: number;
    lowSoc: number;
  };
  lastAllocationTime: Date | null;
  nextAllocationTime: Date | null;
  isAutoAllocateOn: boolean;
  arrivalMetrics: { green: number; yellow: number; red: number; total: number };
}

export function DashboardHeader({
  isRefreshing,
  handleRefresh,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  onExport,
  resultCount,
  counts,
  lastAllocationTime,
  nextAllocationTime,
  isAutoAllocateOn,
  arrivalMetrics
}: DashboardHeaderProps) {
  return (
    <div className="relative z-50 mb-8 animate-in fade-in slide-in-from-top-4 duration-700 ease-out">
      {/* Dynamic Title Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 px-2">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 drop-shadow-sm mix-blend-multiply">
            Control Center
                      </h1>
          <p className="text-sm font-semibold text-slate-500/80 mt-1 flex items-center gap-2 tracking-wide uppercase">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Live Fleet Monitoring
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 mt-4 sm:mt-0">
          <div className="flex gap-2">
            <div className="bg-white/40 backdrop-blur-xl border border-white/60 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.1)] rounded-xl px-3 py-1.5 flex items-center gap-2">
               <History className="w-3.5 h-3.5 text-slate-500" />
               <span className="text-xs font-bold text-slate-700">Last Run: {lastAllocationTime ? lastAllocationTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) : 'N/A'}</span>
            </div>
            <div className="bg-white/40 backdrop-blur-xl border border-white/60 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.1)] rounded-xl px-3 py-1.5 flex items-center gap-2">
               <Clock className={`w-3.5 h-3.5 ${isAutoAllocateOn ? 'text-blue-500 animate-pulse' : 'text-slate-500'}`} />
               <span className="text-xs font-bold text-slate-700">Next Tick: {isAutoAllocateOn && nextAllocationTime ? nextAllocationTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) : 'Paused'}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="bg-emerald-50/80 backdrop-blur-xl border border-emerald-100 shadow-sm rounded-xl px-3 py-1 flex items-center gap-1.5">
               <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm border border-emerald-600"></div>
               <span className="text-[11px] font-bold text-emerald-800">&gt; Green Ride: {arrivalMetrics?.green || 0}%</span>
            </div>
            <div className="bg-yellow-50/80 backdrop-blur-xl border border-yellow-100 shadow-sm rounded-xl px-3 py-1 flex items-center gap-1.5">
               <div className="h-2.5 w-2.5 rounded-full bg-yellow-400 shadow-sm border border-yellow-500"></div>
               <span className="text-[11px] font-bold text-yellow-800">Yellow Ride: {arrivalMetrics?.yellow || 0}%</span>
            </div>
            <div className="bg-red-50/80 backdrop-blur-xl border border-red-100 shadow-sm rounded-xl px-3 py-1 flex items-center gap-1.5">
               <div className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-sm border border-red-600"></div>
               <span className="text-[11px] font-bold text-red-800">Red Ride: {arrivalMetrics?.red || 0}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Glass Dock */}
      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.15)] rounded-[2rem] p-3 flex flex-col xl:flex-row gap-3">
        
        {/* Search & Alerts */}
        <div className="flex-1 flex flex-col gap-3 w-full">
          {/* Search Inputs */}
          <div className="flex flex-col md:flex-row gap-3 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search ID, Customer, Location..." 
                className="w-full pl-11 h-11 bg-white/50 hover:bg-white/80 focus:bg-white border-white/60 shadow-inner rounded-[1.5rem] text-[13px] font-medium transition-all duration-300 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-indigo-500/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-36">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full h-11 bg-white/50 hover:bg-white/80 focus:bg-white border-white/60 shadow-inner rounded-[1.5rem] text-[12px] font-medium transition-all duration-300 focus-visible:ring-2 focus-visible:ring-indigo-500/20"
                />
              </div>
              <div className="relative flex-1 md:w-36">
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full h-11 bg-white/50 hover:bg-white/80 focus:bg-white border-white/60 shadow-inner rounded-[1.5rem] text-[12px] font-medium transition-all duration-300 focus-visible:ring-2 focus-visible:ring-indigo-500/20"
                />
              </div>
            </div>
          </div>
          
          {/* Alert Filters (Below Search Bar) */}
          <div className="flex flex-wrap items-center gap-2 pl-1">
            <Button size="sm" variant="ghost" onClick={() => setStatusFilter('delayed')} className={`h-8 px-4 rounded-full text-[12px] font-bold transition-all duration-300 ${statusFilter === 'delayed' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25' : 'bg-white/40 text-rose-700 hover:bg-white/80 border border-rose-200 backdrop-blur-md shadow-sm'}`}>
              Delayed <Badge variant="secondary" className={`ml-1.5 border-none px-1.5 min-w-[20px] rounded-full ${statusFilter === 'delayed' ? 'bg-white/30 text-white' : 'bg-rose-100 text-rose-800'}`}>{counts.delayed}</Badge>
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setStatusFilter('unassigned')} className={`h-8 px-4 rounded-full text-[12px] font-bold transition-all duration-300 ${statusFilter === 'unassigned' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25' : 'bg-white/40 text-amber-700 hover:bg-white/80 border border-amber-200 backdrop-blur-md shadow-sm'}`}>
              Unassigned <Badge variant="secondary" className={`ml-1.5 px-1.5 min-w-[20px] rounded-full border-none ${statusFilter === 'unassigned' ? 'bg-white/30 text-white' : 'bg-amber-100 text-amber-800'}`}>{counts.unassigned}</Badge>
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setStatusFilter('gps_off')} className={`h-8 px-4 rounded-full text-[12px] font-bold transition-all duration-300 ${statusFilter === 'gps_off' ? 'bg-zinc-800 text-white shadow-md shadow-zinc-800/25' : 'bg-white/40 text-zinc-700 hover:bg-white/80 border border-zinc-200 backdrop-blur-md shadow-sm'}`}>
              No GPS <Badge variant="secondary" className={`ml-1.5 px-1.5 min-w-[20px] rounded-full border-none ${statusFilter === 'gps_off' ? 'bg-white/30 text-white' : 'bg-zinc-200 text-zinc-800'}`}>{counts.gpsOff}</Badge>
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setStatusFilter('low_soc')} className={`h-8 px-4 rounded-full text-[12px] font-bold transition-all duration-300 ${statusFilter === 'low_soc' ? 'bg-red-600 text-white shadow-md shadow-red-600/25' : 'bg-white/40 text-red-700 hover:bg-white/80 border border-red-200 backdrop-blur-md shadow-sm'}`}>
              Low SOC &lt; 20% <Badge variant="secondary" className={`ml-1.5 px-1.5 min-w-[20px] rounded-full border-none ${statusFilter === 'low_soc' ? 'bg-white/30 text-white' : 'bg-red-100 text-red-800'}`}>{counts.lowSoc}</Badge>
            </Button>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex flex-col gap-2 w-full xl:w-auto shrink-0 justify-start pt-1 xl:pt-0">
          <div className="flex gap-2 w-full">
            <Button 
              variant="ghost" 
              className="flex-1 xl:w-auto h-11 px-5 rounded-[1.5rem] font-bold text-[13px] bg-white/60 hover:bg-white border border-white shadow-sm transition-all duration-300 text-slate-700" 
              onClick={handleRefresh}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin text-indigo-500' : 'text-slate-400'}`} /> Refresh
            </Button>
            <Button 
              variant="ghost" 
              className="flex-1 xl:w-auto h-11 px-5 rounded-[1.5rem] font-bold text-[13px] bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 shadow-lg shadow-slate-900/20 transition-all duration-300" 
              onClick={onExport} 
              disabled={resultCount === 0}
            >
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Chips - Glass Style */}
      <div className="mt-4 px-2 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => setStatusFilter('all')} className={`h-8 px-4 rounded-full text-[12px] font-bold transition-all duration-300 ${statusFilter === 'all' ? 'bg-slate-800 text-white shadow-md' : 'bg-white/40 text-slate-600 hover:bg-white/80 border border-white/60 backdrop-blur-md shadow-sm'}`}>All Rides</Button>
        <Button size="sm" variant="ghost" onClick={() => setStatusFilter('priority')} className={`h-8 px-4 rounded-full text-[12px] font-bold transition-all duration-300 ${statusFilter === 'priority' ? 'bg-pink-600 text-white shadow-md shadow-pink-600/25' : 'bg-white/40 text-pink-700 hover:bg-white/80 border border-white/60 backdrop-blur-md shadow-sm'}`}>
          Priority <Badge variant="secondary" className={`ml-1.5 px-1.5 min-w-[20px] rounded-full border-none ${statusFilter === 'priority' ? 'bg-white/30 text-white' : 'bg-pink-100 text-pink-800'}`}>{counts.priority}</Badge>
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setStatusFilter('dispatched')} className={`h-8 px-4 rounded-full text-[12px] font-bold transition-all duration-300 ${statusFilter === 'dispatched' ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/25' : 'bg-white/40 text-indigo-700 hover:bg-white/80 border border-white/60 backdrop-blur-md shadow-sm'}`}>
          Dispatched <Badge variant="secondary" className={`ml-1.5 px-1.5 min-w-[20px] rounded-full border-none ${statusFilter === 'dispatched' ? 'bg-white/30 text-white' : 'bg-indigo-100 text-indigo-800'}`}>{counts.dispatched}</Badge>
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setStatusFilter('arrived')} className={`h-8 px-4 rounded-full text-[12px] font-bold transition-all duration-300 ${statusFilter === 'arrived' ? 'bg-purple-500 text-white shadow-md shadow-purple-500/25' : 'bg-white/40 text-purple-700 hover:bg-white/80 border border-white/60 backdrop-blur-md shadow-sm'}`}>
          Arrived <Badge variant="secondary" className={`ml-1.5 px-1.5 min-w-[20px] rounded-full border-none ${statusFilter === 'arrived' ? 'bg-white/30 text-white' : 'bg-purple-100 text-purple-800'}`}>{counts.arrived}</Badge>
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setStatusFilter('pickup')} className={`h-8 px-4 rounded-full text-[12px] font-bold transition-all duration-300 ${statusFilter === 'pickup' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25' : 'bg-white/40 text-emerald-700 hover:bg-white/80 border border-white/60 backdrop-blur-md shadow-sm'}`}>
          Pickup (In-Trip) <Badge variant="secondary" className={`ml-1.5 px-1.5 min-w-[20px] rounded-full border-none ${statusFilter === 'pickup' ? 'bg-white/30 text-white' : 'bg-emerald-100 text-emerald-800'}`}>{counts.ongoing}</Badge>
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setStatusFilter('dropped')} className={`h-8 px-4 rounded-full text-[12px] font-bold transition-all duration-300 ${statusFilter === 'dropped' ? 'bg-teal-500 text-white shadow-md shadow-teal-500/25' : 'bg-white/40 text-teal-700 hover:bg-white/80 border border-white/60 backdrop-blur-md shadow-sm'}`}>
          Ended (Not Closed) <Badge variant="secondary" className={`ml-1.5 px-1.5 min-w-[20px] rounded-full border-none ${statusFilter === 'dropped' ? 'bg-white/30 text-white' : 'bg-teal-100 text-teal-800'}`}>{counts.dropped}</Badge>
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setStatusFilter('closed')} className={`h-8 px-4 rounded-full text-[12px] font-bold transition-all duration-300 ${statusFilter === 'closed' ? 'bg-slate-600 text-white shadow-md shadow-slate-500/25' : 'bg-white/40 text-slate-700 hover:bg-white/80 border border-white/60 backdrop-blur-md shadow-sm'}`}>
          Closed <Badge variant="secondary" className={`ml-1.5 px-1.5 min-w-[20px] rounded-full border-none ${statusFilter === 'closed' ? 'bg-white/30 text-white' : 'bg-slate-200 text-slate-800'}`}>{counts.closed}</Badge>
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setStatusFilter('cancelled')} className={`h-8 px-4 rounded-full text-[12px] font-bold transition-all duration-300 ${statusFilter === 'cancelled' ? 'bg-red-600 text-white shadow-md shadow-red-600/25' : 'bg-white/40 text-red-700 hover:bg-white/80 border border-white/60 backdrop-blur-md shadow-sm'}`}>
          Cancelled <Badge variant="secondary" className={`ml-1.5 px-1.5 min-w-[20px] rounded-full border-none ${statusFilter === 'cancelled' ? 'bg-white/30 text-white' : 'bg-red-100 text-red-800'}`}>{counts.cancelled}</Badge>
        </Button>
      </div>

    </div>
  );
}
