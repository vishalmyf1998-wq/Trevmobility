import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, RefreshCw, Search, Settings } from "lucide-react";
import Link from "next/link";

export function DashboardHeader({
  isRefreshing,
  handleRefresh,
  statusFilter,
  setStatusFilter,
  cityFilter,
  setCityFilter,
  hubFilter,
  setHubFilter,
  cities,
  hubs,
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
  arrivalMetrics,
  delaySubFilter,
  setDelaySubFilter,
  ongoingSubFilter,
  setOngoingSubFilter,
  prioritySubFilter,
  setPrioritySubFilter,
  actions,
}: {
  isRefreshing: boolean;
  handleRefresh: () => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  cityFilter: string;
  setCityFilter: (city: string) => void;
  hubFilter: string;
  setHubFilter: (hub: string) => void;
  cities: any[];
  hubs: any[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  dateFrom: string;
  setDateFrom: (date: string) => void;
  dateTo: string;
  setDateTo: (date: string) => void;
  onExport: () => void;
  resultCount: number;
  counts: any;
  lastAllocationTime: Date | null;
  nextAllocationTime: Date | null;
  isAutoAllocateOn: boolean;
  arrivalMetrics: any;
  delaySubFilter: string;
  setDelaySubFilter: (filter: string) => void;
  ongoingSubFilter: string;
  setOngoingSubFilter: (filter: string) => void;
  prioritySubFilter: string;
  setPrioritySubFilter: (filter: string) => void;
  actions?: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Active Rides</h1>
          <p className="text-slate-500 text-sm">Real-time operational dashboard</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by ID, name, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 rounded-xl w-64 bg-white/60"
            />
          </div>

          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-[180px] h-10 rounded-xl bg-white/60">
              <SelectValue placeholder="Select City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city.id} value={city.id}>
                  {city.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={hubFilter} onValueChange={setHubFilter}>
            <SelectTrigger className="w-[180px] h-10 rounded-xl bg-white/60">
              <SelectValue placeholder="Select Hub" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Hubs</SelectItem>
              {hubs.map((hub) => (
                <SelectItem key={hub.id} value={hub.id}>
                  {hub.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-10 rounded-xl w-36 bg-white/60"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-10 rounded-xl w-36 bg-white/60"
          />
          <Button variant="outline" onClick={handleRefresh} size="icon" className="h-10 w-10 rounded-xl bg-white/60">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" onClick={onExport} size="icon" className="h-10 w-10 rounded-xl bg-white/60">
            <Download className="h-4 w-4" />
          </Button>
          {actions}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterButton
          label="All Active"
          count={resultCount}
          isActive={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        />
        <FilterButton
          label="Delayed"
          count={counts.delayed}
          isActive={statusFilter === 'delayed'}
          onClick={() => setStatusFilter('delayed')}
          color="rose"
        />
        <FilterButton
          label="Unassigned"
          count={counts.unassigned}
          isActive={statusFilter === 'unassigned'}
          onClick={() => setStatusFilter('unassigned')}
          color="amber"
        />
        <FilterButton
          label="Dispatched"
          count={counts.dispatched}
          isActive={statusFilter === 'dispatched'}
          onClick={() => setStatusFilter('dispatched')}
        />
        <FilterButton
          label="Arrived"
          count={counts.arrived}
          isActive={statusFilter === 'arrived'}
          onClick={() => setStatusFilter('arrived')}
        />
        <FilterButton
          label="In-Trip"
          count={counts.ongoing}
          isActive={statusFilter === 'pickup'}
          onClick={() => setStatusFilter('pickup')}
        />
        <FilterButton
          label="Dropped"
          count={counts.dropped}
          isActive={statusFilter === 'dropped'}
          onClick={() => setStatusFilter('dropped')}
        />
        <FilterButton
          label="GPS Off"
          count={counts.gpsOff}
          isActive={statusFilter === 'gps_off'}
          onClick={() => setStatusFilter('gps_off')}
          color="slate"
        />
        <FilterButton
          label="Priority"
          count={counts.priority}
          isActive={statusFilter === 'priority'}
          onClick={() => setStatusFilter('priority')}
          color="indigo"
        />
      </div>
    </div>
  );
}

const FilterButton = ({ label, count, isActive, onClick, color }: { label: string; count: number; isActive: boolean; onClick: () => void; color?: string }) => {
  const baseStyle = "transition-all duration-200 h-9 rounded-lg px-3 text-xs font-bold flex items-center gap-2 shadow-sm";
  const activeStyle = isActive ? `bg-slate-800 text-white` : `bg-white/60 hover:bg-white/90`;
  const colorStyle = color && isActive ? `bg-${color}-600 text-white` : '';

  return (
    <Button variant="outline" className={`${baseStyle} ${activeStyle} ${colorStyle}`} onClick={onClick}>
      {label}
      <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${isActive ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>{count}</span>
    </Button>
  )
}