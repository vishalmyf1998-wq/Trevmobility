"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function ExtrasConfigPage() {
  const [activeTab, setActiveTab] = useState('tolls')
  const [tolls, setTolls] = useState<any[]>([])
  const [taxes, setTaxes] = useState<any[]>([])
  const [parking, setParking] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    const [tollsRes, taxesRes, parkingRes] = await Promise.all([
      fetch('/api/admin/extras?type=tolls').then(r => r.json()),
      fetch('/api/admin/extras?type=taxes').then(r => r.json()),
      fetch('/api/admin/extras?type=parking').then(r => r.json())
    ])
    setTolls(Array.isArray(tollsRes) ? tollsRes : [])
    setTaxes(Array.isArray(taxesRes) ? taxesRes : [])
    setParking(Array.isArray(parkingRes) ? parkingRes : [])
    setLoading(false)
  }

  const addRecord = async (table: string, data: any) => {
    const res = await fetch('/api/admin/extras', {
      method: 'POST',
      body: JSON.stringify({ table, ...data })
    })
    if (res.ok) fetchAll()
  }

  const deleteRecord = async (id: string, table: string) => {
    await fetch(`/api/admin/extras?id=${id}&table=${table}`, { method: 'DELETE' })
    fetchAll()
  }

  const testRPC = async () => {
    const from = document.getElementById('test_from') as HTMLInputElement
    const to = document.getElementById('test_to') as HTMLInputElement
    const category = document.getElementById('test_category') as HTMLInputElement
    const res = await supabase.rpc('calculate_trip_extras', {
      p_from_city_id: from?.value || 'city1-id',
      p_to_city_id: to?.value || 'city2-id',
      p_car_category_id: category?.value || 'cat1-id'
    })
    alert(JSON.stringify(res, null, 2))
  }

  if (loading) return <div>Loading extras config...</div>

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Trip Extras Configuration</h1>
      
      {/* Test RPC */}
      <div className="p-4 border rounded-lg">
        <h3>Test Calculation</h3>
        <input id="test_from" placeholder="From City ID" className="border p-2 mr-2" />
        <input id="test_to" placeholder="To City ID" className="border p-2 mr-2" />
        <input id="test_category" placeholder="Car Category ID" className="border p-2 mr-2" />
        <button onClick={testRPC} className="bg-blue-500 text-white p-2 rounded">Calculate Extras</button>
      </div>

      <div className="tabs">
        <button onClick={() => setActiveTab('tolls')} className={activeTab === 'tolls' ? 'bg-primary text-white p-2 rounded-t' : 'p-2 border'}>
          Tolls ({tolls.length})
        </button>
        <button onClick={() => setActiveTab('taxes')} className={activeTab === 'taxes' ? 'bg-primary text-white p-2 rounded-t' : 'p-2 border'}>
          State Taxes ({taxes.length})
        </button>
        <button onClick={() => setActiveTab('parking')} className={activeTab === 'parking' ? 'bg-primary text-white p-2 rounded-t' : 'p-2 border'}>
          Parking ({parking.length})
        </button>
      </div>

      {activeTab === 'tolls' && (
        <div className="space-y-4">
          <h3>Route Tolls <button onClick={() => addRecord('route_tolls', {})}>+ Add</button></h3>
          <table className="w-full border">
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {tolls.map((t: any) => (
                <tr key={t.id}>
                  <td>{t.cities_from?.name}</td>
                  <td>{t.cities_to?.name}</td>
                  <td>{t.car_categories?.name}</td>
                  <td>₹{t.toll_amount}</td>
                  <td><button onClick={() => deleteRecord(t.id, 'route_tolls')}>Del</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'taxes' && (
        <div className="space-y-4">
          <h3>State Taxes/Permits <button onClick={() => addRecord('state_taxes', {})}>+ Add</button></h3>
          <table className="w-full border">
            <thead>
              <tr>
                <th>State</th>
                <th>Category</th>
                <th>Permit</th>
                <th>GST%</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {taxes.map((t: any) => (
                <tr key={t.id}>
                  <td>{t.state_code}</td>
                  <td>{t.car_categories?.name}</td>
                  <td>₹{t.permit_tax}</td>
                  <td>{t.gst_rate}%</td>
                  <td><button onClick={() => deleteRecord(t.id, 'state_taxes')}>Del</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'parking' && (
        <div className="space-y-4">
          <h3>Parking Fees <button onClick={() => addRecord('parking_fees', {})}>+ Add</button></h3>
          <table className="w-full border">
            <thead>
              <tr>
                <th>Location</th>
                <th>City</th>
                <th>Category</th>
                <th>Amount/hr</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {parking.map((p: any) => (
                <tr key={p.id}>
                  <td>{p.location_type}</td>
                  <td>{p.city_id}</td>
                  <td>{p.car_category_id}</td>
                  <td>₹{p.fee_amount}</td>
                  <td><button onClick={() => deleteRecord(p.id, 'parking_fees')}>Del</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
