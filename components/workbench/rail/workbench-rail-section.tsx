"use client"

import { WorkbenchRailNavItem } from "./workbench-rail-nav-item"
import type { WorkbenchRailNavSection } from "./workbench-rail.types"

type WorkbenchRailSectionProps = {
  section: WorkbenchRailNavSection
  collapsed: boolean
}

/**
 * Group of nav items inside `WorkbenchRail` — header label is rendered only
 * when expanded and only when the section provides one (flat rails, like
 * account, omit it).
 */
export function WorkbenchRailSection({
  section,
  collapsed,
}: WorkbenchRailSectionProps) {
  return (
    <div
      className="flex flex-col gap-0.5"
      role="group"
      aria-label={section.label}
    >
      {!collapsed && section.label ? (
        <p className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
          {section.label}
        </p>
      ) : null}
      {section.items.map((item) => (
        <WorkbenchRailNavItem key={item.id} item={item} collapsed={collapsed} />
      ))}
    </div>
  )
}
