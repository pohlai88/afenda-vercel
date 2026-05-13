import { Suspense } from "react"

import { WorkbenchUtilityBarRow } from "./workbench-utility-bar-row"
import { WorkbenchUtilityBarNoOrgRow } from "./workbench-utility-bar-no-org-row"

type WorkbenchUtilityBarOrgProps = {
  /** Full org mode — all org-scoped widgets are available */
  mode: "org"
  orgSlug: string
  orgName: string
  orgId: string
  userId: string
  userEmail: string
}

type WorkbenchUtilityBarNoOrgProps = {
  /** No-org mode — only universal widgets (theme, locale, identity); used by console, operator, auth-shell */
  mode: "no-org"
  userId: string
  userEmail: string
}

export type WorkbenchUtilityBarProps =
  | WorkbenchUtilityBarOrgProps
  | WorkbenchUtilityBarNoOrgProps

/**
 * L1 Utility Bar
 *
 * Persistent system-control layer. Supports two modes:
 * - `org`: full bar with org switcher, module nav, org-scoped utilities
 * - `no-org`: universal-only bar for console / operator / non-org surfaces
 *
 * **Rails:** left = org / module / operational shortcuts; right = personal utilities
 * (governed by the Marketplace at `/marketplace`).
 */
export function WorkbenchUtilityBar(props: WorkbenchUtilityBarProps) {
  return (
    <header
      data-workbench-utility-bar="true"
      aria-label="Afenda workbench utility bar"
      className="af-nexus-l1-chrome-backplate af-nexus-utility-bar-backdrop sticky top-0 z-40"
    >
      <div className="mx-auto max-w-screen-2xl px-2.5 sm:px-4">
        {props.mode === "org" ? (
          <Suspense fallback={<UtilityBarRowSkeleton />}>
            <WorkbenchUtilityBarRow
              orgSlug={props.orgSlug}
              orgName={props.orgName}
              orgId={props.orgId}
              userId={props.userId}
              userEmail={props.userEmail}
            />
          </Suspense>
        ) : (
          <Suspense fallback={<UtilityBarRowSkeleton compact />}>
            <WorkbenchUtilityBarNoOrgRow
              userId={props.userId}
              userEmail={props.userEmail}
            />
          </Suspense>
        )}
      </div>
    </header>
  )
}

/** Suspense fallback — pulse pauses when `prefers-reduced-motion: reduce`. */
function UtilityBarRowSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div
      className="grid h-(--af-l1-height) grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2"
      aria-hidden="true"
    >
      {/* Left: brand + nav trigger */}
      <div className="flex items-center gap-1.5">
        <div className="size-[33px] animate-pulse rounded-full border border-border/50 bg-card/72 motion-reduce:animate-none" />
        {!compact && (
          <div className="size-[28px] animate-pulse rounded-full border border-border/50 bg-card/72 motion-reduce:animate-none" />
        )}
      </div>
      {!compact && (
        <div className="flex justify-center px-2 sm:px-4">
          <div className="h-9 max-w-md flex-1 animate-pulse rounded-lg border border-border/50 bg-card/72 motion-reduce:animate-none sm:w-72 sm:flex-none" />
        </div>
      )}
      {compact && <div />}
      {/* Right: operational shortcuts + utilities + identity */}
      <div className="flex items-center justify-end gap-1.5">
        <div className="size-[28px] animate-pulse rounded-full border border-border/50 bg-card/72 motion-reduce:animate-none" />
        <div className="size-[28px] animate-pulse rounded-full border border-border/50 bg-card/72 motion-reduce:animate-none" />
        <div className="size-[33px] animate-pulse rounded-full border border-border/50 bg-card/72 motion-reduce:animate-none" />
      </div>
    </div>
  )
}
