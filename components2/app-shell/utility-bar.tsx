import type { ReactNode } from "react"

import { cn } from "#lib/utils"

type AppShellUtilityBarProps = {
  left: ReactNode
  center?: ReactNode
  right: ReactNode
  className?: string
}

/**
 * AppShellUtilityBar — extracted layout component for the L1 top bar.
 *
 * Consumed by AppShellClient; exported separately so host route layouts can
 * import just the slot structure for testing or custom compositions without
 * pulling in the full client shell.
 */
export function AppShellUtilityBar({
  left,
  center,
  right,
  className,
}: AppShellUtilityBarProps) {
  return (
    <header
      aria-label="Application utility bar"
      data-app-shell="utility-bar"
      className={cn(
        "af-nexus-l1-chrome-backplate af-nexus-utility-bar-backdrop sticky top-0 z-40 shrink-0",
        className
      )}
    >
      <div className="mx-auto max-w-screen-2xl px-2.5 sm:px-4">
        <div className="relative flex h-(--af-l1-height) items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">{left}</div>

          {center ? (
            <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center px-14 sm:px-24">
              <div className="pointer-events-auto">{center}</div>
            </div>
          ) : null}

          <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
            {right}
          </div>
        </div>
      </div>
    </header>
  )
}
