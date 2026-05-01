"use client"

import { useState, useEffect } from 'react'
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function AdminReferralsPage() {
  const [referrals, setReferrals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchReferrals()
  }, [])

  const fetchReferrals = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/referrals')
    const data = await res.json()
    setReferrals(Array.isArray(data.referrals) ? data.referrals : [])
    setLoading(false)
  }

  const handleAction = async (referralId: string, action: 'approve' | 'cancel') => {
    const res = await fetch('/api/admin/referrals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referral_id: referralId, action }),
    })

    if (res.ok) {
      fetchReferrals()
    } else {
      const data = await res.json()
      alert(`Error: ${data.error || 'Failed to update referral'}`)
    }
  }

  const filteredReferrals = referrals.filter(r => 
    (filterStatus === 'all' || r.status === filterStatus) &&
    (!searchQuery || 
      r.referral_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.referee_phone?.includes(searchQuery) ||
      r.referrer?.phone?.includes(searchQuery)
    )
  )

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Refer & Earn - Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input 
              placeholder="Search phone/code..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchReferrals} variant="outline">
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div>Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Referrer</TableHead>
                  <TableHead>Referee Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reward</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReferrals.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.referral_code}</TableCell>
                    <TableCell>{r.referrer?.phone || r.referrer?.customerCode || r.referrer?.customer_code}</TableCell>
                    <TableCell>{r.referee_phone}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === 'approved' ? 'default' : 'secondary'}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>₹{r.reward_amount}</TableCell>
                    <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {r.status === 'pending' && (
                        <div className="space-x-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleAction(r.id, 'approve')}
                            variant="default"
                          >
                            Approve & Credit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleAction(r.id, 'cancel')}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
