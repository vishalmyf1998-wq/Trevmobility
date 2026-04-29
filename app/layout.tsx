import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AdminProvider } from '@/lib/admin-context'
import { AdminLayout } from '@/components/admin-layout'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const geist = Geist({ 
  subsets: ["latin"],
  variable: "--font-geist-sans"
});
const geistMono = Geist_Mono({ 
  subsets: ["latin"],
  variable: "--font-geist-mono"
});

export const metadata: Metadata = {
  title: 'Trev Admin - Fleet Management',
  description: 'Trev Mobility Fleet Management System',
  generator: 'v0.app',
  icons: {
    icon: 'https://play-lh.googleusercontent.com/m2cWyG1zroDi0XxEK-WeMDuLKKJrwzPPEiPh7M_xzTm-ToRj9KDAOjBU4HzneWjMpsI=w240-h480-rw',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background" suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}>
        <AdminProvider>
          <AdminLayout>
            {children}
          </AdminLayout>
        </AdminProvider>
        <Toaster position="top-right" />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
