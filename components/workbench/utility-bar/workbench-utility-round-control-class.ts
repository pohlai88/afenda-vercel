import { cn } from "#lib/utils"

/**
 * Shared chrome for L1 utility-bar 33px discs (brand home affordance, identity control).
 * Matches brand button geometry in the Workbench rail — use fixed `width`/`height` on
 * `next/image` + `object-contain`, not `fill` + overscale.
 */
const UTILITY_CHROME_RING_BASE = cn(
  "af-nexus-round-control-backdrop shrink-0 rounded-full! border border-border/60 bg-card/72 p-0! shadow-elevation-1 transition-colors hover:bg-card/92 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
)

export const WORKBENCH_UTILITY_CHROME_RING_BASE = UTILITY_CHROME_RING_BASE

export const WORKBENCH_UTILITY_CHROME_DISC_33_CLASS = cn(
  UTILITY_CHROME_RING_BASE,
  "relative block size-[33px]! min-h-0 overflow-hidden"
)

/** L1 utility-bar icon-only controls (settings / help / Lynx shortcuts). */
export const WORKBENCH_UTILITY_ROUND_CONTROL_CLASS = cn(
  "flex size-[28px] shrink-0 items-center justify-center rounded-full",
  "bg-transparent text-muted-foreground ring-1 ring-border/50 transition-colors",
  "hover:bg-muted/55 hover:text-foreground active:bg-muted/75",
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 focus-visible:outline-none"
)
