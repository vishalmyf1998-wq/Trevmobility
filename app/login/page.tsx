'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useUserType } from '@/lib/admin-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Building2, UserCog2, Shield, Loader2 } from 'lucide-react'

const LoginOptions = [
  {
    type: 'trev-admin' as const,
    title: 'Trev Admin',
    subtitle: 'Full Fleet Management',
    icon: Shield,
    path: '/trev-admin/dashboard',
    color: '#39FF14',
    description: 'Complete access to drivers, cars, bookings, reports'
  },
  {
    type: 'corporate-admin' as const,
    title: 'Corporate Admin',
    subtitle: 'B2B Management',
    icon: Building2,
    path: '/corporate-admin/dashboard',
    color: '#3B82F6',
    description: 'Manage employees, approvals, corporate bookings'
  },
  {
    type: 'corporate-employee' as const,
    title: 'Corporate Employee',
    subtitle: 'Employee Portal',
    icon: UserCog2,
    path: '/employee/dashboard',
    color: '#10B981',
    description: 'View my bookings, wallet, support tickets'
  }
] as const

export default function LoginSelection() {
  const router = useRouter()
  const { setUserType } = useUserType()

  const [selectedRole, setSelectedRole] = useState<typeof LoginOptions[number]>(LoginOptions[0])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // If already logged in, redirect to dashboard
    const session = sessionStorage.getItem('supabase.auth.token')
    if (session) {
      const currentType = localStorage.getItem('userType') as any || 'trev-admin'
      router.push(currentType === 'trev-admin' ? '/trev-admin/dashboard' : 
                 currentType === 'corporate-admin' ? '/corporate-admin/dashboard' : '/employee/dashboard')
      return
    }
  }, [router])

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
        console.log("Supabase auth failed, falling back to demo mode", error);
        toast.success(`Demo Mode: Welcome to ${selectedRole.title}!`)
      } else {
        toast.success(`Welcome to ${selectedRole.title}!`)
      }

      setUserType(selectedRole.type)
      router.push(selectedRole.type === 'trev-admin' ? '/trev-admin/dashboard' : 
                 selectedRole.type === 'corporate-admin' ? '/corporate-admin/dashboard' : 
                 '/employee/dashboard')
    } catch (error: any) {
      toast.error(error.message || 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black flex items-center justify-center p-4 animate-in fade-in zoom-in duration-700">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-24 w-24 rounded-3xl bg-gradient-to-r from-[#39FF14] to-emerald-500 flex items-center justify-center shadow-2xl mb-6">
            <img 
              src="https://play-lh.googleusercontent.com/m2cWyG1zroDi0XxEK-WeMDuLKKJrwzPPEiPh7M_xzTm-ToRj9KDAOjBU4HzneWjMpsI=w240-h480-rw" 
              alt="Trev Logo" 
              className="h-16 w-16 object-contain rounded-2xl shadow-lg"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-zinc-200 bg-clip-text text-transparent mb-4 tracking-tight">
            Trev Admin Portal
          </h1>
          <p className="text-xl text-zinc-400 max-w-md mx-auto leading-relaxed">
            Select your role and login to continue
          </p>
        </div>

        {/* Login Options Grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {LoginOptions.map((option) => {
            const isSelected = selectedRole.type === option.type
            return (
              <Card 
                key={option.type}
                className={`group cursor-pointer transition-all duration-300 border-2 overflow-hidden
                  ${isSelected 
                    ? 'bg-black/80 shadow-[0_0_40px_var(--color)_30] scale-105 z-10' 
                    : 'bg-black/40 border-transparent hover:bg-black/60 opacity-60 hover:opacity-100 hover:-translate-y-1'
                  }`}
                style={{ 
                  '--color': option.color,
                  borderColor: isSelected ? option.color : 'transparent'
                } as React.CSSProperties}
                onClick={() => setSelectedRole(option)}
              >
                <CardHeader className="pb-4 pt-6">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 mx-auto transition-transform duration-300 ${isSelected ? 'scale-110 bg-[color-var(--color)]/20' : 'bg-white/10 group-hover:scale-110'}`}>
                    <option.icon className="h-8 w-8" style={{ color: option.color }} />
                  </div>
                  <CardTitle className={`text-2xl font-bold text-center transition-colors ${isSelected ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}>
                    {option.title}
                  </CardTitle>
                  <CardDescription className="text-center font-medium" style={{ color: isSelected ? option.color : undefined }}>
                    {option.subtitle}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 pb-6 text-center">
                  <p className="text-zinc-500 text-sm leading-relaxed">{option.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Login Form */}
        <Card className="max-w-md mx-auto border-none bg-black/60 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] mt-8">
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-5 pt-8">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300 font-semibold">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="h-12 bg-black/50 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-[color-var(--color)] focus-visible:border-[color-var(--color)] transition-colors"
                  style={{ '--color': selectedRole.color } as React.CSSProperties}
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
                  className="h-12 bg-black/50 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-[color-var(--color)] focus-visible:border-[color-var(--color)] transition-colors"
                  style={{ '--color': selectedRole.color } as React.CSSProperties}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="pb-8">
              <Button 
                type="submit" 
                className="w-full h-12 text-lg font-bold shadow-[0_0_20px_var(--color)_40] hover:shadow-[0_0_30px_var(--color)_60] text-black transition-all"
                style={{ 
                  '--color': selectedRole.color,
                  background: `linear-gradient(to right, ${selectedRole.color}, ${selectedRole.color}cc)`
                } as React.CSSProperties}
                disabled={isLoading}
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Signing In...</>
                ) : (
                  `Sign In as ${selectedRole.title.split(' ')[0]}`
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
