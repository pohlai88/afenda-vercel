import type { WorkbenchRailBadgeTone } from "./workbench-rail.schema"

/** Badge pill tones — shared by primary nav rows and inbox pressure. */
export const WORKBENCH_RAIL_BADGE_TONE_CLASS: Record<
  WorkbenchRailBadgeTone,
  string
> = {
  default: "bg-muted-foreground/15 text-muted-foreground",
  positive: "bg-success/15 text-success",
  attention: "bg-warning/20 text-warning-foreground",
  critical: "bg-destructive text-destructive-foreground",
}

/** Memory-section headings (pinned / views / recents). */
export const WORKBENCH_RAIL_SECTION_HEADING_CLASS =
  "h-7 rounded-xl px-3 text-xs font-medium text-sidebar-foreground/70"
