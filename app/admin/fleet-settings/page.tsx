"use client";

import React, { useState } from 'react';
import { useAdmin } from '@/lib/admin-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Map, Plus, Trash2, X, Building2, MapPin } from 'lucide-react';

export default function DispatchCenterSettingsPage() {
  const { 
    cities = [], 
    updateCity, 
    dispatchCenters = [], 
    addDispatchCenter, 
    deleteDispatchCenter 
  } = useAdmin();

  // Create Dispatch Center Form state
  const [newDcName, setNewDcName] = useState('');
  const [newDcShortLabel, setNewDcShortLabel] = useState('');

  // Handle Dispatch Center creation
  const handleCreateDC = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDcName.trim() || !newDcShortLabel.trim()) {
      toast.error('Please enter both name and short label.');
      return;
    }
    
    // Check if name or short label already exists
    const exists = dispatchCenters.some(
      dc => dc.name.toLowerCase() === newDcName.trim().toLowerCase() ||
            dc.shortLabel.toLowerCase() === newDcShortLabel.trim().toLowerCase()
    );
    if (exists) {
      toast.error('A Dispatch Center with this name or short label already exists.');
      return;
    }

    addDispatchCenter({
      name: newDcName.trim(),
      shortLabel: newDcShortLabel.trim().toUpperCase()
    });
    
    toast.success(`Dispatch Center '${newDcName}' created successfully.`);
    setNewDcName('');
    setNewDcShortLabel('');
  };

  // Handle Dispatch Center deletion
  const handleDeleteDC = (dcId: string, dcName: string) => {
    if (dcId === 'ncr' || dcId === 'jpr' || dcId === 'other') {
      toast.error('Default Dispatch Centers cannot be deleted.');
      return;
    }

    // Unassign cities belonging to this dispatch center
    cities.forEach((city: any) => {
      if (city.operatingCity === dcId) {
        updateCity(city.id, { ...city, operatingCity: null });
      }
    });

    deleteDispatchCenter(dcId);
    toast.success(`Dispatch Center '${dcName}' deleted.`);
  };

  // Add City to Dispatch Center
  const handleAddCityToDC = (dcId: string, cityId: string) => {
    const city = cities.find((c: any) => c.id === cityId);
    if (city) {
      updateCity(cityId, { ...city, operatingCity: dcId });
      const dcName = dispatchCenters.find(dc => dc.id === dcId)?.name || dcId;
      toast.success(`City '${city.name}' assigned to Dispatch Center '${dcName}'.`);
    }
  };

  // Remove City from Dispatch Center
  const handleRemoveCityFromDC = (cityId: string) => {
    const city = cities.find((c: any) => c.id === cityId);
    if (city) {
      updateCity(cityId, { ...city, operatingCity: null });
      toast.success(`City '${city.name}' unassigned.`);
    }
  };

  // Filter cities by their assigned dispatch center
  const getCitiesInDC = (dcId: string) => {
    return cities.filter((city: any) => {
      const resolvedDc = city.operatingCity || (city.id === 'demo-city-delhi' ? 'ncr' : city.id === 'demo-city-jaipur' ? 'jpr' : 'other');
      return resolvedDc === dcId;
    });
  };

  // Unassigned cities are those that aren't mapped to any active dispatch center in dispatchCenters list
  const getUnassignedCities = () => {
    return cities.filter((city: any) => {
      const resolvedDc = city.operatingCity || (city.id === 'demo-city-delhi' ? 'ncr' : city.id === 'demo-city-jaipur' ? 'jpr' : null);
      if (!resolvedDc) return true;
      return !dispatchCenters.some(dc => dc.id === resolvedDc);
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center border border-indigo-100 shadow-md">
          <Map className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dispatch Center Settings</h1>
          <p className="text-sm font-semibold text-slate-500">Configure operational dispatch centers and group cities under them.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Dispatch Center Panel */}
        <div className="lg:col-span-1">
          <Card className="shadow-md border border-slate-100 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Create Dispatch Center</CardTitle>
              <CardDescription>Add a new operations region to group cities.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateDC} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dispatch Center Name</label>
                  <Input 
                    placeholder="e.g. West Hub, Delhi-NCR" 
                    value={newDcName} 
                    onChange={(e) => setNewDcName(e.target.value)} 
                    className="rounded-xl border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Short Label</label>
                  <Input 
                    placeholder="e.g. WH, NCR" 
                    value={newDcShortLabel} 
                    maxLength={5}
                    onChange={(e) => setNewDcShortLabel(e.target.value)} 
                    className="rounded-xl border-slate-200"
                  />
                </div>
                <Button type="submit" className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-2 mt-2 py-5 shadow-sm">
                  <Plus className="w-4 h-4" /> Create Center
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Unassigned Cities Card */}
          {getUnassignedCities().length > 0 && (
            <Card className="mt-8 shadow-md border border-slate-100 rounded-2xl bg-amber-50/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-amber-800">
                  <Building2 className="w-5 h-5" /> Unassigned Cities
                </CardTitle>
                <CardDescription className="text-amber-700/80">Cities not mapped to any active dispatch center.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {getUnassignedCities().map((city: any) => (
                    <div key={city.id} className="flex items-center gap-2 p-2.5 bg-white border border-amber-100 rounded-xl shadow-sm text-xs font-semibold text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-amber-500" />
                      <span>{city.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Dispatch Centers Grid */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Operational Centers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {dispatchCenters.filter(dc => dc.id !== 'other').map((dc) => {
              const assignedCities = getCitiesInDC(dc.id);
              const unassignedPool = cities.filter((city: any) => {
                const resolvedDc = city.operatingCity || (city.id === 'demo-city-delhi' ? 'ncr' : city.id === 'demo-city-jaipur' ? 'jpr' : null);
                return resolvedDc !== dc.id;
              });

              return (
                <Card key={dc.id} className="shadow-md border border-slate-100 rounded-2xl flex flex-col justify-between">
                  <div>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg font-extrabold text-slate-800">{dc.name}</CardTitle>
                          <CardDescription className="font-semibold text-slate-400 mt-0.5">Code: {dc.shortLabel}</CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold rounded-lg text-xs tracking-wider">
                            {assignedCities.length} Cities
                          </span>
                          {dc.id !== 'ncr' && dc.id !== 'jpr' && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDeleteDC(dc.id, dc.name)}
                              className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Assigned Cities List */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cities Assigned</label>
                        {assignedCities.length === 0 ? (
                          <p className="text-xs italic text-slate-400 py-1">No cities assigned. Add one below.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {assignedCities.map((city: any) => (
                              <span key={city.id} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 bg-slate-50 border rounded-xl text-xs font-bold text-slate-700 shadow-sm">
                                {city.name}
                                <button 
                                  onClick={() => handleRemoveCityFromDC(city.id)}
                                  className="p-0.5 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </div>
                  
                  {/* Add City Select Dropdown */}
                  <CardContent className="pt-0 border-t border-slate-50 mt-4 bg-slate-50/50 p-4 rounded-b-2xl">
                    <div className="flex gap-2">
                      <Select 
                        onValueChange={(value) => handleAddCityToDC(dc.id, value)}
                        value=""
                      >
                        <SelectTrigger className="w-full bg-white rounded-xl border-slate-200 text-xs font-semibold">
                          <SelectValue placeholder="Add city..." />
                        </SelectTrigger>
                        <SelectContent>
                          {unassignedPool.map((city: any) => (
                            <SelectItem key={city.id} value={city.id} className="text-xs font-semibold">
                              {city.name} {city.operatingCity ? `(from ${dispatchCenters.find(d => d.id === city.operatingCity)?.name || city.operatingCity})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

