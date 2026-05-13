"use client"

import { StarIcon } from "lucide-react"

import { Link, usePathname } from "#i18n/navigation"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from "#components/ui/sidebar"
import { cn } from "#lib/utils"

import { isWorkbenchRailNavItemActive } from "./workbench-rail-active-match"
import {
  RAIL_NAV_ICON_MAP,
  WorkbenchRailTooltip,
} from "./workbench-rail-nav-item"
import type { WorkbenchRailPin } from "./workbench-rail.schema"
import { WORKBENCH_RAIL_SECTION_HEADING_CLASS } from "./workbench-rail-tone"

type WorkbenchRailPinnedSectionProps = {
  pinned: ReadonlyArray<WorkbenchRailPin>
  collapsed: boolean
  /**
   * Section heading. Optional in the kernel labels schema; the renderer
   * keeps a permanent English fallback so a builder regression cannot
   * leave the section heading-less in production. Per-workbench callers
   * MUST supply a localized value once they wire pin slot data (gated
   * by the contract in `workbench-rail.schema.ts`).
   */
  heading?: string
}

/**
 * Pinned-records section of `WorkbenchRail` — operator-authored persistence.
 *
 * Answers exactly one operator question: *"Which records am I currently
 * working with?"* Pinned items are persistence the operator chose; the
 * shell never injects "suggested" pins. Per the §3.6 collapsed mode
 * doctrine ("Views / pinned / recents drop below 72px"), pinned rows
 * disappear entirely when the rail is collapsed — the affordance lives
 * in the expanded surface only.
 *
 * Active state uses `match: "exact"`: a pin to `/employees/123` should
 * activate ONLY when the operator is exactly on that record, not on
 * `/employees/123/edit`. This matches Linear / Notion behavior and
 * avoids the "wrong sibling lit" class of bugs.
 *
 * Empty arrays are rejected by the kernel — a `pinned` slot present in
 * `slots` always carries ≥ 1 row by contract, so the section never
 * renders a hollow "Pinned (0)" frame.
 */
export function WorkbenchRailPinnedSection({
  pinned,
  collapsed,
  heading,
}: WorkbenchRailPinnedSectionProps) {
  if (collapsed) return null
  if (pinned.length === 0) return null

  const sectionHeading = heading ?? "Pinned"

  return (
    <SidebarGroup
      aria-label={sectionHeading}
      data-rail-section="pinned"
      data-rail-section-count={pinned.length}
      className="p-0"
    >
      <SidebarGroupLabel className={WORKBENCH_RAIL_SECTION_HEADING_CLASS}>
        {sectionHeading}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {pinned.map((pin) => (
            <WorkbenchRailPinRow key={pin.id} pin={pin} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

type WorkbenchRailPinRowProps = {
  pin: WorkbenchRailPin
}

function WorkbenchRailPinRow({ pin }: WorkbenchRailPinRowProps) {
  const pathname = usePathname()
  const active = isWorkbenchRailNavItemActive(
    { href: pin.href, match: "exact" },
    pathname
  )
  const Icon = pin.icon ? RAIL_NAV_ICON_MAP[pin.icon] : StarIcon

  return (
    <WorkbenchRailTooltip label={pin.label} enabled={false}>
      <SidebarMenuItem>
        <Link
          href={pin.href}
          prefetch={false}
          aria-current={active ? "page" : undefined}
          data-active={active ? "true" : undefined}
          data-rail-pin-id={pin.id}
          className={cn(
            "peer/menu-button group/menu-button relative flex h-8 w-full min-w-0 items-center gap-2 overflow-hidden rounded-xl px-3 text-sm ring-sidebar-ring outline-hidden",
            "transition-[width,height,padding,background-color,color] duration-150 ease-out",
            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground",
            "data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground"
          )}
        >
          <span
            aria-hidden
            data-rail-indicator="true"
            className={cn(
              "pointer-events-none absolute inset-y-1 left-0 w-[2px] rounded-r-md bg-primary",
              "transition-opacity duration-150 ease-out",
              active ? "opacity-100" : "opacity-0"
            )}
          />
          <Icon
            className={cn(
              "size-3.5 shrink-0 transition-colors",
              active
                ? "text-sidebar-accent-foreground"
                : "text-sidebar-foreground/60 group-hover/menu-button:text-sidebar-accent-foreground"
            )}
            aria-hidden
          />
          <span className="flex-1 truncate">{pin.label}</span>
        </Link>
      </SidebarMenuItem>
    </WorkbenchRailTooltip>
  )
}
