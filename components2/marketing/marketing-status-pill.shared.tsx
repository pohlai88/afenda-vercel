import type {
  OpenStatusPublicState,
  TrustSurfaceState,
} from "#features/public-trust"
import { cn } from "#lib/utils"

const OPEN_STATUS_PILL_BASE =
  "inline-flex min-h-8 items-center rounded-full border px-3 text-[0.72rem] font-bold tracking-[0.08em] uppercase"

const TRUST_STATE_PILL_BASE =
  "inline-flex min-h-[30px] items-center justify-center rounded-full border px-3 text-[0.72rem] font-bold tracking-[0.08em] uppercase"

export function openStatusPillLabel(state: OpenStatusPublicState | string): string {
  switch (state) {
    case "operational":
      return "Operational"
    case "degraded":
      return "Degraded"
    case "maintenance":
      return "Maintenance"
    case "incident":
      return "Incident"
    default:
      return state
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
  }
}

export function openStatusPillClassName(state: OpenStatusPublicState | string): string {
  switch (state) {
    case "operational":
      return "border-emerald-500/35 bg-emerald-500/10 text-foreground dark:bg-emerald-500/15"
    case "degraded":
      return "border-warning/40 bg-warning/10 text-foreground"
    case "maintenance":
      return "border-info/40 bg-info/10 text-foreground"
    case "incident":
      return "border-critical/45 bg-critical/10 text-foreground"
    default:
      return "border-border bg-muted text-foreground"
  }
}

export function OpenStatusPill({
  state,
}: {
  readonly state: OpenStatusPublicState | string
}) {
  return (
    <span
      className={cn(OPEN_STATUS_PILL_BASE, openStatusPillClassName(state))}
    >
      {openStatusPillLabel(state)}
    </span>
  )
}

export function trustSurfacePillClassName(state: TrustSurfaceState): string {
  switch (state) {
    case "live":
      return "border-emerald-500/35 bg-emerald-500/10 text-foreground dark:bg-emerald-500/15"
    case "planned":
      return "border-primary/25 bg-primary/10 text-foreground"
    case "withheld":
      return "border-border bg-muted text-foreground"
    default:
      return "border-border bg-muted"
  }
}

export function TrustSurfaceStatePill({
  state,
}: {
  readonly state: TrustSurfaceState
}) {
  return (
    <span className={cn(TRUST_STATE_PILL_BASE, trustSurfacePillClassName(state))}>
      {state}
    </span>
  )
}
