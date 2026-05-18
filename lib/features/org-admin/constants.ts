import { organizationAdminPath } from "#lib/dashboard-module-paths"

import type {
  OrgAdminCapability,
  OrgAdminCapabilityId,
  OrgAdminEventNamespace,
  OrgAdminNavItem,
  OrgAdminNavKey,
  OrgEventDeliveryState,
  OrgImportAdapterId,
  OrgImportJobState,
  OrgImportRowState,
} from "./types"
import { ORG_ADMIN_NAV_NAMESPACE } from "./types"

/**
 * Canonical capability registry — single source of truth for routes, sidebar,
 * sanitizer, breadcrumbs, redirects, audit prefixes, and contract tests.
 */
export const ORG_ADMIN_CAPABILITIES = [
  {
    id: "identity",
    segments: ["members"] as const,
    auditPrefix: "org.member",
    nav: { navKey: "members", order: 10, primarySegment: "members" },
  },
  {
    id: "access",
    segments: ["access"] as const,
    auditPrefix: "org.access",
    nav: { navKey: "access", order: 15, primarySegment: "access" },
  },
  {
    id: "governance",
    segments: ["audit"] as const,
    auditPrefix: "org.governance",
    nav: { navKey: "audit", order: 20, primarySegment: "audit" },
  },
  {
    id: "feedback",
    segments: ["feedback"] as const,
    auditPrefix: "org.feedback",
    nav: { navKey: "feedback", order: 25, primarySegment: "feedback" },
  },
  {
    id: "integrations",
    segments: ["integrations"] as const,
    auditPrefix: "org.integration",
    nav: {
      navKey: "integrations",
      order: 30,
      primarySegment: "integrations",
    },
  },
  {
    id: "organization",
    segments: ["settings"] as const,
    auditPrefix: "org.profile",
    nav: { navKey: "settings", order: 40, primarySegment: "settings" },
  },
  {
    id: "operations",
    segments: ["knowledge"] as const,
    auditPrefix: "org.operations",
    nav: null,
  },
] as const satisfies readonly OrgAdminCapability[]

/** i18n key for the workbench overview entry (no segment). */
export const ORG_ADMIN_OVERVIEW_NAV_KEY = "overview" as const

/** Canonical IAM/ERP/governance event namespaces (also used by audit + delivery). */
export const ORG_ADMIN_EVENT_NAMESPACES = [
  "iam",
  "org",
  "erp",
  "governance",
  "integration",
  "workflow",
  "system",
] as const satisfies readonly OrgAdminEventNamespace[]

/**
 * Canonical lifecycle states for `org_event_delivery` rows. Order is
 * documentation-only; persistence stores the state string verbatim.
 */
export const EVENT_DELIVERY_STATES = [
  "queued",
  "sending",
  "delivered",
  "failed",
  "expired",
  "disabled",
] as const satisfies readonly OrgEventDeliveryState[]

const DELIVERY_STATE_SET = new Set<string>(EVENT_DELIVERY_STATES)

/** Type guard: validates a stored `state` string against the canonical set. */
export function isEventDeliveryState(
  value: string
): value is OrgEventDeliveryState {
  return DELIVERY_STATE_SET.has(value)
}

/** Current signature algorithm version for outbound HMAC delivery. */
export const ORG_EVENT_SIGNATURE_VERSION = "v1" as const

/**
 * Allowlist of canonical event types that endpoints may subscribe to.
 * Each entry must match `ORG_ADMIN_EVENT_NAMESPACES.<segment>...` so the gate
 * in `isAllowedEventType` covers both creation forms and delivery enqueue.
 */
export const ORG_EVENT_TYPES = [
  "iam.session.sign_in",
  "iam.session.sign_out",
  "iam.session.revoke",
  "iam.passkey.add",
  "iam.passkey.remove",
  "org.member.invite",
  "org.member.role.update",
  "org.member.remove",
  "org.invitation.accept",
  "org.invitation.cancel",
  "org.integration.endpoint.create",
  "org.integration.endpoint.update",
  "org.integration.endpoint.delete",
  "org.integration.endpoint.rotate_secret",
  "org.integration.endpoint.ping",
  "erp.contact.record.create",
  "erp.contact.record.update",
  "erp.knowledge.chunk.create",
  "erp.hrm.statutory.epf.submitted",
  "erp.hrm.statutory.socso.submitted",
  "erp.hrm.statutory.eis.submitted",
  "erp.hrm.statutory.pcb.submitted",
  "erp.hrm.statutory.hrdf.submitted",
  "erp.hrm.statutory.ea.published",
  "erp.hrm.payroll.run.posted",
  "erp.hrm.payroll.period.finalized",
  /**
   * Phase 3P + 3Q — system-observed compliance aging crossings.
   * Fired by the `hrm-compliance-aging-watch` cron each time an
   * evidence row crosses one of three severity thresholds:
   *
   *   - `detected`   → STUCK_DAYS      (default  7 days)
   *   - `escalated`  → ESCALATED_DAYS  (default 14 days)
   *   - `critical`   → CRITICAL_DAYS   (default 30 days)
   *
   * Each tier is an independent subscription. Orgs typically wire
   * the digest channel to `detected`, the on-call rotation to
   * `escalated`, and the PagerDuty / regulator-incident workflow
   * to `critical` — so escalation discipline matches operational
   * severity rather than collapsing onto one event.
   *
   * Idempotent per evidence row × tier — exactly one delivery per
   * organization per evidence row per tier, ever (anchored on the
   * Phase 3O audit dedup that gates the fanout).
   *
   * Event payload is operational facets only (severity tier, age,
   * pack type, period id, rule pack version) — never payroll
   * payload bytes, never PII. Receivers are expected to page HR
   * managers, raise a Slack incident, or open a Jira ticket.
   */
  "erp.hrm.compliance.aging.detected",
  "erp.hrm.compliance.aging.escalated",
  "erp.hrm.compliance.aging.critical",
  "erp.hrm.claim.submitted",
  "erp.hrm.claim.under_review",
  "erp.hrm.claim.approved",
  "erp.hrm.claim.rejected",
  "erp.hrm.claim.returned",
  "erp.hrm.claim.exception_requested",
  "erp.hrm.claim.paid",
  "erp.hrm.claim.overdue",
] as const

