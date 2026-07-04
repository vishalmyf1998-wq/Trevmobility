'use client'

import { ReactNode } from 'react'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { usePathname } from 'next/navigation'
import { CitySelector } from '@/components/city-selector'

export function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  
  if (pathname === '/login') {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        {children}
      </main>
    )
  }

  if (pathname.startsWith('/print/')) {
    return <>{children}</>
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-slate-50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100/40 via-purple-50/20 to-emerald-50/30 relative">
        {/* Global Decorative Blur Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-300/20 rounded-full blur-[120px] pointer-events-none mix-blend-multiply fixed" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-300/20 rounded-full blur-[120px] pointer-events-none mix-blend-multiply fixed" />

        {/* Minimal Transparent Header */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 px-4 md:px-6 sticky top-0 z-50 w-full pointer-events-none">
          <div className="pointer-events-auto">
            <SidebarTrigger className="-ml-1 bg-white/70 backdrop-blur-2xl hover:bg-white shadow-[0_8px_16px_-6px_rgba(0,0,0,0.1)] border border-white/80 h-10 w-10 rounded-[1rem] text-slate-700 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center" />
          </div>
          <div className="pointer-events-auto">
            <CitySelector />
          </div>
        </header>
        
        <main className="flex-1 overflow-auto px-4 pb-4 md:px-6 md:pb-6 relative z-10 custom-scrollbar">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
