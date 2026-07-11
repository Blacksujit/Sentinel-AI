import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--paper-raised)] px-3 py-2 text-sm text-[color:var(--ink)] shadow-[0_1px_2px_rgba(26,24,20,0.04)] transition-colors placeholder:text-[color:var(--ink-soft)] focus-visible:outline-none focus-visible:border-[color:var(--red)] focus-visible:ring-2 focus-visible:ring-[color:var(--red)]/20 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
