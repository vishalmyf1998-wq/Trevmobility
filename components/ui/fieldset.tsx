import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { Label as RadixLabel } from "@radix-ui/react-label"
import { cn } from "@/lib/utils"

const FieldGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return <div ref={ref} className={cn("flex flex-col space-y-2", className)} {...props} />
})
FieldGroup.displayName = "FieldGroup"

const Field = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return <div ref={ref} className={cn("grid w-full items-center gap-1.5", className)} {...props} />
})
Field.displayName = "Field"

const FieldLabel = React.forwardRef<
  React.ElementRef<typeof RadixLabel>,
  React.ComponentPropsWithoutRef<typeof RadixLabel>
>(({ className, ...props }, ref) => {
  return <RadixLabel ref={ref} className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)} {...props} />
})
FieldLabel.displayName = "FieldLabel"

export { Field, FieldGroup, FieldLabel }