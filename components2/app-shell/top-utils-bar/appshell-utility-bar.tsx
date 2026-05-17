import { cn } from "#lib/utils"

import type { AppShellUtilityBarSlots } from "../appshell-props.shared"

export type AppShellUtilityBarProps = AppShellUtilityBarSlots & {
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
        {center ? (
          <div className="relative flex h-(--af-l1-height) w-full min-w-0 items-center justify-between gap-2">
            <div className="relative z-10 flex min-w-0 items-center gap-1.5 overflow-hidden">
              {left}
            </div>
            <div className="relative z-10 flex flex-none items-center justify-end gap-1.5 overflow-hidden">
              {right}
            </div>
            {/* True bar midpoint (50% of full inner width), not the gap between L/R clusters. */}
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
              <div className="pointer-events-auto w-full max-w-[100px] min-w-0">
                {center}
              </div>
            </div>
          </div>
        ) : (
          <div className="relative flex h-(--af-l1-height) items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
              {left}
            </div>
            <div className="flex flex-none items-center justify-end gap-1.5 overflow-hidden">
              {right}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
