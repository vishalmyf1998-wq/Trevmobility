"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Search, Headset, MessageSquare, AlertCircle, CheckCircle2, Clock, Plus, Send, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAdmin, SupportTicket } from "@/lib/admin-context"

export default function SupportTicketsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading Tickets...</div>}>
      <SupportTicketsContent />
    </Suspense>
  )
}

function SupportTicketsContent() {
  const { supportTickets, addSupportTicket, updateSupportTicket, currentUser, userType, b2bEmployees } = useAdmin()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [sortBy, setSortBy] = useState<string>("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [newTicketData, setNewTicketData] = useState({
    subject: "",
    customer: "",
    type: "Complaint",
    priority: "medium",
    description: "",
  })
  const [newComment, setNewComment] = useState("")

  const searchParams = useSearchParams()
  const urlStatus = searchParams?.get('status')

  useEffect(() => {
    if (urlStatus) {
      setStatusFilter(urlStatus)
    }
  }, [urlStatus])

  const filteredTickets = supportTickets.filter(ticket => {
    const matchesSearch = 
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
      ticket.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter
    const ticketDate = ticket.createdAt.split('T')[0]
    const matchesDateFrom = !dateFrom || ticketDate >= dateFrom
    const matchesDateTo = !dateTo || ticketDate <= dateTo
    return matchesSearch && matchesStatus && matchesPriority && matchesDateFrom && matchesDateTo
  }).sort((a, b) => {
    let aVal: any = a[sortBy as keyof SupportTicket] || "";
    let bVal: any = b[sortBy as keyof SupportTicket] || "";

    if (sortBy === "priority") {
      const pRank: any = { high: 3, medium: 2, low: 1 };
      aVal = pRank[a.priority] || 0;
      bVal = pRank[b.priority] || 0;
    }

    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">Open</Badge>
      case "in_progress":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">In Progress</Badge>
      case "resolved":
        return <Badge variant="outline" className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Resolved</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "medium":
        return <Clock className="h-4 w-4 text-orange-500" />
      case "low":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      default:
        return null
    }
  }
  
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("asc")
    }
  }

  const renderSortIcon = (field: string) => {
    if (sortBy !== field) return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground opacity-50" />
    return sortOrder === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
  }

  const handleOpenCreateDialog = () => {
    let defaultCustomer = "";
    if (userType === 'corporate-employee' || userType === 'corporate-admin') {
      const emp = b2bEmployees.find(e => e.officeEmail === currentUser?.email);
      if (emp) defaultCustomer = emp.name;
    }
    setNewTicketData({
      subject: "",
      customer: defaultCustomer,
      type: "Complaint",
      priority: "medium",
      description: "",
    });
    setIsCreateDialogOpen(true);
  }

  const handleCreateTicket = () => {
    if (!newTicketData.subject || !newTicketData.customer) {
      toast.error("Subject and Customer name are required")
      return
    }
    addSupportTicket({
      subject: newTicketData.subject,
      customerName: newTicketData.customer,
      type: newTicketData.type,
      priority: newTicketData.priority,
      description: newTicketData.description,
      status: "open"
    })
    toast.success("Support ticket created successfully")
    setIsCreateDialogOpen(false)
    setNewTicketData({ subject: "", customer: "", type: "Complaint", priority: "medium", description: "" })
  }

  const handleAddComment = () => {
    if (!newComment.trim() || !selectedTicket) return;
    const comment = {
      id: crypto.randomUUID(),
      text: newComment.trim(),
      senderName: currentUser?.email?.split('@')[0] || "Admin",
      isAdmin: true,
      timestamp: new Date().toISOString()
    };
    const updatedComments = [...(selectedTicket.comments || []), comment];
    updateSupportTicket(selectedTicket.id, { comments: updatedComments });
    setSelectedTicket({ ...selectedTicket, comments: updatedComments });
    setNewComment("");
  };

  const openTicketsCount = supportTickets.filter(t => t.status === 'open').length
  const inProgressCount = supportTickets.filter(t => t.status === 'in_progress').length
  const resolvedTodayCount = supportTickets.filter(t => t.status === 'resolved' && new Date(t.updatedAt).toDateString() === new Date().toDateString()).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
          <p className="text-muted-foreground text-lg">
            Manage and resolve customer support requests
          </p>
        </div>
        <Button onClick={handleOpenCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Create Ticket
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Open Tickets</p>
              <h2 className="text-3xl font-bold text-red-600">{openTicketsCount}</h2>
            </div>
            <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">In Progress</p>
              <h2 className="text-3xl font-bold text-blue-600">{inProgressCount}</h2>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Resolved (Today)</p>
              <h2 className="text-3xl font-bold text-green-600">{resolvedTodayCount}</h2>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ticket Queue</CardTitle>
          <CardDescription>Review and respond to active support tickets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="relative lg:col-span-2">
              <Label className="text-xs text-muted-foreground mb-1 block">Search</Label>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tickets by ID, subject, or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tickets</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Priority</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">From Date</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">To Date</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
          {(searchQuery || statusFilter !== "all" || priorityFilter !== "all" || dateFrom || dateTo) && (
            <div className="mt-4 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("")
                  setStatusFilter("all")
                  setPriorityFilter("all")
                  setDateFrom("")
                  setDateTo("")
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}

          <div className="rounded-md border mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('ticketNumber')}>
                    <div className="flex items-center">Ticket ID {renderSortIcon('ticketNumber')}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('subject')}>
                    <div className="flex items-center">Subject {renderSortIcon('subject')}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('customerName')}>
                    <div className="flex items-center">Customer {renderSortIcon('customerName')}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('type')}>
                    <div className="flex items-center">Type {renderSortIcon('type')}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('priority')}>
                    <div className="flex items-center">Priority {renderSortIcon('priority')}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('status')}>
                    <div className="flex items-center">Status {renderSortIcon('status')}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('createdAt')}>
                    <div className="flex items-center">Date {renderSortIcon('createdAt')}</div>
                  </TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No tickets found.</TableCell>
                  </TableRow>
                )}
                {filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium text-primary">{ticket.ticketNumber}</TableCell>
                    <TableCell>{ticket.subject}</TableCell>
                    <TableCell>{ticket.customerName}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{ticket.type}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 capitalize">
                        {getPriorityIcon(ticket.priority)}
                        <span className="text-sm">{ticket.priority}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedTicket(ticket)
                          setIsViewDialogOpen(true)
                        }}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Ticket Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Ticket</DialogTitle>
            <DialogDescription>
              Fill in the details below to create a new support ticket.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Field>
              <Label>Subject</Label>
              <Input 
                placeholder="Briefly describe the issue" 
                value={newTicketData.subject}
                onChange={(e) => setNewTicketData({...newTicketData, subject: e.target.value})}
              />
            </Field>
            <Field>
              <Label>Customer</Label>
              <Input 
                placeholder="Customer name or ID" 
                value={newTicketData.customer}
                onChange={(e) => setNewTicketData({...newTicketData, customer: e.target.value})}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <Label>Type</Label>
                <Select value={newTicketData.type} onValueChange={(v) => setNewTicketData({...newTicketData, type: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Complaint">Complaint</SelectItem>
                    <SelectItem value="Billing">Billing</SelectItem>
                    <SelectItem value="Technical">Technical</SelectItem>
                    <SelectItem value="General Inquiry">General Inquiry</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <Label>Priority</Label>
                <Select value={newTicketData.priority} onValueChange={(v) => setNewTicketData({...newTicketData, priority: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field>
              <Label>Description</Label>
              <Textarea 
                placeholder="Provide a detailed description of the issue..." 
                rows={4} 
                value={newTicketData.description}
                onChange={(e) => setNewTicketData({...newTicketData, description: e.target.value})}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTicket}>Save Ticket</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Ticket Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-3xl flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Ticket Details: {selectedTicket?.ticketNumber}</DialogTitle>
            <DialogDescription>{selectedTicket?.subject}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 flex-1 min-h-0">
            {/* Left Col: Info */}
            <div className="space-y-4">
              <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Status</span>{selectedTicket && getStatusBadge(selectedTicket.status)}</div>
              <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Priority</span><div className="flex items-center gap-2 capitalize">{selectedTicket && getPriorityIcon(selectedTicket.priority)}<span className="text-sm font-medium">{selectedTicket?.priority}</span></div></div>
              <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Customer</span><span className="text-sm font-medium">{selectedTicket?.customerName}</span></div>
              <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Type</span><Badge variant="outline">{selectedTicket?.type}</Badge></div>
              {selectedTicket?.description && (
                <div className="flex flex-col gap-1 mt-2">
                  <span className="text-sm text-muted-foreground">Description</span>
                  <p className="text-sm bg-muted/50 p-3 rounded-md">{selectedTicket.description}</p>
                </div>
              )}
              <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Created At</span><span className="text-sm text-muted-foreground">{selectedTicket && new Date(selectedTicket.createdAt).toLocaleString()}</span></div>
            </div>
            
            {/* Right Col: Chat Interface */}
            <div className="flex flex-col border rounded-md overflow-hidden bg-background">
              <div className="bg-muted/50 p-2 border-b text-sm font-medium text-center">Conversation</div>
              <ScrollArea className="flex-1 p-4 h-[300px]">
                <div className="space-y-4 flex flex-col justify-end">
                  {selectedTicket?.comments?.length ? selectedTicket.comments.map(comment => (
                    <div key={comment.id} className={`flex flex-col ${comment.isAdmin ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] rounded-lg p-2.5 text-sm ${comment.isAdmin ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        {comment.text}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <span className="font-medium">{comment.senderName}</span>
                        <span>•</span>
                        <span>{new Date(comment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center text-muted-foreground text-sm py-8">No messages yet.</div>
                  )}
                </div>
              </ScrollArea>
              <div className="p-3 border-t bg-muted/20 flex gap-2">
                <Input 
                  placeholder="Type a message..." 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                />
                <Button size="icon" onClick={handleAddComment} disabled={!newComment.trim() || selectedTicket?.status === 'resolved'}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            {selectedTicket?.status !== 'resolved' && (
              <Button 
                variant="outline" 
                className="mr-auto text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                onClick={() => {
                  updateSupportTicket(selectedTicket!.id, { status: 'resolved' })
                  toast.success("Ticket marked as resolved")
                  setIsViewDialogOpen(false)
                }}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Resolved
              </Button>
            )}
            <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ children }: { children: React.ReactNode }) {
  return <div className="grid w-full items-center gap-1.5">{children}</div>
}