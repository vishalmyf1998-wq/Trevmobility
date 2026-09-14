// @ts-nocheck
'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useAdmin } from '@/lib/admin-context'
import { useTelephony } from '@/lib/telephony-context'
import {
  getExotelConfig,
  saveExotelConfig,
  formatDuration,
  formatDurationHuman,
  formatPhone,
  getCallStatusColor,
  getCallStatusLabel,
  getCallTypeLabel,
  getCallCategoryLabel,
  getSentimentBadge,
  resetDemoCallData,
} from '@/lib/exotel'
import {
  CallLog,
  CallFollowUp,
  CallStatus,
  CallDirection,
  CallType,
  CallCategory,
} from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  PhoneOff,
  PhoneForwarded,
  Search,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Car,
  User,
  Users,
  Building2,
  Shield,
  FileText,
  Settings,
  Headset,
  Tag,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Layers,
  Check,
  Zap,
  BarChart3,
  Copy,
  ExternalLink,
  X,
  MapPin,
  MessageSquare,
} from 'lucide-react'
import { toast } from 'sonner'

const CHART_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function CallCenterPage() {
  const { bookings, drivers, b2cCustomers, b2bClients } = useAdmin()
  const {
    activeCall,
    incomingCall,
    callLogs,
    followUps,
    isDialing,
    dialNumber,
    hangupCall,
    simulateIncomingCall,
    resolveFollowUp,
    refreshData,
  } = useTelephony()

  const [activeTab, setActiveTab] = useState('dialer')

  // Dialer form state
  const [dialPhoneNumber, setDialPhoneNumber] = useState('')
  const [selectedContactType, setSelectedContactType] = useState<CallType>('customer')
  const [selectedBookingId, setSelectedBookingId] = useState<string>('none')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('none')
  const [selectedDriverId, setSelectedDriverId] = useState<string>('none')
  const [selectedCategory, setSelectedCategory] = useState<CallCategory>('booking_enquiry')
  const [dialNotes, setDialNotes] = useState('')

  // Call History Filters
  const [historySearch, setHistorySearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [directionFilter, setDirectionFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Inspection Drawer / Modal State
  const [selectedCallDetail, setSelectedCallDetail] = useState<CallLog | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  // Audio Player State for Recording
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [audioPlaybackSpeed, setAudioPlaybackSpeed] = useState(1)
  const [audioProgress, setAudioProgress] = useState(0)
  const [audioDuration, setAudioDuration] = useState(140)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Configuration Settings State
  const [config, setConfig] = useState(getExotelConfig())
  const [isTestingConfig, setIsTestingConfig] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  // Follow-up resolution modal
  const [resolvingFollowUp, setResolvingFollowUp] = useState<CallFollowUp | null>(null)
  const [resolveNotes, setResolveNotes] = useState('')

  // Agent Status & Queue Management
  const [agentStatus, setAgentStatus] = useState<'available' | 'busy' | 'offline'>('available')
  const [queueStats, setQueueStats] = useState({ waiting: 0, active: 0, avgWait: 0 })
  const [quickReplyText, setQuickReplyText] = useState('')
  const [showTransferDialog, setShowTransferDialog] = useState(false)
  const [transferTarget, setTransferTarget] = useState('')

  // Quick Reply Templates
  const quickReplyTemplates = [
    { id: '1', label: '✅ Confirm Booking', text: 'Your booking has been confirmed. You will receive a driver update shortly.' },
    { id: '2', label: '⏰ Running Late', text: 'Your driver is running slightly late. We are tracking the location and will update you shortly.' },
    { id: '3', label: '❓ Enquiry', text: 'Thank you for calling. How can I help you today?' },
    { id: '4', label: '🚫 Cancel', text: 'I understand you wish to cancel. Let me check the cancellation policy and assist you.' },
    { id: '5', label: '💰 Refund', text: 'Your refund has been initiated. It will reflect in your account within 5-7 business days.' },
    { id: '6', label: '🚗 Driver Issue', text: 'I have noted your concern about the driver. Our team will investigate and get back to you.' },
  ]

  // Simulate live queue stats
  useEffect(() => {
    const interval = setInterval(() => {
      setQueueStats({
        waiting: Math.floor(Math.random() * 5),
        active: Math.floor(Math.random() * 8) + 2,
        avgWait: Math.floor(Math.random() * 45) + 10,
      })
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Agent status change handler
  const handleAgentStatusChange = (status: 'available' | 'busy' | 'offline') => {
    setAgentStatus(status)
    const labels = { available: 'Available', busy: 'Busy', offline: 'Offline' }
    toast.success(`Status changed to ${labels[status]}`)
  }

  // Incoming Call Auto-Tab System
  const [openIncomingTabs, setOpenIncomingTabs] = useState<Map<string, { callSid: string; contactName: string; contactType: string; fromNumber: string; bookingNumber?: string; customerName?: string; driverName?: string; b2bClientName?: string; rides: any[] }>>(new Map())
  const [activeIncomingTab, setActiveIncomingTab] = useState<string | null>(null)

  // Auto-open tab when incoming call arrives
  useEffect(() => {
    if (!incomingCall) return
    const tabId = `inc-${incomingCall.callSid}`
    if (openIncomingTabs.has(tabId)) return

    // Find customer rides
    const customerRides = bookings.filter(b => 
      b.customerPhone === incomingCall.fromNumber || 
      b.customerPhone?.replace(/\s/g, '') === incomingCall.fromNumber?.replace(/\s/g, '')
    )

    const tabData = {
      callSid: incomingCall.callSid,
      contactName: incomingCall.contactName,
      contactType: incomingCall.contactType,
      fromNumber: incomingCall.fromNumber,
      bookingNumber: incomingCall.bookingNumber,
      customerName: incomingCall.contactType === 'customer' ? incomingCall.contactName : undefined,
      driverName: incomingCall.contactType === 'driver' ? incomingCall.contactName : undefined,
      b2bClientName: incomingCall.contactType === 'corporate' ? incomingCall.contactName : undefined,
      rides: customerRides,
    }

    setOpenIncomingTabs(prev => new Map(prev).set(tabId, tabData))
    setActiveIncomingTab(tabId)
    toast.info(`Auto-opened customer details for ${incomingCall.contactName}`, {
      description: `${customerRides.length} ride(s) found`
    })
  }, [incomingCall, bookings, openIncomingTabs])

  // Close incoming tab
  const closeIncomingTab = (tabId: string) => {
    setOpenIncomingTabs(prev => {
      const next = new Map(prev)
      next.delete(tabId)
      return next
    })
    if (activeIncomingTab === tabId) {
      setActiveIncomingTab(openIncomingTabs.size > 1 ? Array.from(openIncomingTabs.keys()).find(k => k !== tabId) || null : null)
    }
  }

  // Audio progress simulator
  useEffect(() => {
    let interval: any
    if (isPlayingAudio) {
      interval = setInterval(() => {
        setAudioProgress((prev) => {
          if (prev >= audioDuration) {
            setIsPlayingAudio(false)
            return 0
          }
          return prev + 1 * audioPlaybackSpeed
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isPlayingAudio, audioDuration, audioPlaybackSpeed])

  // Sync selected booking to dial form
  const handleBookingSelect = (bookingId: string) => {
    setSelectedBookingId(bookingId)
    if (bookingId === 'none') return

    const bk = bookings.find((b) => b.id === bookingId)
    if (bk) {
      if (selectedContactType === 'driver') {
        const drv = drivers.find((d) => d.id === bk.driverId)
        if (drv) {
          setDialPhoneNumber(drv.phone)
          setSelectedDriverId(drv.id)
        }
      } else {
        setDialPhoneNumber(bk.customerPhone)
        if (bk.b2cCustomerId) setSelectedCustomerId(bk.b2cCustomerId)
      }
    }
  }

  // Dial Pad Digit Click
  const handleDialPadPress = (digit: string) => {
    setDialPhoneNumber((prev) => prev + digit)
  }

  const handleDialPadBackspace = () => {
    setDialPhoneNumber((prev) => prev.slice(0, -1))
  }

  // Execute Outbound Dial
  const handleInitiateCall = async () => {
    if (!dialPhoneNumber.trim()) {
      toast.error('Please enter a destination phone number.')
      return
    }

    const matchedBooking = bookings.find((b) => b.id === selectedBookingId)
    const matchedCustomer = b2cCustomers.find((c) => c.id === selectedCustomerId)
    const matchedDriver = drivers.find((d) => d.id === selectedDriverId)

    const success = await dialNumber({
      to: dialPhoneNumber,
      type: selectedContactType,
      contactName:
        selectedContactType === 'driver'
          ? matchedDriver?.name || 'Driver'
          : matchedCustomer?.name || matchedBooking?.customerName || 'Customer',
      bookingId: matchedBooking?.id,
      bookingNumber: matchedBooking?.bookingNumber,
      customerId: matchedCustomer?.id || matchedBooking?.b2cCustomerId,
      customerName: matchedCustomer?.name || matchedBooking?.customerName,
      driverId: matchedDriver?.id || matchedBooking?.driverId,
      driverName: matchedDriver?.name,
      category: selectedCategory,
      notes: dialNotes,
    })

    if (success) {
      setDialNotes('')
    }
  }

  // Redial from History or Missed queue
  const handleRedial = (call: CallLog) => {
    const targetPhone = call.direction === 'inbound' ? call.fromNumber : call.toNumber
    setDialPhoneNumber(targetPhone)
    setSelectedContactType(call.callType || 'customer')
    if (call.bookingId) setSelectedBookingId(call.bookingId)
    if (call.category) setSelectedCategory(call.category)
    setActiveTab('dialer')
    toast.info(`Pre-filled dialer with ${formatPhone(targetPhone)}`)
  }

  // Open Call Details Modal
  const openCallDetails = (call: CallLog) => {
    setSelectedCallDetail(call)
    setIsPlayingAudio(false)
    setAudioProgress(0)
    setAudioDuration(call.durationSeconds || 120)
    setIsDetailModalOpen(true)
  }

  // Toggle Audio Playback
  const toggleAudio = () => {
    setIsPlayingAudio(!isPlayingAudio)
  }

  // Save Settings
  const handleSaveSettings = () => {
    const updated = saveExotelConfig(config)
    setConfig(updated)
    toast.success('Exotel Telephony settings saved successfully!')
  }

  // Test Settings Connection
  const handleTestConnection = async () => {
    setIsTestingConfig(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/exotel/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountSid: config.accountSid,
          apiToken: config.apiToken,
          subdomain: config.subdomain,
          callerId: config.callerId,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setTestResult({ success: true, message: data.message })
        toast.success(data.message)
      } else {
        setTestResult({ success: false, message: data.error || 'Connection failed' })
        toast.error(data.error || 'Connection failed')
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message })
      toast.error(err.message)
    } finally {
      setIsTestingConfig(false)
    }
  }

  // Resolve Follow-up Task
  const handleConfirmResolve = () => {
    if (!resolvingFollowUp) return
    resolveFollowUp(resolvingFollowUp.id, resolveNotes)
    setResolvingFollowUp(null)
    setResolveNotes('')
  }

  // Filtered Call Logs
  const filteredCallLogs = useMemo(() => {
    return callLogs.filter((log) => {
      const q = historySearch.toLowerCase()
      const matchQuery =
        !q ||
        log.fromNumber.toLowerCase().includes(q) ||
        log.toNumber.toLowerCase().includes(q) ||
        (log.customerName && log.customerName.toLowerCase().includes(q)) ||
        (log.driverName && log.driverName.toLowerCase().includes(q)) ||
        (log.bookingNumber && log.bookingNumber.toLowerCase().includes(q)) ||
        (log.agentName && log.agentName.toLowerCase().includes(q))

      const matchStatus = statusFilter === 'all' || log.status === statusFilter
      const matchDirection = directionFilter === 'all' || log.direction === directionFilter
      const matchType = typeFilter === 'all' || log.callType === typeFilter
      const matchCategory = categoryFilter === 'all' || log.category === categoryFilter

      return matchQuery && matchStatus && matchDirection && matchType && matchCategory
    })
  }, [callLogs, historySearch, statusFilter, directionFilter, typeFilter, categoryFilter])

  // Missed Calls Queue
  const missedCallsQueue = useMemo(() => {
    return callLogs.filter(
      (log) => log.status === 'missed' || log.status === 'failed' || log.status === 'no_answer'
    )
  }, [callLogs])

  // Aggregate Metrics & KPIs
  const stats = useMemo(() => {
    const total = callLogs.length
    const answered = callLogs.filter((l) => l.status === 'answered' || l.status === 'completed').length
    const missed = missedCallsQueue.length
    const totalDuration = callLogs.reduce((acc, l) => acc + (l.durationSeconds || 0), 0)
    const avgDuration = answered > 0 ? Math.round(totalDuration / answered) : 0
    const answerRate = total > 0 ? Math.round((answered / total) * 100) : 100
    const pendingFollowUps = followUps.filter((f) => f.status === 'pending').length

    return {
      total,
      answered,
      missed,
      totalDuration,
      avgDuration,
      answerRate,
      pendingFollowUps,
    }
  }, [callLogs, missedCallsQueue, followUps])

  // Chart Data: Hourly Distribution
  const hourlyCallData = [
    { hour: '08:00', calls: 8, answered: 7 },
    { hour: '10:00', calls: 24, answered: 22 },
    { hour: '12:00', calls: 35, answered: 31 },
    { hour: '14:00', calls: 28, answered: 26 },
    { hour: '16:00', calls: 42, answered: 38 },
    { hour: '18:00', calls: 50, answered: 44 },
    { hour: '20:00', calls: 33, answered: 30 },
  ]

  // Chart Data: Call Outcome Breakdown
  const outcomeData = [
    { name: 'Answered', value: Math.max(stats.answered, 4) },
    { name: 'Missed', value: Math.max(stats.missed, 1) },
    { name: 'Busy / Failed', value: 2 },
  ]

  // Agent Leaderboard Sample
  const agentPerformance = [
    { name: 'Rohan Sharma', total: 46, answered: 43, rate: '93%', aht: '2m 15s', fup: 8, csat: '4.8 ★' },
    { name: 'Pooja Iyer', total: 39, answered: 37, rate: '95%', aht: '1m 52s', fup: 5, csat: '4.9 ★' },
    { name: 'Amit Verma', total: 31, answered: 28, rate: '90%', aht: '3m 10s', fup: 6, csat: '4.7 ★' },
    { name: 'Sneha Kapoor', total: 24, answered: 22, rate: '92%', aht: '2m 30s', fup: 4, csat: '4.6 ★' },
  ]

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header & Ambient Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0c101d] via-[#12182b] to-[#0c101d] border border-white/10 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 shadow-inner shrink-0">
              <Headset className="w-7 h-7 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-3xl font-black tracking-tight text-white">
                  Exotel Call Center
                </h1>
                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-0.5 flex items-center gap-1.5 font-bold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Cloud Telephony Online
                </Badge>
              </div>
              <p className="text-sm font-medium text-white/60 mt-1">
                Integrated Telephony Hub: Inbound & Outbound Calling, Call Recordings, AI Intelligence & Automated Follow-ups
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Agent Status Toggle */}
            <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
              {(['available', 'busy', 'offline'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => handleAgentStatusChange(status)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
                    agentStatus === status
                      ? status === 'available' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                      : status === 'busy' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                      : 'bg-slate-600 text-white'
                      : 'text-white/50 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Live Queue Stats */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[11px] font-bold text-cyan-300">
                  Q: {queueStats.waiting} waiting • {queueStats.active} active • {queueStats.avgWait}s avg
                </span>
              </div>
            </div>

            {/* Simulate Inbound Button */}
            <Button
              onClick={() => simulateIncomingCall()}
              variant="outline"
              className="rounded-xl border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-bold text-xs h-10 px-3.5 shadow-sm"
              title="Trigger a test inbound call screen-pop"
            >
              <PhoneIncoming className="w-4 h-4 mr-2 text-indigo-400 animate-pulse" />
              Simulate Inbound Call
            </Button>

            {/* Reset Demo Data Button */}
            <Button
              onClick={() => {
                resetDemoCallData()
                refreshData()
                toast.success('Sample telephony data reset!')
              }}
              variant="ghost"
              size="icon"
              className="rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white h-10 w-10"
              title="Reset sample calls"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Calls */}
        <Card className="bg-[#0f1424]/80 border-white/10 shadow-sm backdrop-blur-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Total Calls</p>
              <h3 className="text-2xl font-black text-white mt-0.5">{stats.total}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <PhoneCall className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Answer Rate */}
        <Card className="bg-[#0f1424]/80 border-white/10 shadow-sm backdrop-blur-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Answer Rate</p>
              <h3 className="text-2xl font-black text-emerald-400 mt-0.5">{stats.answerRate}%</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Missed Calls */}
        <Card className="bg-[#0f1424]/80 border-white/10 shadow-sm backdrop-blur-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Missed Calls</p>
              <h3 className="text-2xl font-black text-amber-400 mt-0.5">{stats.missed}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <PhoneMissed className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Total Talk Time */}
        <Card className="bg-[#0f1424]/80 border-white/10 shadow-sm backdrop-blur-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Total Talk Time</p>
              <h3 className="text-2xl font-black text-cyan-400 mt-0.5">
                {formatDurationHuman(stats.totalDuration)}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Average Handle Time (AHT) */}
        <Card className="bg-[#0f1424]/80 border-white/10 shadow-sm backdrop-blur-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Avg Duration</p>
              <h3 className="text-2xl font-black text-purple-400 mt-0.5">
                {formatDuration(stats.avgDuration)}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Zap className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Follow-ups Queue */}
        <Card className="bg-[#0f1424]/80 border-white/10 shadow-sm backdrop-blur-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Pending Tasks</p>
              <h3 className="text-2xl font-black text-rose-400 mt-0.5">{stats.pendingFollowUps}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Incoming Call Auto-Tabs Bar */}
      {openIncomingTabs.size > 0 && (
        <div className="mb-4 bg-[#0f1424] border border-white/10 rounded-2xl p-3 shadow-xl">
          <div className="flex items-center gap-2 overflow-x-auto">
            <PhoneIncoming className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider shrink-0 mr-2">
              Active Incoming Details:
            </span>
            {Array.from(openIncomingTabs.entries()).map(([tabId, data]) => (
              <div
                key={tabId}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all shrink-0 ${
                  activeIncomingTab === tabId
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-white/60'
                }`}
              >
                <PhoneIncoming className="w-3 h-3" />
                <span className="text-xs font-bold">{data.contactName}</span>
                <span className="text-[10px] text-white/40">({data.rides.length} rides)</span>
                <button
                  onClick={() => {
                    setActiveIncomingTab(tabId)
                    closeIncomingTab(tabId)
                  }}
                  className="text-white/40 hover:text-rose-400 ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Incoming Call Customer Details Panel */}
        {activeIncomingTab && openIncomingTabs.get(activeIncomingTab) && (
          <div className="mb-6 bg-[#0f1424] border border-emerald-500/30 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <PhoneIncoming className="w-5 h-5 text-emerald-400" /> Incoming Call — Customer Details
              </h3>
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                {openIncomingTabs.get(activeIncomingTab)!.contactType}
              </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Customer Summary Card */}
              <div className="lg:col-span-1 space-y-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-bold text-white">
                        {openIncomingTabs.get(activeIncomingTab)!.contactName}
                      </p>
                      <p className="text-xs text-white/50 font-mono">
                        {openIncomingTabs.get(activeIncomingTab)!.fromNumber}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-white/50">Contact Type:</span>
                      <span className="font-bold text-white capitalize">
                        {openIncomingTabs.get(activeIncomingTab)!.contactType}
                      </span>
                    </div>
                    {openIncomingTabs.get(activeIncomingTab)!.bookingNumber && (
                      <div className="flex justify-between">
                        <span className="text-white/50">Booking:</span>
                        <span className="font-mono font-bold text-cyan-400">
                          {openIncomingTabs.get(activeIncomingTab)!.bookingNumber}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <p className="text-[11px] font-bold text-white/50 uppercase tracking-wider mb-2">
                    Quick Actions
                  </p>
                  <Button
                    size="sm"
                    className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                    onClick={() => {
                      const data = openIncomingTabs.get(activeIncomingTab)!
                      dialNumber({
                        to: data.fromNumber,
                        type: data.contactType as CallType,
                        contactName: data.contactName,
                        bookingNumber: data.bookingNumber,
                      })
                    }}
                  >
                    <PhoneCall className="w-3 h-3 mr-2" /> Call Back
                  </Button>
                  <Link href="/bookings" className="block">
                    <Button size="sm" variant="outline" className="w-full rounded-xl border-white/10 text-white text-xs font-bold">
                      <ExternalLink className="w-3 h-3 mr-2" /> View All Bookings
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Rides History Table */}
              <div className="lg:col-span-2">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Car className="w-4 h-4 text-cyan-400" /> Ride History
                      <span className="text-[11px] text-white/40 font-normal">
                        ({openIncomingTabs.get(activeIncomingTab)!.rides.length} rides)
                      </span>
                    </h4>
                  </div>
                  {openIncomingTabs.get(activeIncomingTab)!.rides.length > 0 ? (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                      {openIncomingTabs.get(activeIncomingTab)!.rides.map((ride: any) => (
                        <div
                          key={ride.id}
                          className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-indigo-500/30 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-mono font-bold text-cyan-400 text-xs">
                                {ride.bookingNumber}
                              </span>
                              <span className="text-[11px] text-white/50 ml-2">
                                {ride.pickupDate} {ride.pickupTime}
                              </span>
                            </div>
                            <Badge
                              className={`text-[10px] ${
                                ride.status === 'completed'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : ride.status === 'in_progress'
                                  ? 'bg-blue-500/10 text-blue-400'
                                  : 'bg-amber-500/10 text-amber-400'
                              }`}
                            >
                              {ride.status}
                            </Badge>
                          </div>
                          <div className="mt-2 text-xs text-white/70">
                            <MapPin className="w-3 h-3 inline mr-1 text-emerald-400" />
                            {ride.pickupLocation?.slice(0, 40)} → {ride.dropLocation?.slice(0, 40)}
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[11px]">
                            <span className="text-white/50">
                              ₹ {ride.grandTotal}
                            </span>
                            {ride.driverName && (
                              <span className="text-white/50">
                                Driver: {ride.driverName}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Car className="w-10 h-10 text-white/20 mx-auto mb-2" />
                      <p className="text-xs text-white/50">No previous rides found</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="bg-[#0f1424] border border-white/10 p-1.5 rounded-2xl flex flex-wrap gap-1.5 h-auto">
          <TabsTrigger
            value="dialer"
            className="rounded-xl text-xs font-bold py-2.5 px-4 data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-white/70"
          >
            <Phone className="w-4 h-4 mr-2" />
            Live Dialer & Console
          </TabsTrigger>

          <TabsTrigger
            value="history"
            className="rounded-xl text-xs font-bold py-2.5 px-4 data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-white/70"
          >
            <Clock className="w-4 h-4 mr-2" />
            Call History ({callLogs.length})
          </TabsTrigger>

          <TabsTrigger
            value="missed"
            className="rounded-xl text-xs font-bold py-2.5 px-4 data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-white/70 relative"
          >
            <PhoneMissed className="w-4 h-4 mr-2 text-amber-400" />
            Missed Calls
            {stats.missed > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded-full text-[10px] font-bold border border-amber-500/30">
                {stats.missed}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger
            value="followups"
            className="rounded-xl text-xs font-bold py-2.5 px-4 data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-white/70 relative"
          >
            <CheckCircle2 className="w-4 h-4 mr-2 text-rose-400" />
            Follow-ups & Tasks
            {stats.pendingFollowUps > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-rose-500/20 text-rose-300 rounded-full text-[10px] font-bold border border-rose-500/30">
                {stats.pendingFollowUps}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger
            value="reports"
            className="rounded-xl text-xs font-bold py-2.5 px-4 data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-white/70"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Productivity Reports
          </TabsTrigger>

          <TabsTrigger
            value="settings"
            className="rounded-xl text-xs font-bold py-2.5 px-4 data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-white/70"
          >
            <Settings className="w-4 h-4 mr-2" />
            Exotel Configuration
          </TabsTrigger>
        </TabsList>

        {/* ============================================================ */}
        {/* TAB 1: LIVE DIALER & CONSOLE */}
        {/* ============================================================ */}
        <TabsContent value="dialer" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Softphone Dial Pad */}
            <div className="lg:col-span-5 bg-[#0f1424] border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <PhoneCall className="w-5 h-5 text-indigo-400" /> Outbound Quick Dialer
                </h3>
                <p className="text-xs text-white/50">
                  Virtual Caller ID: <span className="font-mono text-cyan-400 font-bold">{config.callerId}</span>
                </p>
              </div>

              {/* Number Input Box */}
              <div className="relative">
                <Input
                  value={dialPhoneNumber}
                  onChange={(e) => setDialPhoneNumber(e.target.value)}
                  placeholder="+91 99999 99999"
                  className="h-14 bg-white/5 border-white/10 rounded-2xl text-center text-xl font-mono font-bold text-white tracking-wider focus:border-indigo-500"
                />
                {dialPhoneNumber && (
                  <button
                    onClick={handleDialPadBackspace}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-white/40 hover:text-white"
                  >
                    ⌫
                  </button>
                )}
              </div>

              {/* Keypad Grid */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { digit: '1', sub: '' },
                  { digit: '2', sub: 'ABC' },
                  { digit: '3', sub: 'DEF' },
                  { digit: '4', sub: 'GHI' },
                  { digit: '5', sub: 'JKL' },
                  { digit: '6', sub: 'MNO' },
                  { digit: '7', sub: 'PQRS' },
                  { digit: '8', sub: 'TUV' },
                  { digit: '9', sub: 'WXYZ' },
                  { digit: '*', sub: '' },
                  { digit: '0', sub: '+' },
                  { digit: '#', sub: '' },
                ].map((key, i) => (
                  <button
                    key={i}
                    onClick={() => handleDialPadPress(key.digit)}
                    className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-indigo-600/30 border border-white/5 text-white flex flex-col items-center justify-center transition-all active:scale-95 group"
                  >
                    <span className="text-lg font-bold">{key.digit}</span>
                    {key.sub && <span className="text-[9px] text-white/40 group-hover:text-white/70">{key.sub}</span>}
                  </button>
                ))}
              </div>

              {/* Dial Button */}
              <Button
                onClick={handleInitiateCall}
                disabled={isDialing || Boolean(activeCall)}
                className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <PhoneCall className="w-5 h-5 animate-pulse" />
                {activeCall ? 'Call In Progress...' : isDialing ? 'Connecting...' : 'Dial Outbound Call'}
              </Button>
            </div>

            {/* Right: Context Mapping & Pre-call Setup */}
            <div className="lg:col-span-7 space-y-6">
              {/* Context Selector Card */}
              <Card className="bg-[#0f1424] border-white/10 rounded-3xl p-6 shadow-xl space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-cyan-400" /> Associate Context & Booking
                  </h3>
                  <p className="text-xs text-white/50">
                    Map this call to an active Booking, Customer, or Driver for complete operational history.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Contact Type */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-white/50">
                      Party Type
                    </label>
                    <Select
                      value={selectedContactType}
                      onValueChange={(val: CallType) => setSelectedContactType(val)}
                    >
                      <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-xl text-white text-xs font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#121727] border-white/10 text-white text-xs">
                        <SelectItem value="customer">B2C Customer</SelectItem>
                        <SelectItem value="driver">Driver Partner</SelectItem>
                        <SelectItem value="corporate">B2B Corporate Account</SelectItem>
                        <SelectItem value="support">Support Desk</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Call Category */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-white/50">
                      Call Purpose / Category
                    </label>
                    <Select
                      value={selectedCategory}
                      onValueChange={(val: CallCategory) => setSelectedCategory(val)}
                    >
                      <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-xl text-white text-xs font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#121727] border-white/10 text-white text-xs">
                        <SelectItem value="booking_enquiry">Booking Enquiry</SelectItem>
                        <SelectItem value="complaint">Customer Complaint</SelectItem>
                        <SelectItem value="driver_issue">Driver & Route Issue</SelectItem>
                        <SelectItem value="cancellation">Ride Cancellation</SelectItem>
                        <SelectItem value="payment">Payment & Invoice</SelectItem>
                        <SelectItem value="general">General Support</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Booking Linking Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center justify-between">
                    <span>Link Booking ID (Optional)</span>
                    <span className="text-[11px] text-cyan-400 font-normal">Auto-fills phone</span>
                  </label>
                  <Select value={selectedBookingId} onValueChange={handleBookingSelect}>
                    <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-xl text-white text-xs">
                      <SelectValue placeholder="Select or search booking..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#121727] border-white/10 text-white text-xs max-h-64">
                      <SelectItem value="none">-- No Booking Link --</SelectItem>
                      {bookings.slice(0, 15).map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.bookingNumber} — {b.customerName} ({b.customerPhone}) [{b.pickupLocation?.slice(0, 20)}...]
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Pre-call Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-white/50">
                    Call Purpose Notes
                  </label>
                  <Input
                    value={dialNotes}
                    onChange={(e) => setDialNotes(e.target.value)}
                    placeholder="e.g. Inquiring regarding baggage size, or updating flight delay..."
                    className="h-11 bg-white/5 border-white/10 rounded-xl text-white text-xs placeholder:text-white/30"
                  />
                </div>
              </Card>

              {/* Test Scenarios Panel for Instant Evaluation */}
              <div className="p-5 rounded-3xl bg-indigo-500/5 border border-indigo-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Quick Demo Scenarios
                  </span>
                  <span className="text-[11px] text-white/40">1-click simulation</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() =>
                      simulateIncomingCall({
                        contactName: 'Raghav Mehra (VIP)',
                        fromNumber: '+91 98200 11223',
                        contactType: 'customer',
                        bookingNumber: 'BK-2026-095',
                        pickupLocation: 'Terminal 3, IGI Airport',
                        dropLocation: 'DLF Phase 5, Gurugram',
                        fare: 1650,
                      })
                    }
                    className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-left transition-all text-xs"
                  >
                    <p className="font-bold text-white">🛬 Airport Customer</p>
                    <p className="text-[11px] text-white/50 truncate">Luggage & arrival query</p>
                  </button>

                  <button
                    onClick={() =>
                      simulateIncomingCall({
                        contactName: 'Driver Rakesh Yadav',
                        fromNumber: '+91 98711 33445',
                        contactType: 'driver',
                        bookingNumber: 'BK-2026-092',
                        pickupLocation: 'Sector 62, Noida',
                        dropLocation: 'Connaught Place, Delhi',
                        fare: 890,
                      })
                    }
                    className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-left transition-all text-xs"
                  >
                    <p className="font-bold text-white">🚗 Toll Jam Alert</p>
                    <p className="text-[11px] text-white/50 truncate">Driver reporting route delay</p>
                  </button>

                  <button
                    onClick={() =>
                      simulateIncomingCall({
                        contactName: 'Shalini Singhal (Accenture)',
                        fromNumber: '+91 98109 88776',
                        contactType: 'corporate',
                        bookingNumber: 'BK-2026-089',
                        pickupLocation: 'Cyber City, Gurugram',
                        dropLocation: 'Aerocity, Delhi',
                        fare: 1100,
                      })
                    }
                    className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-left transition-all text-xs"
                  >
                    <p className="font-bold text-white">💼 B2B Corporate</p>
                    <p className="text-[11px] text-white/50 truncate">GST invoice consolidation</p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ============================================================ */}
        {/* QUICK REPLY TEMPLATES — FULL WIDTH SECTION */}
        {/* ============================================================ */}
        <div className="mt-6 p-5 rounded-3xl bg-gradient-to-r from-cyan-500/5 to-indigo-500/5 border border-cyan-500/20 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cyan-400" /> Quick Reply Templates
            </h4>
            {activeCall && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowTransferDialog(true)}
                className="h-8 rounded-xl bg-amber-500/10 border-amber-500/30 text-amber-400 text-xs font-bold hover:bg-amber-500/20"
              >
                <PhoneForwarded className="w-3.5 h-3.5 mr-1.5" /> Transfer Call
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {quickReplyTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => {
                  setQuickReplyText(template.text)
                  toast.success(`Template: ${template.label}`)
                }}
                className="p-4 rounded-2xl bg-[#0f1424]/60 hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 text-left transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/10"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-cyan-400" />
                  </div>
                  <p className="text-sm font-bold text-white">{template.label}</p>
                </div>
                <p className="text-xs text-white/60 leading-relaxed line-clamp-3">{template.text}</p>
              </button>
            ))}
          </div>
          {quickReplyText && (
            <div className="mt-4 p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  <p className="text-sm text-cyan-300 font-medium">{quickReplyText}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setQuickReplyText('')}
                  className="h-7 rounded-lg text-xs text-white/50 hover:text-white hover:bg-white/10"
                >
                  Clear
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* TAB 2: CALL HISTORY & RECORDINGS */}
        {/* ============================================================ */}
        <TabsContent value="history" className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-[#0f1424] p-4 rounded-3xl border border-white/10 shadow-xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search phone, name, booking..."
                  className="pl-9 h-10 bg-white/5 border-white/10 text-xs text-white placeholder:text-white/30 rounded-xl"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 bg-white/5 border-white/10 text-xs text-white rounded-xl">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="bg-[#121727] border-white/10 text-white text-xs">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="answered">Answered / Completed</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="failed">Failed / Busy</SelectItem>
                </SelectContent>
              </Select>

              {/* Direction Filter */}
              <Select value={directionFilter} onValueChange={setDirectionFilter}>
                <SelectTrigger className="h-10 bg-white/5 border-white/10 text-xs text-white rounded-xl">
                  <SelectValue placeholder="All Directions" />
                </SelectTrigger>
                <SelectContent className="bg-[#121727] border-white/10 text-white text-xs">
                  <SelectItem value="all">All Directions</SelectItem>
                  <SelectItem value="inbound">Inbound Calls ↙</SelectItem>
                  <SelectItem value="outbound">Outbound Calls ↗</SelectItem>
                </SelectContent>
              </Select>

              {/* Party Type Filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-10 bg-white/5 border-white/10 text-xs text-white rounded-xl">
                  <SelectValue placeholder="All Parties" />
                </SelectTrigger>
                <SelectContent className="bg-[#121727] border-white/10 text-white text-xs">
                  <SelectItem value="all">All Parties</SelectItem>
                  <SelectItem value="customer">Customers</SelectItem>
                  <SelectItem value="driver">Drivers</SelectItem>
                  <SelectItem value="corporate">Corporate B2B</SelectItem>
                </SelectContent>
              </Select>

              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-10 bg-white/5 border-white/10 text-xs text-white rounded-xl">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="bg-[#121727] border-white/10 text-white text-xs">
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="booking_enquiry">Booking Enquiry</SelectItem>
                  <SelectItem value="complaint">Complaint</SelectItem>
                  <SelectItem value="driver_issue">Driver Issue</SelectItem>
                  <SelectItem value="cancellation">Cancellation</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Call Logs Table */}
          <div className="rounded-3xl bg-[#0f1424] border border-white/10 overflow-hidden shadow-xl">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/5 text-white/50">
                  <TableHead className="font-bold text-xs">Direction & Time</TableHead>
                  <TableHead className="font-bold text-xs">Contact & Role</TableHead>
                  <TableHead className="font-bold text-xs">Phone Number</TableHead>
                  <TableHead className="font-bold text-xs">Linked Booking</TableHead>
                  <TableHead className="font-bold text-xs">Agent</TableHead>
                  <TableHead className="font-bold text-xs">Duration</TableHead>
                  <TableHead className="font-bold text-xs">Status</TableHead>
                  <TableHead className="font-bold text-xs">AI Insights</TableHead>
                  <TableHead className="font-bold text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCallLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-white/40">
                      No call records matching your current filter criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCallLogs.map((call) => {
                    const sentiment = getSentimentBadge(call.sentiment)
                    return (
                      <TableRow
                        key={call.id}
                        className="border-white/5 hover:bg-white/5 transition-colors"
                      >
                        {/* Direction & Time */}
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`p-1.5 rounded-lg ${
                                call.direction === 'inbound'
                                  ? 'bg-cyan-500/10 text-cyan-400'
                                  : 'bg-indigo-500/10 text-indigo-400'
                              }`}
                            >
                              {call.direction === 'inbound' ? (
                                <ArrowDownLeft className="w-4 h-4" />
                              ) : (
                                <ArrowUpRight className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white capitalize">
                                {call.direction}
                              </p>
                              <p className="text-[11px] text-white/40">
                                {new Date(call.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Contact Name & Role */}
                        <TableCell>
                          <div>
                            <p className="text-xs font-bold text-white">
                              {call.customerName || call.driverName || call.b2bClientName || 'Guest Contact'}
                            </p>
                            <Badge className="text-[10px] px-1.5 py-0 bg-white/5 text-white/60 border-white/5 capitalize mt-0.5">
                              {getCallTypeLabel(call.callType)}
                            </Badge>
                          </div>
                        </TableCell>

                        {/* Phone Number */}
                        <TableCell>
                          <span className="font-mono text-xs text-white/80">
                            {formatPhone(call.direction === 'inbound' ? call.fromNumber : call.toNumber)}
                          </span>
                        </TableCell>

                        {/* Linked Booking */}
                        <TableCell>
                          {call.bookingNumber ? (
                            <Link
                              href="/bookings"
                              className="inline-flex items-center gap-1 font-mono text-xs font-bold text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md transition-colors"
                            >
                              <Car className="w-3 h-3" />
                              {call.bookingNumber}
                            </Link>
                          ) : (
                            <span className="text-white/30 text-xs">—</span>
                          )}
                        </TableCell>

                        {/* Agent */}
                        <TableCell>
                          <span className="text-xs text-white/70">
                            {call.agentName || 'Unassigned / Auto'}
                          </span>
                        </TableCell>

                        {/* Duration */}
                        <TableCell>
                          <span className="font-mono text-xs font-bold text-white">
                            {formatDuration(call.durationSeconds)}
                          </span>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge className={`text-xs ${getCallStatusColor(call.status)}`}>
                            {getCallStatusLabel(call.status)}
                          </Badge>
                        </TableCell>

                        {/* AI Sentiment */}
                        <TableCell>
                          {call.sentiment ? (
                            <Badge className={`text-[10px] ${sentiment.color}`}>
                              <span className="mr-1">{sentiment.icon}</span> {sentiment.label}
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-white/30">N/A</span>
                          )}
                        </TableCell>

                        {/* Action Buttons */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View AI Insights & Recording */}
                            <Button
                              onClick={() => openCallDetails(call)}
                              size="sm"
                              variant="ghost"
                              className="h-8 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs px-2.5 flex items-center gap-1"
                              title="Listen to recording and view AI transcript"
                            >
                              {call.recordingUrl ? <Play className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                              <span className="hidden sm:inline">Details</span>
                            </Button>

                            {/* Redial Button */}
                            <Button
                              onClick={() => handleRedial(call)}
                              size="sm"
                              variant="ghost"
                              className="h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs px-2"
                              title="Redial this number"
                            >
                              <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ============================================================ */}
        {/* TAB 3: MISSED & UNATTENDED CALLS (PRIORITY QUEUE) */}
        {/* ============================================================ */}
        <TabsContent value="missed" className="space-y-4">
          <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-300">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Priority Missed Calls Queue ({missedCallsQueue.length} Unresolved)
                </h3>
                <p className="text-xs text-white/70">
                  Customer & driver calls that were dropped or went unanswered. Timely callback ensures high customer retention.
                </p>
              </div>
            </div>

            <Button
              onClick={() => {
                if (missedCallsQueue[0]) handleRedial(missedCallsQueue[0])
              }}
              disabled={missedCallsQueue.length === 0}
              className="rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs h-9 px-4 shadow-lg shadow-amber-600/30"
            >
              <PhoneCall className="w-4 h-4 mr-2" />
              Callback Next in Queue
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {missedCallsQueue.map((call) => (
              <Card
                key={call.id}
                className="bg-[#0f1424] border-white/10 rounded-3xl p-5 shadow-xl hover:border-amber-500/40 transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                    Missed Inbound Call
                  </Badge>
                  <span className="text-[11px] text-white/40 font-mono">
                    {new Date(call.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-black text-white">
                    {call.customerName || call.driverName || 'Unregistered Caller'}
                  </h4>
                  <p className="font-mono text-sm text-cyan-400 font-bold">
                    {formatPhone(call.fromNumber)}
                  </p>
                </div>

                {call.bookingNumber && (
                  <div className="text-xs text-white/70 flex items-center gap-1.5 pt-2 border-t border-white/5">
                    <Car className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Linked Ride:</span>
                    <span className="font-mono font-bold text-white">{call.bookingNumber}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <Button
                    onClick={() => openCallDetails(call)}
                    size="sm"
                    variant="ghost"
                    className="text-xs text-white/60 hover:text-white rounded-xl"
                  >
                    View Notes
                  </Button>

                  <Button
                    onClick={() => handleRedial(call)}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    Call Back Now
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ============================================================ */}
        {/* TAB 4: AUTOMATED FOLLOW-UPS & REMINDERS */}
        {/* ============================================================ */}
        <TabsContent value="followups" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Automated Task Follow-up Engine</h3>
              <p className="text-xs text-white/50">
                Tasks created automatically from missed calls, complaints, or negative customer sentiments.
              </p>
            </div>
          </div>

          <div className="rounded-3xl bg-[#0f1424] border border-white/10 overflow-hidden shadow-xl">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/5 text-white/50">
                  <TableHead className="font-bold text-xs">Status</TableHead>
                  <TableHead className="font-bold text-xs">Action Task</TableHead>
                  <TableHead className="font-bold text-xs">Priority</TableHead>
                  <TableHead className="font-bold text-xs">Due Timeline</TableHead>
                  <TableHead className="font-bold text-xs">Assignee</TableHead>
                  <TableHead className="font-bold text-xs text-right">Resolution</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {followUps.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-white/40">
                      All follow-up tasks resolved! Good job team.
                    </TableCell>
                  </TableRow>
                ) : (
                  followUps.map((task) => (
                    <TableRow key={task.id} className="border-white/5 hover:bg-white/5">
                      <TableCell>
                        <Badge
                          className={`text-xs ${
                            task.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {task.status === 'completed' ? 'Completed' : 'Pending SLA'}
                        </Badge>
                      </TableCell>

                      <TableCell className="font-medium text-xs text-white">
                        {task.task}
                      </TableCell>

                      <TableCell>
                        <Badge
                          className={`text-[10px] ${
                            task.priority === 'high'
                              ? 'bg-red-500/20 text-red-300 border-red-500/30'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          }`}
                        >
                          {task.priority || 'Medium'}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs text-white/70">
                        {new Date(task.dueAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>

                      <TableCell className="text-xs text-white/70">
                        {task.assignedTo || 'Dispatch Team'}
                      </TableCell>

                      <TableCell className="text-right">
                        {task.status === 'completed' ? (
                          <span className="text-xs text-emerald-400 font-bold flex items-center justify-end gap-1">
                            <Check className="w-3.5 h-3.5" /> Resolved
                          </span>
                        ) : (
                          <Button
                            onClick={() => setResolvingFollowUp(task)}
                            size="sm"
                            className="h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                          >
                            Mark Done
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ============================================================ */}
        {/* TAB 5: PRODUCTIVITY REPORTS */}
        {/* ============================================================ */}
        <TabsContent value="reports" className="space-y-6">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Hourly Traffic Chart */}
            <div className="lg:col-span-8 bg-[#0f1424] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
              <div>
                <h4 className="text-base font-bold text-white">Peak Calling Hours Distribution</h4>
                <p className="text-xs text-white/50">Call volume vs successfully answered calls by dispatch hour</p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyCallData}>
                    <defs>
                      <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorAns" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="hour" stroke="#ffffff40" fontSize={11} />
                    <YAxis stroke="#ffffff40" fontSize={11} />
                    <ChartTooltip
                      contentStyle={{
                        backgroundColor: '#121727',
                        borderColor: '#ffffff20',
                        color: '#fff',
                        borderRadius: '12px',
                      }}
                    />
                    <Area type="monotone" dataKey="calls" stroke="#6366f1" fillOpacity={1} fill="url(#colorCalls)" name="Total Calls" />
                    <Area type="monotone" dataKey="answered" stroke="#10b981" fillOpacity={1} fill="url(#colorAns)" name="Answered" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Outcome Breakdown Donut */}
            <div className="lg:col-span-4 bg-[#0f1424] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="text-base font-bold text-white">Call Outcomes</h4>
                <p className="text-xs text-white/50">Answered vs Missed vs Failed</p>
              </div>

              <div className="h-48 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={outcomeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {outcomeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      contentStyle={{
                        backgroundColor: '#121727',
                        borderColor: '#ffffff20',
                        color: '#fff',
                        borderRadius: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex justify-around text-xs pt-2 border-t border-white/10">
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Answered
                </span>
                <span className="flex items-center gap-1.5 text-indigo-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-indigo-400"></span> Missed
                </span>
                <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span> Busy/Failed
                </span>
              </div>
            </div>
          </div>

          {/* Agent Leaderboard Table */}
          <div className="bg-[#0f1424] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
            <div>
              <h4 className="text-base font-bold text-white">Agent Productivity & Quality Matrix</h4>
              <p className="text-xs text-white/50">Performance metrics, talk time, and CSAT scores by support agent</p>
            </div>

            <div className="rounded-2xl border border-white/5 overflow-hidden">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/5 text-white/50">
                    <TableHead className="text-xs font-bold">Agent Name</TableHead>
                    <TableHead className="text-xs font-bold">Calls Handled</TableHead>
                    <TableHead className="text-xs font-bold">Answer %</TableHead>
                    <TableHead className="text-xs font-bold">Avg Handle Time (AHT)</TableHead>
                    <TableHead className="text-xs font-bold">Follow-ups Done</TableHead>
                    <TableHead className="text-xs font-bold text-right">CSAT Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentPerformance.map((agent, i) => (
                    <TableRow key={i} className="border-white/5 hover:bg-white/5">
                      <TableCell className="font-bold text-xs text-white flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[10px] text-indigo-300 font-bold">
                          {agent.name.slice(0, 2).toUpperCase()}
                        </div>
                        {agent.name}
                      </TableCell>
                      <TableCell className="text-xs text-white/80">{agent.total}</TableCell>
                      <TableCell className="text-xs font-bold text-emerald-400">{agent.rate}</TableCell>
                      <TableCell className="text-xs font-mono text-white/80">{agent.aht}</TableCell>
                      <TableCell className="text-xs text-white/80">{agent.fup}</TableCell>
                      <TableCell className="text-xs font-bold text-amber-400 text-right">{agent.csat}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* ============================================================ */}
        {/* TAB 6: EXOTEL CONFIGURATION & SETTINGS */}
        {/* ============================================================ */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Credentials form */}
            <div className="lg:col-span-7 bg-[#0f1424] border border-white/10 rounded-3xl p-6 shadow-xl space-y-5">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-400" /> Exotel Account Credentials
                </h3>
                <p className="text-xs text-white/50">
                  Connect your live Exotel Cloud Telephony account for production calling.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-white/50">
                    Account SID *
                  </label>
                  <Input
                    value={config.accountSid}
                    onChange={(e) => setConfig({ ...config, accountSid: e.target.value })}
                    placeholder="e.g. trevmobility_exotel_acc"
                    className="h-11 bg-white/5 border-white/10 rounded-xl text-white text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-white/50">
                    API Token / Secret *
                  </label>
                  <Input
                    type="password"
                    value={config.apiToken}
                    onChange={(e) => setConfig({ ...config, apiToken: e.target.value })}
                    placeholder="••••••••••••••••••••"
                    className="h-11 bg-white/5 border-white/10 rounded-xl text-white text-xs font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-white/50">
                      Virtual ExoPhone Number (Caller ID) *
                    </label>
                    <Input
                      value={config.callerId}
                      onChange={(e) => setConfig({ ...config, callerId: e.target.value })}
                      placeholder="+918047190000"
                      className="h-11 bg-white/5 border-white/10 rounded-xl text-white text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-white/50">
                      Agent Mobile Number *
                    </label>
                    <Input
                      value={config.agentPhone}
                      onChange={(e) => setConfig({ ...config, agentPhone: e.target.value })}
                      placeholder="+919876543210"
                      className="h-11 bg-white/5 border-white/10 rounded-xl text-white text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-white/50">
                    Exotel Subdomain Cluster
                  </label>
                  <Select
                    value={config.subdomain}
                    onValueChange={(val) => setConfig({ ...config, subdomain: val })}
                  >
                    <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-xl text-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#121727] border-white/10 text-white text-xs">
                      <SelectItem value="api.exotel.com">api.exotel.com (Default Global)</SelectItem>
                      <SelectItem value="api.in.exotel.com">api.in.exotel.com (Mumbai Cloud)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                    testResult.success
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                      : 'bg-red-500/10 text-red-300 border border-red-500/30'
                  }`}
                >
                  {testResult.success ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  {testResult.message}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <Button
                  onClick={handleTestConnection}
                  disabled={isTestingConfig}
                  variant="outline"
                  className="rounded-xl border-white/10 bg-white/5 text-white font-bold text-xs h-11 px-4"
                >
                  {isTestingConfig ? 'Testing Connection...' : 'Test Connection'}
                </Button>

                <Button
                  onClick={handleSaveSettings}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-11 px-6 shadow-lg shadow-indigo-600/30"
                >
                  Save Settings
                </Button>
              </div>
            </div>

            {/* Right: Webhook Setup Guide */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="bg-[#0f1424] border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-cyan-400" /> Webhook Integration Setup
                </h4>
                <p className="text-xs text-white/60 leading-relaxed">
                  Configure these webhook endpoints in your Exotel Dashboard to automatically stream call recordings, live statuses, and inbound screen-pops into Trev Admin.
                </p>

                {/* Status Webhook Box */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white/50 uppercase">Call Status & Recordings URL</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/api/exotel/webhook`)
                        toast.success('Status webhook URL copied!')
                      }}
                      className="text-indigo-400 hover:text-indigo-300 text-[11px] font-bold flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                  <code className="text-xs font-mono text-cyan-300 block truncate">
                    /api/exotel/webhook
                  </code>
                </div>

                {/* Inbound Applet Box */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white/50 uppercase">Inbound Passthru Applet URL</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/api/exotel/inbound`)
                        toast.success('Inbound applet URL copied!')
                      }}
                      className="text-indigo-400 hover:text-indigo-300 text-[11px] font-bold flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                  <code className="text-xs font-mono text-cyan-300 block truncate">
                    /api/exotel/inbound
                  </code>
                </div>

                <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> AI Intelligence Enabled
                  </p>
                  <p className="text-[11px] text-white/70">
                    AI automatically analyzes recordings to generate executive summaries, sentiment ratings, and auto-callback tasks.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ============================================================ */}
      {/* CALL DETAILS & AI INSIGHTS MODAL */}
      {/* ============================================================ */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="bg-[#0f1424] border-white/10 text-white max-w-2xl rounded-3xl p-6 shadow-2xl">
          {selectedCallDetail && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <Badge className={`text-xs ${getCallStatusColor(selectedCallDetail.status)}`}>
                    {getCallStatusLabel(selectedCallDetail.status)}
                  </Badge>
                  <span className="text-xs font-mono text-white/40">
                    SID: {selectedCallDetail.callSid}
                  </span>
                </div>

                <DialogTitle className="text-xl font-black text-white mt-2">
                  Call with {selectedCallDetail.customerName || selectedCallDetail.driverName || 'Contact'}
                </DialogTitle>
                <DialogDescription className="text-xs text-white/50">
                  {selectedCallDetail.direction === 'inbound' ? 'Inbound Call' : 'Outbound Call'} •{' '}
                  {new Date(selectedCallDetail.createdAt).toLocaleString()}
                </DialogDescription>
              </DialogHeader>

              {/* Audio Recording Player Widget */}
              {selectedCallDetail.recordingUrl && (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white/60 flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-cyan-400" /> Audio Recording Playback
                    </span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {formatDuration(audioProgress)} / {formatDuration(audioDuration)}
                    </span>
                  </div>

                  {/* Progress Wave Bar */}
                  <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden cursor-pointer">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full transition-all"
                      style={{
                        width: `${Math.min(100, (audioProgress / audioDuration) * 100)}%`,
                      }}
                    />
                  </div>

                  {/* Player Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={toggleAudio}
                        className="h-9 w-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white"
                      >
                        {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                      </Button>

                      {/* Speed toggle */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const speeds = [1, 1.25, 1.5, 2]
                          const next = speeds[(speeds.indexOf(audioPlaybackSpeed) + 1) % speeds.length]
                          setAudioPlaybackSpeed(next)
                        }}
                        className="h-8 rounded-lg bg-white/5 border border-white/10 text-[11px] font-mono font-bold text-white px-2.5"
                      >
                        {audioPlaybackSpeed}x
                      </Button>
                    </div>

                    {/* Download Audio */}
                    <a
                      href={selectedCallDetail.recordingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-bold"
                    >
                      <Download className="w-3.5 h-3.5" /> Download MP3
                    </a>
                  </div>
                </div>
              )}

              {/* AI Summary Box */}
              {selectedCallDetail.summary && (
                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" /> AI Executive Summary
                    </span>
                    {selectedCallDetail.sentiment && (
                      <Badge className={`text-[10px] ${getSentimentBadge(selectedCallDetail.sentiment).color}`}>
                        {getSentimentBadge(selectedCallDetail.sentiment).icon}{' '}
                        {getSentimentBadge(selectedCallDetail.sentiment).label}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-white/80 leading-relaxed">
                    {selectedCallDetail.summary}
                  </p>

                  {selectedCallDetail.keyPoints && selectedCallDetail.keyPoints.length > 0 && (
                    <ul className="list-disc list-inside text-[11px] text-white/70 space-y-1 pt-1">
                      {selectedCallDetail.keyPoints.map((pt, idx) => (
                        <li key={idx}>{pt}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Speaker-Separated Transcript */}
              {selectedCallDetail.transcript && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-white/60 uppercase tracking-wider">
                    Call Transcript (Speaker Diarization)
                  </span>
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 max-h-52 overflow-y-auto space-y-2 text-xs">
                    {selectedCallDetail.transcript.split('\n').map((line, i) => {
                      const isAgent = line.startsWith('Agent:')
                      return (
                        <div
                          key={i}
                          className={`p-2.5 rounded-xl ${
                            isAgent
                              ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-200'
                              : 'bg-white/5 border border-white/5 text-white/80'
                          }`}
                        >
                          <span className="font-bold">{line.split(':')[0]}:</span>{' '}
                          {line.split(':').slice(1).join(':')}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Associated Booking Pill */}
              {selectedCallDetail.bookingNumber && (
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-cyan-400" />
                    <span>Mapped to Booking:</span>
                    <span className="font-mono font-bold text-white">
                      {selectedCallDetail.bookingNumber}
                    </span>
                  </div>
                  <Link
                    href="/bookings"
                    className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 text-xs"
                  >
                    View Ride <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              )}

              <DialogFooter>
                <Button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-5"
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* RESOLVE FOLLOW-UP MODAL */}
      {/* ============================================================ */}
      <Dialog
        open={Boolean(resolvingFollowUp)}
        onOpenChange={(open) => !open && setResolvingFollowUp(null)}
      >
        <DialogContent className="bg-[#0f1424] border-white/10 text-white max-w-md rounded-3xl p-6">
          {resolvingFollowUp && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-white">
                  Resolve Follow-up Task
                </DialogTitle>
                <DialogDescription className="text-xs text-white/50">
                  {resolvingFollowUp.task}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-white/50">
                  Resolution Notes
                </label>
                <Input
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  placeholder="e.g. Called customer back and re-confirmed pickup schedule..."
                  className="h-10 bg-white/5 border-white/10 rounded-xl text-white text-xs"
                />
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setResolvingFollowUp(null)}
                  className="rounded-xl text-xs text-white/60 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmResolve}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4"
                >
                  Mark Completed
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* TRANSFER CALL DIALOG */}
      {/* ============================================================ */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="bg-[#0f1424] border-white/10 text-white max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <PhoneForwarded className="w-5 h-5 text-amber-400" /> Transfer Call
            </DialogTitle>
            <DialogDescription className="text-xs text-white/50">
              Transfer the active call to another agent or department.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <label className="text-xs font-bold uppercase tracking-wider text-white/50">
              Transfer To
            </label>
            <Select value={transferTarget} onValueChange={setTransferTarget}>
              <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-xl text-white text-xs">
                <SelectValue placeholder="Select agent or department" />
              </SelectTrigger>
              <SelectContent className="bg-[#121727] border-white/10 text-white text-xs">
                <SelectItem value="agent-2">Agent 2 — Support Desk</SelectItem>
                <SelectItem value="agent-3">Agent 3 — Billing</SelectItem>
                <SelectItem value="agent-4">Agent 4 — Operations</SelectItem>
                <SelectItem value="supervisor">Supervisor — Team Lead</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2 mt-4">
            <Button
              variant="ghost"
              onClick={() => setShowTransferDialog(false)}
              className="rounded-xl text-xs text-white/60 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!transferTarget) {
                  toast.error('Please select a transfer target')
                  return
                }
                toast.success(`Call transferred to ${transferTarget}`)
                setShowTransferDialog(false)
                setTransferTarget('')
              }}
              className="rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-4"
            >
              <PhoneForwarded className="w-3 h-3 mr-1" /> Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}