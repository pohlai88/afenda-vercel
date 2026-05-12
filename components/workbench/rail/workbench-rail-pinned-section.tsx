"use client"

import { StarIcon } from "lucide-react"

import { Link, usePathname } from "#i18n/navigation"
import { cn } from "#lib/utils"

import { isWorkbenchRailNavItemActive } from "./workbench-rail-active-match"
import { RAIL_NAV_ICON_MAP } from "./workbench-rail-icon-map"
import { WorkbenchRailTooltip } from "./workbench-rail-tooltip"
import type { WorkbenchRailPin } from "./workbench-rail.types"

const SECTION_HEADING_CLASS =
  "text-muted-foreground/60 px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wider uppercase"

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
    <section
      aria-label={sectionHeading}
      data-rail-section="pinned"
      data-rail-section-count={pinned.length}
      className="flex flex-col gap-0.5"
    >
      <p className={SECTION_HEADING_CLASS}>{sectionHeading}</p>
      {pinned.map((pin) => (
        <WorkbenchRailPinRow key={pin.id} pin={pin} />
      ))}
    </section>
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
      <Link
        href={pin.href}
        prefetch={false}
        aria-current={active ? "page" : undefined}
        data-active={active ? "true" : undefined}
        data-rail-pin-id={pin.id}
        className={cn(
          "group relative flex h-8 w-full min-w-0 items-center gap-3 rounded-lg px-3 text-sm outline-none",
          "transition-[background-color,color,box-shadow] duration-150 ease-out",
          "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1",
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
        )}
      >
        <span
          aria-hidden
          data-rail-indicator="true"
          className={cn(
            "pointer-events-none absolute inset-y-0.5 left-0 w-[3px] rounded-r-md bg-primary",
            "shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_22%,transparent)]",
            "transition-opacity duration-150 ease-out",
            active ? "opacity-100" : "opacity-0"
          )}
        />
        <Icon
          className={cn(
            "h-3.5 w-3.5 flex-none transition-colors",
            active
              ? "text-primary"
              : "text-muted-foreground/70 group-hover:text-foreground"
          )}
          aria-hidden
        />
        <span className="flex-1 truncate">{pin.label}</span>
      </Link>
    </WorkbenchRailTooltip>
  )
}
