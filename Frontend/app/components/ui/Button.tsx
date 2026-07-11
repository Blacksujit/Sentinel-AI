"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold tracking-[0.01em] border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--red)]/25 focus-visible:border-[color:var(--red)] disabled:pointer-events-none disabled:opacity-45 hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-[color:var(--red)] bg-[color:var(--red)] text-white shadow-[0_2px_8px_rgba(168,52,38,0.18)] hover:bg-[color:var(--red)]/90 hover:shadow-[0_4px_12px_rgba(168,52,38,0.22)]",
        destructive:
          "border-[color:var(--red)] bg-[color:var(--red-bg)] text-[color:var(--red)] hover:bg-[color:var(--red-soft)]",
        outline:
          "border-[color:var(--line)] bg-[color:var(--paper-raised)] text-[color:var(--ink)] shadow-sm hover:bg-[color:var(--paper-sunken)] hover:border-[color:var(--line-strong)]",
        secondary:
          "border-[color:var(--line)] bg-[color:var(--paper-sunken)] text-[color:var(--ink)] hover:bg-[color:var(--paper-raised)]",
        ghost: "border-transparent bg-transparent text-[color:var(--ink)] shadow-none hover:bg-[color:var(--paper-sunken)] hover:text-[color:var(--ink)]",
        link: "border-transparent bg-transparent px-0 py-0 h-auto rounded-none text-[color:var(--red)] underline-offset-4 hover:underline shadow-none hover:-translate-y-0",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-lg px-8",
        icon: "h-9 w-9 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
