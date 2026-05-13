"use client"

import { useFormatter, useNow } from "next-intl"

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
import type { WorkbenchRailRecent } from "./workbench-rail.schema"
import { WORKBENCH_RAIL_SECTION_HEADING_CLASS } from "./workbench-rail-tone"

/**
 * Refresh "now" once per minute on the client. `useNow` from next-intl
 * returns a hydration-safe value: server and client render the same
 * `now` on first paint, then the client ticks at `updateInterval`.
 * One minute is the smallest meaningful resolution for an
 * activity-derived recents list (`5m ago`, `12m ago`, `1h ago`); any
 * tighter is wasted work. Reference: next-intl `useNow` docs +
 * AGENTS §5 React 19 hydration guidance.
 */
const RECENTS_NOW_TICK_MS = 60_000

type WorkbenchRailRecentsSectionProps = {
  recents: ReadonlyArray<WorkbenchRailRecent>
  collapsed: boolean
  /**
   * Section heading. Optional in the kernel labels schema; the renderer
   * keeps a permanent English fallback so a builder regression cannot
   * leave the section heading-less in production.
   */
  heading?: string
}

/**
 * Recent-visits section of `WorkbenchRail` — activity-derived continuity.
 *
 * Answers exactly one operator question: *"Where was I just at?"*
 * Recents are derived from RSC-side calls to `recordRecentVisit`
 * (server-only — see `lib/features/rail-memory/data/recent.mutations.server.ts`),
 * deduped per `(resourceType, resourceId | __list__:href)`, and capped
 * at 5 by the queries layer. The kernel additionally enforces the
 * 1–5 range at parse time so a builder cannot emit a 12-row recents
 * list.
 *
 * **Recents are continuity memory, not audit logs.** Labels read as
 * operator narratives ("Aisha Khan · viewed 12m ago",
 * "Payroll batch · 1h ago"). The kernel `workbenchRailRecentSchema`
 * refines `label` to reject canonical audit-namespace prefixes —
 * `iam.` / `org.` / `erp.` / `governance.` / `integration.` /
 * `workflow.` / `system.` — so a builder cannot leak audit action
 * strings here. 7W1H audit rows live in `iam_audit_event`.
 *
 * Active state uses `match: "exact"`: the row representing the
 * resource you are viewing right now lights up, but sibling sub-routes
 * do not.
 *
 * Per §3.6 collapsed-mode doctrine, recent rows disappear entirely
 * when the rail is collapsed.
 */
export function WorkbenchRailRecentsSection({
  recents,
  collapsed,
  heading,
}: WorkbenchRailRecentsSectionProps) {
  const now = useNow({ updateInterval: RECENTS_NOW_TICK_MS })

  if (collapsed) return null
  if (recents.length === 0) return null

  const sectionHeading = heading ?? "Recent"

  return (
    <SidebarGroup
      aria-label={sectionHeading}
      data-rail-section="recents"
      data-rail-section-count={recents.length}
      className="p-0"
    >
      <SidebarGroupLabel className={WORKBENCH_RAIL_SECTION_HEADING_CLASS}>
        {sectionHeading}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {recents.map((recent) => (
            <WorkbenchRailRecentRow key={recent.id} recent={recent} now={now} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

type WorkbenchRailRecentRowProps = {
  recent: WorkbenchRailRecent
  now: Date
}

function WorkbenchRailRecentRow({ recent, now }: WorkbenchRailRecentRowProps) {
  const pathname = usePathname()
  const formatter = useFormatter()
  const occurredAt = new Date(recent.occurredAt)
  const relative = Number.isFinite(occurredAt.getTime())
    ? formatter.relativeTime(occurredAt, now)
    : ""
  const active = isWorkbenchRailNavItemActive(
    { href: recent.href, match: "exact" },
    pathname
  )
  const Icon = recent.icon ? RAIL_NAV_ICON_MAP[recent.icon] : null

  return (
    <WorkbenchRailTooltip
      label={recent.label}
      description={relative}
      enabled={false}
    >
      <SidebarMenuItem>
        <Link
          href={recent.href}
          prefetch={false}
          aria-current={active ? "page" : undefined}
          data-active={active ? "true" : undefined}
          data-rail-recent-id={recent.id}
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
          {Icon ? (
            <Icon
              className={cn(
                "size-3.5 shrink-0 transition-colors",
                active
                  ? "text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/60 group-hover/menu-button:text-sidebar-accent-foreground"
              )}
              aria-hidden
            />
          ) : (
            <span
              aria-hidden
              data-rail-recent-bullet="true"
              className={cn(
                "size-1.5 shrink-0 rounded-full transition-colors",
                active
                  ? "bg-primary"
                  : "bg-sidebar-foreground/35 group-hover/menu-button:bg-sidebar-accent-foreground"
              )}
            />
          )}
          <span className="min-w-0 flex-1 truncate">{recent.label}</span>
          {relative ? (
            <time
              dateTime={recent.occurredAt}
              data-rail-recent-time="true"
              className="flex-none text-[11px] text-sidebar-foreground/55 tabular-nums"
              suppressHydrationWarning
            >
              {relative}
            </time>
          ) : null}
        </Link>
      </SidebarMenuItem>
    </WorkbenchRailTooltip>
  )
}
