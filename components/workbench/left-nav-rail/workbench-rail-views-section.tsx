"use client"

import { FilterIcon } from "lucide-react"

import { Link } from "#i18n/navigation"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from "#components/ui/sidebar"
import { cn } from "#lib/utils"

import {
  RAIL_NAV_ICON_MAP,
  WorkbenchRailTooltip,
} from "./workbench-rail-nav-item"
import type { WorkbenchRailView } from "./workbench-rail.schema"
import { WORKBENCH_RAIL_SECTION_HEADING_CLASS } from "./workbench-rail-tone"

type WorkbenchRailViewsSectionProps = {
  views: ReadonlyArray<WorkbenchRailView>
  collapsed: boolean
  /**
   * Section heading. Optional in the kernel labels schema; the renderer
   * keeps a permanent English fallback so a builder regression cannot
   * leave the section heading-less in production.
   */
  heading?: string
}

/**
 * Saved-views section of `WorkbenchRail` — operator-authored filtered URLs.
 *
 * Answers exactly one operator question: *"What queries do I run
 * repeatedly?"* Views are the operator's working set of saved filtered
 * navigations. The shell never injects "suggested" views.
 *
 * **Active state is intentionally NOT applied to views.** Saved view
 * URLs almost always carry query strings (e.g.
 * `/employees?status=active&grade=L3`). The active matcher strips
 * `?…` / `#…` to compute pathname equality — a saved view to
 * `/employees?status=active` would otherwise activate whenever the
 * operator visits the bare `/employees` index, which is misleading.
 * Mirrors Linear's behavior: the link navigates, but the row stays
 * muted.
 *
 * Per §3.6 collapsed-mode doctrine ("Views / pinned / recents drop
 * below 72px"), saved-view rows disappear entirely when the rail is
 * collapsed.
 */
export function WorkbenchRailViewsSection({
  views,
  collapsed,
  heading,
}: WorkbenchRailViewsSectionProps) {
  if (collapsed) return null
  if (views.length === 0) return null

  const sectionHeading = heading ?? "Views"

  return (
    <SidebarGroup
      aria-label={sectionHeading}
      data-rail-section="views"
      data-rail-section-count={views.length}
      className="p-0"
    >
      <SidebarGroupLabel className={WORKBENCH_RAIL_SECTION_HEADING_CLASS}>
        {sectionHeading}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {views.map((view) => (
            <WorkbenchRailViewRow key={view.id} view={view} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

type WorkbenchRailViewRowProps = {
  view: WorkbenchRailView
}

function WorkbenchRailViewRow({ view }: WorkbenchRailViewRowProps) {
  const Icon = view.icon ? RAIL_NAV_ICON_MAP[view.icon] : FilterIcon

  return (
    <WorkbenchRailTooltip label={view.label} enabled={false}>
      <SidebarMenuItem>
        <Link
          href={view.href}
          prefetch={false}
          data-rail-view-id={view.id}
          className={cn(
            "peer/menu-button group/menu-button flex h-8 w-full min-w-0 items-center gap-2 overflow-hidden rounded-xl px-3 text-sm ring-sidebar-ring outline-hidden",
            "transition-[width,height,padding,background-color,color] duration-150 ease-out",
            "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground"
          )}
        >
          <Icon
            className="size-3.5 shrink-0 text-sidebar-foreground/60 transition-colors group-hover/menu-button:text-sidebar-accent-foreground"
            aria-hidden
          />
          <span className="flex-1 truncate">{view.label}</span>
        </Link>
      </SidebarMenuItem>
    </WorkbenchRailTooltip>
  )
}
