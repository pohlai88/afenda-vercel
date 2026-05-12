/**
 * Nexus runtime types — single server-shaped snapshot consumed by the Nexus Field.
 *
 * Doctrine: do **not** let individual Nexus widgets fetch independently. The whole
 * field is built once per request from one `NexusSnapshot`. See AGENTS.md §5 →
 * "Nexus runtime (org root)".
 */

import type { Route } from "next"

/** Aggregate runtime state — drives material escalation across the field. */
export type NexusState = "stable" | "pressure" | "resolving" | "interrupted"

/** Operating domain a Nexus surface card represents. */
export type NexusSurfaceKind =
  | "cashflow"
  | "stockIntegrity"
  | "pipeline"
  | "workforce"
  | "procurement"
  | "evidence"
  | "operations"

export type NexusSurfaceStatus =
  | "stable"
  | "attention"
  | "blocked"
  | "resolving"

export type NexusFreshness = "live" | "recent" | "stale"

export type NexusSurfaceState = {
  id: string
  label: string
  surface: NexusSurfaceKind
  status: NexusSurfaceStatus
  pressureCount: number
  /** ISO timestamp; undefined when no resolution exists yet for this surface. */
  lastResolvedAt?: string
  freshness: NexusFreshness
  /** Locale-internal href consumed by `Link` from `#i18n/navigation`. */
  href: Route | string
}

export type NexusPressureSeverity =
  | "ambient"
  | "attention"
  | "critical"
  | "emergency"

export type OperationalStageBadge = {
  label: string
  tone: "info" | "warning" | "critical"
}

export type OperationalPressureItem = {
  id: string
  severity: NexusPressureSeverity
  title: string
  /** Surface label this pressure originated from (display string only). */
  surface: string
  reason: string
  evidenceCount: number
  stageBadge?: OperationalStageBadge | null
  primaryAction: {
    label: string
    /** Locale-internal href the Nexus shell navigates to when the action fires. */
    command: Route | string
  }
}

export type PriorityLaneKind =
  | "approvals"
  | "automation_attention"
  | "assignee_blockers"
  | "evidence_gaps"
  | "vendor_blockers"
  | "review_blockers"
  | "escalation_pressure"
  | "inventory_exceptions"
  | "cashflow_interruptions"
  | "compliance_deadlines"

export type PriorityLane = {
  id: string
  kind: PriorityLaneKind
  label: string
  surface: string
  count: number
  href: Route | string
}

export type ResolutionEvent = {
  id: string
  what: string
  consequence: string
  surface: string
  actorName: string
  resolvedAt: string
  evidenceCount: number
  lynxAssisted: boolean
  href: Route | string
}

export type NexusEnvironment = "production" | "staging" | "development"

export type OrgContext = {
  organizationId: string
  orgSlug: string
  orgName: string
  environment: NexusEnvironment
  role: "owner" | "admin" | "member" | null
}

export type OperatorContext = {
  userId: string
  name: string | null
  email: string
  /** Operator's current operating day (UTC ISO date `YYYY-MM-DD`). */
  operatingDay: string
}

export type SystemReadinessState = "ready" | "degraded" | "outage"
export type LynxRuntimeState = "idle" | "thinking" | "resolving"

export type SystemReadiness = {
  status: SystemReadinessState
  lynxState: LynxRuntimeState
}

export type NexusSnapshot = {
  /** Aggregate runtime state — derived from `pressure` severity + readiness. */
  state: NexusState
  org: OrgContext
  operator: OperatorContext
  readiness: SystemReadiness
  surfaces: NexusSurfaceState[]
  pressure: OperationalPressureItem[]
  priorityLanes: PriorityLane[]
  recentResolutions: ResolutionEvent[]
}
