"use client"

import { cn } from "#lib/utils"

import { WORKBENCH_RAIL_NAV_DOM_ID } from "../workbench-rail-collapse-context"

import { WorkbenchRailIdentity } from "./workbench-rail-identity"
import { WorkbenchRailInboxSection } from "./workbench-rail-inbox"
import { WorkbenchRailPinnedSection } from "./workbench-rail-pinned-section"
import { WorkbenchRailRecentsSection } from "./workbench-rail-recents-section"
import { WorkbenchRailSection } from "./workbench-rail-section"
import { WorkbenchRailViewsSection } from "./workbench-rail-views-section"
import type { WorkbenchRailProps } from "./workbench-rail.types"

/**
 * Subtle linear scroll mask — fades nav top/bottom while users scroll.
 *
 * Inline style avoids introducing a new Tailwind utility while keeping the
 * gradient consumable from any rail variant. Scoped to the nav scroll
 * region only, so the chrome edges remain solid.
 */
const NAV_SCROLL_MASK: React.CSSProperties = {
  maskImage:
    "linear-gradient(to bottom, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)",
  WebkitMaskImage:
    "linear-gradient(to bottom, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)",
}

/**
 * Rail surface chrome — sidebar fill only (no borders, no inset linework).
 */
const RAIL_CHROME_CLASS = "bg-sidebar text-sidebar-foreground"

/**
 * `WorkbenchRail` — the canonical operating rail for every post-login shell.
 *
 * Layered as: identity → primary execution nav → optional footer slot.
 * Domain-agnostic; callers feed slot data through `WorkbenchRailSlots` (registry-derived in
 * admin/HRM/platform/account). No decorative status, no description filler,
 * no permanent operational chrome — empty slots disappear so the rail
 * mirrors operator state.
 */
export function WorkbenchRail({
  slots,
  labels,
  collapsed,
  assignNavLandmarkId = true,
}: WorkbenchRailProps) {
  const { identity, nav, footer, inbox, pinned, views, recents } = slots
  const totalNavItems = nav.reduce(
    (sum, section) => sum + section.items.length,
    0
  )
  const isNavEmpty = totalNavItems === 0
  const emptyStateLabel = labels.emptyState ?? "No surfaces available."

  // Working Memory Rail — Phase 3c. Conditional density is enforced
  // here in lockstep with the kernel: arrays are non-empty by schema
  // (PR 3a), so a present slot always carries data; an absent slot
  // means "nothing to surface for this operator right now" and the
  // section disappears entirely. Pinned / views / recents additionally
  // collapse-fold (§3.6 doctrine) — only inbox survives below 72px so
  // pressure remains visible without words.
  const hasInbox = inbox !== undefined
  const hasPinned = pinned !== undefined && pinned.length > 0
  const hasViews = views !== undefined && views.length > 0
  const hasRecents = recents !== undefined && recents.length > 0
  const hasMemorySection = !collapsed && (hasPinned || hasViews || hasRecents)

  return (
    <aside
      className={cn(
        RAIL_CHROME_CLASS,
        "flex h-full flex-col transition-[width] duration-200 ease-out",
        collapsed ? "w-16" : "w-60"
      )}
      aria-label={labels.ariaLabel}
      data-workbench-rail="true"
      data-collapsed={collapsed ? "true" : "false"}
    >
      <WorkbenchRailIdentity identity={identity} collapsed={collapsed} />

      {hasInbox ? (
        <div className="px-2">
          <WorkbenchRailInboxSection
            inbox={inbox}
            collapsed={collapsed}
            ariaLabel={labels.inboxAriaLabel}
          />
        </div>
      ) : null}

      <nav
        id={assignNavLandmarkId ? WORKBENCH_RAIL_NAV_DOM_ID : undefined}
        className="min-h-0 flex-1 overflow-y-auto px-2 py-3"
        aria-label={labels.ariaLabel}
        style={NAV_SCROLL_MASK}
      >
        {isNavEmpty ? (
          collapsed ? (
            <span
              aria-hidden
              data-rail-empty="true"
              className="mx-auto my-3 block h-1 w-6 rounded-full bg-muted-foreground/25"
              title={emptyStateLabel}
            />
          ) : (
            <p
              data-rail-empty="true"
              className="px-3 py-3 text-xs leading-snug text-muted-foreground/80"
              role="status"
            >
              {emptyStateLabel}
            </p>
          )
        ) : (
          <div className="flex flex-col gap-3">
            {nav.map((section) => (
              <WorkbenchRailSection
                key={section.id}
                section={section}
                collapsed={collapsed}
              />
            ))}
            {hasMemorySection ? (
              // Spacer between primary nav and operator memory sections (no hairline —
              // `data-rail-memory-divider` remains the composition test hook).
              <div aria-hidden data-rail-memory-divider="true" className="mx-3 my-2" />
            ) : null}
            {hasViews ? (
              <WorkbenchRailViewsSection
                views={views}
                collapsed={collapsed}
                heading={labels.viewsHeading}
              />
            ) : null}
            {hasPinned ? (
              <WorkbenchRailPinnedSection
                pinned={pinned}
                collapsed={collapsed}
                heading={labels.pinnedHeading}
              />
            ) : null}
            {hasRecents ? (
              <WorkbenchRailRecentsSection
                recents={recents}
                collapsed={collapsed}
                heading={labels.recentsHeading}
              />
            ) : null}
          </div>
        )}
      </nav>

      {footer ? (
        <div
          className={cn(collapsed ? "px-2 py-2" : "px-3 py-3")}
        >
          {footer}
        </div>
      ) : null}
    </aside>
  )
}
