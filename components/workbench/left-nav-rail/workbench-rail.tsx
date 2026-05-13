"use client"

import { useMemo, useState } from "react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from "#components/ui/sidebar"
import { cn } from "#lib/utils"

import {
  WORKBENCH_RAIL_NAV_DOM_ID,
  WorkbenchRailVisualCollapseProvider,
} from "../workbench-rail-collapse-context"

import { filterWorkbenchRailNavSections } from "./workbench-rail-nav-filter.shared"
import { WorkbenchRailNavSearchChrome } from "./workbench-rail-nav-search.client"
import { WorkbenchRailInboxSection } from "./workbench-rail-inbox"
import { WorkbenchRailNavItem } from "./workbench-rail-nav-item"
import { WorkbenchRailPinnedSection } from "./workbench-rail-pinned-section"
import { WorkbenchRailRecentsSection } from "./workbench-rail-recents-section"
import type {
  WorkbenchRailNavSection,
  WorkbenchRailProps,
} from "./workbench-rail.schema"
import { WorkbenchRailViewsSection } from "./workbench-rail-views-section"

/** Rail surface chrome — sidebar fill only. */
const RAIL_CHROME_CLASS = "bg-sidebar text-sidebar-foreground"

const DEFAULT_NAV_SEARCH_PLACEHOLDER = "Filter navigation…"
const DEFAULT_NAV_SEARCH_ARIA = "Filter navigation links"
const DEFAULT_NAV_SEARCH_COLLAPSED_ARIA = "Open navigation filter"
const DEFAULT_NAV_SEARCH_NO_MATCHES = "No links match your filter."

/**
 * `WorkbenchRail` — the canonical operating rail for every post-login shell.
 *
 * Layered as: nav filter → primary execution nav → optional footer slot.
 * Domain-agnostic; callers feed slot data through `WorkbenchRailSlots` (registry-derived in
 * admin/HRM/platform/account). No decorative status, no description filler,
 * no permanent operational chrome — empty slots disappear so the rail
 * mirrors operator state.
 */
