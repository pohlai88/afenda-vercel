import { cn } from "#lib/utils"

/** Physical CSS size for the 33px L1 disc cluster (brand · launcher · avatar). */
export const WORKBENCH_UTILITY_DISC_33_PX = 33

/**
 * Shared chrome for L1 utility-bar 33px discs (brand home affordance, identity control).
 * Avatar art inside these discs should use `fill` + `object-cover` so raster art fully
 * covers the ring (no inset from `object-contain`).
 */
const UTILITY_CHROME_RING_BASE = cn(
  "af-nexus-round-control-backdrop shrink-0 rounded-full! border border-border/60 bg-card/72 p-0! shadow-elevation-1 transition-colors hover:bg-card/92 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
)

export const WORKBENCH_UTILITY_CHROME_RING_BASE = UTILITY_CHROME_RING_BASE

export const WORKBENCH_UTILITY_CHROME_DISC_33_CLASS = cn(
  UTILITY_CHROME_RING_BASE,
  "relative block size-[33px]! min-h-0 overflow-hidden"
)

/**
 * Flush raster disc — used by L1 controls whose PNG already carries the brand
 * surface (avatar, multi-apps launcher). Strips the calm-glass ring and
 * shadow chrome from {@link WORKBENCH_UTILITY_CHROME_DISC_33_CLASS} so the
 * raster art reads edge-to-edge with no white halo. Hover, active, and open
 * state feedback live in `.af-workbench-flush-disc` (`app/globals.css`).
 *
 * Callers append the size token, e.g. `cn(WORKBENCH_UTILITY_FLUSH_DISC_CLASS, "size-[33px]!")`.
 */
export const WORKBENCH_UTILITY_FLUSH_DISC_CLASS = cn(
  "af-workbench-flush-disc shrink-0 rounded-full! border-0 bg-transparent p-0!",
  "relative block min-h-0 overflow-hidden",
  "hover:bg-transparent",
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
)

/** L1 utility-bar icon-only controls (settings / help / Lynx shortcuts). */
export const WORKBENCH_UTILITY_ROUND_CONTROL_CLASS = cn(
  "flex size-[28px] shrink-0 items-center justify-center rounded-full",
  "bg-transparent text-muted-foreground ring-1 ring-border/50 transition-colors",
  "hover:bg-muted/55 hover:text-foreground active:bg-muted/75",
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 focus-visible:outline-none"
)
