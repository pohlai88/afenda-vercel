"use client"

import { ChevronRightIcon, InboxIcon } from "lucide-react"

import { Link } from "#i18n/navigation"
import { cn } from "#lib/utils"

import { WorkbenchRailTooltip } from "./workbench-rail-tooltip"
import type {
  WorkbenchRailBadgeTone,
  WorkbenchRailInbox,
} from "./workbench-rail.types"

/**
 * Tone classes mirror `workbench-rail-nav-item.tsx` so operators read the
 * same urgency cues across every pressure surface in the rail.
 */
const BADGE_TONE_CLASS: Record<WorkbenchRailBadgeTone, string> = {
  default: "bg-muted-foreground/15 text-muted-foreground",
  positive: "bg-success/15 text-success",
  attention: "bg-warning/20 text-warning-foreground",
  critical: "bg-destructive text-destructive-foreground",
}

type WorkbenchRailInboxSectionProps = {
  inbox: WorkbenchRailInbox
  collapsed: boolean
  /**
   * sr-only regional name for the inbox `<section>`. The visible label
   * always comes from `inbox.label` (slot data) so per-workbench builders
   * own the operator copy ("3 pending invitations" vs "Approvals").
   */
  ariaLabel?: string
}

/**
 * Inbox slot for `WorkbenchRail` — single, linkable pressure summary.
 *
 * One operator question only: *"What needs me right now?"* Builders shape
 * the row from the workbench's most pressing aggregate (pending
 * invitations, audit alerts, leave approvals, …); the kernel guarantees
 * `count >= 1` so a zero-pressure inbox is omitted at build time and
 * never renders here.
 *
 * Expanded layout: `[icon] label … [tone-tinted count badge] [chevron]`
 * Collapsed layout: icon-only with the count badge stacked top-right
 * (matches the nav-item collapsed glyph). Tooltip surfaces the full
 * label + count for collapsed operators.
 */
export function WorkbenchRailInboxSection({
  inbox,
  collapsed,
  ariaLabel,
}: WorkbenchRailInboxSectionProps) {
  const accessibleCount = `${inbox.count} ${
    inbox.count === 1 ? "item" : "items"
  }`
  const accessibleName = collapsed
    ? `${inbox.label} — ${accessibleCount}`
    : undefined
  const showCount = inbox.count > 0

  return (
    <section
      aria-label={ariaLabel ?? "Inbox"}
      data-rail-section="inbox"
      data-rail-section-tone={inbox.tone}
      className="py-2"
    >
      <WorkbenchRailTooltip
        enabled={collapsed}
        label={inbox.label}
        description={accessibleCount}
      >
        <Link
          href={inbox.href}
          prefetch={false}
          aria-label={accessibleName}
          data-rail-inbox-link="true"
          className={cn(
            "group flex h-9 w-full min-w-0 items-center gap-3 rounded-lg text-sm font-medium outline-none",
            "transition-[background-color,color,box-shadow] duration-150 ease-out",
            "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1",
            "text-foreground hover:bg-muted/70",
            collapsed ? "justify-center px-2" : "px-3"
          )}
        >
          <span className="relative flex-none">
            <InboxIcon
              className="h-4 w-4 text-muted-foreground/90 transition-colors group-hover:text-foreground"
              aria-hidden
            />
            {collapsed && showCount ? (
              <span
                aria-hidden
                data-rail-badge="true"
                className={cn(
                  "absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums shadow-[0_0_0_2px_var(--sidebar)]",
                  BADGE_TONE_CLASS[inbox.tone]
                )}
              >
                {inbox.count > 99 ? "99+" : inbox.count}
              </span>
            ) : null}
          </span>

          {!collapsed && <span className="flex-1 truncate">{inbox.label}</span>}

          {!collapsed && showCount ? (
            <>
              <span
                data-rail-badge="true"
                className={cn(
                  "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                  BADGE_TONE_CLASS[inbox.tone]
                )}
              >
                {inbox.count > 99 ? "99+" : inbox.count}
              </span>
              <ChevronRightIcon
                className="h-3.5 w-3.5 flex-none text-muted-foreground/60 transition-colors group-hover:text-foreground"
                aria-hidden
              />
              <span className="sr-only">{accessibleCount}</span>
            </>
          ) : null}
        </Link>
      </WorkbenchRailTooltip>
    </section>
  )
}
