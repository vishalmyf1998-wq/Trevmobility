'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { useAdmin, useUserType } from '@/lib/admin-context'
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
  UserCircle,
  Headset,
  Bell,
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
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

type NavItem = {
  title: string
  icon: any
  href?: string
  notificationKey?: 'pendingEdits' | 'openTickets'
  items?: { title: string; href: string; notificationKey?: 'pendingEdits' | 'openTickets' }[]
}


export function AppSidebar() {
  const pathname = usePathname()
  const { currentUser, logout, bookings, supportTickets } = useAdmin()
  const { userType } = useUserType()

  const sidebarConfig = {
    'trev-admin': {
      title: 'Trev Admin',
      subtitle: 'Fleet Management',
      color: '#39FF14',
    },
    'corporate-admin': {
      title: 'Corporate Admin',
      subtitle: 'B2B Dashboard',
      color: '#3B82F6',
    },
    'corporate-employee': {
      title: 'Corporate Employee',
      subtitle: 'My Portal',
      color: '#10B981',
    }
  }[userType] || sidebarConfig['trev-admin']

  const isTrevAdmin = userType === 'trev-admin'
  const isCorpAdmin = userType === 'corporate-admin'
  const isEmployee = userType === 'corporate-employee'

  const hexToHslString = (hex: string) => {
    if (hex === '#3B82F6') return '217 91% 60%'
    if (hex === '#10B981') return '160 84% 39%'
    return '111 100% 54%'
  }
  const colorHsl = hexToHslString(sidebarConfig.color)
  
  const notificationCounts = useMemo(() => {
    return {
      pendingEdits: bookings.filter(b => b.status === 'pending_edit_approval').length,
      openTickets: supportTickets.filter(t => t.status === 'open').length
    }
  }, [bookings, supportTickets])

  const navigation: NavItem[] = [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      href: isEmployee ? '/employee/dashboard' : isCorpAdmin ? '/corporate-admin/dashboard' : '/trev-admin/dashboard',
    },

    ...(isTrevAdmin ? [
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
        title: 'B2C Management',
        icon: UserCircle,
        items: [
          { title: 'Customers', href: '/b2c-customers' },
          { title: 'Wallet Management', href: '/b2c-wallet' },
          { title: 'Refer & Earn', href: '/admin-users/referrals' },
          { title: 'Reviews & Ratings', href: '/admin-users/reviews' },
        ],
      },
    ] : []),
    ...((isTrevAdmin || isCorpAdmin) ? [
      {
        title: isCorpAdmin ? 'My Company' : 'B2B Management',
        icon: Building2,
        items: [
          ...(isTrevAdmin ? [{ title: 'B2B Clients', href: '/b2b-clients' }] : []),
          { title: isCorpAdmin ? 'My Employees' : 'B2B Employees', href: '/b2b-employees' },
          { title: 'Approval Workflows', href: '/b2b-approvals' },
        ],
      },
    ] : []),
    {
      title: isEmployee ? 'My Bookings' : 'Bookings',
      icon: CalendarCheck,
      ...(isTrevAdmin ? {
        items: [
          { title: 'All Bookings', href: '/bookings' },
          { title: 'Changes Approval', href: '/bookings?status=pending_edit_approval', notificationKey: 'pendingEdits' }
        ]
      } : { href: '/bookings' }),
    },
    ...(isTrevAdmin ? [
      {
        title: 'Fare & Operations',
        icon: DollarSign,
        items: [
          { title: 'Fare Configuration', href: '/fare-groups' },
          { title: 'Surge Pricing', href: '/admin-users/surge' },
          { title: 'Tolls & Taxes', href: '/admin-users/extras' },
        ],
      },
    ] : []),
    {
      title: isEmployee ? 'Support' : 'Support & Tickets',
      icon: Headset,
      href: '/admin-users/support',
      notificationKey: 'openTickets',
    },
    ...(isTrevAdmin ? [
      {
        title: 'Driver Settlements',
        icon: Wallet,
        href: '/driver-payouts',
      },
      {
        title: 'Promo Codes',
        icon: Tag,
        href: '/promo-codes',
      },
    ] : []),
    ...((isTrevAdmin || isCorpAdmin) ? [
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
    ] : []),
    ...(isTrevAdmin ? [
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
    ] : []),
  ]

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        :root, .dark {
          --sidebar-background: 0 0% 0% !important;
          --sidebar-foreground: ${colorHsl} !important;
          --sidebar-primary: ${colorHsl} !important;
          --sidebar-primary-foreground: 0 0% 0% !important;
          --sidebar-accent: 0 0% 15% !important;
          --sidebar-accent-foreground: ${colorHsl} !important;
          --sidebar-border: 0 0% 20% !important;
          --sidebar-ring: ${colorHsl} !important;
        }

        /* Force Background directly if variables fail */
        [data-sidebar="sidebar"],
        [data-sidebar="sidebar"] > div {
          background-color: #000000 !important;
          color: ${sidebarConfig.color} !important;
        }

        [data-sidebar="menu-button"][data-active="true"] {
          background-color: ${sidebarConfig.color} !important;
          color: #000000 !important;
        }

        @keyframes notification-pulse {
          0%, 100% {
            box-shadow: 0 0 0 0px hsl(var(--destructive) / 0.5);
          }
          50% {
            box-shadow: 0 0 0 6px hsl(var(--destructive) / 0);
          }
        }

        .notification-badge-pulse {
          animation: notification-pulse 2s infinite;
        }
      `}} />
      <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg overflow-hidden">
            <img src="https://play-lh.googleusercontent.com/m2cWyG1zroDi0XxEK-WeMDuLKKJrwzPPEiPh7M_xzTm-ToRj9KDAOjBU4HzneWjMpsI=w240-h480-rw" alt="Trev Admin Logo" className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
<span className="text-sm font-semibold text-sidebar-foreground">{sidebarConfig.title}</span>
            <span className="text-xs text-sidebar-foreground/60">{sidebarConfig.subtitle}</span>
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
                            <SidebarMenuSubItem key={subItem.href} className="flex items-center justify-between pr-2">
                              <SidebarMenuSubButton asChild isActive={pathname === subItem.href}>
                                <Link href={subItem.href} className="flex-grow">{subItem.title}</Link>
                              </SidebarMenuSubButton>
                              {subItem.notificationKey && notificationCounts[subItem.notificationKey as keyof typeof notificationCounts] > 0 && (
                                <Badge variant="destructive" className="h-5 px-1.5 text-xs font-semibold notification-badge-pulse">
                                  {notificationCounts[subItem.notificationKey as keyof typeof notificationCounts]}
                                </Badge>
                              )}
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
                    <span className="flex-1">{item.title}</span>
                    {item.notificationKey && notificationCounts[item.notificationKey as keyof typeof notificationCounts] > 0 && (
                      <Badge variant="destructive" className="h-5 px-1.5 text-xs font-semibold notification-badge-pulse">
                        {notificationCounts[item.notificationKey as keyof typeof notificationCounts]}
                      </Badge>
                    )}
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
<span className="text-sm font-medium text-sidebar-foreground">
                {sidebarConfig.title} ({userType.toUpperCase()})
              </span>
              <span className="text-xs text-sidebar-foreground/60 truncate max-w-[120px]">
                {currentUser?.email || 'user@company.com'}
              </span>
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
