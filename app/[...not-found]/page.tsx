import Link from 'next/link'
import { redirect } from 'next/navigation'

type NotFoundParams = {
  'not-found'?: string[]
}

type NotFoundProps = {
  params: NotFoundParams | Promise<NotFoundParams>
}

const redirects: Record<string, string> = {
  'corporate-admin': '/corporate-admin/dashboard',
  'corporate-employee': '/employee/dashboard',
  'admin-users': '/trev-admin/dashboard',
}

export default async function NotFound({ params }: NotFoundProps) {
  const resolvedParams = await params
  const pathname = resolvedParams['not-found']?.[0] || ''
  const targetPath = redirects[pathname]

  if (targetPath) {
    redirect(targetPath)
  }

  // Generic 404 for everything else
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black flex flex-col items-center justify-center p-8 text-center">
      <div className="max-w-md space-y-6">
        <div className="h-24 w-24 mx-auto bg-zinc-800/50 rounded-2xl flex items-center justify-center">
          <span className="text-4xl font-bold text-zinc-500">404</span>
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-white">Page Not Found</h1>
          <p className="text-lg text-zinc-400">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
        <div className="flex gap-3 pt-4">
          <Link
            href="/trev-admin/dashboard"
            className="px-6 py-2.5 bg-emerald-500/90 hover:bg-emerald-500 text-black font-semibold rounded-xl transition-all shadow-lg hover:shadow-emerald-500/25"
          >
            Admin Dashboard
          </Link>
          <Link
            href="/bookings"
            className="px-6 py-2.5 border border-zinc-700 hover:border-zinc-600 text-zinc-300 font-semibold rounded-xl transition-all hover:bg-zinc-800/50"
          >
            Bookings
          </Link>
        </div>
      </div>
    </div>
  )
}
