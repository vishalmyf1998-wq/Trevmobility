"use client"

import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function SurgePricingPage() {
  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Surge Pricing & Demand</h1>
        <Button>Add Surge Zone</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Active Surge Zones</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Manage active multiplier rules based on high demand or bad weather conditions.</p>
        </CardContent>
      </Card>
    </AdminLayout>
  )
}
