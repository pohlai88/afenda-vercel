"use client"

import { ChevronRightIcon, InboxIcon } from "lucide-react"

import { Link } from "#i18n/navigation"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
} from "#components/ui/sidebar"
import { cn } from "#lib/utils"

import { WorkbenchRailTooltip } from "./workbench-rail-nav-item"
import type { WorkbenchRailInbox } from "./workbench-rail.schema"
import { WORKBENCH_RAIL_BADGE_TONE_CLASS } from "./workbench-rail-tone"

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
      className="px-2 py-2"
    >
      <SidebarGroup className="p-0">
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
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
                    "peer/menu-button group/menu-button flex h-9 w-full min-w-0 items-center overflow-hidden rounded-xl text-sm font-medium ring-sidebar-ring outline-hidden",
                    "transition-[width,height,padding,background-color,color] duration-150 ease-out",
                    "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground",
                    collapsed
                      ? "size-8 justify-center gap-0 p-2"
                      : "gap-2 px-3 py-2"
                  )}
                >
                  <span className="relative flex-none">
                    <InboxIcon
                      className="size-4 shrink-0 text-sidebar-foreground/70 transition-colors group-hover/menu-button:text-sidebar-accent-foreground"
                      aria-hidden
                    />
                    {collapsed && showCount ? (
                      <span
                        aria-hidden
                        data-rail-badge="true"
                        className={cn(
                          "absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
                          WORKBENCH_RAIL_BADGE_TONE_CLASS[inbox.tone]
                        )}
                      >
                        {inbox.count > 99 ? "99+" : inbox.count}
                      </span>
                    ) : null}
                  </span>

                  {!collapsed && (
                    <span className="flex-1 truncate">{inbox.label}</span>
                  )}

                  {!collapsed && showCount ? (
                    <>
                      <span
                        data-rail-badge="true"
                        className={cn(
                          "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                          WORKBENCH_RAIL_BADGE_TONE_CLASS[inbox.tone]
                        )}
                      >
                        {inbox.count > 99 ? "99+" : inbox.count}
                      </span>
                      <ChevronRightIcon
                        className="size-3.5 flex-none text-sidebar-foreground/45 transition-colors group-hover/menu-button:text-sidebar-accent-foreground"
                        aria-hidden
                      />
                      <span className="sr-only">{accessibleCount}</span>
                    </>
                  ) : null}
                </Link>
              </WorkbenchRailTooltip>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </section>
  )
}
