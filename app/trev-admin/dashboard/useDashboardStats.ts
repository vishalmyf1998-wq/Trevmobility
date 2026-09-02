import { useMemo, useCallback } from 'react';
import {
  Users, Building2, Car, MapPin, DollarSign, Calendar, CreditCard, PieChart,
  BarChart3, Headset, LayoutDashboard, AlertTriangle, HardDrive,
  Truck, Activity, FileText, Edit, CheckCircle, XCircle, Wallet, MapPinned,
  QrCode, Smartphone, Banknote, Landmark, FileCheck, Globe

} from "lucide-react";
import { Booking, Driver, Car as CarType, Invoice, B2C_Customer, B2B_Client, DriverPayout, SupportTicket } from '@/lib/types';

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

interface UseDashboardStatsProps {
  drivers: Driver[];
  cars: CarType[];
  bookings: Booking[];
  b2cCustomers: B2C_Customer[];
  b2bClients: B2B_Client[];
  invoices: Invoice[];
  driverPayouts: DriverPayout[];
  supportTickets: SupportTicket[];
  chartDays: number;
}

export const useDashboardStats = ({
  drivers,
  cars,
  bookings,
  b2cCustomers,
  b2bClients,
  invoices,
  driverPayouts,
  supportTickets,
  chartDays,
}: UseDashboardStatsProps) => {

  const getMonthDateRange = (year: number, month: number) => {
    const start = new Date(year, month, 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(year, month + 1, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };

  const { currentMonthRange, previousMonthRange } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const currentMonthRange = getMonthDateRange(currentYear, currentMonth);
    // Handle January case for previous month
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const previousMonthRange = getMonthDateRange(prevYear, prevMonth);

    return { currentMonthRange, previousMonthRange };
  }, []);

  const calculatePercentageChange = useCallback((current: number, previous: number): string => {
    if (previous === 0) {
      return current > 0 ? "+100%" : "0%";
    }
    const change = ((current - previous) / previous) * 100;
    if (!isFinite(change)) return "N/A";
    return `${change >= 0 ? '+' : ''}${change.toFixed(0)}%`;
  }, []);

  // --- Data filtered by month for change calculations ---
  const currentMonthBookingsFiltered = useMemo(() => bookings.filter(b =>
    b.createdAt && new Date(b.createdAt) >= currentMonthRange.start && new Date(b.createdAt) <= currentMonthRange.end
  ), [bookings, currentMonthRange]);

  const previousMonthBookingsFiltered = useMemo(() => bookings.filter(b =>
    b.createdAt && new Date(b.createdAt) >= previousMonthRange.start && new Date(b.createdAt) <= previousMonthRange.end
  ), [bookings, previousMonthRange]);

  const currentMonthClosedBookingsFiltered = useMemo(() => currentMonthBookingsFiltered.filter(b => b.status === 'closed'), [currentMonthBookingsFiltered]);
  const previousMonthClosedBookingsFiltered = useMemo(() => previousMonthBookingsFiltered.filter(b => b.status === 'closed'), [previousMonthBookingsFiltered]);

  const currentMonthB2CCustomersFiltered = useMemo(() => b2cCustomers.filter(c =>
    c.createdAt && new Date(c.createdAt) >= currentMonthRange.start && new Date(c.createdAt) <= currentMonthRange.end
  ), [b2cCustomers, currentMonthRange]);

  const previousMonthB2CCustomersFiltered = useMemo(() => b2cCustomers.filter(c =>
    c.createdAt && new Date(c.createdAt) >= previousMonthRange.start && new Date(c.createdAt) <= previousMonthRange.end
  ), [b2cCustomers, previousMonthRange]);

  const activeDrivers = useMemo(() => drivers.filter(d => d.status === "active").length, [drivers]);
  const availableCars = useMemo(() => cars.filter(c => c.status === "available").length, [cars]);
  const totalBookings = useMemo(() => bookings.length, [bookings]);
  
  const todayBookings = useMemo(() => bookings.filter(b =>
    new Date(b.createdAt).toDateString() === new Date().toDateString()
  ).length, [bookings]);

  const pendingInvoices = useMemo(() => invoices.filter(i => i.status === "pending").length, [invoices]);
  const b2bClientsCount = useMemo(() => b2bClients.length, [b2bClients]);
  const b2cCount = useMemo(() => b2cCustomers.length, [b2cCustomers]);
  const pendingPayouts = useMemo(() => driverPayouts.filter(p => p.status === 'pending').length, [driverPayouts]);
  const liveTrips = useMemo(() => bookings.filter(b => ['dispatched', 'arrived', 'picked_up'].includes(b.status)).length, [bookings]);
  const openTickets = useMemo(() => supportTickets.filter(t => t.status === 'open').length, [supportTickets]);
  const totalRevenue = useMemo(() => bookings.filter(b => b.status === 'closed').reduce((sum, b) => sum + (b.grandTotal || 0), 0), [bookings]);

  // B2C Finance Stats
  const b2cBookings = useMemo(() => bookings.filter(b => b.b2cCustomerId), [bookings]);
  const b2cAllBookingsCount = useMemo(() => b2cBookings.length, [b2cBookings]);
  const b2cTotalRevenue = useMemo(() => b2cBookings
    .filter(b => b.status === 'closed')
    .reduce((sum, b) => sum + (b.grandTotal || 0), 0), [b2cBookings]);
  const b2cPendingPaymentCount = useMemo(() => b2cBookings.filter(b => b.paymentStatus === 'pending').length, [b2cBookings]);
  const b2cPaymentReceived = useMemo(() => b2cBookings
    .filter(b => b.paymentStatus === 'paid')
    .reduce((sum, b) => sum + (b.grandTotal || 0), 0), [b2cBookings]);

  // B2B Finance Stats
  const b2bBookings = useMemo(() => bookings.filter(b => b.b2bClientId), [bookings]);
  const b2bAllBookingsCount = useMemo(() => b2bBookings.length, [b2bBookings]);
  const b2bTotalRevenue = useMemo(() => b2bBookings
    .filter(b => b.status === 'closed')
    .reduce((sum, b) => sum + (b.grandTotal || 0), 0), [b2bBookings]);
  const b2bPendingPaymentCount = useMemo(() => invoices.filter(i => i.status === 'pending' && b2bClients.some(c => c.id === i.b2bClientId)).length, [invoices, b2bClients]);
  const b2bPaymentReceived = useMemo(() => invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + i.amount, 0), [invoices]);
  const b2bInvoicePendingCount = useMemo(() => bookings.filter(b => b.b2bClientId && b.status === 'closed' && !b.invoiceId).length, [bookings]);

  // B2C Booking type breakdown
  const b2cLocalBookings = useMemo(() => b2cBookings.filter(b => b.bookingType === 'local').length, [b2cBookings]);
  const b2cOutstationBookings = useMemo(() => b2cBookings.filter(b => b.bookingType === 'outstation').length, [b2cBookings]);
  const b2cTransferBookings = useMemo(() => b2cBookings.filter(b => b.bookingType === 'transfer').length, [b2cBookings]);

  // B2B Booking type breakdown
  const b2bLocalBookings = useMemo(() => b2bBookings.filter(b => b.bookingType === 'local').length, [b2bBookings]);
  const b2bOutstationBookings = useMemo(() => b2bBookings.filter(b => b.bookingType === 'outstation').length, [b2bBookings]);
  const b2bTransferBookings = useMemo(() => b2bBookings.filter(b => b.bookingType === 'transfer').length, [b2bBookings]);

  const paymentMethodRevenue = useMemo(() => {
    const revenueByMethod = {
        qr: 0,
        app: 0,
        cash: 0,
    };

    currentMonthClosedBookingsFiltered.forEach(booking => {
        if (booking.b2cCustomerId && booking.paymentStatus === 'paid') {
            const revenue = booking.grandTotal || 0;
            // Assuming booking.paymentMethod exists and has values like 'qr', 'app', 'cash'
            switch (booking.paymentMethod) {
                case 'qr':
                    revenueByMethod.qr += revenue;
                    break;
                case 'app':
                    revenueByMethod.app += revenue;
                    break;
                case 'cash':
                    revenueByMethod.cash += revenue;
                    break;
            }
        }
    });
    return revenueByMethod;
  }, [currentMonthClosedBookingsFiltered]);

  const bookingSourceChartData = useMemo(() => {
    const sources: Record<string, number> = {
      'Website': 0,
      'App': 0,
      'Call': 0,
      'Other': 0, // Catch-all for unknown sources
    };

    currentMonthBookingsFiltered.forEach(booking => {
      if (booking.source) { // Assuming booking.source exists
        const source = booking.source as 'Website' | 'App' | 'Call'; // Type assertion for known sources
        if (sources.hasOwnProperty(source)) {
          sources[source]++;
        } else {
          sources['Other']++;
        }
      } else {
        sources['Other']++; // If source is undefined or null
      }
    });
    return Object.entries(sources).filter(([, value]) => value > 0).map(([name, value]) => ({ name, value }));
  }, [currentMonthBookingsFiltered]);

  // Placeholder stats
  const b2cPendingOnCustomer = b2cPendingPaymentCount;
  const b2cPendingOnDriver = 0; // Placeholder for now
  const b2cReceivedViaQR = paymentMethodRevenue.qr;
  const b2cReceivedViaApp = paymentMethodRevenue.app;
  const b2cReceivedViaCash = paymentMethodRevenue.cash;

  const dailyTrendData = useMemo(() => {
    const trendDays = 7;
    const data: Record<string, { date: string; name: string; bookings: number; revenue: number; newB2c: number; newTickets: number }> = {};

    for (let i = trendDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      data[dateStr] = {
        date: dateStr,
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        bookings: 0,
        revenue: 0,
        newB2c: 0,
        newTickets: 0,
      };
    }

    bookings.forEach(booking => {
      if (booking.createdAt) {
        const d = new Date(booking.createdAt);
        if (!isNaN(d.getTime())) {
          const bookingDateStr = d.toISOString().split('T')[0];
          if (data[bookingDateStr]) {
            data[bookingDateStr].bookings++;
            if (booking.status === 'closed') {
                data[bookingDateStr].revenue += (booking.grandTotal || booking.estimatedFare || 0);
            }
          }
        }
      }
    });

    b2cCustomers.forEach(customer => {
        if (customer.createdAt) {
            const d = new Date(customer.createdAt);
            if (!isNaN(d.getTime())) {
                const customerDateStr = d.toISOString().split('T')[0];
                if (data[customerDateStr]) data[customerDateStr].newB2c++;
            }
        }
    });

    supportTickets.forEach(ticket => {
        if (ticket.createdAt) {
            const d = new Date(ticket.createdAt);
            if (!isNaN(d.getTime())) {
                const ticketDateStr = d.toISOString().split('T')[0];
                if (data[ticketDateStr]) data[ticketDateStr].newTickets++;
            }
        }
    });

    return Object.values(data);
  }, [bookings, b2cCustomers, supportTickets]);

  const newB2cCustomersLast7Days = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return b2cCustomers.filter(c => c.createdAt && new Date(c.createdAt) >= sevenDaysAgo).length;
  }, [b2cCustomers]);

  const newTicketsLast7Days = useMemo(() => {
    return dailyTrendData.reduce((sum, day) => sum + day.newTickets, 0);
  }, [dailyTrendData]);

  // --- Calculate Month-over-Month Changes ---
  const changeTotalBookings = calculatePercentageChange(currentMonthBookingsFiltered.length, previousMonthBookingsFiltered.length);
  const changeTotalRevenue = calculatePercentageChange(
    currentMonthClosedBookingsFiltered.reduce((sum, b) => sum + (b.grandTotal || 0), 0),
    previousMonthClosedBookingsFiltered.reduce((sum, b) => sum + (b.grandTotal || 0), 0)
  );

  const changeB2CAllBookings = calculatePercentageChange(
    currentMonthBookingsFiltered.filter(b => b.b2cCustomerId).length,
    previousMonthBookingsFiltered.filter(b => b.b2cCustomerId).length
  );
  const changeB2CTotalRevenue = calculatePercentageChange(
    currentMonthClosedBookingsFiltered.filter(b => b.b2cCustomerId).reduce((sum, b) => sum + (b.grandTotal || 0), 0),
    previousMonthClosedBookingsFiltered.filter(b => b.b2cCustomerId).reduce((sum, b) => sum + (b.grandTotal || 0), 0)
  );
  const changeB2CPaymentReceived = calculatePercentageChange(
    currentMonthBookingsFiltered.filter(b => b.b2cCustomerId && b.paymentStatus === 'paid').reduce((sum, b) => sum + (b.grandTotal || 0), 0),
    previousMonthBookingsFiltered.filter(b => b.b2cCustomerId && b.paymentStatus === 'paid').reduce((sum, b) => sum + (b.grandTotal || 0), 0)
  );

  const changeB2BAllBookings = calculatePercentageChange(
    currentMonthBookingsFiltered.filter(b => b.b2bClientId).length,
    previousMonthBookingsFiltered.filter(b => b.b2bClientId).length
  );
  const changeB2BTotalRevenue = calculatePercentageChange(
    currentMonthClosedBookingsFiltered.filter(b => b.b2bClientId).reduce((sum, b) => sum + (b.grandTotal || 0), 0),
    previousMonthClosedBookingsFiltered.filter(b => b.b2bClientId).reduce((sum, b) => sum + (b.grandTotal || 0), 0)
  );
  const changeB2BPaymentReceived = calculatePercentageChange(
    invoices.filter(i => i.status === 'paid' && i.createdAt && new Date(i.createdAt) >= currentMonthRange.start && new Date(i.createdAt) <= currentMonthRange.end).reduce((sum, i) => sum + i.amount, 0),
    invoices.filter(i => i.status === 'paid' && i.createdAt && new Date(i.createdAt) >= previousMonthRange.start && new Date(i.createdAt) <= previousMonthRange.end).reduce((sum, i) => sum + i.amount, 0)
  );

  const changeOverallTotalRevenue = calculatePercentageChange(
    currentMonthClosedBookingsFiltered.reduce((sum, b) => sum + (b.grandTotal || 0), 0),
    previousMonthClosedBookingsFiltered.reduce((sum, b) => sum + (b.grandTotal || 0), 0)
  );

  const previousTotalB2CCustomers = useMemo(() => b2cCustomers.filter(c =>
    c.createdAt && new Date(c.createdAt) <= previousMonthRange.end
  ).length, [b2cCustomers, previousMonthRange]);
  const changeTotalB2CCustomers = calculatePercentageChange(b2cCustomers.length, previousTotalB2CCustomers);

  const baseFinanceStats: StatCardProps[] = useMemo(() => ([
    { title: "B2C Total Bookings", value: currentMonthBookingsFiltered.filter(b => b.b2cCustomerId).length, icon: Calendar, color: "blue", change: changeB2CAllBookings },
    { title: "B2C Total Revenue", value: `₹${currentMonthClosedBookingsFiltered.filter(b => b.b2cCustomerId).reduce((sum, b) => sum + (b.grandTotal || 0), 0).toLocaleString()}`, icon: DollarSign, color: "green", change: changeB2CTotalRevenue },
    { title: "B2C Pending Payments", value: b2cPendingPaymentCount, icon: CreditCard, color: "orange", change: "N/A" }, // Snapshot, no direct month-over-month change
    { title: "B2C Payments Received", value: `₹${currentMonthBookingsFiltered.filter(b => b.b2cCustomerId && b.paymentStatus === 'paid').reduce((sum, b) => sum + (b.grandTotal || 0), 0).toLocaleString()}`, icon: Wallet, color: "emerald", change: changeB2CPaymentReceived },
    { title: "B2B Total Bookings", value: currentMonthBookingsFiltered.filter(b => b.b2bClientId).length, icon: Building2, color: "indigo", change: changeB2BAllBookings },
    { title: "B2B Total Revenue", value: `₹${currentMonthClosedBookingsFiltered.filter(b => b.b2bClientId).reduce((sum, b) => sum + (b.grandTotal || 0), 0).toLocaleString()}`, icon: DollarSign, color: "green", change: changeB2BTotalRevenue },
    { title: "B2B Pending Payments", value: b2bPendingPaymentCount, icon: CreditCard, color: "orange", change: "N/A" }, // Snapshot
    { title: "B2B Payments Received", value: `₹${invoices.filter(i => i.status === 'paid' && i.createdAt && new Date(i.createdAt) >= currentMonthRange.start && new Date(i.createdAt) <= currentMonthRange.end).reduce((sum, i) => sum + i.amount, 0).toLocaleString()}`, icon: Wallet, color: "emerald", change: changeB2BPaymentReceived },
    { title: "B2B Invoices Pending", value: b2bInvoicePendingCount, icon: FileText, color: "rose", change: "N/A" }, // Snapshot
    { title: "Overall Total Revenue", value: `₹${(currentMonthClosedBookingsFiltered.reduce((sum, b) => sum + (b.grandTotal || 0), 0)).toLocaleString()}`, icon: DollarSign, color: "purple", change: changeOverallTotalRevenue },
  ]), [
    currentMonthBookingsFiltered, currentMonthClosedBookingsFiltered, b2cPendingPaymentCount, b2bPendingPaymentCount, b2bInvoicePendingCount,
    changeB2CAllBookings, changeB2CTotalRevenue, changeB2CPaymentReceived, changeB2BAllBookings, changeB2BTotalRevenue, changeB2BPaymentReceived, changeOverallTotalRevenue,
    invoices, currentMonthRange, b2bClients
  ]);

  const todayDateString = new Date().toISOString().split('T')[0];

  const stats = useMemo(() => [
    { title: "Live Trips", value: liveTrips, change: "Ongoing now", icon: MapPinned, color: "blue", href: "/live-tracking" },
    { title: "Today's Bookings", value: todayBookings, change: "N/A", icon: Calendar, color: "purple", href: `/bookings?dateFrom=${todayDateString}T00:00&to=${todayDateString}T23:59`, trendData: dailyTrendData.map(d => ({ name: d.name, value: d.bookings })) }, // Removed href for now, as it's not a direct navigation
    { title: "Active Drivers", value: activeDrivers, change: "N/A", icon: Users, color: "green", href: "/drivers" }, // Snapshot // Removed href for now, as it's not a direct navigation
    { title: "Available Cars", value: availableCars, change: "N/A", icon: Car, color: "cyan", href: "/cars" }, // Snapshot
    { title: "Total Bookings", value: currentMonthBookingsFiltered.length, change: changeTotalBookings, icon: Calendar, color: "blue", href: "/bookings" },
    { title: "Total Revenue", value: `₹${currentMonthClosedBookingsFiltered.reduce((sum, b) => sum + (b.grandTotal || 0), 0).toLocaleString()}`, change: changeTotalRevenue, icon: DollarSign, color: "emerald", href: "/invoices", trendData: dailyTrendData.map(d => ({ name: d.name, value: dailyTrendData.find(d => d.date === todayDateString)?.revenue || 0 })) },
    { title: "B2B Clients", value: b2bClientsCount, change: "N/A", icon: Building2, color: "indigo", href: "/b2b-clients" }, // Snapshot
    { title: "B2C Customers", value: b2cCount, change: changeTotalB2CCustomers, icon: Users, color: "blue", href: "/b2c-customers", trendData: dailyTrendData.map(d => ({ name: d.name, value: dailyTrendData.find(d => d.date === todayDateString)?.newB2c || 0 })) },
    { title: "Pending Invoices", value: pendingInvoices, change: "N/A", icon: DollarSign, color: "orange", href: "/invoices" }, // Snapshot
    { title: "Pending Payouts", value: pendingPayouts, change: "N/A", icon: Wallet, color: "rose", href: "/driver-payouts" }, // Snapshot // Removed href for now, as it's not a direct navigation
  ], [liveTrips, todayBookings, activeDrivers, availableCars, currentMonthBookingsFiltered.length, currentMonthClosedBookingsFiltered, b2bClientsCount, b2cCount, pendingInvoices, pendingPayouts, dailyTrendData, todayDateString, changeTotalBookings, changeTotalRevenue, changeTotalB2CCustomers]);

  const opsStats = useMemo(() => stats.filter(s => ['Live Trips', 'Today\'s Bookings', 'Active Drivers', 'Available Cars', 'Open Tickets'].includes(s.title)), [stats]);

  const recentActivity = useMemo(() => bookings
    .flatMap(b => (b.eventLog || []).map(e => ({ ...e, bookingNumber: b.bookingNumber })))
    .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime())
    .slice(0, 5), [bookings]);

  const chartData = useMemo(() => {
    const data = Array.from({ length: chartDays }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return {
        date: d.toISOString().split('T')[0],
        name: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        bookings: 0,
        revenue: 0,
      };
    }).reverse();

    bookings.forEach(booking => {
      if (booking.createdAt) {
        const d = new Date(booking.createdAt);
        if (!isNaN(d.getTime())) {
          const bookingDateStr = d.toISOString().split('T')[0];
          const dayData = data.find(d => d.date === bookingDateStr);
          if (dayData) {
            dayData.bookings++;
            dayData.revenue += (booking.grandTotal || booking.estimatedFare || 0);
          }
        }
      }
    });
    return data;
  }, [bookings, chartDays]);

  const financeChartData = useMemo(() => {
    const data = Array.from({ length: chartDays }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return {
        date: d.toISOString().split('T')[0],
        name: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        b2cRevenue: 0,
        b2bRevenue: 0,
      };
    }).reverse();

    bookings.forEach(booking => {
      if (booking.createdAt && booking.status === 'closed') {
        const d = new Date(booking.createdAt);
        if (!isNaN(d.getTime())) {
          const bookingDateStr = d.toISOString().split('T')[0];
          const dayData = data.find(d => d.date === bookingDateStr);
          if (dayData) {
            const revenue = booking.grandTotal || 0;
            if (booking.b2cCustomerId) {
              dayData.b2cRevenue += revenue;
            } else if (booking.b2bClientId) {
              dayData.b2bRevenue += revenue;
            }
          }
        }
      }
    });
    return data;
  }, [bookings, chartDays]);

  const pendingEditBookings = useMemo(() => bookings.filter(b => b.status === 'pending_edit_approval'), [bookings]);

  return {
    stats,
    opsStats,
    baseFinanceStats,
    b2cPendingOnCustomer,
    b2cPendingOnDriver,
    b2cReceivedViaQR,
    b2cReceivedViaApp,
    b2cReceivedViaCash,
    b2bPendingPaymentCount,
    b2bPaymentReceived,
    b2bLocalBookings,
    b2bOutstationBookings,
    b2bTransferBookings,
    b2cTotalRevenue,
    b2bTotalRevenue,
    b2cLocalBookings,
    b2cOutstationBookings,
    b2cTransferBookings,
    bookingSourceChartData,
    chartData,
    financeChartData,
    recentActivity,
    pendingEditBookings,
    paymentMethodChartData: [
      { name: 'QR', value: paymentMethodRevenue.qr },
      { name: 'App', value: paymentMethodRevenue.app },
      { name: 'Cash', value: paymentMethodRevenue.cash },
    ],
    top5TodayBookings: bookings
      .filter(b => new Date(b.createdAt).toDateString() === new Date().toDateString())
      .sort((a, b) => (b.grandTotal || 0) - (a.grandTotal || 0))
      .slice(0, 5)
      .map(b => ({
        id: b.id,
        bookingNumber: b.bookingNumber,
        customerName: b.customerName || b.b2bClient?.name || 'N/A',
        grandTotal: b.grandTotal || 0,
      })),
  };
};