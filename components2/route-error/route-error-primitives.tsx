"use client"

import type { ReactNode } from "react"

export type RouteErrorShellVariant = "fullscreen" | "embedded" | "auth"

type ShellProps = {
  variant?: RouteErrorShellVariant
  /** Optional logo / brand link placed above the main message (e.g. root or locale error pages). */
  brand?: ReactNode
  children: ReactNode
}

/**
 * Layout wrapper for App Router `error.tsx` surfaces — keeps spacing and min-heights consistent.
 * Compose with {@link RouteErrorDigest} and {@link RouteErrorActions}; keep copy local to each segment.
 */
export function RouteErrorShell({
  variant = "fullscreen",
  brand,
  children,
}: ShellProps) {
  const className =
    variant === "auth"
      ? "mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center"
      : variant === "embedded"
        ? "flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6 text-center"
        : "flex min-h-svh flex-col items-center justify-center gap-6 p-6"

  if (variant === "auth") {
    return (
      <main className={className}>
        {brand}
        {children}
      </main>
    )
  }

  return (
    <div className={className}>
      {brand}
      {children}
    </div>
  )
}

/** Displays `error.digest` for correlation with server logs (production-safe messaging elsewhere). */
export function RouteErrorDigest({ digest }: { digest?: string }) {
  if (!digest) {
    return null
  }
  return (
    <p className="font-mono text-xs text-muted-foreground">
      Reference: {digest}
    </p>
  )
}

/** Flex row for retry + secondary navigation actions on route error pages. */
export function RouteErrorActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {children}
    </div>
  )
}
