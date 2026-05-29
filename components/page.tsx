"use client";

import React, { useState } from 'react';
import { CalendarDays, Clock, Save, CheckCircle2, XCircle, AlertCircle, CalendarX2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

// Mock data for the upcoming week
const upcomingWeek = [
  { id: 'mon', label: 'Monday', date: '25 May' },
  { id: 'tue', label: 'Tuesday', date: '26 May' },
  { id: 'wed', label: 'Wednesday', date: '27 May' },
  { id: 'thu', label: 'Thursday', date: '28 May' },
  { id: 'fri', label: 'Friday', date: '29 May' },
  { id: 'sat', label: 'Saturday', date: '30 May' },
  { id: 'sun', label: 'Sunday', date: '31 May' },
];

// 12-hour shift options
const shiftOptions = [
  { id: '06-18', label: '06:00 AM - 06:00 PM', type: 'Day' },
  { id: '08-20', label: '08:00 AM - 08:00 PM', type: 'Day' },
  { id: '10-22', label: '10:00 AM - 10:00 PM', type: 'Day' },
  { id: '18-06', label: '06:00 PM - 06:00 AM', type: 'Night' },
  { id: '20-08', label: '08:00 PM - 08:00 AM', type: 'Night' },
];

export default function DriverWeeklyRoster() {
  const [selectedShift, setSelectedShift] = useState<string>("");
  
  // Initialize all days as working (true)
  const [workingDays, setWorkingDays] = useState<Record<string, boolean>>(
    upcomingWeek.reduce((acc, day) => ({ ...acc, [day.id]: true }), {})
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleDay = (dayId: string) => {
    setWorkingDays(prev => ({
      ...prev,
      [dayId]: !prev[dayId]
    }));
  };

  const handleSaveRoster = () => {
    if (!selectedShift) {
      toast.error("Please select a shift timing first.");
      return;
    }

    const activeDaysCount = Object.values(workingDays).filter(Boolean).length;
    if (activeDaysCount === 0) {
      toast.error("You must select at least one working day.");
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Your weekly roster has been saved successfully!");
      // Yahan aap API call karke data database me bhej sakte hain
      console.log({
        shift: selectedShift,
        schedule: workingDays,
        week: '25 May - 31 May 2026'
      });
    }, 1000);
  };

  const workingCount = Object.values(workingDays).filter(Boolean).length;
  const offCount = 7 - workingCount;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 pb-24 font-sans">
      <div className="max-w-xl mx-auto space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">My Weekly Roster</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Plan your shifts and offs for the upcoming week.</p>
        </div>

        {/* Step 1: Shift Selection */}
        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-white pb-4 border-b border-slate-100">
            <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
              <Clock className="h-5 w-5 text-blue-600" /> 
              Step 1: Select Shift Timing
            </CardTitle>
            <CardDescription>This 12-hour shift will apply to all your working days this week.</CardDescription>
          </CardHeader>
          <CardContent className="p-5 bg-slate-50/50">
            <Select value={selectedShift} onValueChange={setSelectedShift}>
              <SelectTrigger className="w-full h-14 rounded-xl border-slate-200 bg-white text-base font-semibold shadow-sm focus:ring-blue-500">
                <SelectValue placeholder="Tap to select your 12-hour shift" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {shiftOptions.map(shift => (
                  <SelectItem key={shift.id} value={shift.id} className="py-3 font-medium cursor-pointer">
                    {shift.label} <span className="text-slate-400 text-xs ml-1">({shift.type})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {!selectedShift && (
              <div className="flex items-center gap-2 mt-4 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100 text-xs font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                You cannot change your shift in the middle of the week once submitted.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Day Selection */}
        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-white pb-4 border-b border-slate-100">
            <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
              <CalendarDays className="h-5 w-5 text-blue-600" /> 
              Step 2: Mark Weekly Offs
            </CardTitle>
            <CardDescription>Tap on a day to mark it as Working or Off. (May 25 - May 31)</CardDescription>
          </CardHeader>
          <CardContent className="p-0 bg-slate-50/50">
            <div className="divide-y divide-slate-100">
              {upcomingWeek.map((day) => {
                const isWorking = workingDays[day.id];
                return (
                  <div 
                    key={day.id} 
                    onClick={() => toggleDay(day.id)}
                    className={`flex items-center justify-between p-4 cursor-pointer transition-colors active:scale-[0.98] ${
                      isWorking ? 'bg-white hover:bg-slate-50' : 'bg-red-50/30 hover:bg-red-50/50'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className={`text-base font-bold ${isWorking ? 'text-slate-800' : 'text-slate-500'}`}>
                        {day.label}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">{day.date}</span>
                    </div>
                    
                    <div>
                      {isWorking ? (
                        <div className="flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
                          <CheckCircle2 className="h-4 w-4" /> Working
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-rose-100 text-rose-700 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
                          <CalendarX2 className="h-4 w-4" /> Weekly Off
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Summary & Submit */}
        <Card className="border-blue-100 shadow-md rounded-2xl bg-blue-50/50">
          <CardContent className="p-5">
             <h3 className="font-bold text-blue-900 mb-2 text-sm uppercase tracking-wider">Roster Summary</h3>
             <p className="text-blue-800 text-sm font-medium leading-relaxed">
               You are choosing to work <strong>{workingCount} days</strong> on the <strong>{shiftOptions.find(s => s.id === selectedShift)?.label || '___'}</strong> shift. You will have <strong>{offCount} day(s) off</strong>.
             </p>
          </CardContent>
          <CardFooter className="p-5 pt-0">
            <Button 
              size="lg" 
              className="w-full h-14 rounded-xl text-base font-bold shadow-lg bg-blue-600 hover:bg-blue-700 text-white transition-all"
              onClick={handleSaveRoster}
              disabled={isSubmitting || !selectedShift}
            >
              {isSubmitting ? 'Saving Roster...' : 'Confirm & Save Schedule'}
              {!isSubmitting && <Save className="ml-2 h-5 w-5" />}
            </Button>
          </CardFooter>
        </Card>

      </div>
    </div>
  );
}