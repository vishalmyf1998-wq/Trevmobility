import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[1rem] text-sm font-semibold transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 active:scale-95 hover:shadow-md",
  {
    variants: {
      variant: {
        default: 'bg-slate-900 text-white hover:bg-slate-800 hover:-translate-y-0.5 shadow-lg shadow-slate-900/20',
        destructive:
          'bg-rose-500 text-white hover:bg-rose-600 hover:-translate-y-0.5 shadow-lg shadow-rose-500/20',
        outline:
          'border border-slate-200 bg-white/60 backdrop-blur-md shadow-sm hover:bg-white hover:text-slate-900 hover:-translate-y-0.5',
        secondary:
          'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100/50 shadow-sm hover:-translate-y-0.5',
        ghost:
          'hover:bg-slate-100/50 hover:text-slate-900 hover:shadow-none active:scale-100',
        link: 'text-blue-600 underline-offset-4 hover:underline hover:shadow-none active:scale-100',
      },
      size: {
        default: 'h-10 px-5 py-2 has-[>svg]:px-4',
        sm: 'h-8 rounded-[0.75rem] gap-1.5 px-4 has-[>svg]:px-3 text-xs',
        lg: 'h-12 rounded-[1.25rem] px-8 has-[>svg]:px-6 text-base',
        icon: 'size-10',
        'icon-sm': 'size-8 rounded-[0.75rem]',
        'icon-lg': 'size-12 rounded-[1.25rem]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
