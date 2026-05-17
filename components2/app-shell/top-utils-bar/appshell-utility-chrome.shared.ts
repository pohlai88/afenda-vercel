import { cn } from "#lib/utils"

/** Physical CSS size for the 33px L1 disc cluster (brand · launcher · avatar). */
export const APP_SHELL_UTILITY_DISC_33_PX = 33

const UTILITY_CHROME_RING_BASE = cn(
  "af-nexus-round-control-backdrop shrink-0 rounded-full! border border-border/60 bg-card/72 p-0! shadow-elevation-1 transition-colors hover:bg-card/92 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
)

export const APP_SHELL_UTILITY_CHROME_RING_BASE = UTILITY_CHROME_RING_BASE

export const APP_SHELL_UTILITY_CHROME_DISC_33_CLASS = cn(
  UTILITY_CHROME_RING_BASE,
  "relative block size-[33px]! min-h-0 overflow-hidden"
)

export const APP_SHELL_UTILITY_FLUSH_DISC_CLASS = cn(
  "af-appshell-flush-disc shrink-0 rounded-full! border-0 bg-transparent p-0!",
  "relative block min-h-0 overflow-hidden",
  "hover:bg-transparent",
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
)

export const APP_SHELL_UTILITY_ROUND_CONTROL_CLASS = cn(
  "flex size-[28px] shrink-0 items-center justify-center rounded-full",
  "bg-transparent text-muted-foreground ring-1 ring-border/50 transition-colors",
  "hover:bg-muted/55 hover:text-foreground active:bg-muted/75",
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 focus-visible:outline-none"
)

export const APP_SHELL_CONTENT_PANE_INSET_CLASS =
  "md:overflow-hidden md:rounded-tl-2xl md:border-t md:border-l md:border-border/60"
