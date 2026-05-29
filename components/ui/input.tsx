import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'file:text-foreground placeholder:text-slate-400 selection:bg-indigo-500 selection:text-white border-slate-200/60 h-11 w-full min-w-0 rounded-[1rem] border bg-white/50 backdrop-blur-sm px-4 py-2 text-[14px] font-medium shadow-inner transition-all duration-300 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-semibold disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 hover:bg-white/80',
        'focus-visible:border-indigo-500/50 focus-visible:ring-indigo-500/20 focus-visible:ring-4 focus-visible:bg-white',
        'aria-invalid:ring-rose-500/20 aria-invalid:border-rose-500',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
