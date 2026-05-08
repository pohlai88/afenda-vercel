import type { ReactNode } from "react"

import { Spinner } from "#components/ui/spinner"
import { cn } from "#lib/utils"

type AuthFrameLoadingCardProps = {
  children?: ReactNode
  /** Tailwind min-height utility for route-specific loading layout. */
  minHeightClass?: string
}

/** Shared loading chrome for auth-route loading states inside AuthPageFrame. */
export function AuthFrameLoadingCard({
  children,
  minHeightClass = "min-h-[280px]",
}: AuthFrameLoadingCardProps) {
  return (
    <section
      aria-busy="true"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-border/80 bg-card px-6 py-12 shadow-elevation-1",
        minHeightClass
      )}
    >
      <Spinner className="size-8" aria-hidden="true" />
      {children}
    </section>
  )
}
