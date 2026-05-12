import type { Route } from "next"

import { normalizeOrgSlugParam } from "#lib/org-slug.shared"

import type {
  NexusPressureSeverity,
  NexusSurfaceKind,
  PriorityLaneKind,
} from "./types"

/**
 * Locale-internal pathname for the **Nexus field** (`/o/{slug}/nexus`).
 * Returns a typed {@link Route} for `Link` / `redirect` from `#i18n/navigation`
 * and Next.js typed routes.
 *
 * Prefer this over `organizationDashboardPath(orgSlug, "home")` and over bare
 * `/o/{slug}` (org root redirects here). See AGENTS.md §5 → Nexus runtime.
 * Client-safe.
 */
export function organizationNexusPath(orgSlug: string): Route {
  const slug = normalizeOrgSlugParam(orgSlug)
  if (!slug) {
    throw new Error("organizationNexusPath: invalid org slug")
  }
  return `/o/${slug}/nexus` as Route
}

/** Internal: same shape as {@link organizationNexusPath}, but free of the throw. */
export function ORG_DASHBOARD_HOME_HREF(orgSlug: string): Route {
  return organizationNexusPath(orgSlug)
}

export const NEXUS_SURFACE_KINDS = [
  "cashflow",
  "stockIntegrity",
  "pipeline",
  "workforce",
  "procurement",
  "evidence",
  "operations",
] as const satisfies readonly NexusSurfaceKind[]

export const NEXUS_PRESSURE_SEVERITIES = [
  "ambient",
  "attention",
  "critical",
  "emergency",
] as const satisfies readonly NexusPressureSeverity[]

export const NEXUS_PRIORITY_LANE_KINDS = [
  "approvals",
  "automation_attention",
  "assignee_blockers",
  "evidence_gaps",
  "vendor_blockers",
  "review_blockers",
  "escalation_pressure",
  "inventory_exceptions",
  "cashflow_interruptions",
  "compliance_deadlines",
] as const satisfies readonly PriorityLaneKind[]
