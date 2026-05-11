import { Link } from "#i18n/navigation"
import type { Route } from "next"

import { Card, CardContent } from "#components/ui/card"

import type { NexusSurfaceState } from "./nexus.types"

/**
 * Surface card on the Truth Map. Shows operating-domain state, pressure count,
 * last resolved at, and freshness — never raw module marketing copy.
 *
 * Material is opaque/shell; restrict glowing or glassy treatment to tiny status cues.
 */
export type NexusSurfaceCardProps = {
  surface: NexusSurfaceState
}

export function NexusSurfaceCard({ surface }: NexusSurfaceCardProps) {
  return (
    <Link
      href={surface.href as Route}
      className="group block focus-visible:outline-none"
    >
      <Card
        className="h-full border border-border transition-colors group-hover:border-foreground/20 group-focus-visible:ring-2 group-focus-visible:ring-ring"
        size="sm"
      >
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-foreground">
              {surface.label}
            </span>
            <StatusDot status={surface.status} />
          </div>
          <dl className="grid grid-cols-3 gap-3 text-xs">
            <Field
              label="Pressure"
              value={
                surface.pressureCount > 0 ? String(surface.pressureCount) : "—"
              }
            />
            <Field
              label="Resolved"
              value={
                surface.lastResolvedAt
                  ? formatRelativeTime(surface.lastResolvedAt)
                  : "—"
              }
            />
            <Field label="Data" value={formatFreshness(surface.freshness)} />
          </dl>
        </CardContent>
      </Card>
    </Link>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  )
}

const STATUS_TONE: Record<NexusSurfaceState["status"], string> = {
  blocked: "bg-destructive",
  attention: "bg-secondary-foreground",
  resolving: "bg-primary",
  stable: "bg-muted-foreground",
}

const STATUS_LABEL: Record<NexusSurfaceState["status"], string> = {
  blocked: "Blocked",
  attention: "Attention",
  resolving: "Resolving",
  stable: "Stable",
}

const FRESHNESS_LABEL: Record<NexusSurfaceState["freshness"], string> = {
  live: "Live",
  recent: "Recent",
  stale: "Stale",
}

function StatusDot({ status }: { status: NexusSurfaceState["status"] }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] tracking-wide text-muted-foreground uppercase">
      <span
        className={`size-1.5 rounded-full ${STATUS_TONE[status]}`}
        aria-hidden="true"
      />
      {STATUS_LABEL[status]}
    </span>
  )
}

function formatFreshness(freshness: NexusSurfaceState["freshness"]): string {
  return FRESHNESS_LABEL[freshness]
}

function formatRelativeTime(iso: string): string {
  const ms = Date.now() - Date.parse(iso)
  if (!Number.isFinite(ms) || ms < 0) return "—"
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (ms < minute) return "Just now"
  if (ms < hour) return `${Math.floor(ms / minute)}m`
  if (ms < day) return `${Math.floor(ms / hour)}h`
  return `${Math.floor(ms / day)}d`
}
