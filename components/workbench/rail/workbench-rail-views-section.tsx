"use client"

import { FilterIcon } from "lucide-react"

import { Link } from "#i18n/navigation"
import { cn } from "#lib/utils"

import { RAIL_NAV_ICON_MAP } from "./workbench-rail-icon-map"
import { WorkbenchRailTooltip } from "./workbench-rail-tooltip"
import type { WorkbenchRailView } from "./workbench-rail.types"

const SECTION_HEADING_CLASS =
  "text-muted-foreground/60 px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wider uppercase"

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
    <section
      aria-label={sectionHeading}
      data-rail-section="views"
      data-rail-section-count={views.length}
      className="flex flex-col gap-0.5"
    >
      <p className={SECTION_HEADING_CLASS}>{sectionHeading}</p>
      {views.map((view) => (
        <WorkbenchRailViewRow key={view.id} view={view} />
      ))}
    </section>
  )
}

type WorkbenchRailViewRowProps = {
  view: WorkbenchRailView
}

function WorkbenchRailViewRow({ view }: WorkbenchRailViewRowProps) {
  const Icon = view.icon ? RAIL_NAV_ICON_MAP[view.icon] : FilterIcon

  return (
    <WorkbenchRailTooltip label={view.label} enabled={false}>
      <Link
        href={view.href}
        prefetch={false}
        data-rail-view-id={view.id}
        className={cn(
          "group flex h-8 w-full min-w-0 items-center gap-3 rounded-lg px-3 text-sm outline-none",
          "transition-[background-color,color,box-shadow] duration-150 ease-out",
          "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1",
          "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
        )}
      >
        <Icon
          className="h-3.5 w-3.5 flex-none text-muted-foreground/70 transition-colors group-hover:text-foreground"
          aria-hidden
        />
        <span className="flex-1 truncate">{view.label}</span>
      </Link>
    </WorkbenchRailTooltip>
  )
}
