import { Link } from "#i18n/navigation"
import type { Route } from "next"

import type { ResolutionEvent } from "./nexus.types"

/**
 * Single Recent Resolution row — quiet narrative, never a label grid.
 * Optional Lynx accent indicates Lynx-assisted resolutions.
 */
export type NexusResolutionStripProps = {
  event: ResolutionEvent
}

export function NexusResolutionStrip({ event }: NexusResolutionStripProps) {
  return (
    <li className="flex flex-col gap-1 border-b border-border px-surface-lg py-3 last:border-b-0">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{event.surface}</span>
        <span aria-hidden="true">·</span>
        <span>{formatTime(event.resolvedAt)}</span>
        {event.lynxAssisted ? (
          <>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-primary">Lynx-assisted</span>
          </>
        ) : null}
      </div>
      <Link
        href={event.href as Route}
        className="text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
      >
        {event.what}
      </Link>
      <p className="text-xs text-muted-foreground">
        {event.consequence}
        {event.evidenceCount > 0
          ? ` · ${event.evidenceCount} evidence item${event.evidenceCount === 1 ? "" : "s"}`
          : ""}
        {" · "}
        {event.actorName}
      </p>
    </li>
  )
}

function formatTime(iso: string): string {
  const ms = Date.now() - Date.parse(iso)
  if (!Number.isFinite(ms) || ms < 0) return "—"
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (ms < minute) return "just now"
  if (ms < hour) return `${Math.floor(ms / minute)}m ago`
  if (ms < day) return `${Math.floor(ms / hour)}h ago`
  return `${Math.floor(ms / day)}d ago`
}
