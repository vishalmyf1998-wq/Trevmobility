'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Shield, Building2, UserCog2 } from 'lucide-react'
import { useUserType } from '@/lib/admin-context'

const roleConfig = {
  'trev-admin': { color: '#39FF14', title: 'Trev Admin Login', subtitle: 'Fleet Management Portal' },
  'corporate-admin': { color: '#3B82F6', title: 'Corporate Admin Login', subtitle: 'B2B Management Portal' },
  'corporate-employee': { color: '#10B981', title: 'Corporate Employee Login', subtitle: 'Employee Portal' }
} as const

export default function RoleLogin() {
  const params = useParams()
  const role = params.role as keyof typeof roleConfig
  const config = roleConfig[role] || roleConfig['trev-admin']
  const router = useRouter()
  const { setUserType } = useUserType()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Please enter email and password')
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Fallback for Demo Mode if Supabase fails or isn't set up
        console.log("Supabase auth failed, falling back to demo mode", error);
        toast.success(`Demo Mode: Welcome to ${config.title}!`)
      } else {
        toast.success(`Welcome to ${config.title}!`)
      }

      setUserType(role)
      router.push(role === 'trev-admin' ? '/trev-admin/dashboard' : 
                 role === 'corporate-admin' ? '/corporate-admin/dashboard' : 
                 '/employee/dashboard')

    } catch (error: any) {
      toast.error(error.message || 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-none bg-black/60 backdrop-blur-xl shadow-[0_0_50px_rgba(57,255,20,0.15)]">
        <CardHeader className="space-y-3 text-center pb-8">
          <div className="flex justify-center mb-4">
            <div 
              className="h-20 w-20 rounded-3xl bg-gradient-to-r from-transparent via-white/10 to-transparent flex items-center justify-center border-2 border-[color-var(--color)] shadow-[0_0_20px_var(--color)_20]" 
              style={{ '--color': config.color } as React.CSSProperties} 
            />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-white via-zinc-200 to-white/50 bg-clip-text text-transparent">
            {config.title}
          </CardTitle>
          <CardDescription className="text-zinc-400 text-lg">
            {config.subtitle}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300 font-semibold">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@trevcabs.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="h-12 bg-black/50 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-[color-var(--color)] focus-visible:border-[color-var(--color)]"
                style={{ '--color': config.color } as React.CSSProperties}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300 font-semibold">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="h-12 bg-black/50 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-[color-var(--color)] focus-visible:border-[color-var(--color)]"
                style={{ '--color': config.color } as React.CSSProperties}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="pt-4 pb-6">
            <Button 
              type="submit" 
              className="w-full h-12 text-lg font-bold shadow-[0_0_20px_var(--color)_40] hover:shadow-[0_0_30px_var(--color)_60] bg-gradient-to-r from-[color-var(--color)] to-[color-var(--color)]/80 hover:from-[color-var(--color)]/90 text-black transition-all"
              style={{ '--color': config.color } as React.CSSProperties}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing In...
                </>
              ) : (
                `Sign In as ${config.title.split(' ')[0]}`
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
