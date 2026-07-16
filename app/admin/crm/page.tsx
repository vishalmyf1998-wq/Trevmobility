// @ts-nocheck
"use client"

import React, { useState, useMemo, useEffect } from "react"

import { useAdmin } from "@/lib/admin-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell, LineChart, Line
} from "recharts"
import {
  Headset, Activity, AlertTriangle, CheckCircle, Clock, Users, Shield, BookOpen,
  DollarSign, FileText, BarChart3, Settings, Phone, Mail,
  Search, User, Plus, Download, Check, Award, Zap
} from "lucide-react"
import { toast } from "sonner"

// Colors for charts
const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

export default function CRMModulePage() {
  const {
    bookings, supportTickets, addSupportTicket, updateSupportTicket, drivers, cars, b2bClients, b2cCustomers,
    currentUser, adminUsers = [], adminRoles = []
  } = useAdmin()

  // Tabs state
  const [activeTab, setActiveTab] = useState("dashboard")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  // Simulation speed
  const simulationSpeed = 1

  // Sub-module Local States
  const [ticketsList, setTicketsList] = useState(() => {
    return supportTickets.map(t => ({
      ...t,
      slaTimer: Math.floor(Math.random() * 90) + 10,
      source: ["Phone", "WhatsApp", "Email", "App"][Math.floor(Math.random() * 4)],
      category: t.type || "Billing",
      priority: t.priority || "Medium",
      status: t.status || "Open",
      assignedAgent: ["Rohan K.", "Sneha S.", "Amit P.", "Unassigned"][Math.floor(Math.random() * 4)],
      phone: "+91 98765 43210"
    }))
  })

  // Synchronize context changes
  useEffect(() => {
    setTicketsList(prev => {
      const existingIds = new Set(prev.map(t => t.id))
      const newTickets = supportTickets
        .filter(t => !existingIds.has(t.id))
        .map(t => ({
          id: t.id,
          ticketNumber: t.ticketNumber || `TK-${Math.floor(1000 + Math.random() * 9000)}`,
          subject: t.subject || "General Inquiry",
          customerName: t.customerName || "Anonymous Customer",
          category: t.type || "Ride Issue",
          priority: t.priority || "Medium",
          status: t.status || "Open",
          createdAt: t.createdAt || new Date().toISOString(),
          slaTimer: 60,
          source: "App",
          assignedAgent: "Unassigned",
          phone: "+91 98765 00000"
        }))
      return [...prev, ...newTickets]
    })
  }, [supportTickets])

  // Selected ticket for sliding drawer details
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  
  // Advanced filters state
  const [searchTerm, setSearchTerm] = useState("")
  const [filterPriority, setFilterPriority] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterCategory, setFilterCategory] = useState("all")

  // Mock complaints list
  const [complaints, setComplaints] = useState([
    { id: "CMP-001", customerName: "Rahul Sharma", category: "Driver Behaviour", priority: "High", severity: "Major", owner: "Rohan K.", department: "Operations", status: "Open", rootCause: "Driver spoke rudely regarding toll route", resolution: "", resolutionTime: "", confirmed: false },
    { id: "CMP-002", customerName: "Priya Singh", category: "Late Arrival", priority: "Medium", severity: "Minor", owner: "Sneha S.", department: "Dispatch", status: "Resolved", rootCause: "Traffic congestion at Gurugram toll gate", resolution: "Waived peak charges for delay", resolutionTime: "45 mins", confirmed: true },
    { id: "CMP-003", customerName: "Amit Kumar", category: "Vehicle Quality", priority: "High", severity: "Major", owner: "Amit P.", department: "Fleet Audit", status: "Resolved", rootCause: "AC fan noise and low cooling", resolution: "Vehicle recalled for maintenance; issued Rs. 200 coupon", resolutionTime: "2 hrs", confirmed: true },
    { id: "CMP-004", customerName: "Neha Gupta", category: "Billing Issue", priority: "Low", severity: "Minor", owner: "Unassigned", department: "Finance", status: "Open", rootCause: "Double peak multiplier incorrectly applied", resolution: "", resolutionTime: "", confirmed: false }
  ])

  // Mock refunds list
  const [refunds, setRefunds] = useState([
    { id: "RFD-001", ticketId: "TK-TEST-001", customerName: "Rahul Sharma", amount: 450, reason: "Ride delayed beyond 45 minutes", status: "Pending Approval", financeStatus: "Pending", expectedDate: "2026-07-20", timeline: ["Requested by Agent", "Pending TL Approval"] },
    { id: "RFD-002", ticketId: "TK-TEST-002", customerName: "Priya Singh", amount: 1200, reason: "Duplicate charge on payment gateway", status: "Sent to Finance", financeStatus: "Processing", expectedDate: "2026-07-18", timeline: ["Requested by Agent", "Approved by Team Lead", "Sent to Finance"] },
    { id: "RFD-003", ticketId: "TK-TEST-003", customerName: "Nitin Rao", amount: 350, reason: "Driver cancelled; advance paid", status: "Completed", financeStatus: "Disbursed", expectedDate: "2026-07-15", timeline: ["Requested", "Approved", "Disbursed by HDFC gateway"] }
  ])

  // Mock feedback rating list
  const [feedbacks, setFeedbacks] = useState([
    { id: "FDB-001", customerName: "Vikram Patel", overallRating: 5, driverRating: 5, vehicleRating: 5, supportRating: 5, comments: "Excellent service! Prompt dispatch.", nps: 10, tripId: "BK-10001" },
    { id: "FDB-002", customerName: "Sunil Shetty", overallRating: 2, driverRating: 1, vehicleRating: 3, supportRating: 2, comments: "Driver arrived 20 minutes late and was using phone during drive.", nps: 3, tripId: "BK-10002" },
    { id: "FDB-003", customerName: "Anjali Desai", overallRating: 4, driverRating: 4, vehicleRating: 4, supportRating: 4, comments: "Clean car but route taken was long.", nps: 8, tripId: "BK-10003" }
  ])

  // Simulated live rides list
  const [liveRides, setLiveRides] = useState([
    { id: "BK-LIVE-1", bookingNumber: "BK20091", customerName: "Rahul Sharma", customerPhone: "+91 99999 11111", status: "picked_up", driverName: "Ramesh Yadav", driverPhone: "+91 88888 11111", carNumber: "DL-1CA-1234", location: "Connaught Place, Delhi", eta: 12, delay: 5, notes: "Corporate transfer" },
    { id: "BK-LIVE-2", bookingNumber: "BK20092", customerName: "Priya Singh", customerPhone: "+91 99999 22222", status: "dispatched", driverName: "Suresh Kumar", driverPhone: "+91 88888 22222", carNumber: "HR-26CP-5678", location: "Cyber City, Gurgaon", eta: 25, delay: 18, notes: "Airport pickup - Delayed at toll" },
    { id: "BK-LIVE-3", bookingNumber: "BK20093", customerName: "Amit Kumar", customerPhone: "+91 99999 33333", status: "arrived", driverName: "Mahesh Pal", driverPhone: "+91 88888 33333", carNumber: "DL-1CB-4321", location: "Sector 18, Noida", eta: 0, delay: 22, notes: "SLA alert - Driver waiting at terminal" }
  ])

  // New ticket state for modal
  const [newTicketSubject, setNewTicketSubject] = useState("")
  const [newTicketCustomer, setNewTicketCustomer] = useState("")
  const [newTicketCategory, setNewTicketCategory] = useState("service")
  const [newTicketPriority, setNewTicketPriority] = useState("medium")
  const [newTicketDesc, setNewTicketDesc] = useState("")

  // Search timeline state
  const [timelineSearch, setTimelineSearch] = useState("")
  const [searchedCustomer, setSearchedCustomer] = useState<any>(null)

  // Simulation logic for live rides & auto tickets creation on SLA breach
  useEffect(() => {
    const timer = setInterval(() => {
      const breachedRides: any[] = []

      setLiveRides(prev => {
        return prev.map(ride => {
          const newDelay = ride.delay + (Math.random() > 0.6 ? 2 : 0)
          
          if (newDelay > 15 && ride.delay <= 15) {
            breachedRides.push({ ...ride, delay: newDelay })
          }

          return {
            ...ride,
            delay: newDelay,
            eta: Math.max(0, ride.eta - (Math.random() > 0.7 ? 1 : 0))
          }
        })
      })

      // Run side-effects outside of the state updater
      if (breachedRides.length > 0) {
        breachedRides.forEach(ride => {
          toast.error(`SLA Breach Alert: Ride ${ride.bookingNumber} is delayed by ${ride.delay} mins!`, {
            description: `Automatically generating CRM ticket & notifying ${ride.customerName}`
          })

          const autoTicket = {
            subject: `Auto SLA Breach - Ride ${ride.bookingNumber} Delayed`,
            customerName: ride.customerName,
            type: "service",
            priority: "high",
            description: `System generated ticket. Ride ${ride.bookingNumber} delayed by ${ride.delay} minutes. Driver: ${ride.driverName}.`
          }
          addSupportTicket(autoTicket)
        })
      }
    }, 5000)

    return () => clearInterval(timer)
  }, [addSupportTicket])

  // Feedback NPS rating low-stars complaint auto-trigger
  const handleAddFeedback = (newFdb: typeof feedbacks[0]) => {
    setFeedbacks(prev => [newFdb, ...prev])
    if (newFdb.overallRating < 3) {
      toast.warning(`Low Rating Feedback Alert (Rating: ${newFdb.overallRating})!`, {
        description: `Automatically created a complaint ticket for ${newFdb.customerName}. CRM Manager has been notified.`
      })

      const autoComplaint = {
        id: `CMP-${Math.floor(100 + Math.random() * 900)}`,
        customerName: newFdb.customerName,
        category: "Safety Concern",
        priority: "High",
        severity: "Critical",
        owner: "CRM Manager",
        department: "Quality",
        status: "Open",
        rootCause: `Customer reported low rating: ${newFdb.comments}`,
        resolution: "",
        resolutionTime: "",
        confirmed: false
      }
      setComplaints(prev => [autoComplaint, ...prev])
    } else {
      toast.success("Feedback submitted successfully!")
    }
  }

  // Action helper: check permissions
  const hasPermission = (tab: string) => {
    // 1. Map tabs to specific permission IDs
    const permissionMap: Record<string, string> = {
      dashboard: "crm_dashboard",
      tickets: "crm_tickets",
      liveSupport: "crm_live_support",
      complaints: "crm_complaints",
      refunds: "crm_refunds",
      corporate: "crm_corporate",
      feedback: "crm_feedback",
      timeline: "crm_timeline",
      kb: "crm_kb",
      reports: "crm_reports",
      settings: "crm_settings"
    }
    const neededPermission = permissionMap[tab]
    if (!neededPermission) return true

    // 2. If no currentUser session exists, default to full access (Super Admin)
    if (!currentUser) return true

    // 3. Find the user's role
    const matchedUser = adminUsers.find((u: any) => u.email?.toLowerCase() === currentUser.email?.toLowerCase())
    const roleId = matchedUser?.roleId || "a1111111-1111-4111-a111-111111111111" // fallback to super admin
    const matchedRole = adminRoles.find((r: any) => r.id === roleId)

    if (!matchedRole) return true // default to true if role not configured

    // 4. Check if permissions array contains 'all' or the needed permission
    return (
      matchedRole.permissions.includes("all") ||
      matchedRole.permissions.includes(neededPermission)
    )
  }

  // Filtered tickets count
  const filteredTickets = useMemo(() => {
    return ticketsList.filter(t => {
      const matchSearch =
        (t.ticketNumber?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (t.customerName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (t.subject?.toLowerCase() || "").includes(searchTerm.toLowerCase())
      
      const matchPriority = filterPriority === "all" || t.priority?.toLowerCase() === filterPriority.toLowerCase()
      const matchStatus = filterStatus === "all" || t.status?.toLowerCase() === filterStatus.toLowerCase()
      const matchCategory = filterCategory === "all" || t.category?.toLowerCase() === filterCategory.toLowerCase()

      return matchSearch && matchPriority && matchStatus && matchCategory
    })
  }, [ticketsList, searchTerm, filterPriority, filterStatus, filterCategory])

  // Metric stats for cards
  const stats = useMemo(() => {
    const total = ticketsList.length
    const open = ticketsList.filter(t => t.status === "Open" || t.status === "open").length
    const pending = ticketsList.filter(t => t.status === "In Progress" || t.status === "in_progress").length
    const resolved = ticketsList.filter(t => t.status === "Closed" || t.status === "closed").length
    const escalated = complaints.filter(c => c.severity === "Critical" || c.priority === "High").length
    const refundPending = refunds.filter(r => r.status === "Pending Approval").length
    const liveDelayCount = liveRides.filter(r => r.delay > 15).length

    const avgRating = feedbacks.length > 0 ? feedbacks.reduce((acc, curr) => acc + curr.overallRating, 0) / feedbacks.length : 4.2

    return {
      open,
      pending,
      resolved,
      escalated,
      avgRating: avgRating.toFixed(1),
      refundPending,
      liveDelayCount
    }
  }, [ticketsList, complaints, refunds, liveRides, feedbacks])

  // Sample data for charts
  const ticketTrendData = [
    { name: "Mon", open: 12, resolved: 8, pending: 4 },
    { name: "Tue", open: 15, resolved: 10, pending: 5 },
    { name: "Wed", open: 18, resolved: 14, pending: 6 },
    { name: "Thu", open: 14, resolved: 13, pending: 8 },
    { name: "Fri", open: 22, resolved: 15, pending: 11 },
    { name: "Sat", open: 10, resolved: 11, pending: 6 },
    { name: "Sun", open: 8, resolved: 12, pending: 3 }
  ]

  const complaintCategoriesData = [
    { name: "Driver Behaviour", value: 12 },
    { name: "Late Arrival", value: 18 },
    { name: "Vehicle Quality", value: 8 },
    { name: "Billing Issue", value: 15 },
    { name: "Safety Concern", value: 3 }
  ]

  const csatTrendData = [
    { name: "Week 1", rating: 4.2 },
    { name: "Week 2", rating: 4.4 },
    { name: "Week 3", rating: 4.1 },
    { name: "Week 4", rating: 4.5 }
  ]

  const agentPerformanceData = [
    { name: "Rohan K.", resolved: 32, avgTime: 45 },
    { name: "Sneha S.", resolved: 41, avgTime: 32 },
    { name: "Amit P.", resolved: 28, avgTime: 55 },
    { name: "Kriti M.", resolved: 36, avgTime: 38 }
  ]

  const handleAddNewTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTicketSubject || !newTicketCustomer) {
      toast.error("Subject and Customer Name are required.")
      return
    }

    const ticketPayload = {
      subject: newTicketSubject,
      customerName: newTicketCustomer,
      type: newTicketCategory,
      priority: newTicketPriority,
      description: newTicketDesc,
      status: "Open"
    }

    addSupportTicket(ticketPayload)
    toast.success("CRM Support Ticket Created Successfully!")
    setIsCreateDialogOpen(false)
    
    // Reset Form
    setNewTicketSubject("")
    setNewTicketCustomer("")
    setNewTicketDesc("")
  }

  // Handle Search Customer Timeline
  const handleTimelineSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!timelineSearch) return
    const customer = b2cCustomers?.find(c => c.name.toLowerCase().includes(timelineSearch.toLowerCase()) || c.phone.includes(timelineSearch)) || {
      name: timelineSearch,
      phone: "+91 99999 55555",
      email: "cust@timeline-test.com",
      vip: true,
      spend: 42500,
      bookings: 24,
      repeat: true
    }
    setSearchedCustomer(customer)
  }

  return (
    <>
      <div className="w-full space-y-6">
        
        {/* CRM Module Title & Top Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/70 p-6 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center border border-indigo-100 shadow-md shrink-0">
              <Headset className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">CRM Workspace</h1>
              <p className="text-sm font-semibold text-slate-500">Customer Experience, Feedback, Refunds & Escalations Management</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                size="sm"
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm px-4 py-2"
              >
                <Plus className="mr-2 h-4 w-4" /> New Ticket
              </Button>
              <DialogContent className="bg-white border-slate-100 text-slate-900 max-w-lg rounded-2xl shadow-2xl p-6">
                <DialogHeader className="pb-3 border-b border-slate-100">
                  <DialogTitle className="text-slate-900 text-xl font-black">Create Support Ticket</DialogTitle>
                  <DialogDescription className="text-slate-500 font-semibold text-xs mt-1">
                    Add a new ticket generated from phone calls or offline feedback channels.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddNewTicketSubmit} className="space-y-5 mt-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Customer Name *</label>
                    <Input
                      value={newTicketCustomer}
                      onChange={(e) => setNewTicketCustomer(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="border-slate-200 rounded-xl focus-visible:ring-indigo-500"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subject / Issue Summary *</label>
                    <Input
                      value={newTicketSubject}
                      onChange={(e) => setNewTicketSubject(e.target.value)}
                      placeholder="e.g. Fare double-debited during ride"
                      className="border-slate-200 rounded-xl focus-visible:ring-indigo-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
                      <select
                        value={newTicketCategory}
                        onChange={(e) => setNewTicketCategory(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold cursor-pointer"
                      >
                        <option value="billing">💰 Billing</option>
                        <option value="service">🚗 Service Quality</option>
                        <option value="app">📱 App Issue</option>
                        <option value="safety">🚨 Safety Concern</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</label>
                      <select
                        value={newTicketPriority}
                        onChange={(e) => setNewTicketPriority(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold cursor-pointer"
                      >
                        <option value="low">🟢 Low</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="high">🔴 High</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Detailed Description</label>
                    <textarea
                      value={newTicketDesc}
                      onChange={(e) => setNewTicketDesc(e.target.value)}
                      placeholder="Enter specific details regarding the customer complaint or query..."
                      className="w-full h-28 bg-white border border-slate-200 rounded-xl p-3 text-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 font-medium leading-relaxed"
                    />
                  </div>
                  <div className="flex gap-3 justify-end border-t border-slate-100 pt-4 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                      className="rounded-xl border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-bold"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 shadow-md shadow-indigo-500/10">
                      Submit Ticket
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* CRM View Selector Bar */}
        <div className="bg-white/70 p-4 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">CRM Section:</span>
            <select
              value={activeTab}
              onChange={(e) => {
                const allowed = hasPermission(e.target.value)
                if (allowed) {
                  setActiveTab(e.target.value)
                } else {
                  const matchedUser = adminUsers.find((u: any) => u.email?.toLowerCase() === currentUser?.email?.toLowerCase())
                  const roleId = matchedUser?.roleId || "a1111111-1111-4111-a111-111111111111"
                  const matchedRole = adminRoles.find((r: any) => r.id === roleId)
                  const roleName = matchedRole?.name || "assigned role"

                  toast.error("Permission Denied", {
                    description: `Your active role (${roleName}) does not have permission to view this section.`
                  })
                }
              }}
              className="bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-w-[260px]"
            >
              <option value="dashboard">📊 CRM Dashboard</option>
              <option value="tickets">🎧 Customer Tickets ({stats.open} open)</option>
              <option value="liveSupport">⚡ Live Ride Support {stats.liveDelayCount > 0 ? "⚠️" : ""}</option>
              <option value="complaints">⚠️ Complaints Portal</option>
              <option value="refunds">💸 Refund Requests ({stats.refundPending} pending)</option>
              <option value="corporate">🛡️ Corporate Support</option>
              <option value="feedback">🌟 Feedback & NPS (Avg: {stats.avgRating})</option>
              <option value="timeline">👤 Timeline Explorer</option>
              <option value="kb">📖 Knowledge Base</option>
              <option value="reports">📄 Analytics & Reports</option>
              <option value="settings">⚙️ CRM Settings</option>
            </select>
          </div>
          
          <div className="flex gap-4 text-xs font-bold text-slate-500 mr-2">
            <p>Open Tickets: <span className="text-indigo-600 font-extrabold">{stats.open}</span></p>
            <p>SLA Breached: <span className="text-red-500 font-extrabold">{stats.liveDelayCount}</span></p>
            <p>Avg Rating: <span className="text-emerald-600 font-extrabold">★ {stats.avgRating}</span></p>
          </div>
        </div>

        {/* CRM Primary Render Window */}
        <div className="w-full bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 min-h-[700px]">
            
            {/* Dashboard Tab Content */}
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Customer Support Analytics</h2>
                  <p className="text-xs text-slate-500">Overview of ticket queues, complaint matrices, and agent metrics.</p>
                </div>

                {/* Dashboard KPI Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Open Tickets", value: stats.open, icon: Headset, color: "text-indigo-600", bg: "bg-indigo-50" },
                    { label: "Pending Tickets", value: stats.pending, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
                    { label: "Resolved Today", value: stats.resolved, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "High-Priority Complaints", value: stats.escalated, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
                    { label: "Avg CSAT", value: `${stats.avgRating} / 5`, icon: Zap, color: "text-cyan-600", bg: "bg-cyan-50" },
                    { label: "NPS Score", value: "+46", icon: Award, color: "text-purple-600", bg: "bg-purple-50" },
                    { label: "Refund Pending", value: stats.refundPending, icon: DollarSign, color: "text-pink-600", bg: "bg-pink-50" },
                    { label: "Delayed Live Rides", value: stats.liveDelayCount, icon: Activity, color: "text-rose-600", bg: "bg-rose-50" }
                  ].map((stat, i) => (
                    <Card key={i} className="border-slate-100 shadow-sm overflow-hidden bg-white">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                          <p className="text-xl font-black text-slate-800">{stat.value}</p>
                        </div>
                        <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                          <stat.icon className="h-5 w-5" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Dashboard Chart Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Ticket Trend */}
                  <Card className="border-slate-100 shadow-sm bg-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-slate-800 text-sm font-bold">Support Ticket Trends</CardTitle>
                      <CardDescription className="text-slate-400 text-xs">Daily intake vs resolution count</CardDescription>
                    </CardHeader>
                    <CardContent className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={ticketTrendData}>
                          <defs>
                            <linearGradient id="colorOpen" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorRes" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                          <XAxis dataKey="name" stroke="#64748b" fontSize={11}/>
                          <YAxis stroke="#64748b" fontSize={11}/>
                          <ChartTooltip contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", color: "#0f172a" }}/>
                          <Area type="monotone" dataKey="open" stroke="#6366f1" fillOpacity={1} fill="url(#colorOpen)"/>
                          <Area type="monotone" dataKey="resolved" stroke="#10b981" fillOpacity={1} fill="url(#colorRes)"/>
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Complaint Category */}
                  <Card className="border-slate-100 shadow-sm bg-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-slate-800 text-sm font-bold">Complaint Distribution</CardTitle>
                      <CardDescription className="text-slate-400 text-xs">Distribution of logged issues by category</CardDescription>
                    </CardHeader>
                    <CardContent className="h-64 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={complaintCategoriesData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {complaintCategoriesData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <ChartTooltip contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", color: "#0f172a" }}/>
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* CSAT Trend */}
                  <Card className="border-slate-100 shadow-sm bg-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-slate-800 text-sm font-bold">CSAT Weekly Score Trend</CardTitle>
                      <CardDescription className="text-slate-400 text-xs">Customer satisfaction ratings tracker</CardDescription>
                    </CardHeader>
                    <CardContent className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={csatTrendData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                          <XAxis dataKey="name" stroke="#64748b" fontSize={11}/>
                          <YAxis stroke="#64748b" fontSize={11} domain={[1, 5]}/>
                          <ChartTooltip contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", color: "#0f172a" }}/>
                          <Line type="monotone" dataKey="rating" stroke="#10b981" strokeWidth={3} activeDot={{ r: 8 }}/>
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Agent SLA Compliance */}
                  <Card className="border-slate-100 shadow-sm bg-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-slate-800 text-sm font-bold">Agent Resolution Metrics</CardTitle>
                      <CardDescription className="text-slate-400 text-xs">Closed tickets vs Avg resolution time (mins)</CardDescription>
                    </CardHeader>
                    <CardContent className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={agentPerformanceData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                          <XAxis dataKey="name" stroke="#64748b" fontSize={11}/>
                          <YAxis stroke="#64748b" fontSize={11}/>
                          <ChartTooltip contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", color: "#0f172a" }}/>
                          <Legend />
                          <Bar dataKey="resolved" fill="#6366f1" name="Tickets Resolved" radius={[4, 4, 0, 0]}/>
                          <Bar dataKey="avgTime" fill="#ef4444" name="Avg Time (mins)" radius={[4, 4, 0, 0]}/>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                </div>
              </div>
            )}

            {/* Customer Tickets Tab Content */}
            {activeTab === "tickets" && (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Customer Support Tickets</h2>
                    <p className="text-xs text-slate-500">View, assign, and escalate active support cases.</p>
                  </div>
                  
                  {/* Bulk Actions */}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-xl border-slate-200 text-slate-700 bg-white hover:bg-slate-50" onClick={() => {
                      toast.success("Bulk action completed: Closed 3 tickets.")
                    }}>
                      Bulk Close
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl border-slate-200 text-slate-700 bg-white hover:bg-slate-50" onClick={() => {
                      toast.success("Bulk action completed: Reassigned to Rohan K.")
                    }}>
                      Bulk Reassign
                    </Button>
                  </div>
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search ID, name, subject..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-white border-slate-200 text-slate-800 pl-9 rounded-xl shadow-sm"
                    />
                  </div>
                  
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="bg-white border border-slate-200 text-slate-750 text-sm rounded-xl p-2.5 shadow-sm"
                  >
                    <option value="all">All Priorities</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-white border border-slate-200 text-slate-750 text-sm rounded-xl p-2.5 shadow-sm"
                  >
                    <option value="all">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="closed">Closed</option>
                  </select>

                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="bg-white border border-slate-200 text-slate-750 text-sm rounded-xl p-2.5 shadow-sm"
                  >
                    <option value="all">All Categories</option>
                    <option value="billing">Billing</option>
                    <option value="service">Service Quality</option>
                    <option value="app">App Issue</option>
                    <option value="safety">Safety Concern</option>
                  </select>
                </div>

                {/* Tickets Table */}
                <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50/70">
                      <TableRow className="border-slate-100">
                        <TableHead className="text-slate-500 font-bold">Ticket ID</TableHead>
                        <TableHead className="text-slate-500 font-bold">Customer</TableHead>
                        <TableHead className="text-slate-500 font-bold">Subject</TableHead>
                        <TableHead className="text-slate-500 font-bold">Category</TableHead>
                        <TableHead className="text-slate-500 font-bold">Priority</TableHead>
                        <TableHead className="text-slate-500 font-bold">Status</TableHead>
                        <TableHead className="text-slate-500 font-bold">SLA Timer</TableHead>
                        <TableHead className="text-slate-500 font-bold">Agent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTickets.map((ticket, index) => (
                        <TableRow
                          key={index}
                          className="border-slate-100 hover:bg-slate-50/50 cursor-pointer"
                          onClick={() => setSelectedTicket(ticket)}
                        >
                          <TableCell className="font-bold text-slate-800">{ticket.ticketNumber}</TableCell>
                          <TableCell className="text-slate-700 font-medium">{ticket.customerName}</TableCell>
                          <TableCell className="text-slate-700 font-medium">{ticket.subject}</TableCell>
                          <TableCell className="capitalize text-slate-500 font-medium">{ticket.category}</TableCell>
                          <TableCell>
                            <Badge className={
                              ticket.priority.toLowerCase() === "high" ? "bg-red-50 text-red-600 border border-red-100 font-semibold" :
                              ticket.priority.toLowerCase() === "medium" ? "bg-amber-50 text-amber-600 border border-amber-100 font-semibold" :
                              "bg-slate-50 text-slate-600 border border-slate-100 font-semibold"
                            }>
                              {ticket.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              ticket.status.toLowerCase() === "open" ? "bg-indigo-50 text-indigo-600 border border-indigo-100 font-semibold" :
                              ticket.status.toLowerCase() === "in_progress" ? "bg-amber-50 text-amber-600 border border-amber-100 font-semibold" :
                              "bg-emerald-50 text-emerald-600 border border-emerald-100 font-semibold"
                            }>
                              {ticket.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-600 text-xs font-mono font-bold">
                            {ticket.status.toLowerCase() === "closed" ? "-" : `${ticket.slaTimer}m left`}
                          </TableCell>
                          <TableCell className="text-slate-700 font-medium">{ticket.assignedAgent}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Ticket Details Slide Drawer */}
                {selectedTicket && (
                  <Sheet open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
                    <SheetContent className="w-full sm:max-w-2xl bg-white text-slate-800 overflow-y-auto">
                      <SheetHeader className="pb-4 border-b border-slate-100">
                        <div className="flex justify-between items-center pr-6">
                          <SheetTitle className="text-slate-900 font-black flex items-center gap-2">
                            <span>{selectedTicket.ticketNumber}</span>
                            <Badge className="bg-indigo-50 text-indigo-600">{selectedTicket.category}</Badge>
                          </SheetTitle>
                          <Badge className={
                            selectedTicket.priority.toLowerCase() === "high" ? "bg-red-50 text-red-600 border border-red-100" : "bg-slate-50 text-slate-600"
                          }>
                            {selectedTicket.priority} Priority
                          </Badge>
                        </div>
                        <SheetDescription className="text-slate-500 font-semibold text-sm">
                          {selectedTicket.subject}
                        </SheetDescription>
                      </SheetHeader>

                      <div className="space-y-6 mt-6">
                        
                        {/* Action buttons bar */}
                        <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-100">
                          <Button size="xs" variant="outline" className="rounded-xl border-slate-200 text-slate-700 bg-white" onClick={() => {
                            updateSupportTicket(selectedTicket.id, { status: "in_progress" })
                            setSelectedTicket(prev => ({ ...prev, status: "In Progress" }))
                            toast.info("Ticket marked In Progress")
                          }}>
                            Mark In Progress
                          </Button>
                          <Button size="xs" variant="outline" className="rounded-xl bg-emerald-50 text-emerald-600 border-emerald-100 text-xs" onClick={() => {
                            updateSupportTicket(selectedTicket.id, { status: "closed" })
                            setSelectedTicket(prev => ({ ...prev, status: "Closed" }))
                            toast.success("Ticket closed successfully")
                          }}>
                            Close Ticket
                          </Button>
                          <Button size="xs" variant="outline" className="rounded-xl border-slate-200 text-slate-700 bg-white" onClick={() => {
                            toast.info("Escalation triggered. Notified CRM Team Lead.")
                          }}>
                            Escalate
                          </Button>
                          <Button size="xs" variant="outline" className="rounded-xl bg-red-50 text-red-600 border-red-100 text-xs" onClick={() => {
                            const newRefund = {
                              id: `RFD-${Math.floor(100 + Math.random() * 900)}`,
                              ticketId: selectedTicket.ticketNumber,
                              customerName: selectedTicket.customerName,
                              amount: 500,
                              reason: "SLA delayed breach payout",
                              status: "Pending Approval",
                              financeStatus: "Pending",
                              expectedDate: new Date(Date.now() + 500000000).toISOString().split("T")[0],
                              timeline: ["Requested by Agent"]
                            }
                            setRefunds(prev => [newRefund, ...prev])
                            toast.success("Refund request submitted to Finance!")
                          }}>
                            Request Refund
                          </Button>
                        </div>

                        {/* Customer 360 Information grid */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-xs text-slate-400 font-bold uppercase tracking-wider">Customer Profile</h4>
                            <p className="text-sm font-bold text-slate-800 mt-1">{selectedTicket.customerName}</p>
                            <p className="text-xs text-slate-500 font-semibold">{selectedTicket.phone || "+91 98765 43210"}</p>
                          </div>
                          <div>
                            <h4 className="text-xs text-slate-400 font-bold uppercase tracking-wider">Booking Reference</h4>
                            <p className="text-sm font-bold text-slate-800 mt-1">{selectedTicket.bookingNumber || "BK-23091"}</p>
                            <Badge className="bg-slate-100 text-slate-600 font-semibold mt-1">Delhi-NCR Scope</Badge>
                          </div>
                        </div>

                        {/* Description Details */}
                        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                          <h4 className="text-xs text-slate-500 font-bold uppercase tracking-wider">Initial Complaint</h4>
                          <p className="text-sm text-slate-700 mt-2 font-medium leading-relaxed">{selectedTicket.description || "No detailed description provided."}</p>
                        </div>

                        {/* Simulated Live Ride / Drivers block */}
                        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                          <h4 className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Linked Ride Operational Details</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 font-medium">
                            <p>Driver: <span className="text-slate-800 font-bold">Ramesh Yadav (+91 99988 88888)</span></p>
                            <p>Vehicle: <span className="text-slate-800 font-bold">DL-1CA-8899 (Sedan)</span></p>
                            <p>GPS Status: <span className="text-emerald-600 font-bold">Online (5 km from Pickup)</span></p>
                            <p>Delay Time: <span className="text-red-600 font-bold">18 minutes delay</span></p>
                          </div>
                        </div>

                        {/* Communication Logs Tabbed View */}
                        <div>
                          <h4 className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3">Communication Logs</h4>
                          <Tabs defaultValue="notes" className="w-full">
                            <TabsList className="bg-slate-50 border border-slate-100 w-full grid grid-cols-4 rounded-xl p-1">
                              <TabsTrigger value="notes" className="text-xs rounded-lg">Notes</TabsTrigger>
                              <TabsTrigger value="calls" className="text-xs rounded-lg">Exotel Logs</TabsTrigger>
                              <TabsTrigger value="whatsapp" className="text-xs rounded-lg">WhatsApp</TabsTrigger>
                              <TabsTrigger value="emails" className="text-xs rounded-lg">Emails</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="notes" className="mt-3 space-y-2">
                              <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-xl text-xs space-y-1">
                                <p className="text-slate-400">Jul 16, 2026 07:14 - <span className="text-slate-700 font-bold">Amit P. (Agent)</span></p>
                                <p className="text-slate-600 font-medium">Driver confirmed delay due to heavy congestion at airport arrival road.</p>
                              </div>
                              <div className="flex gap-2">
                                <Input placeholder="Type internal note here..." className="bg-white border-slate-200 text-xs rounded-xl" />
                                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-xs text-white font-bold rounded-xl" onClick={() => toast.success("Internal note added.")}>Save</Button>
                              </div>
                            </TabsContent>

                            <TabsContent value="calls" className="mt-3 space-y-2 text-xs">
                              <div className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                                <div>
                                  <p className="font-bold text-slate-750">Outgoing Call via Exotel</p>
                                  <p className="text-[10px] text-slate-500 font-semibold">Agent Rohini to Customer Rahul (Duration: 2m 14s)</p>
                                </div>
                                <Button size="xs" variant="ghost" className="text-indigo-600 font-bold"><Phone className="h-3 w-3 mr-1" /> Play Log</Button>
                              </div>
                            </TabsContent>

                            <TabsContent value="whatsapp" className="mt-3 space-y-2 text-xs">
                              <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl space-y-1">
                                <p className="text-emerald-600 font-bold text-[10px]">CRM Agent (07:15):</p>
                                <p className="text-slate-700 font-medium">Hello Rahul, we see your ride is delayed. We are tracking your cab in real-time. Extremely sorry for the delay.</p>
                              </div>
                              <div className="flex gap-2">
                                <Input placeholder="Type message..." className="bg-white border-slate-200 text-xs rounded-xl" />
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs text-white font-bold rounded-xl" onClick={() => toast.success("WhatsApp message dispatched.")}>Send</Button>
                              </div>
                            </TabsContent>

                            <TabsContent value="emails" className="mt-3 text-xs text-slate-500 text-center py-6 font-medium">
                              No email threads logged on this ticket.
                            </TabsContent>
                          </Tabs>
                        </div>

                      </div>
                    </SheetContent>
                  </Sheet>
                )}

              </div>
            )}

            {/* Live Ride Support Content */}
            {activeTab === "liveSupport" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Live Active Ride Monitoring</h2>
                  <p className="text-xs text-slate-500">Real-time status updates of active bookings. Breach of SLA delays triggers alerts immediately.</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {liveRides.map((ride, idx) => {
                    const isBreached = ride.delay > 15
                    return (
                      <Card key={idx} className={`bg-white border-slate-100 border-l-4 shadow-sm transition-all duration-300 ${
                        isBreached ? "border-l-red-500 bg-red-50/20 shadow-md" : "border-l-emerald-500"
                      }`}>
                        <CardContent className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-slate-800">{ride.bookingNumber}</h3>
                              <Badge className="bg-slate-100 text-slate-600 font-mono text-[10px] font-bold">{ride.status.toUpperCase()}</Badge>
                              {isBreached && <Badge className="bg-red-100 text-red-600 font-bold border border-red-200">SLA Breach ({ride.delay}m delayed)</Badge>}
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs text-slate-500 font-semibold">
                              <p>Customer: <span className="text-slate-800">{ride.customerName} ({ride.customerPhone})</span></p>
                              <p>Driver: <span className="text-slate-800">{ride.driverName} ({ride.driverPhone})</span></p>
                              <p>Cab Assigned: <span className="text-slate-800">{ride.carNumber}</span></p>
                              <p className="col-span-3 mt-1 text-slate-400">Location: <span className="text-emerald-600 font-bold">{ride.location}</span></p>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full md:w-auto">
                            <Button size="xs" variant="outline" className="rounded-xl border-slate-200 bg-white text-xs text-slate-700 font-bold" onClick={() => {
                              toast.info(`Predefined Template sent to ${ride.customerName}: "Apologies for the delay. We are actively tracking your driver..."`)
                            }}>
                              Send WhatsApp Template
                            </Button>
                            <Button size="xs" variant="outline" className="rounded-xl border-slate-200 bg-white text-xs text-slate-700 font-bold" onClick={() => {
                              toast.success(`Dialing Driver Ramesh via Exotel...`)
                            }}>
                              Call Driver
                            </Button>
                            <Button size="xs" variant="outline" className="rounded-xl border-slate-200 bg-white text-xs text-slate-700 font-bold" onClick={() => {
                              toast.success(`Dialing Customer ${ride.customerName}...`)
                            }}>
                              Call Customer
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Complaints Tab Content */}
            {activeTab === "complaints" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Complaints Register</h2>
                  <p className="text-xs text-slate-500">Record, investigate, and close specific ride complaints.</p>
                </div>

                <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50/70">
                      <TableRow className="border-slate-100">
                        <TableHead className="text-slate-500 font-bold">Complaint ID</TableHead>
                        <TableHead className="text-slate-500 font-bold">Customer</TableHead>
                        <TableHead className="text-slate-500 font-bold">Category</TableHead>
                        <TableHead className="text-slate-500 font-bold">Severity</TableHead>
                        <TableHead className="text-slate-500 font-bold">Owner</TableHead>
                        <TableHead className="text-slate-500 font-bold">Status</TableHead>
                        <TableHead className="text-slate-500 font-bold">Resolution Status</TableHead>
                        <TableHead className="text-slate-500 font-bold">Customer Confirmed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {complaints.map((c, idx) => (
                        <TableRow key={idx} className="border-slate-100 hover:bg-slate-50/50 text-xs">
                          <TableCell className="font-bold text-slate-800">{c.id}</TableCell>
                          <TableCell className="text-slate-700 font-semibold">{c.customerName}</TableCell>
                          <TableCell className="text-slate-500 font-medium">{c.category}</TableCell>
                          <TableCell>
                            <Badge className={
                              c.severity === "Critical" ? "bg-red-50 text-red-600 border border-red-100 font-bold" :
                              c.severity === "Major" ? "bg-amber-50 text-amber-600 border border-amber-100 font-bold" :
                              "bg-slate-50 text-slate-600 border border-slate-100 font-bold"
                            }>
                              {c.severity}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-700 font-medium">{c.owner}</TableCell>
                          <TableCell>
                            <Badge className={c.status === "Open" ? "bg-indigo-50 text-indigo-600 font-bold" : "bg-emerald-50 text-emerald-600 font-bold"}>
                              {c.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-600 font-medium">{c.resolution || "Under Investigation"}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center">
                              <Checkbox
                                checked={c.confirmed}
                                onCheckedChange={(checked) => {
                                  setComplaints(prev => prev.map(comp => comp.id === c.id ? { ...comp, confirmed: !!checked } : comp))
                                  toast.success(`Customer confirmation status updated for ${c.id}`)
                                }}
                                className="border-slate-300 data-[state=checked]:bg-emerald-600 rounded"
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Refunds Tab Content */}
            {activeTab === "refunds" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Refund Approval Queue</h2>
                  <p className="text-xs text-slate-500">Validate claims and approve payouts before routing to Finance payouts.</p>
                </div>

                <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50/70">
                      <TableRow className="border-slate-100">
                        <TableHead className="text-slate-500 font-bold">Refund ID</TableHead>
                        <TableHead className="text-slate-500 font-bold">Ticket Ref</TableHead>
                        <TableHead className="text-slate-500 font-bold">Customer</TableHead>
                        <TableHead className="text-slate-500 font-bold">Amount</TableHead>
                        <TableHead className="text-slate-500 font-bold">Reason</TableHead>
                        <TableHead className="text-slate-500 font-bold">Approval Status</TableHead>
                        <TableHead className="text-slate-500 font-bold">Finance Status</TableHead>
                        <TableHead className="text-slate-500 font-bold">Expected Settlement</TableHead>
                        <TableHead className="text-slate-500 font-bold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {refunds.map((r, idx) => (
                        <TableRow key={idx} className="border-slate-100 hover:bg-slate-50/50 text-xs">
                          <TableCell className="font-bold text-slate-800">{r.id}</TableCell>
                          <TableCell className="text-slate-500 font-medium">{r.ticketId}</TableCell>
                          <TableCell className="text-slate-700 font-semibold">{r.customerName}</TableCell>
                          <TableCell className="text-slate-800 font-black">₹ {r.amount}</TableCell>
                          <TableCell className="text-slate-500 font-medium">{r.reason}</TableCell>
                          <TableCell>
                            <Badge className={
                              r.status === "Approved" ? "bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold" :
                              r.status === "Pending Approval" ? "bg-amber-50 text-amber-600 border border-amber-100 font-bold" :
                              "bg-slate-50 text-slate-600 border border-slate-100 font-bold"
                            }>
                              {r.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-700 font-bold">{r.financeStatus}</TableCell>
                          <TableCell className="text-slate-500 font-medium">{r.expectedDate}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              {r.status === "Pending Approval" && (
                                <>
                                  <Button size="xs" className="bg-emerald-600 hover:bg-emerald-700 text-[10px] rounded-lg text-white font-bold" onClick={() => {
                                    setRefunds(prev => prev.map(ref => ref.id === r.id ? { ...ref, status: "Sent to Finance", financeStatus: "Processing" } : ref))
                                    toast.success("Refund claim approved and sent to Finance payouts queue.")
                                  }}>
                                    Approve
                                  </Button>
                                  <Button size="xs" variant="destructive" className="text-[10px] rounded-lg font-bold" onClick={() => {
                                    setRefunds(prev => prev.map(ref => ref.id === r.id ? { ...ref, status: "Rejected", financeStatus: "Cancelled" } : ref))
                                    toast.error("Refund claim rejected.")
                                  }}>
                                    Reject
                                  </Button>
                                </>
                              )}
                              {r.status === "Sent to Finance" && (
                                <Button size="xs" className="bg-indigo-600 hover:bg-indigo-700 text-[10px] rounded-lg text-white font-bold" onClick={() => {
                                  setRefunds(prev => prev.map(ref => ref.id === r.id ? { ...ref, status: "Completed", financeStatus: "Disbursed" } : ref))
                                  toast.success("Refund marked Completed (Disbursed).")
                                }}>
                                  Mark Disbursed
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Corporate Accounts Tab Content */}
            {activeTab === "corporate" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Corporate SLA Dashboard</h2>
                  <p className="text-xs text-slate-500">Manage SLA metrics and custom policies for B2B Clients.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {b2bClients?.map((client, idx) => (
                    <Card key={idx} className="bg-white border-slate-100 shadow-sm rounded-2xl">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-slate-800 text-sm font-bold">{client.companyName || client.company_name}</CardTitle>
                          <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold">Active SLA</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 text-xs font-semibold text-slate-500">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <p>Contract Email: <span className="text-slate-800">{client.email}</span></p>
                          <p>GST Status: <span className="text-slate-800">{client.gst_number || "Yes"}</span></p>
                          <p>Total Bookings: <span className="text-slate-800">142</span></p>
                          <p>Active Support SLA: <span className="text-indigo-600 font-bold">15 min response</span></p>
                        </div>
                        <div className="border-t border-slate-100 pt-3">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Corporate Escalations</p>
                          <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 flex justify-between items-center">
                            <span className="text-slate-600 font-medium">No open critical ticket SLA breaches for this client.</span>
                            <Check className="h-4 w-4 text-emerald-600 font-bold" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback & NPS Tab Content */}
            {activeTab === "feedback" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Customer Feedback Logs</h2>
                    <p className="text-xs text-slate-500">Trip ratings and NPS metrics. Critical feedback automatically logs complaints.</p>
                  </div>
                  
                  {/* Simulate Feedback Tool */}
                  <Button size="sm" className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold" onClick={() => {
                    const badFdb = {
                      id: `FDB-${Math.floor(100 + Math.random() * 900)}`,
                      customerName: "Rahul Sharma",
                      overallRating: 1,
                      driverRating: 1,
                      vehicleRating: 2,
                      supportRating: 1,
                      comments: "Extremely dirty seat covers and driver arrived late.",
                      nps: 1,
                      tripId: `BK-${Math.floor(10000 + Math.random() * 90000)}`
                    }
                    handleAddFeedback(badFdb)
                  }}>
                    Simulate Bad Feedback (Rating: 1)
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {feedbacks.map((fdb, idx) => (
                    <Card key={idx} className="bg-white border-slate-100 shadow-sm rounded-2xl">
                      <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-800">{fdb.customerName}</h3>
                            <Badge className="bg-slate-100 text-slate-600 text-[10px] font-bold">{fdb.tripId}</Badge>
                          </div>
                          <p className="text-xs text-slate-600 italic font-medium">"{fdb.comments}"</p>
                          <div className="flex gap-4 text-[10px] text-slate-400 font-bold mt-2">
                            <span>Driver: {"★".repeat(fdb.driverRating)}</span>
                            <span>Vehicle: {"★".repeat(fdb.vehicleRating)}</span>
                            <span>Support: {"★".repeat(fdb.supportRating)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overall Rating</p>
                            <p className={`text-2xl font-black ${fdb.overallRating < 3 ? "text-red-500" : "text-emerald-500"}`}>
                              {fdb.overallRating} / 5
                            </p>
                          </div>
                          <div className="text-center bg-slate-50 p-2.5 rounded-xl border border-slate-100 min-w-[60px]">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">NPS</p>
                            <p className="text-sm font-extrabold text-slate-700">{fdb.nps}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline Explorer Tab Content */}
            {activeTab === "timeline" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Customer 360 Timeline</h2>
                  <p className="text-xs text-slate-500">Search customer name/phone to fetch total bookings, lifetime spend, VIP badges, and chronological log.</p>
                </div>

                <form onSubmit={handleTimelineSearchSubmit} className="flex gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Enter customer name or phone number..."
                      value={timelineSearch}
                      onChange={(e) => setTimelineSearch(e.target.value)}
                      className="bg-white border-slate-200 text-slate-800 pl-9 rounded-xl shadow-sm"
                    />
                  </div>
                  <Button type="submit" className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5">Search Profile</Button>
                </form>

                {searchedCustomer ? (
                  <div className="space-y-6">
                    {/* Summary Card */}
                    <Card className="bg-white border-slate-100 shadow-sm rounded-2xl relative overflow-hidden">
                      <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
                      <CardContent className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-16 w-16 border-2 border-indigo-500 shadow-sm">
                            <AvatarFallback className="bg-indigo-50 text-indigo-600 text-xl font-bold">
                              {searchedCustomer.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-black text-slate-800">{searchedCustomer.name}</h3>
                              {searchedCustomer.vip && (
                                <Badge className="bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 font-bold flex items-center gap-1 shadow-sm">
                                  <Award className="h-3 w-3" /> VIP
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 font-semibold">{searchedCustomer.email} | {searchedCustomer.phone}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Repeat Customer Indicator</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-center shrink-0">
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 min-w-[100px]">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lifetime Spend</p>
                            <p className="text-lg font-black text-emerald-600">₹{searchedCustomer.spend || 24000}</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 min-w-[100px]">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bookings</p>
                            <p className="text-lg font-black text-slate-700">{searchedCustomer.bookings || 12}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Timeline List */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-slate-800">Chronological Logs</h3>
                      
                      <div className="relative border-l-2 border-slate-200 pl-6 ml-4 space-y-6">
                        {[
                          { date: "Jul 16, 2026", title: "Support Ticket Resolved", desc: "Ticket TK-TEST-002 closed by Sneha S. (Resolved driver late delay query)", icon: CheckCircle, color: "text-emerald-600" },
                          { date: "Jul 15, 2026", title: "Corporate Booking Completed", desc: "BK20092: Delhi Airport T3 to Connaught Place, Delhi. Paid ₹ 1,250 via Wallet.", icon: Activity, color: "text-indigo-600" },
                          { date: "Jul 10, 2026", title: "Support Ticket Opened", desc: "Reported driver behaviour concern via Phone Call.", icon: AlertTriangle, color: "text-red-600" },
                          { date: "Jun 24, 2026", title: "Refund Disbursed", desc: "Refund of ₹ 350 issued to HDFC source gateway on cancellation.", icon: DollarSign, color: "text-pink-600" }
                        ].map((log, idx) => (
                          <div key={idx} className="relative">
                            <span className="absolute -left-[35px] top-1 p-1 bg-white border border-slate-200 rounded-full shadow-sm">
                              <log.icon className={`h-4 w-4 ${log.color}`} />
                            </span>
                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-400 font-bold font-mono">{log.date}</span>
                              <h4 className="text-sm font-bold text-slate-850">{log.title}</h4>
                              <p className="text-xs text-slate-500 font-medium leading-relaxed">{log.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400 font-semibold text-sm bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    Search a customer's name to view their 360-degree timeline.
                  </div>
                )}
              </div>
            )}

            {/* Knowledge Base Tab Content */}
            {activeTab === "kb" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">CRM Knowledge Base & SOPs</h2>
                  <p className="text-xs text-slate-500">Search emergency guidelines, refund limits, and corporate procedures.</p>
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input placeholder="Search policies, SOPs, FAQs..." className="bg-white border-slate-200 text-slate-800 pl-9 rounded-xl" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {[
                    { title: "Refund Policy (SOP-011)", desc: "Maximum refund limit is ₹ 1,500. Escalation to TL required for any cash refunds above threshold.", tag: "Refunds" },
                    { title: "Emergency & Safety SOP (SOP-024)", desc: "Immediately route call to operations desk. Contact local authorities and dispatch rescue cabs.", tag: "Safety" },
                    { title: "Cancellation Policy (SOP-005)", desc: "B2C cancellation is free up to 60 mins before pickup. B2B cancellation holds custom client terms.", tag: "Cancellations" },
                    { title: "Airport SOP - Terminal Transfers", desc: "Coordinators must track airport toll pass validity and terminal access lanes.", tag: "Operations" }
                  ].map((kb, idx) => (
                    <Card key={idx} className="bg-white border-slate-100 hover:border-indigo-400/50 hover:shadow-md transition-all duration-200 cursor-pointer rounded-2xl shadow-sm">
                      <CardHeader className="p-4 pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-slate-800 text-sm font-bold">{kb.title}</CardTitle>
                          <Badge className="bg-slate-100 text-slate-600 text-[10px] font-bold">{kb.tag}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 text-xs text-slate-500 font-medium">
                        <p>{kb.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Reports Tab Content */}
            {activeTab === "reports" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">CRM Reports & Analytics Downloads</h2>
                  <p className="text-xs text-slate-500">Download CSAT, NPS audits, complaint indices, and agent performance reports.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { title: "NPS & CSAT Quarterly Audit", format: "PDF", desc: "Detailed customer feedback sentiment report." },
                    { title: "Complaint Category Index", format: "Excel", desc: "Statistical distribution of operations complaints." },
                    { title: "Agent Performance & SLA Compliance", format: "CSV", desc: "Average response and resolution time matrices." }
                  ].map((rep, idx) => (
                    <Card key={idx} className="bg-white border-slate-100 shadow-sm rounded-2xl">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-slate-800 text-sm font-bold">{rep.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 text-xs text-slate-500 font-medium space-y-4">
                        <p>{rep.desc}</p>
                        <Button
                          size="xs"
                          className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl py-3"
                          onClick={() => {
                            toast.success(`Download started: ${rep.title}.${rep.format.toLowerCase()}`)
                          }}
                        >
                          <Download className="h-3.5 w-3.5 mr-2 text-inherit" /> Download as {rep.format}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Settings Tab Content */}
            {activeTab === "settings" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">CRM Settings & Access Control</h2>
                  <p className="text-xs text-slate-500">Global configuration and role permissions guidelines.</p>
                </div>

                <Card className="bg-white border-slate-100 shadow-sm rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-slate-800 text-sm font-bold flex items-center gap-2">
                      <Shield className="h-4.5 w-4.5 text-indigo-600" />
                      Centrally Managed Role Permissions
                    </CardTitle>
                    <CardDescription className="text-slate-400 text-xs">
                      All CRM submodule permissions are configured globally to maintain role integrity across the portal.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-600 font-medium leading-relaxed">
                      To grant or revoke access to CRM sections (Dashboard, Tickets, Refunds, SLA, Complaints, etc.) for various staff roles, please navigate to the main <strong>Roles & Permissions</strong> dashboard.
                    </div>
                    <Button
                      onClick={() => window.location.href = "/roles"}
                      className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5"
                    >
                      Go to Roles & Permissions
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

        </div>

      </div>
    </>
  )
}
