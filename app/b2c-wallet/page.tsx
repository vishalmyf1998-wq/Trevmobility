"use client"

import { useState } from "react"
import { useAdmin } from "@/lib/admin-context"
import { WalletTransaction, B2CCustomer } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Search, Wallet, ArrowUpRight, ArrowDownLeft, Plus, History, UserCircle, DollarSign } from "lucide-react"

export default function CustomerWalletPage() {
  const { b2cCustomers, walletTransactions, addWalletTransaction } = useAdmin()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<B2CCustomer | null>(null)
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false)
  const [transactionType, setTransactionType] = useState<'credit' | 'debit'>('credit')
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")

  const filteredCustomers = b2cCustomers.filter(customer => {
    const query = searchQuery.toLowerCase()
    return (
      customer.name.toLowerCase().includes(query) ||
      customer.phone.toLowerCase().includes(query) ||
      customer.customerCode.toLowerCase().includes(query)
    )
  }).slice(0, 5) // Show top 5 matches for quick selection

  const customerTransactions = selectedCustomer 
    ? walletTransactions.filter(t => t.customerId === selectedCustomer.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : []

  const totalWalletBalance = b2cCustomers.reduce((sum, c) => sum + (c.walletBalance || 0), 0)

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomer) return
    
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    if (transactionType === 'debit' && numAmount > (selectedCustomer.walletBalance || 0)) {
      toast.error('Insufficient wallet balance')
      return
    }

    try {
      await addWalletTransaction({
        customerId: selectedCustomer.id,
        amount: numAmount,
        type: transactionType,
        description: description || (transactionType === 'credit' ? 'Wallet Top-up' : 'Wallet Deduction')
      })
      
      toast.success(`Successfully ${transactionType === 'credit' ? 'added to' : 'deducted from'} wallet`)
      setIsTransactionDialogOpen(false)
      setAmount("")
      setDescription("")
      
      // Update selected customer state manually to reflect new balance immediately
      setSelectedCustomer(prev => {
        if (!prev) return null
        return {
          ...prev,
          walletBalance: (prev.walletBalance || 0) + (transactionType === 'credit' ? numAmount : -numAmount)
        }
      })
    } catch (error) {
      toast.error('Transaction failed')
    }
  }

  const openTransactionDialog = (type: 'credit' | 'debit') => {
    setTransactionType(type)
    setAmount("")
    setDescription("")
    setIsTransactionDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Customer Wallets</h1>
          <p className="text-muted-foreground">Manage wallet balances, cashbacks, and refunds</p>
        </div>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">₹{totalWalletBalance.toLocaleString('en-IN')}</p>
                <p className="text-sm text-muted-foreground">Total System Balance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Customer Search & Selection */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Find Customer</CardTitle>
            <CardDescription>Search by name, phone or code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {searchQuery && (
              <div className="space-y-2 border rounded-md p-2">
                {filteredCustomers.length === 0 ? (
                  <p className="text-sm text-center text-muted-foreground py-2">No customers found</p>
                ) : (
                  filteredCustomers.map(customer => (
                    <div 
                      key={customer.id}
                      className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedCustomer(customer)
                        setSearchQuery("")
                      }}
                    >
                      <div>
                        <p className="text-sm font-medium">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">{customer.phone}</p>
                      </div>
                      <Badge variant="outline">₹{customer.walletBalance || 0}</Badge>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Customer Details & Transactions */}
        <div className="lg:col-span-2 space-y-6">
          {selectedCustomer ? (
            <>
              {/* Selected Customer Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xl font-bold text-primary">
                          {selectedCustomer.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">{selectedCustomer.name}</h2>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <span>{selectedCustomer.customerCode}</span>
                          <span>•</span>
                          <span>{selectedCustomer.phone}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Current Balance</p>
                        <p className="text-3xl font-bold text-primary">₹{(selectedCustomer.walletBalance || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button 
                          size="sm" 
                          className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => openTransactionDialog('credit')}
                        >
                          <ArrowDownLeft className="mr-2 h-4 w-4" />
                          Add Money
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full sm:w-auto text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => openTransactionDialog('debit')}
                          disabled={(selectedCustomer.walletBalance || 0) <= 0}
                        >
                          <ArrowUpRight className="mr-2 h-4 w-4" />
                          Deduct
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transaction History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Transaction History
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerTransactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No wallet transactions found for this customer.
                          </TableCell>
                        </TableRow>
                      ) : (
                        customerTransactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell className="text-sm">
                              {new Date(tx.createdAt).toLocaleString('en-IN', {
                                day: 'numeric', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </TableCell>
                            <TableCell className="font-medium text-sm">
                              {tx.description}
                            </TableCell>
                            <TableCell>
                              {tx.type === 'credit' ? (
                                <Badge className="bg-green-500/10 text-green-600 border-green-200">Credit</Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20">Debit</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              <span className={tx.type === 'credit' ? 'text-green-600' : 'text-foreground'}>
                                {tx.type === 'credit' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="h-full flex items-center justify-center min-h-[400px] border-dashed">
              <CardContent className="flex flex-col items-center justify-center text-muted-foreground">
                <UserCircle className="h-16 w-16 mb-4 opacity-20" />
                <p>Search and select a customer to view and manage their wallet</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Transaction Dialog */}
      <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {transactionType === 'credit' ? 'Add Money to Wallet' : 'Deduct from Wallet'}
            </DialogTitle>
            <DialogDescription>
              {transactionType === 'credit' 
                ? `Adding funds to ${selectedCustomer?.name}'s wallet.`
                : `Deducting funds from ${selectedCustomer?.name}'s wallet. Current balance: ₹${selectedCustomer?.walletBalance || 0}`
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleTransaction} className="space-y-4">
            <Field>
              <FieldLabel>Amount (₹) *</FieldLabel>
              <Input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                required
              />
            </Field>
            
            <Field>
              <FieldLabel>Description *</FieldLabel>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={transactionType === 'credit' ? "e.g., Promotional Cashback, Refund" : "e.g., Booking Cancellation Fee"}
                required
              />
            </Field>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsTransactionDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className={transactionType === 'credit' ? "bg-green-600 hover:bg-green-700 text-white" : "bg-destructive hover:bg-destructive/90 text-white"}
              >
                {transactionType === 'credit' ? 'Add Funds' : 'Deduct Funds'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
