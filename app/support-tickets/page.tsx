"use client"

import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function SupportTicketsPage() {
  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Support & Ticketing</h1>
        <Button>Create Ticket</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Active Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Manage customer and driver support issues here.</p>
          {/* Table will go here */}
        </CardContent>
      </Card>
    </AdminLayout>
  )
}
