// @ts-nocheck
'use client'

import React, { useState } from 'react'
import { useTelephony } from '@/lib/telephony-context'
import { formatDuration, formatPhone, getCallCategoryLabel } from '@/lib/exotel'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  PhoneOff,
  Mic,
  MicOff,
  Pause,
  Play,
  FileText,
  Tag,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Car,
} from 'lucide-react'

export function ActiveCallBar() {
  const {
    activeCall,
    hangupCall,
    toggleMute,
    toggleHold,
    updateActiveCallNotes,
    updateActiveCallCategory,
  } = useTelephony()

  const [expanded, setExpanded] = useState(false)
  const [showEndDialog, setShowEndDialog] = useState(false)

  if (!activeCall) return null

  const handleEndCall = () => {
    hangupCall()
    setShowEndDialog(false)
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-2xl w-[94vw] sm:w-[580px] transition-all duration-300 animate-in slide-in-from-bottom-5">
      <div className="relative overflow-hidden rounded-2xl bg-[#0e1322]/95 backdrop-blur-2xl border border-indigo-500/30 shadow-[0_12px_40px_rgba(0,0,0,0.6)] p-4 text-white">
        {/* Glow accent */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Primary In-Call Row */}
        <div className="flex items-center justify-between gap-3">
          {/* Left: Status & Caller Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 shrink-0">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-85"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-white truncate">
                  {activeCall.contactName || 'Active Caller'}
                </h4>
                <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px] px-1.5 py-0 capitalize">
                  {activeCall.contactType || 'Customer'}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/60">
                <span className="font-mono">{formatPhone(activeCall.toNumber)}</span>
                {activeCall.bookingNumber && (
                  <>
                    <span>•</span>
                    <span className="text-cyan-400 font-mono font-bold flex items-center gap-1">
                      <Car className="w-3 h-3" />
                      {activeCall.bookingNumber}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Timer & In-Call Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Live Elapsed Duration */}
            <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 font-mono text-sm font-bold text-emerald-400 flex items-center gap-1.5">
              <span>⏱️</span>
              <span>{formatDuration(activeCall.durationSeconds)}</span>
            </div>

            {/* Mute Button */}
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleMute}
              className={`h-9 w-9 rounded-xl border transition-all ${
                activeCall.isMuted
                  ? 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30'
                  : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/15'
              }`}
              title={activeCall.isMuted ? 'Unmute' : 'Mute'}
            >
              {activeCall.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>

            {/* Hold Button */}
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleHold}
              className={`h-9 w-9 rounded-xl border transition-all ${
                activeCall.isOnHold
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-amber-500/30'
                  : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/15'
              }`}
              title={activeCall.isOnHold ? 'Resume Call' : 'Hold Call'}
            >
              {activeCall.isOnHold ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </Button>

            {/* Expand / Minimize Notes */}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setExpanded(!expanded)}
              className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/15"
              title="Call Notes & Disposition"
            >
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </Button>

            {/* End Call Button */}
            <Button
              onClick={() => setShowEndDialog(true)}
              className="bg-red-600 hover:bg-red-500 text-white font-bold h-9 px-3.5 rounded-xl shadow-lg shadow-red-600/30 flex items-center gap-1.5 transition-transform active:scale-95"
            >
              <PhoneOff className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">End</span>
            </Button>
          </div>
        </div>

        {/* Expandable Section: Disposition Category & Quick Notes */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-white/10 space-y-3 animate-in fade-in-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Category Selector */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/50 flex items-center gap-1 mb-1">
                  <Tag className="w-3 h-3 text-indigo-400" /> Call Category
                </label>
                <Select
                  value={activeCall.category || 'general'}
                  onValueChange={(val) => updateActiveCallCategory(val)}
                >
                  <SelectTrigger className="h-8 bg-white/5 border-white/10 text-xs text-white rounded-lg">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#121727] border-white/10 text-white text-xs">
                    <SelectItem value="booking_enquiry">Booking Enquiry</SelectItem>
                    <SelectItem value="complaint">Complaint / Dispute</SelectItem>
                    <SelectItem value="driver_issue">Driver Issue</SelectItem>
                    <SelectItem value="cancellation">Ride Cancellation</SelectItem>
                    <SelectItem value="payment">Payment / Fare Query</SelectItem>
                    <SelectItem value="general">General Support</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Disposition Note Input */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/50 flex items-center gap-1 mb-1">
                  <FileText className="w-3 h-3 text-cyan-400" /> Live Call Notes
                </label>
                <Input
                  value={activeCall.notes || ''}
                  onChange={(e) => updateActiveCallNotes(e.target.value)}
                  placeholder="e.g. Passenger luggage clarified..."
                  className="h-8 bg-white/5 border-white/10 text-xs text-white placeholder:text-white/30 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-white/50 bg-white/5 p-2 rounded-lg">
              <span className="flex items-center gap-1 text-indigo-300">
                <Sparkles className="w-3.5 h-3.5" />
                AI Call Analysis will auto-generate transcript, summary & sentiment upon hangup.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Call End Dialog — Context Summary Popup */}
      {showEndDialog && (
        <div className="absolute bottom-0 left-0 right-0 z-50 animate-in fade-in-50 slide-in-from-bottom-3">
          <div className="relative overflow-hidden rounded-2xl bg-[#0e1322]/98 backdrop-blur-2xl border border-white/20 shadow-[0_12px_40px_rgba(0,0,0,0.6)] p-5 text-white">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" /> Call Summary
                </h3>
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">
                  Ending Call
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-[10px] text-white/50 uppercase tracking-wider">Contact</p>
                  <p className="text-sm font-bold text-white">{activeCall.contactName || 'Unknown'}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-[10px] text-white/50 uppercase tracking-wider">Type</p>
                  <p className="text-sm font-bold text-white capitalize">{activeCall.contactType || 'Customer'}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-[10px] text-white/50 uppercase tracking-wider">Duration</p>
                  <p className="text-sm font-bold text-emerald-400 font-mono">{formatDuration(activeCall.durationSeconds)}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-[10px] text-white/50 uppercase tracking-wider">Category</p>
                  <p className="text-sm font-bold text-white">{getCallCategoryLabel(activeCall.category || 'general')}</p>
                </div>
              </div>

              {activeCall.bookingNumber && (
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 mb-4">
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs text-cyan-300">
                      Linked Booking: <span className="font-bold font-mono">{activeCall.bookingNumber}</span>
                    </span>
                  </div>
                </div>
              )}

              {activeCall.notes && (
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 mb-4">
                  <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Call Notes</p>
                  <p className="text-sm text-white/80">{activeCall.notes}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setShowEndDialog(false)}
                  className="rounded-xl text-xs text-white/60 hover:text-white hover:bg-white/10 px-4"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEndCall}
                  className="rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4"
                >
                  <PhoneOff className="w-3.5 h-3.5 mr-1.5" /> End Call
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

