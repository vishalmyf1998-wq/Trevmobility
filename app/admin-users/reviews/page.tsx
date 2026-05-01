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
import { Star } from 'lucide-react'

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterMinRating, setFilterMinRating] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchReviews()
  }, [])

  const fetchReviews = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/reviews')
      const data = await res.json()
      setReviews(Array.isArray(data.reviews) ? data.reviews : [])
    } catch (error) {
      console.error('Reviews fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredReviews = reviews.filter(r => 
    filterMinRating === 0 || 
    r.driver_rating <= filterMinRating ||
    r.car_rating <= filterMinRating
  ).filter(r => 
    !searchQuery || 
    r.bookings?.bookingNumber?.includes(searchQuery) ||
    r.b2c_customers?.phone?.includes(searchQuery) ||
    r.drivers?.driverId?.includes(searchQuery)
  )

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Reviews & Ratings Monitor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <Input 
              placeholder="Search booking/driver phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <Select value={filterMinRating.toString()} onValueChange={(v) => setFilterMinRating(parseInt(v))}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Low rating filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">All ratings</SelectItem>
                <SelectItem value="3">≤3 stars</SelectItem>
                <SelectItem value="2">≤2 stars</SelectItem>
                <SelectItem value="1">1 star</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchReviews} variant="outline">
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-12">Loading reviews...</div>
          ) : filteredReviews.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No reviews matching filters
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Car</TableHead>
                  <TableHead>Driver Rating</TableHead>
                  <TableHead>Car Rating</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReviews.slice(0, 100).map((review: any) => (
                  <TableRow key={review.id}>
                    <TableCell className="font-medium">
                      {review.bookings?.bookingNumber || 'N/A'}
                    </TableCell>
                    <TableCell>{review.b2c_customers?.phone}</TableCell>
                    <TableCell>{review.drivers?.name || 'N/A'}</TableCell>
                    <TableCell>{review.cars?.registrationNumber || 'N/A'}</TableCell>
                    <TableCell className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-4 w-4 ${
                            i < review.driver_rating 
                              ? 'fill-yellow-400 text-yellow-400' 
                              : 'text-muted-foreground'
                          }`} 
                        />
                      ))}
                      <span className="ml-1 text-sm">{review.driver_rating}</span>
                    </TableCell>
                    <TableCell className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-4 w-4 ${
                            i < review.car_rating 
                              ? 'fill-yellow-400 text-yellow-400' 
                              : 'text-muted-foreground'
                          }`} 
                        />
                      ))}
                      <span className="ml-1 text-sm">{review.car_rating}</span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{review.comment || '-'}</TableCell>
                    <TableCell>{new Date(review.created_at).toLocaleDateString()}</TableCell>
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
