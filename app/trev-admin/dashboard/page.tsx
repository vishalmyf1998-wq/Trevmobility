"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAdmin, useUserType } from "@/lib/admin-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import {
  Users, Building2, Car, MapPin, DollarSign, Calendar, CreditCard, PieChart,
  BarChart3, Headset, LayoutDashboard, AlertTriangle, HardDrive,
  Truck, Activity, FileText, Edit, CheckCircle, XCircle, Wallet, MapPinned, Globe, Download,
  QrCode, Smartphone, Banknote

} from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, Pie, Cell } from 'recharts' // Removed duplicate MapPinned import
import { useDashboardStats } from "./useDashboardStats"


interface StatCardProps {
  title: string;
  value: string | number;
  change: string;
  icon: React.ElementType;
  color: string;
  href?: string;
  trendData?: { name: string; value: number }[];
  onClick?: () => void;
  isSubItem?: boolean;
}
export default function TrevAdminDashboard() {
  const router = useRouter()
  const { userType } = useUserType()
  const { 
    drivers, cars, bookings, b2cCustomers, b2bClients, b2bEmployees,
    dutySlips, invoices, hubs, adminUsers, fareGroups, promoCodes,
    driverPayouts, cities, airports, supportTickets,
    approveBookingEdit, rejectBookingEdit
  } = useAdmin()

  const [chartDays, setChartDays] = useState(7)

  const {
    stats = [],
    opsStats = [],
    baseFinanceStats = [],
    b2cPendingOnCustomer = 0,
    b2cPendingOnDriver = 0,
    b2cReceivedViaQR = 0,
    b2cReceivedViaApp = 0,
    b2cReceivedViaCash = 0,
    b2bPendingPaymentCount = 0,
    b2bPaymentReceived = 0,
    b2bLocalBookings = 0,
    b2bOutstationBookings = 0,
    b2bTransferBookings = 0,
    b2cTotalRevenue = 0,
    b2cLocalBookings = 0,
    b2cOutstationBookings = 0,
    b2bInvoicePendingCount = 0,
    b2cTransferBookings = 0,
    b2bTotalRevenue = 0,
    chartData = [],
    financeChartData = [],
    recentActivity = [],
    paymentMethodChartData = [],
    pendingEditBookings = [],
    top5TodayBookings = [],
    bookingSourceChartData = [],
  } = useDashboardStats({ drivers, cars, bookings, b2cCustomers, b2bClients, invoices, driverPayouts, supportTickets, chartDays });

  
  const [statsLoading, setStatsLoading] = useState(true)

  const [showB2CPendingDetails, setShowB2CPendingDetails] = useState(false);
  const [showB2CPaymentDetails, setShowB2CPaymentDetails] = useState(false);
  const [showB2BPendingDetails, setShowB2BPendingDetails] = useState(false);
  const [showB2BPaymentDetails, setShowB2BPaymentDetails] = useState(false);
  const [showB2CTotalBookings, setShowB2CTotalBookings] = useState(false);
  const [showB2CTotalRevenue, setShowB2CTotalRevenue] = useState(false);
  const [showB2BTotalBookings, setShowB2BTotalBookings] = useState(false);
  const [showB2BInvoicesPending, setShowB2BInvoicesPending] = useState(false);
  const [showB2BTotalRevenue, setShowB2BTotalRevenue] = useState(false);
  const [showOverallRevenueDetails, setShowOverallRevenueDetails] = useState(false);

  const [systemHealth, setSystemHealth] = useState({
    server: 'loading', // 'operational', 'degraded', 'down'
    database: 'loading',
    cache: 'loading',
    backgroundJobs: 'loading',
    emailService: 'loading',
    lastChecked: null as Date | null,
  });
  const [healthHistory, setHealthHistory] = useState<{ service: string, status: string, time: Date }[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setStatsLoading(false), 1200)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const fetchHealth = () => {
      // Mock API call. Replace with actual API call in production.
      setTimeout(() => {
        const newHealth = {
          server: 'operational',
          database: 'operational',
          cache: Math.random() > 0.5 ? 'operational' : 'degraded',
          backgroundJobs: 'operational',
          emailService: Math.random() > 0.2 ? 'operational' : 'down',
          lastChecked: new Date(),
        };

        setSystemHealth(prevHealth => {
          // Check for status changes and show notifications
          Object.keys(newHealth).forEach(key => {
            if (key === 'lastChecked') return;
            const service = key as keyof Omit<typeof newHealth, 'lastChecked'>;
            const oldStatus = prevHealth ? prevHealth[service] : 'loading';
            const newStatus = newHealth[service];

            if (newStatus !== oldStatus && oldStatus !== 'loading') {
              if (newStatus === 'degraded') toast.warning(`System Alert: ${service} service has degraded.`);
              if (newStatus === 'down') toast.error(`System Alert: ${service} service is down.`);
              
              setHealthHistory(prevHistory => [
                { service, status: newStatus, time: new Date() },
                ...prevHistory
              ].slice(0, 10)); // Keep last 10 events
            }
          });
          return newHealth;
        });
      }, 1000);
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 60000); // Refresh every 60 seconds

    return () => clearInterval(interval);
  }, []);
  const exportToCsv = useCallback((filename: string, data: any[]) => {
    if (!data || data.length === 0) {
      toast.error("No data to export.");
      return;
    }
    try {
      const header = Object.keys(data[0]).join(',');
      const rows = data.map(row => Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(','));
      const csvContent = [header, ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${filename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Data exported successfully.");
    } catch (e) { toast.error("Failed to export data.") }
  }, []);
  const [view, setView] = useState("all") // 'all', 'finance', 'ops'
  
  const colorMap: { [key: string]: string } = {
    // ... existing colors
    'QR': '#3b82f6', // blue
    'App': '#8b5cf6', // purple
    'Cash': '#10b981', // emerald
    'Website': '#facc15', // yellow
    'Call': '#ef4444', // red
    'Other': '#a3a3a3', // gray
  };

  const iconColorMap: { [key: string]: string } = {
    green: '#22c55e',
    blue: '#3b82f6',
    purple: '#a855f7',
    indigo: '#6366f1',
    orange: '#f97316',
    cyan: '#06b6d4',
    rose: '#f43f5e',
    emerald: '#10b981',
  };

  const displayedFinanceStats: StatCardProps[] = useMemo(() => {
    const financeStatsWithHandler = baseFinanceStats.map(stat => {
      if (stat.title === "B2C Pending Payments") {
        return { ...stat, onClick: () => setShowB2CPendingDetails(prev => !prev), href: undefined };
      }
      if (stat.title === "B2C Payments Received") {
        return { ...stat, onClick: () => setShowB2CPaymentDetails(prev => !prev), href: undefined };
      }
      if (stat.title === "B2B Pending Payments") {
        return { ...stat, onClick: () => setShowB2BPendingDetails(prev => !prev), href: undefined };
      }
      if (stat.title === "B2B Payments Received") {
        return { ...stat, onClick: () => setShowB2BPaymentDetails(prev => !prev), href: undefined };
      }
      if (stat.title === "B2C Total Bookings") {
        return { ...stat, onClick: () => setShowB2CTotalBookings(prev => !prev), href: undefined };
      }
      if (stat.title === "B2C Total Revenue") {
        return { ...stat, onClick: () => setShowB2CTotalRevenue(prev => !prev), href: undefined };
      }
      if (stat.title === "B2B Total Bookings") {
        return { ...stat, onClick: () => setShowB2BTotalBookings(prev => !prev), href: undefined };
      }
      if (stat.title === "B2B Total Revenue") {
        return { ...stat, onClick: () => setShowB2BTotalRevenue(prev => !prev), href: undefined };
      }
      if (stat.title === "Overall Total Revenue") {
        return { ...stat, onClick: () => setShowOverallRevenueDetails(prev => !prev), href: undefined };
      }
      if (stat.title === "B2B Invoices Pending") {
        return { ...stat, onClick: () => setShowB2BInvoicesPending(prev => !prev), href: undefined };
      }
      return stat;
    });
    
    let stats = [...financeStatsWithHandler];
    const b2cPendingIndex = stats.findIndex(stat => stat.title === "B2C Pending Payments");

    if (b2cPendingIndex !== -1 && showB2CPendingDetails) {
      stats.splice(b2cPendingIndex + 1, 0,
        {
          title: "  - Pending on Customer",
          value: b2cPendingOnCustomer,
          icon: Users,
          color: "orange",
          change: "N/A",
          isSubItem: true,
        },
        {
          title: "  - Pending on Driver",
          value: b2cPendingOnDriver,
          icon: Truck,
          color: "orange",
          change: "N/A",
          isSubItem: true,
        }
      );
    }

    const b2cPaymentIndex = stats.findIndex(stat => stat.title === "B2C Payments Received");
    if (b2cPaymentIndex !== -1 && showB2CPaymentDetails) {
      stats.splice(b2cPaymentIndex + 1, 0,
        {
          title: "  - Received Via QR",
          value: `₹${(b2cReceivedViaQR ?? 0).toLocaleString()}`,
          icon: QrCode,
          color: "emerald",
          change: "N/A",
          isSubItem: true,
        },
        {
          title: "  - Received Via App",
          value: `₹${(b2cReceivedViaApp ?? 0).toLocaleString()}`,
          icon: Smartphone,
          color: "emerald",
          change: "N/A",
          isSubItem: true,
        },
        {
          title: "  - Received Via Cash",
          value: `₹${(b2cReceivedViaCash ?? 0).toLocaleString()}`,
          icon: Banknote,
          color: "emerald",
          change: "N/A",
          isSubItem: true,
        }
      );
    }

    const b2bPendingIndex = stats.findIndex(stat => stat.title === "B2B Pending Payments");
    if (b2bPendingIndex !== -1 && showB2BPendingDetails) {
      stats.splice(b2bPendingIndex + 1, 0,
        {
          title: "  - Total Pending",
          value: b2bPendingPaymentCount,
          icon: CreditCard,
          color: "orange",
          change: "N/A",
          isSubItem: true,
        }
      );
    }

    const b2bPaymentReceivedIndex = stats.findIndex(stat => stat.title === "B2B Payments Received");
    if (b2bPaymentReceivedIndex !== -1 && showB2BPaymentDetails) {
      stats.splice(b2bPaymentReceivedIndex + 1, 0,
        {
          title: "  - Total Received",
          value: `₹${(b2bPaymentReceived ?? 0).toLocaleString()}`,
          icon: Wallet,
          color: "emerald",
          change: "N/A",
          isSubItem: true,
        }
      );
    }

    const b2cTotalBookingsIndex = stats.findIndex(stat => stat.title === "B2C Total Bookings");
    if (b2cTotalBookingsIndex !== -1 && showB2CTotalBookings) {
      stats.splice(b2cTotalBookingsIndex + 1, 0,
        { title: "  - Dummy B2C Detail 1", value: "N/A", icon: Users, color: "blue", change: "N/A", isSubItem: true },
        { title: "  - Dummy B2C Detail 2", value: "N/A", icon: Users, color: "blue", change: "N/A", isSubItem: true }
      );
    }

    const b2cTotalRevenueIndex = stats.findIndex(stat => stat.title === "B2C Total Revenue");
    if (b2cTotalRevenueIndex !== -1 && showB2CTotalRevenue) {
      stats.splice(b2cTotalRevenueIndex + 1, 0,
        { title: "  - Dummy Revenue Detail 1", value: "N/A", icon: DollarSign, color: "green", change: "N/A", isSubItem: true }
      );
    }

    const b2bTotalBookingsIndex = stats.findIndex(stat => stat.title === "B2B Total Bookings");
    if (b2bTotalBookingsIndex !== -1 && showB2BTotalBookings) {
      stats.splice(b2bTotalBookingsIndex + 1, 0,
        {
          title: "  - Local",
          value: b2bLocalBookings,
          icon: MapPin,
          color: "indigo",
          change: "N/A",
          isSubItem: true,
        },
        {
          title: "  - Outstation",
          value: b2bOutstationBookings,
          icon: Globe,
          color: "indigo",
          change: "N/A",
          isSubItem: true,
        },
        {
          title: "  - Transfer",
          value: b2bTransferBookings,
          icon: Car,
          color: "indigo",
          change: "N/A",
          isSubItem: true,
        }
      );
    }

    const b2bTotalRevenueIndex = stats.findIndex(stat => stat.title === "B2B Total Revenue");
    if (b2bTotalRevenueIndex !== -1 && showB2BTotalRevenue) {
      stats.splice(b2bTotalRevenueIndex + 1, 0,
        { title: "  - Dummy B2B Revenue Detail", value: "N/A", icon: DollarSign, color: "green", change: "N/A", isSubItem: true }
      );
    }

    const b2bInvoicesPendingIndex = stats.findIndex(stat => stat.title === "B2B Invoices Pending");
    if (b2bInvoicesPendingIndex !== -1 && showB2BInvoicesPending) {
      stats.splice(b2bInvoicesPendingIndex + 1, 0,
        {
          title: "  - Total Pending Invoices",
          value: b2bInvoicePendingCount,
          icon: FileText,
          color: "rose",
          change: "N/A",
          isSubItem: true,
        },
        { title: "  - Dummy Invoice Detail", value: "N/A", icon: FileText, color: "rose", change: "N/A", isSubItem: true } // Placeholder for more details


      );
    }

    const overallRevenueIndex = stats.findIndex(stat => stat.title === "Overall Total Revenue");
    if (overallRevenueIndex !== -1 && showOverallRevenueDetails) {
      stats.splice(overallRevenueIndex + 1, 0,
        {
          title: "  - B2C Revenue",
          value: `₹${(b2cTotalRevenue ?? 0).toLocaleString()}`,
          icon: Users,
          color: "purple",
          change: "N/A",
          isSubItem: true,
        },
        {
          title: "  - B2B Revenue",
          value: `₹${(b2bTotalRevenue ?? 0).toLocaleString()}`,
          icon: Building2,
          color: "purple",
          change: "N/A",
          isSubItem: true,
        }
      );
    }

    return stats;
  }, [
    baseFinanceStats,
    showB2CPendingDetails, b2cPendingOnCustomer, b2cPendingOnDriver,
    showB2CPaymentDetails, b2cReceivedViaQR, b2cReceivedViaApp, b2cReceivedViaCash,
    showB2BPendingDetails, b2bPendingPaymentCount,
    showB2BPaymentDetails, b2bPaymentReceived, b2cTotalRevenue, b2bTotalRevenue, b2bInvoicePendingCount,
    showB2CTotalBookings, b2cLocalBookings, b2cOutstationBookings, b2cTransferBookings, // Removed showB2CAllBookings
    showB2CTotalRevenue, // Removed showB2CAllRevenue
    showB2BTotalBookings, b2bLocalBookings, b2bOutstationBookings, b2bTransferBookings,
    showB2BInvoicesPending,
    showB2BTotalRevenue,
    showOverallRevenueDetails, b2cTotalRevenue, b2bTotalRevenue
  ]);

  const HealthStatusItem = ({ name, status }: { name: string, status: string }) => {
    const statusConfig = {
      loading: { icon: <Skeleton className="h-5 w-5 rounded-full" />, text: 'Checking...', color: 'text-muted-foreground' },
      operational: { icon: <CheckCircle className="h-5 w-5 text-green-500" />, text: 'Operational', color: 'text-green-500' },
      degraded: { icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />, text: 'Degraded', color: 'text-yellow-500' },
      down: { icon: <XCircle className="h-5 w-5 text-red-500" />, text: 'Down', color: 'text-red-500' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.loading;

    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {config.icon}
          <span className="font-medium">{name}</span>
        </div>
        <span className={`font-semibold ${config.color}`}>{config.text}</span>
      </div>
    );
  };

  const OpsCards = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            System Health
          </CardTitle>
          <CardDescription>
            Live status of critical system components.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <HealthStatusItem name="API Server" status={systemHealth.server} />
          <HealthStatusItem name="Database" status={systemHealth.database} />
          <HealthStatusItem name="Cache Service" status={systemHealth.cache} />
          <HealthStatusItem name="Background Jobs" status={systemHealth.backgroundJobs} />
          <HealthStatusItem name="Email Service" status={systemHealth.emailService} />
          {systemHealth.lastChecked && <p className="text-xs text-muted-foreground text-right pt-2">Last checked: {systemHealth.lastChecked.toLocaleTimeString()}</p>}
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Event Log
          </CardTitle>
          <CardDescription>
            Recent system health status changes. 
            <Button variant="ghost" size="sm" className="ml-auto h-8" onClick={() => setHealthHistory([])}>
              Clear Log
            </Button>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {healthHistory.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-40 text-green-500" />
              <p className="text-sm">No system events recorded recently. All systems are stable.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {healthHistory.map((event, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium capitalize">{event.service.replace(/([A-Z])/g, ' $1')}</TableCell>
                    <TableCell><Badge variant={event.status === 'down' ? 'destructive' : event.status === 'degraded' ? 'secondary' : 'default'}>{event.status}</Badge></TableCell>
                    <TableCell className="text-right text-muted-foreground">{event.time.toLocaleTimeString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Top 5 Bookings
          </CardTitle>
          <CardDescription>
            Highest value bookings for today.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/30 animate-pulse h-12" />
            ))
          ) : top5TodayBookings.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p className="text-sm">No top bookings for today.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top5TodayBookings.map((booking, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{booking.bookingNumber}</TableCell>
                    <TableCell>{booking.customerName}</TableCell>
                    <TableCell className="text-right">₹{booking.grandTotal.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
  const StatsCards = ({ statsToShow, numColumns }: { statsToShow: StatCardProps[], numColumns: number }) => (
  // Change the type of statsToShow to StatCardProps[]
  // const StatsCards = ({ statsToShow, numColumns }: { statsToShow: StatCardProps[], numColumns: number }) => (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${numColumns} gap-6`}>
      {statsToShow.map((stat) => (
        <Card
          key={stat.title}
          className={`${statsLoading ? 'cursor-wait' : ''} ${stat.href || stat.onClick ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''} ${stat.isSubItem ? 'ml-8 border-l-4 border-orange-300' : ''}`}
          onClick={() => {
            if (stat.onClick) {
              stat.onClick();
            } else if (stat.href) {
              router.push(stat.href);
            }
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-6 w-6 ${stat.color === 'green' ? 'text-green-500' : stat.color === 'blue' ? 'text-blue-500' : stat.color === 'purple' ? 'text-purple-500' : stat.color === 'indigo' ? 'text-indigo-500' : stat.color === 'orange' ? 'text-orange-500' : stat.color === 'cyan' ? 'text-cyan-500' : stat.color === 'rose' ? 'text-rose-500' : 'text-emerald-500'}`} />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-10 w-24" />
            ) : (
              <div className="flex items-end justify-between gap-4">
                <div className="flex-shrink-0">
                  <div className="text-2xl font-bold">
                    {stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className={stat.change.startsWith('+') ? 'text-green-500 font-medium' : 'text-red-500 font-medium'}>{stat.change}</span> from last month
                  </p>
                </div>
                {stat.trendData && (
                  <div className="h-10 w-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stat.trendData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                        <Line
                          type="monotone"
                          dataKey="value" // @ts-ignore
                          stroke={iconColorMap[stat.color] || '#8884d8'}
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )


  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Overview of fleet operations, bookings, B2B clients, and financials
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu> {/* Export Data Dropdown */}
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export Data
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Export CSV</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => exportToCsv('trends_overview', chartData)}>Trends Overview</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => exportToCsv('b2b_vs_b2c_revenue', financeChartData)}>B2B vs B2C Revenue</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => exportToCsv('revenue_by_payment_method', paymentMethodChartData)}>Revenue by Payment Method</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => exportToCsv('bookings_by_source', bookingSourceChartData)}>Bookings by Source</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => exportToCsv('recent_activity', recentActivity)}>Recent Activity</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant={view === 'all' ? 'default' : 'outline'} onClick={() => setView('all')}>All View</Button>
          <Button variant={view === 'finance' ? 'default' : 'outline'} onClick={() => setView('finance')}>Finance View</Button>
          <Button variant={view === 'ops' ? 'default' : 'outline'} onClick={() => setView('ops')}>Ops View</Button>
        </div> {/* End of Export Data Dropdown */}
      </div>

      {/* All View */}
      <div className={`${view !== 'all' && 'hidden'}`}>
        <StatsCards statsToShow={stats} numColumns={5} />
        <div className="mt-6 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Trends Overview
                </CardTitle>
                <CardDescription>Bookings and Revenue over the last {chartDays} days.</CardDescription> 
              </div>
              <div className="flex items-center gap-2">
                <Select value={chartDays.toString()} onValueChange={(val) => setChartDays(Number(val))}>
                  <SelectTrigger className="w-[130px] h-8 text-xs">
                    <SelectValue placeholder="Select Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 Days</SelectItem>
                    <SelectItem value="14">Last 14 Days</SelectItem>
                    <SelectItem value="30">Last 30 Days</SelectItem>
                    <SelectItem value="90">Last 90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="pl-2">
              {statsLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="name" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <YAxis 
                        yAxisId="left"
                        width={40}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                        allowDecimals={false} 
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(value) => `₹${value}`}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }} 
                      />
                      <Legend />
                      <Area 
                        yAxisId="left"
                        type="monotone" 
                        name="Bookings"
                        dataKey="bookings" 
                        stroke="#3b82f6" 
                        fillOpacity={1}
                        fill="url(#colorBookings)"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Area 
                        yAxisId="right"
                        type="monotone" 
                        name="Revenue"
                        dataKey="revenue" 
                        stroke="#a855f7" 
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
          {pendingEditBookings.length > 0 && (
            <Card className="border-purple-500/20 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-600">
                  <Edit className="h-5 w-5" />
                  Pending Booking Edits ({pendingEditBookings.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingEditBookings.slice(0, 5).map(booking => (
                  <div key={booking.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{booking.bookingNumber} <span className="text-muted-foreground">({booking.customerName})</span></p>
                      <p className="text-xs text-muted-foreground truncate">
                        {booking.pickupLocation} to {booking.dropLocation}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button size="sm" variant="outline" className="h-8" onClick={() => router.push(`/bookings?review=${booking.id}`)}>
                        Review
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Operations Overview</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 lg:grid-cols-6 gap-6 pt-0">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-1">{hubs.length}</div>
                <div className="text-sm text-muted-foreground">Hubs</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-1">{fareGroups.length}</div>
                <div className="text-sm text-muted-foreground">Fare Groups</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-1">{promoCodes.length}</div>
                <div className="text-sm text-muted-foreground">Promo Codes</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-1">{cities.length}</div>
                <div className="text-sm text-muted-foreground">Cities</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-1">{airports.length}</div>
                <div className="text-sm text-muted-foreground">Airports</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-1">{adminUsers.length}</div>
                <div className="text-sm text-muted-foreground">Admin Users</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Finance View */}
      <div className={`space-y-6 ${view !== 'finance' && 'hidden'}`}>
        <StatsCards statsToShow={displayedFinanceStats} numColumns={5} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                B2B vs B2C Revenue
              </CardTitle>
              <CardDescription>Revenue comparison over the last {chartDays} days.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={chartDays.toString()} onValueChange={(val) => setChartDays(Number(val))}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue placeholder="Select Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="14">Last 14 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pl-2">
            {statsLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={financeChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorB2C" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorB2B" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `₹${value}`}
                    />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }} />
                    <Legend />
                    <Area type="monotone" name="B2C Revenue" dataKey="b2cRevenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorB2C)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Area type="monotone" name="B2B Revenue" dataKey="b2bRevenue" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorB2B)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
          <Card>
            <CardHeader>
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Revenue by Payment Method
                </CardTitle>
                <CardDescription>Current month's B2C revenue breakdown.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {statsLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentMethodChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                          const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                          const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                          const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                          return (percent > 0.05) ? <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central"> {`${(percent * 100).toFixed(0)}%`} </text> : null;
                        }}
                      >
                        {paymentMethodChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={colorMap[entry.name as keyof typeof colorMap]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Bookings by Source
                </CardTitle>
                <CardDescription>Current month's bookings breakdown.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {statsLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={bookingSourceChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                          const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                          const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                          const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                          return (percent > 0.05) ? <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central"> {`${(percent * 100).toFixed(0)}%`} </text> : null;
                        }}
                      >
                        {bookingSourceChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={colorMap[entry.name as keyof typeof colorMap]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value.toLocaleString()} Bookings`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Ops View */}
      <div className={`space-y-6 ${view !== 'ops' && 'hidden'}`}>
        <StatsCards statsToShow={opsStats} numColumns={5} />
        <OpsCards />

        {pendingEditBookings.length > 0 && (
          <Card className="border-purple-500/20 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-600">
                <Edit className="h-5 w-5" />
                Pending Booking Edits ({pendingEditBookings.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingEditBookings.slice(0, 5).map(booking => (
                <div key={booking.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{booking.bookingNumber} <span className="text-muted-foreground">({booking.customerName})</span></p>
                    <p className="text-xs text-muted-foreground truncate">
                      {booking.pickupLocation} to {booking.dropLocation}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button size="sm" variant="outline" className="h-8" onClick={() => router.push(`/bookings?review=${booking.id}`)}>
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Operations Overview</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 lg:grid-cols-6 gap-6 pt-0">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">{hubs.length}</div>
              <div className="text-sm text-muted-foreground">Hubs</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">{fareGroups.length}</div>
              <div className="text-sm text-muted-foreground">Fare Groups</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">{promoCodes.length}</div>
              <div className="text-sm text-muted-foreground">Promo Codes</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">{cities.length}</div>
              <div className="text-sm text-muted-foreground">Cities</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">{airports.length}</div>
              <div className="text-sm text-muted-foreground">Airports</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">{adminUsers.length}</div>
              <div className="text-sm text-muted-foreground">Admin Users</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