export function WorkbenchRail({
  slots,
  labels,
  collapsed,
  interactionMode = collapsed ? "collapsed" : "expanded",
  assignNavLandmarkId = true,
}: WorkbenchRailProps) {
  const { nav, footer, inbox, pinned, views, recents } = slots
  const [navQuery, setNavQuery] = useState("")
  const [hoverExpanded, setHoverExpanded] = useState(false)
  const hoverMode = interactionMode === "hover"
  const effectiveCollapsed = hoverMode ? !hoverExpanded : collapsed

  const navSearchLabels = {
    placeholder: labels.navSearchPlaceholder ?? DEFAULT_NAV_SEARCH_PLACEHOLDER,
    ariaLabel: labels.navSearchAriaLabel ?? DEFAULT_NAV_SEARCH_ARIA,
    collapsedTriggerAriaLabel:
      labels.navSearchCollapsedTriggerAriaLabel ??
      DEFAULT_NAV_SEARCH_COLLAPSED_ARIA,
  }

  const displayNav = useMemo(
    () => filterWorkbenchRailNavSections(nav, navQuery),
    [nav, navQuery]
  )

  const originalNavItemCount = useMemo(
    () => nav.reduce((sum, section) => sum + section.items.length, 0),
    [nav]
  )

  const filteredNavItemCount = useMemo(
    () => displayNav.reduce((sum, section) => sum + section.items.length, 0),
    [displayNav]
  )

  const isNavEmpty = originalNavItemCount === 0
  const filterExcludesAll =
    navQuery.trim().length > 0 &&
    originalNavItemCount > 0 &&
    filteredNavItemCount === 0

  const emptyStateLabel = labels.emptyState ?? "No surfaces available."
  const noMatchesLabel =
    labels.navSearchNoMatches ?? DEFAULT_NAV_SEARCH_NO_MATCHES

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
  const hasMemorySection =
    !effectiveCollapsed && (hasPinned || hasViews || hasRecents)

  return (
    <aside
      onPointerEnter={hoverMode ? () => setHoverExpanded(true) : undefined}
      onPointerLeave={hoverMode ? () => setHoverExpanded(false) : undefined}
      onFocusCapture={hoverMode ? () => setHoverExpanded(true) : undefined}
      onBlurCapture={
        hoverMode
          ? (event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setHoverExpanded(false)
              }
            }
          : undefined
      }
      className={cn(
        RAIL_CHROME_CLASS,
        "group/rail flex h-full flex-col transition-[width] duration-200 ease-out",
        effectiveCollapsed ? "w-16" : "w-60"
      )}
      aria-label={labels.ariaLabel}
      data-workbench-rail="true"
      data-collapsed={effectiveCollapsed ? "true" : "false"}
      data-rail-mode={interactionMode}
    >
      <WorkbenchRailNavSearchChrome
        collapsed={effectiveCollapsed}
        query={navQuery}
        onQueryChange={setNavQuery}
        labels={navSearchLabels}
      />

      {hasInbox ? (
        <WorkbenchRailInboxSection
          inbox={inbox}
          collapsed={effectiveCollapsed}
          ariaLabel={labels.inboxAriaLabel}
        />
      ) : null}

      <nav
        id={assignNavLandmarkId ? WORKBENCH_RAIL_NAV_DOM_ID : undefined}
        className="af-workbench-rail-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 py-2 [--radius:var(--radius-xl)]"
        aria-label={labels.ariaLabel}
      >
        {isNavEmpty ? (
          effectiveCollapsed ? (
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
        ) : filterExcludesAll ? (
          effectiveCollapsed ? (
            <span
              aria-hidden
              data-rail-filter-empty="true"
              className="mx-auto my-3 block h-1 w-6 rounded-full bg-muted-foreground/25"
              title={noMatchesLabel}
            />
          ) : (
            <p
              data-rail-filter-empty="true"
              className="px-3 py-3 text-xs leading-snug text-muted-foreground/80"
              role="status"
            >
              {noMatchesLabel}
            </p>
          )
        ) : (
          <div className="flex flex-col gap-2">
            {displayNav.map((section) => (
              <WorkbenchRailSection
                key={section.id}
                section={section}
                collapsed={effectiveCollapsed}
              />
            ))}
            {hasMemorySection ? (
              // Spacer between primary nav and operator memory sections (no hairline —
              // `data-rail-memory-divider` remains the composition test hook).
              <div
                aria-hidden
                data-rail-memory-divider="true"
                className="mx-3 my-2"
              />
            ) : null}
            {hasViews ? (
              <WorkbenchRailViewsSection
                views={views}
                collapsed={effectiveCollapsed}
                heading={labels.viewsHeading}
              />
            ) : null}
            {hasPinned ? (
              <WorkbenchRailPinnedSection
                pinned={pinned}
                collapsed={effectiveCollapsed}
                heading={labels.pinnedHeading}
              />
            ) : null}
            {hasRecents ? (
              <WorkbenchRailRecentsSection
                recents={recents}
                collapsed={effectiveCollapsed}
                heading={labels.recentsHeading}
              />
            ) : null}
          </div>
        )}
      </nav>

      {footer ? (
        <WorkbenchRailVisualCollapseProvider value={effectiveCollapsed}>
          <div className={cn(effectiveCollapsed ? "px-2 py-2" : "px-3 py-3")}>
            {footer}
          </div>
        </WorkbenchRailVisualCollapseProvider>
      ) : null}
    </aside>
  )
}

function WorkbenchRailSection({
  section,
  collapsed,
}: {
  section: WorkbenchRailNavSection
  collapsed: boolean
}) {
  return (
    <SidebarGroup className="p-0" role="group" aria-label={section.label}>
      {!collapsed && section.label ? (
        <SidebarGroupLabel className="h-7 rounded-xl px-3 text-xs font-medium text-sidebar-foreground/70">
          {section.label}
        </SidebarGroupLabel>
      ) : null}
      <SidebarGroupContent>
        <SidebarMenu>
          {section.items.map((item) => (
            <WorkbenchRailNavItem
              key={item.id}
              item={item}
              collapsed={collapsed}
            />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
