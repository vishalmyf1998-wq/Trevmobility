"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

interface CancellationReason {
  id: string
  reason: string
  appliesTo: 'customer' | 'driver' | 'admin' | 'all'
  isActive: boolean
}

// Demo initial data
const initialReasons: CancellationReason[] = [
  { id: "1", reason: "Driver denied duty", appliesTo: "driver", isActive: true },
  { id: "2", reason: "Vehicle broke down", appliesTo: "driver", isActive: true },
  { id: "3", reason: "Change of plans", appliesTo: "customer", isActive: true },
  { id: "4", reason: "Booked by mistake", appliesTo: "customer", isActive: true },
  { id: "5", reason: "Delay in pickup", appliesTo: "customer", isActive: true },
  { id: "6", reason: "Operational issue", appliesTo: "admin", isActive: true },
]

export default function CancellationReasonsPage() {
  const [reasons, setReasons] = useState<CancellationReason[]>(initialReasons)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingReason, setEditingReason] = useState<CancellationReason | null>(null)

  const [formData, setFormData] = useState<Partial<CancellationReason>>({
    reason: "",
    appliesTo: "all",
    isActive: true
  })

  const handleOpenNewDialog = () => {
    setEditingReason(null)
    setFormData({ reason: "", appliesTo: "all", isActive: true })
    setIsDialogOpen(true)
  }

  const handleEdit = (reason: CancellationReason) => {
    setEditingReason(reason)
    setFormData({ ...reason })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this reason?")) {
      setReasons(reasons.filter(r => r.id !== id))
      toast.success("Reason deleted successfully")
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.reason?.trim()) {
      toast.error("Reason text is required")
      return
    }

    if (editingReason) {
      setReasons(reasons.map(r =>
        r.id === editingReason.id ? { ...r, ...formData } as CancellationReason : r
      ))
      toast.success("Reason updated successfully")
    } else {
      const newReason: CancellationReason = {
        id: Math.random().toString(36).substring(2, 9),
        reason: formData.reason,
        appliesTo: formData.appliesTo as any,
        isActive: formData.isActive ?? true
      }
      setReasons([...reasons, newReason])
      toast.success("New reason added successfully")
    }

    setIsDialogOpen(false)
  }

  const toggleStatus = (id: string) => {
    setReasons(reasons.map(r =>
      r.id === id ? { ...r, isActive: !r.isActive } : r
    ))
    toast.success("Status updated")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cancellation Reasons</h1>
          <p className="text-muted-foreground">
            Manage predefined cancellation reasons for customers, drivers, and admins.
          </p>
        </div>
        <Button onClick={handleOpenNewDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Reason
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configured Reasons</CardTitle>
          <CardDescription>A list of all cancellation reasons available in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reason Text</TableHead>
                <TableHead>Applies To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reasons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No cancellation reasons found. Add one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                reasons.map((reason) => (
                  <TableRow key={reason.id}>
                    <TableCell className="font-medium">{reason.reason}</TableCell>
                    <TableCell className="capitalize">
                      {reason.appliesTo}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={reason.isActive ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => toggleStatus(reason.id)}
                      >
                        {reason.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(reason)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(reason.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingReason ? "Edit Reason" : "Add New Reason"}</DialogTitle>
            <DialogDescription>
              {editingReason ? "Update the cancellation reason details below." : "Enter the details for the new cancellation reason."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Reason Text *</Label>
              <Input
                placeholder="e.g., Driver denied duty"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Applies To</Label>
              <Select
                value={formData.appliesTo}
                onValueChange={(value: any) => setFormData({ ...formData, appliesTo: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select who this applies to" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All (Everyone)</SelectItem>
                  <SelectItem value="customer">Customer Only</SelectItem>
                  <SelectItem value="driver">Driver Only</SelectItem>
                  <SelectItem value="admin">Admin Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.isActive ? "active" : "inactive"}
                onValueChange={(value) => setFormData({ ...formData, isActive: value === "active" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingReason ? "Save Changes" : "Add Reason"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