const EVENT_TYPE_SET = new Set<string>(ORG_EVENT_TYPES)

/** Membership check for the canonical event-type allowlist. */
export function isAllowedEventType(value: string): boolean {
  return EVENT_TYPE_SET.has(value)
}

/** Canonical lifecycle states for `import_job` rows. */
export const IMPORT_JOB_STATES = [
  "uploaded",
  "running",
  "completed",
  "failed",
  "cancelled",
] as const satisfies readonly OrgImportJobState[]

const IMPORT_JOB_STATE_SET = new Set<string>(IMPORT_JOB_STATES)

export function isImportJobState(value: string): value is OrgImportJobState {
  return IMPORT_JOB_STATE_SET.has(value)
}

/** Canonical per-row outcome states for `import_job_row` rows. */
export const IMPORT_ROW_STATES = [
  "pending",
  "applied",
  "failed",
  "skipped",
] as const satisfies readonly OrgImportRowState[]

const IMPORT_ROW_STATE_SET = new Set<string>(IMPORT_ROW_STATES)

export function isImportRowState(value: string): value is OrgImportRowState {
  return IMPORT_ROW_STATE_SET.has(value)
}

/** Registered ingestion adapters — extend in lockstep with `OrgImportAdapterId`. */
export const IMPORT_ADAPTERS = [
  "member_invite",
  "hrm_payroll_profile_import",
  "hrm_employee_hire",
  "hrm_attendance_import",
] as const satisfies readonly OrgImportAdapterId[]

const IMPORT_ADAPTER_SET = new Set<string>(IMPORT_ADAPTERS)

export function isImportAdapterId(value: string): value is OrgImportAdapterId {
  return IMPORT_ADAPTER_SET.has(value)
}

/** Maximum number of rows accepted per ingestion job (synchronous Apply guard). */
export const IMPORT_MAX_ROWS_PER_JOB = 500

/** Maximum CSV text byte size accepted by the import form. */
export const IMPORT_MAX_CSV_BYTES = 256 * 1024

const SEGMENT_LIST: readonly string[] = ORG_ADMIN_CAPABILITIES.flatMap(
  (capability) => [...capability.segments]
)
const SEGMENT_SET = new Set(SEGMENT_LIST)

const SEGMENT_TO_CAPABILITY = new Map<string, OrgAdminCapability>()
for (const capability of ORG_ADMIN_CAPABILITIES) {
  for (const segment of capability.segments) {
    SEGMENT_TO_CAPABILITY.set(segment, capability)
  }
}

const NAMESPACE_SET = new Set<string>(ORG_ADMIN_EVENT_NAMESPACES)

/** Sorted, deduplicated list of segments allowed under `/o/{slug}/admin/{segment}`. */
export function getAllowedAdminSegments(): readonly string[] {
  return [...SEGMENT_SET].sort()
}

export function getCapabilityForSegment(
  segment: string
): OrgAdminCapability | null {
  return SEGMENT_TO_CAPABILITY.get(segment) ?? null
}

export function getCapabilityById(
  id: OrgAdminCapabilityId
): OrgAdminCapability | null {
  return (
    ORG_ADMIN_CAPABILITIES.find((capability) => capability.id === id) ?? null
  )
}

export { organizationAdminPath }

/** Validates the second path segment under `/o/.../admin/` for sanitizers. */
export function isAllowedOrgAdminSegment(segment: string): boolean {
  return SEGMENT_SET.has(segment)
}

/** Sidebar items for the workbench, in stable order (excludes overview). */
export function buildOrgAdminNav(orgSlug: string): readonly OrgAdminNavItem[] {
  const items: OrgAdminNavItem[] = []
  for (const capability of ORG_ADMIN_CAPABILITIES) {
    if (!capability.nav) continue
    items.push({
      capabilityId: capability.id,
      href: organizationAdminPath(orgSlug, capability.nav.primarySegment),
      navKey: capability.nav.navKey as OrgAdminNavKey,
      order: capability.nav.order,
    })
  }
  return items.sort((a, b) => a.order - b.order)
}

/** Full i18n key for a capability/overview nav entry. */
export function orgAdminNavLabelKey(navKey: string): string {
  return `${ORG_ADMIN_NAV_NAMESPACE}.${navKey}`
}

/**
 * Audit-action namespace gate. New audit actions must start with one of
 * {@link ORG_ADMIN_EVENT_NAMESPACES} followed by `.`.
 */
export function isAllowedAuditAction(action: string): boolean {
  const dot = action.indexOf(".")
  if (dot <= 0) return false
  return NAMESPACE_SET.has(action.slice(0, dot))
}
