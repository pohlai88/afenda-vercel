"use client"

import { Link } from "#i18n/navigation"
import { cn } from "#lib/utils"

import { WorkbenchRailTooltip } from "./workbench-rail-tooltip"
import type { WorkbenchRailIdentity } from "./workbench-rail.types"

type WorkbenchRailIdentityProps = {
  identity: WorkbenchRailIdentity
  collapsed: boolean
}

/**
 * Identity zone of `WorkbenchRail`.
 *
 * Expanded: monogram + primary + secondary.
 * Collapsed: monogram only — primary + secondary are surfaced via the rail
 * tooltip layer.
 *
 * Rail collapse lives in L1 utilities (`WorkbenchUtilityRailCollapse`).
 *
 * Decorative pills and rail descriptions were retired in the Working Memory
 * Rail migration (see docs/_draft/working-memory-rail-plan.md). Pressure
 * lives on nav items (Phase 2); operator memory arrives as dedicated
 * conditional slots (Phase 3) — never as identity chrome.
 */
export function WorkbenchRailIdentity({
  identity,
  collapsed,
}: WorkbenchRailIdentityProps) {
  const headerContent = (
    <>
      <span
        className={cn(
          "flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-gradient-to-br from-primary/95 to-primary text-xs font-bold tracking-wider text-primary-foreground shadow-[inset_0_1px_0_color-mix(in_oklab,white_18%,transparent)] ring-1 ring-primary/30"
        )}
        aria-hidden
      >
        {identity.initial}
      </span>
      {!collapsed && (
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm leading-tight font-semibold text-foreground">
            {identity.primary}
          </span>
          {identity.secondary ? (
            <span className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">
              {identity.secondary}
            </span>
          ) : null}
        </span>
      )}
    </>
  )

  const accessibleName = collapsed
    ? `${identity.primary}${identity.secondary ? ` — ${identity.secondary}` : ""}`
    : undefined

  const identityTrigger = identity.href ? (
    <Link
      href={identity.href}
      prefetch={false}
      aria-label={accessibleName}
      className={cn(
        "group/identity flex min-w-0 flex-1 items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1",
        collapsed && "flex-none justify-center"
      )}
    >
      {headerContent}
    </Link>
  ) : (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-3 rounded-lg",
        collapsed && "flex-none justify-center"
      )}
      aria-label={accessibleName}
      // Make the monogram keyboard-reachable in collapsed mode so the
      // tooltip is discoverable without a mouse. No-op trigger; the rail
      // does not navigate from here unless `identity.href` is provided.
      tabIndex={collapsed ? 0 : undefined}
    >
      {headerContent}
    </div>
  )

  return (
    <div
      className={cn(
        "flex",
        collapsed
          ? "flex-col items-center gap-1.5 px-2 py-2"
          : "items-center gap-2 px-3 py-3"
      )}
    >
      <WorkbenchRailTooltip
        enabled={collapsed}
        label={identity.primary}
        description={identity.secondary}
      >
        {identityTrigger}
      </WorkbenchRailTooltip>
    </div>
  )
}
