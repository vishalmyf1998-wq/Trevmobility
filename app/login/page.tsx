'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Please enter both email and password')
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      toast.success('Logged in successfully')
      router.push('/')
    } catch (error: any) {
      toast.error(error.message || 'Failed to login')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto animate-in fade-in zoom-in duration-500">
      <Card className="border-[#39FF14]/30 bg-black/60 backdrop-blur-xl shadow-[0_0_50px_rgba(57,255,20,0.15)]">
        <CardHeader className="space-y-3 text-center pb-8">
          <div className="flex justify-center mb-2">
            <div className="h-20 w-20 rounded-3xl bg-black flex items-center justify-center border-2 border-[#39FF14]/50 shadow-[0_0_20px_rgba(57,255,20,0.3)] overflow-hidden">
              <img src="https://play-lh.googleusercontent.com/m2cWyG1zroDi0XxEK-WeMDuLKKJrwzPPEiPh7M_xzTm-ToRj9KDAOjBU4HzneWjMpsI=w240-h480-rw" alt="Trev Admin" className="h-full w-full object-cover" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-white">Trev Admin</CardTitle>
          <CardDescription className="text-zinc-400 text-sm">
            Enter your credentials to access the fleet dashboard
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-5">
            <div className="space-y-2 text-left">
              <Label htmlFor="email" className="text-zinc-300 font-semibold">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@trevcabs.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="h-12 bg-black/50 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-[#39FF14] focus-visible:border-[#39FF14]"
                required
              />
            </div>
            <div className="space-y-2 text-left">
              <Label htmlFor="password" className="text-zinc-300 font-semibold">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="h-12 bg-black/50 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-[#39FF14] focus-visible:border-[#39FF14]"
                required
              />
            </div>
          </CardContent>
          <CardFooter className="pt-4 pb-6">
            <Button 
              type="submit" 
              className="w-full h-12 text-lg bg-[#39FF14] hover:bg-[#39FF14]/80 text-black font-bold shadow-[0_0_20px_rgba(57,255,20,0.4)] transition-all" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
