import React from 'react';
import { Download, Search, Zap, RefreshCw, Leaf } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface DashboardHeaderProps {
  isSimulating: boolean;
  setIsSimulating: (val: boolean) => void;
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
  };
}

export function DashboardHeader({
  isSimulating,
  setIsSimulating,
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
  counts
}: DashboardHeaderProps) {
  return (
    <>
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
           <div>
               <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Active Rides Dashboard</h1>
               <div className="flex items-center gap-2 mt-1">
                   <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><Leaf className="w-3 h-3 mr-1" /> 1,240 kg CO2 Saved Today</Badge>
                   <span className="text-xs text-slate-500 font-medium">100% Electric Fleet</span>
               </div>
           </div>
           <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
               <div className="relative w-full md:w-64">
                   <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                   <Input 
                       placeholder="Search Booking ID, Customer..." 
                       className="pl-9 h-9 bg-white border-slate-200 shadow-sm rounded-xl text-sm"
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                   />
               </div>
               <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                   <Input
                       type="date"
                       value={dateFrom}
                       onChange={(e) => setDateFrom(e.target.value)}
                       className="h-9 bg-white border-slate-200 shadow-sm rounded-xl text-xs"
                       aria-label="Filter rides from date"
                   />
                   <Input
                       type="date"
                       value={dateTo}
                       onChange={(e) => setDateTo(e.target.value)}
                       className="h-9 bg-white border-slate-200 shadow-sm rounded-xl text-xs"
                       aria-label="Filter rides to date"
                   />
               </div>
               <div className="flex gap-2 w-full md:w-auto">
                   <Button variant={isSimulating ? 'default' : 'outline'} size="sm" className={`flex-1 md:flex-none h-9 px-4 rounded-xl shadow-sm ${isSimulating ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600' : 'bg-white hover:bg-slate-100'}`} onClick={() => setIsSimulating(!isSimulating)}>
                       <Zap className={`h-4 w-4 mr-2 ${isSimulating ? 'text-yellow-300 fill-yellow-300' : 'text-blue-500'}`} /> {isSimulating ? 'Simulating...' : 'Simulate GPS'}
                   </Button>
                   <Button variant="outline" size="sm" className="flex-1 md:flex-none bg-white h-9 px-4 rounded-xl shadow-sm hover:bg-slate-100" onClick={handleRefresh}>
                       <RefreshCw className={`h-4 w-4 mr-2 text-slate-600 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh Data
                   </Button>
                   <Button variant="outline" size="sm" className="flex-1 md:flex-none bg-white h-9 px-4 rounded-xl shadow-sm hover:bg-slate-100" onClick={onExport} disabled={resultCount === 0}>
                       <Download className="h-4 w-4 mr-2 text-slate-600" /> Export
                   </Button>
               </div>
           </div>
       </div>

       <Card className="rounded-2xl shadow-sm border-slate-200/60 bg-white mb-4">
           <CardContent className="p-3">
               <div className="flex flex-wrap items-center gap-2">
                   <Button size="sm" variant={statusFilter === 'all' ? 'default' : 'ghost'} onClick={() => setStatusFilter('all')} className={`text-xs h-8 rounded-lg ${statusFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'}`}>All Active</Button>
                   {counts.delayed > 0 && <Button size="sm" variant={statusFilter === 'delayed' ? 'default' : 'ghost'} onClick={() => setStatusFilter('delayed')} className={`text-xs h-8 rounded-lg ${statusFilter === 'delayed' ? 'bg-amber-500 text-white' : 'text-amber-600 hover:bg-amber-50'}`}>Delayed <Badge variant="secondary" className="ml-2 bg-white/20">{counts.delayed}</Badge></Button>}
                   <Button size="sm" variant={statusFilter === 'unassigned' ? 'default' : 'ghost'} onClick={() => setStatusFilter('unassigned')} className={`text-xs h-8 rounded-lg ${statusFilter === 'unassigned' ? 'bg-orange-500 text-white' : 'text-orange-600 hover:bg-orange-50'}`}>Unassigned <Badge variant="secondary" className="ml-2 bg-white/20">{counts.unassigned}</Badge></Button>
                   <Button size="sm" variant={statusFilter === 'dispatched' ? 'secondary' : 'ghost'} onClick={() => setStatusFilter('dispatched')} className="text-xs h-8 rounded-lg">Dispatched <Badge variant="secondary" className="ml-2">{counts.dispatched}</Badge></Button>
                   <Button size="sm" variant={statusFilter === 'arrived' ? 'secondary' : 'ghost'} onClick={() => setStatusFilter('arrived')} className="text-xs h-8 rounded-lg">Arrived <Badge variant="secondary" className="ml-2">{counts.arrived}</Badge></Button>
                   <Button size="sm" variant={statusFilter === 'pickup' ? 'secondary' : 'ghost'} onClick={() => setStatusFilter('pickup')} className={`text-xs h-8 rounded-lg ${statusFilter === 'pickup' ? 'bg-green-600 text-white hover:bg-green-700' : 'text-green-700 hover:bg-green-50'}`}>Ongoing <Badge variant="secondary" className="ml-2 bg-white/20">{counts.ongoing}</Badge></Button>
                   <Button size="sm" variant={statusFilter === 'dropped' ? 'secondary' : 'ghost'} onClick={() => setStatusFilter('dropped')} className="text-xs h-8 rounded-lg">Dropped <Badge variant="secondary" className="ml-2">{counts.dropped}</Badge></Button>
                   <Button size="sm" variant={statusFilter === 'closed' ? 'secondary' : 'ghost'} onClick={() => setStatusFilter('closed')} className="text-xs h-8 rounded-lg">Closed <Badge variant="secondary" className="ml-2">{counts.closed}</Badge></Button>
               </div>
           </CardContent>
       </Card>
    </>
  );
}
