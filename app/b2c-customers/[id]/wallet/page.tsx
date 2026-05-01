"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { WalletTransaction, B2CCustomer } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowUpRight, ArrowDownLeft, Wallet } from 'lucide-react'
import { toast } from 'sonner'

export default function CustomerWalletPage() {
  const params = useParams()
  const customerId = params.id as string
  const [customer, setCustomer] = useState<B2CCustomer | null>(null)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!customerId) return

    const fetchWalletData = async () => {
      setLoading(true)
      try {
        // Fetch customer
        const { data: custData } = await supabase
          .from('b2c_customers')
          .select('*')
          .eq('id', customerId)
          .single()

        // Fetch transactions
        const { data: txData } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })

        setCustomer(custData)
        setTransactions(txData || [])
      } catch (error) {
        toast.error('Failed to load wallet data')
      } finally {
        setLoading(false)
      }
    }

    fetchWalletData()

    // Realtime subscription
    const sub1 = supabase
      .channel('customer-wallet')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'b2c_customers', filter: `id=eq.${customerId}` },
        (payload) => {
          setCustomer(payload.new as B2CCustomer)
        }
      )
      .subscribe()

    const sub2 = supabase
      .channel('wallet-transactions')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'wallet_transactions', filter: `customer_id=eq.${customerId}` },
        () => fetchWalletData() // Refresh on new tx
      )
      .subscribe()

    return () => {
      supabase.removeChannel(sub1)
      supabase.removeChannel(sub2)
    }
  }, [customerId])

  if (loading) {
    return <div>Loading wallet...</div>
  }

  if (!customer) {
    return <div>Customer not found</div>
  }

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-6 w-6" />
            My Wallet
          </CardTitle>
          <CardDescription>Current balance and transaction history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="text-4xl font-bold text-primary mb-2">
              ₹{customer.walletBalance.toLocaleString('en-IN')}
            </div>
            <p className="text-muted-foreground">Available Balance</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No transactions yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.slice(0, 10).map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">
                      {new Date(tx.createdAt).toLocaleDateString('en-IN')}
                    </TableCell>
                    <TableCell>{tx.description}</TableCell>
                    <TableCell>
                      {tx.type === 'credit' ? (
                        <Badge className="bg-green-500/10 text-green-600 border-green-200">
                          Credit
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20">
                          Debit
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      <span className={tx.type === 'credit' ? 'text-green-600' : 'text-destructive'}>
                        {tx.type === 'credit' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                      </span>
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
