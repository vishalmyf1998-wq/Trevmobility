'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAdmin } from '@/lib/admin-context'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Users,
  Car,
  MapPin,
  DollarSign,
  Building2,
  Receipt,
  FileText,
  Settings,
  ChevronDown,
  Layers,
  CalendarCheck,
  Warehouse,
  Tag,
  MapPinned,
  CreditCard,
  BarChart3,
  UserCog,
  MessageSquare,
  Shield,
  XCircle,
  Wallet,
  LogOut,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarFooter,
} from '@/components/ui/sidebar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

type NavItem = {
  title: string
  icon: any
  href?: string
  items?: { title: string; href: string }[]
}

const navigation: NavItem[] = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    href: '/',
  },
  {
    title: 'Fleet Management',
    icon: Car,
    items: [
      { title: 'Drivers', href: '/drivers' },
      { title: 'Cars', href: '/cars' },
      { title: 'Driver-Car Mapping', href: '/driver-car-mapping' },
      { title: 'Car Categories', href: '/car-categories' },
      { title: 'Hubs', href: '/hubs' },
      { title: 'Live Tracking', href: '/live-tracking' },
    ],
  },
  {
    title: 'Cities',
    icon: MapPin,
    items: [
      { title: 'All Cities', href: '/cities' },
      { title: 'Airports', href: '/airports' },
      { title: 'City Polygons', href: '/city-polygons' },
    ],
  },
  {
    title: 'Fare Configuration',
    icon: DollarSign,
    href: '/fare-groups',
  },
  {
    title: 'Bookings',
    icon: CalendarCheck,
    href: '/bookings',
  },
  {
    title: 'Driver Settlements',
    icon: Wallet,
    href: '/driver-payouts',
  },
  {
    title: 'B2B Management',
    icon: Building2,
    items: [
      { title: 'B2B Clients', href: '/b2b-clients' },
      { title: 'B2B Employees', href: '/b2b-employees' },
    ],
  },
  {
    title: 'Promo Codes',
    icon: Tag,
    href: '/promo-codes',
  },
  {
    title: 'Billing',
    icon: Receipt,
    items: [
      { title: 'Invoices', href: '/invoices' },
      { title: 'Pending Payments', href: '/pending-payments' },
    ],
  },
  {
    title: 'Reports',
    icon: BarChart3,
    href: '/reports',
  },
  {
    title: 'Settings',
    icon: Settings,
    items: [
      { title: 'GST Configuration', href: '/gst-config' },
      { title: 'Communication Templates', href: '/communication-templates' },
      { title: 'Cancellation Policy', href: '/cancellation-policy' },
      { title: 'Booking Tags', href: '/booking-tags' },
    ],
  },
  {
    title: 'Access Control',
    icon: Shield,
    items: [
      { title: 'Roles & Permissions', href: '/roles' },
      { title: 'Admin Users', href: '/admin-users' },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { currentUser, logout } = useAdmin()

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        :root, .dark {
          --sidebar-background: 0 0% 0% !important;
          --sidebar-foreground: 111 100% 54% !important;
          --sidebar-primary: 111 100% 54% !important;
          --sidebar-primary-foreground: 0 0% 0% !important;
          --sidebar-accent: 111 100% 15% !important;
          --sidebar-accent-foreground: 111 100% 54% !important;
          --sidebar-border: 111 100% 40% !important;
          --sidebar-ring: 111 100% 54% !important;
        }

        /* Force Background directly if variables fail */
        [data-sidebar="sidebar"],
        [data-sidebar="sidebar"] > div {
          background-color: #000000 !important;
          color: #39FF14 !important;
        }

        [data-sidebar="menu-button"][data-active="true"] {
          background-color: #39FF14 !important;
          color: #000000 !important;
        }
      `}} />
      <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg overflow-hidden">
            <img src="https://play-lh.googleusercontent.com/m2cWyG1zroDi0XxEK-WeMDuLKKJrwzPPEiPh7M_xzTm-ToRj9KDAOjBU4HzneWjMpsI=w240-h480-rw" alt="Trev Admin Logo" className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
          <span className="text-sm font-semibold text-sidebar-foreground">Trev Admin</span>
            <span className="text-xs text-sidebar-foreground/60">Fleet Management</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) =>
                item.items ? (
                  <Collapsible key={item.title} asChild defaultOpen={item.items.some(sub => pathname === sub.href)}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.title}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                          <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.href}>
                              <SidebarMenuSubButton asChild isActive={pathname === subItem.href}>
                                <Link href={subItem.href}>{subItem.title}</Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.title}>
                      <Link href={item.href || '#'}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center w-full">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-8 w-8 shrink-0 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-xs font-bold text-sidebar-accent-foreground">
                {currentUser?.email?.charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-medium text-sidebar-foreground">Admin User</span>
              <span className="text-xs text-sidebar-foreground/60 truncate max-w-[120px]">{currentUser?.email || 'admin@trevcabs.com'}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} className="group-data-[collapsible=icon]:hidden shrink-0 text-sidebar-foreground hover:text-[#39FF14] hover:bg-zinc-900">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
    </>
  )
}
