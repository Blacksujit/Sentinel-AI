import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--paper-raised)] px-3 py-2 text-sm text-[color:var(--ink)] shadow-[0_1px_2px_rgba(26,24,20,0.04)] transition-colors placeholder:text-[color:var(--ink-soft)] focus-visible:outline-none focus-visible:border-[color:var(--red)] focus-visible:ring-2 focus-visible:ring-[color:var(--red)]/20 disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[color:var(--ink)]",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
