import * as React from "react"

import { cn } from "#lib/utils"
import { uiRadius, uiTracking } from "#lib/design-system"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        cn(
          "min-h-[var(--af-field-height)] w-full min-w-0 border border-border/60 bg-muted/70 px-[var(--af-field-px)] py-[var(--af-field-py)] text-sm transition-[color,box-shadow,background-color,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground hover:border-border hover:bg-muted focus-visible:border-ring focus-visible:bg-background focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:border-border/50 dark:bg-muted/40 dark:hover:border-border dark:hover:bg-muted/80 dark:focus-visible:bg-card dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          uiRadius.control,
          uiTracking.control
        ),
        className
      )}
      {...props}
    />
  )
}

export { Input }
