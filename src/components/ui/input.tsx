import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full min-w-0 rounded-lg border border-border bg-background px-3 py-1 text-sm text-foreground shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        // Browser autofill (esp. Chrome/Safari) paints its own background and
        // forces text color via -webkit-text-fill-color, ignoring `color` —
        // without this override, autofilled text can render unreadable
        // against a themed (especially dark) input background.
        "autofill:[-webkit-text-fill-color:var(--foreground)] autofill:[transition:background-color_9999s_ease-in-out_0s]",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
