"use client"

import { useFormatter, useNow } from "next-intl"

import { Link, usePathname } from "#i18n/navigation"
import { cn } from "#lib/utils"

import { isWorkbenchRailNavItemActive } from "./workbench-rail-active-match"
import { RAIL_NAV_ICON_MAP } from "./workbench-rail-icon-map"
import { WorkbenchRailTooltip } from "./workbench-rail-tooltip"
import type { WorkbenchRailRecent } from "./workbench-rail.types"

const SECTION_HEADING_CLASS =
  "text-muted-foreground/60 px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wider uppercase"

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
    <section
      aria-label={sectionHeading}
      data-rail-section="recents"
      data-rail-section-count={recents.length}
      className="flex flex-col gap-0.5"
    >
      <p className={SECTION_HEADING_CLASS}>{sectionHeading}</p>
      {recents.map((recent) => (
        <WorkbenchRailRecentRow key={recent.id} recent={recent} now={now} />
      ))}
    </section>
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
      <Link
        href={recent.href}
        prefetch={false}
        aria-current={active ? "page" : undefined}
        data-active={active ? "true" : undefined}
        data-rail-recent-id={recent.id}
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
        {Icon ? (
          <Icon
            className={cn(
              "h-3.5 w-3.5 flex-none transition-colors",
              active
                ? "text-primary"
                : "text-muted-foreground/60 group-hover:text-foreground"
            )}
            aria-hidden
          />
        ) : (
          <span
            aria-hidden
            data-rail-recent-bullet="true"
            className={cn(
              "h-1.5 w-1.5 flex-none rounded-full transition-colors",
              active
                ? "bg-primary"
                : "bg-muted-foreground/40 group-hover:bg-foreground"
            )}
          />
        )}
        <span className="min-w-0 flex-1 truncate">{recent.label}</span>
        {relative ? (
          <time
            dateTime={recent.occurredAt}
            data-rail-recent-time="true"
            className="flex-none text-[11px] text-muted-foreground/60 tabular-nums"
            suppressHydrationWarning
          >
            {relative}
          </time>
        ) : null}
      </Link>
    </WorkbenchRailTooltip>
  )
}
