import { Suspense } from "react"

import { NexusUtilityBarRow } from "./nexus-utility-bar-row"

type NexusUtilityBarProps = {
  orgSlug: string
  orgName: string
  orgId: string
  userId: string
  userEmail: string
}

/**
 * L1 Utility Bar
 *
 * Persistent system-control layer.
 * Not primary navigation. Not page chrome.
 * It provides origin, command, identity, and operational context.
 *
 * **Rails:** left = org / module / operational shortcuts; right = personal utilities
 * (customizable via control menu → “Customize utility bar”).
 */
export function NexusUtilityBar({
  orgSlug,
  orgName,
  orgId,
  userId,
  userEmail,
}: NexusUtilityBarProps) {
  return (
    <header
      data-nexus-utility-bar="true"
      aria-label="Afenda system utility bar"
      className="af-nexus-l1-chrome-backplate af-nexus-utility-bar-backdrop sticky top-0 z-40"
    >
      <div className="mx-auto max-w-screen-2xl px-2.5 sm:px-4">
        <Suspense fallback={<UtilityBarRowSkeleton />}>
          <NexusUtilityBarRow
            orgSlug={orgSlug}
            orgName={orgName}
            orgId={orgId}
            userId={userId}
            userEmail={userEmail}
          />
        </Suspense>
      </div>
    </header>
  )
}

/** Suspense fallback — pulse pauses when `prefers-reduced-motion: reduce`. */
function UtilityBarRowSkeleton() {
  return (
    <div
      className="grid h-12 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2"
      aria-hidden="true"
    >
      {/* Left: brand + nav trigger */}
      <div className="flex items-center gap-1.5">
        <div className="size-[33px] animate-pulse motion-reduce:animate-none rounded-full border border-border/50 bg-card/72" />
        <div className="size-[28px] animate-pulse motion-reduce:animate-none rounded-full border border-border/50 bg-card/72" />
      </div>
      <div className="flex justify-center px-2 sm:px-4">
        <div className="h-9 max-w-md flex-1 animate-pulse motion-reduce:animate-none rounded-lg border border-border/50 bg-card/72 sm:flex-none sm:w-72" />
      </div>
      {/* Right: operational shortcuts + utilities + identity */}
      <div className="flex items-center justify-end gap-1.5">
        <div className="size-[28px] animate-pulse motion-reduce:animate-none rounded-full border border-border/50 bg-card/72" />
        <div className="size-[28px] animate-pulse motion-reduce:animate-none rounded-full border border-border/50 bg-card/72" />
        <div className="size-[28px] animate-pulse motion-reduce:animate-none rounded-full border border-border/50 bg-card/72" />
        <div className="size-[28px] animate-pulse motion-reduce:animate-none rounded-full border border-border/50 bg-card/72" />
        <div className="size-[33px] animate-pulse motion-reduce:animate-none rounded-full border border-border/50 bg-card/72" />
      </div>
    </div>
  )
}
