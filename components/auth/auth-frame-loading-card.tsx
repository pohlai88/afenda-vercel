import type { ReactNode } from "react"

import { Spinner } from "#components/ui/spinner"
import { cn } from "#lib/utils"

type AuthFrameLoadingCardProps = {
  children: ReactNode
  /** Tailwind min-height utility for the card body (route-specific layout). */
  minHeightClass?: string
}

/** Shared card chrome for auth-route `loading.tsx` files inside `AuthPageFrame`. */
export function AuthFrameLoadingCard({
  children,
  minHeightClass = "min-h-[280px]",
}: AuthFrameLoadingCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-border/80 bg-card px-6 py-12 shadow-elevation-1",
        minHeightClass
      )}
    >
      <Spinner className="size-8" />
      {children}
    </div>
  )
}
