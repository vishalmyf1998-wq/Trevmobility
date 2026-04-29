'use client'

import { ReactNode } from 'react'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Separator } from '@/components/ui/separator'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { usePathname } from 'next/navigation'

const pathTitles: Record<string, string> = {
  '': 'Dashboard',
  'drivers': 'Drivers',
  'cars': 'Cars',
  'car-categories': 'Car Categories',
  'cities': 'Cities',
  'fare-groups': 'Fare Groups',
  'bookings': 'Bookings',
  'b2b-clients': 'B2B Clients',
  'duty-slips': 'Duty Slips',
  'invoices': 'Invoices',
  'gst-config': 'GST Configuration',
  'driver-payouts': 'Driver Settlements',
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)
  
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
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              {segments.length > 0 && segments.map((segment, index) => (
                <span key={segment} className="contents">
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {index === segments.length - 1 ? (
                      <BreadcrumbPage>{pathTitles[segment] || segment}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={`/${segments.slice(0, index + 1).join('/')}`}>
                        {pathTitles[segment] || segment}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </span>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
