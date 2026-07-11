import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva("rounded-xl text-card-foreground", {
  variants: {
    variant: {
      default:
        "border border-[color:var(--line)] bg-[color:var(--paper-raised)] shadow-[0_1px_2px_rgba(26,24,20,0.06)]",
      raised:
        "border border-[color:var(--line)] bg-[color:var(--paper)] shadow-[0_4px_12px_rgba(26,24,20,0.08)]",
      interactive:
        "border border-[color:var(--line)] bg-[color:var(--paper-raised)] shadow-[0_1px_2px_rgba(26,24,20,0.06)] cursor-pointer transition-all duration-200 hover:border-[color:var(--line-strong)] hover:bg-[color:var(--paper)] hover:shadow-[0_4px_12px_rgba(26,24,20,0.08)] active:scale-[0.99]",
      metric:
        "border border-[color:var(--line)] bg-[color:var(--paper-raised)] shadow-sm p-4",
      ghost:
        "border-0 bg-transparent shadow-none",
      danger:
        "border border-[color:var(--red-soft)] bg-[color:var(--red-bg)]",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, className }))}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export {
  Card,
  cardVariants,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
}
