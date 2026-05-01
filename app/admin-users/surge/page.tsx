"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function SurgePricingPage() {
  const [peakHours, setPeakHours] = useState<any[]>([])
  const [weatherTriggers, setWeatherTriggers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'peak' | 'weather' | 'zones'>('peak')
  const [startHour, setStartHour] = useState(18)
  const [endHour, setEndHour] = useState(22)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const [peakRes, weatherRes] = await Promise.all([
      fetch('/api/admin/surge?type=peak').then((res) => res.json()),
      fetch('/api/admin/surge?type=weather').then((res) => res.json())
    ])
    setPeakHours(Array.isArray(peakRes) ? peakRes : [])
    setWeatherTriggers(Array.isArray(weatherRes) ? weatherRes : [])
    setLoading(false)
  }

  const testMultiplier = async () => {
    // Demo test
    const testCity = 'your-city-uuid'
    const res = await fetch(`/api/surge/multiplier?cityId=${testCity}&pickupLat=28.6139&pickupLng=77.2090&hour=18&weather=heavy_rain`)
    const data = await res.json()
    alert(`Test multiplier: ${data.multiplier ?? 1}`)
  }

  const formatHour = (hour: number) => `${hour.toString().padStart(2, '0')}:00`
  const normalizeHour = (value: string) => {
    const parsed = Number(value)
    if (Number.isNaN(parsed)) return 0
    return Math.min(23, Math.max(0, parsed))
  }

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Surge Pricing Config</CardTitle>
          <CardDescription>Peak hours, weather, zone multipliers. Test live RPC.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Button variant={activeTab === 'peak' ? 'default' : 'outline'} onClick={() => setActiveTab('peak')}>
              Peak Hours
            </Button>
            <Button variant={activeTab === 'weather' ? 'default' : 'outline'} onClick={() => setActiveTab('weather')}>
              Weather
            </Button>
            <Button variant={activeTab === 'zones' ? 'default' : 'outline'} onClick={() => setActiveTab('zones')}>
              Zones (Polygons)
            </Button>
            <Button onClick={testMultiplier} className="ml-auto">
              Test Multiplier
            </Button>
          </div>
        </CardContent>
      </Card>

      {activeTab === 'peak' && (
        <Card>
          <CardHeader>
            <CardTitle>Peak Hours Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>City</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Multiplier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {peakHours.map((ph) => (
                    <TableRow key={ph.id}>
                      <TableCell>{ph.cityId ?? ph.city_id}</TableCell>
                      <TableCell>{ph.startHour ?? ph.start_hour}-{ph.endHour ?? ph.end_hour}</TableCell>
                      <TableCell>{Array.isArray(ph.days) ? ph.days.join(', ') : '-'}</TableCell>
                      <TableCell>
                        <Badge>{ph.multiplier}x</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {/* Add new form */}
            <div className="mt-8 p-4 border rounded-lg">
              <h3 className="font-semibold mb-4">Add Peak Hour</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>City ID</Label>
                  <Input placeholder="city-uuid" />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <Label>Start Hour</Label>
                    <span className="rounded border px-2 py-1 text-sm font-semibold">
                      {formatHour(startHour)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[startHour]}
                      min={0}
                      max={23}
                      step={1}
                      onValueChange={([value]) => setStartHour(value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      min={0}
                      max={23}
                      value={startHour}
                      onChange={(event) => setStartHour(normalizeHour(event.target.value))}
                      className="w-20"
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <Label>End Hour</Label>
                    <span className="rounded border px-2 py-1 text-sm font-semibold">
                      {formatHour(endHour)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[endHour]}
                      min={0}
                      max={23}
                      step={1}
                      onValueChange={([value]) => setEndHour(value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      min={0}
                      max={23}
                      value={endHour}
                      onChange={(event) => setEndHour(normalizeHour(event.target.value))}
                      className="w-20"
                    />
                  </div>
                </div>
              </div>
              <Button className="mt-4">Add Rule</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'weather' && (
        <Card>
          <CardHeader>
            <CardTitle>Weather Triggers</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Condition</TableHead>
                  <TableHead>Multiplier</TableHead>
                  <TableHead>Enabled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weatherTriggers.map((wt) => (
                  <TableRow key={wt.id || wt.condition}>
                    <TableCell>{wt.condition}</TableCell>
                    <TableCell>{wt.multiplier}x</TableCell>
                    <TableCell>
                      <Badge variant={wt.enabled ? 'default' : 'secondary'}>
                        {wt.enabled ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {activeTab === 'zones' && (
        <Card>
          <CardHeader>
            <CardTitle>Surge Zones</CardTitle>
            <CardDescription>Configure city_polygons.surge_multiplier &gt; 1.0</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Edit via /city-polygons, set surge_multiplier</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
