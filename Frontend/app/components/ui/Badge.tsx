import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-[0.02em] transition-colors ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--red)]/20 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-[color:var(--red)] bg-[color:var(--red-bg)] text-[color:var(--red)] shadow-sm",
        secondary:
          "border-[color:var(--line)] bg-[color:var(--paper-raised)] text-[color:var(--ink)]",
        destructive:
          "border-[color:var(--red-soft)] bg-[color:var(--red-bg)] text-[color:var(--red)] shadow-sm",
        outline: "border-[color:var(--line)] bg-transparent text-[color:var(--ink)]",
        warning:
          "border-[color:var(--amber-bg)] bg-[color:var(--amber-bg)] text-[color:var(--amber)] shadow-sm",
        success:
          "border-[color:var(--green-soft)] bg-[color:var(--green-bg)] text-[color:var(--green)] shadow-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
