import type { Route } from "next"

/** Stable capability identifiers for the organizational control plane. */
export type OrgAdminCapabilityId =
  | "identity"
  | "governance"
  | "feedback"
  | "integrations"
  | "organization"
  | "operations"

/** Namespace prefix for `OrgAdmin.nav.<key>` i18n entries. */
export const ORG_ADMIN_NAV_NAMESPACE = "OrgAdmin.nav" as const

/**
 * One row in the canonical capability registry. Routes, sidebar, breadcrumbs,
 * sanitizer, redirects and contract tests are all derived from this type.
 */
export type OrgAdminCapability = {
  readonly id: OrgAdminCapabilityId
  /** Path segments the capability owns under `/o/{slug}/admin/{segment}`. */
  readonly segments: readonly string[]
  /** Required prefix for IAM audit actions written by this capability. */
  readonly auditPrefix: string
  /** Sidebar metadata. `null` means the capability has no dedicated nav entry. */
  readonly nav: {
    /** Suffix joined to {@link ORG_ADMIN_NAV_NAMESPACE} for `useTranslations`. */
    readonly navKey: string
    readonly order: number
    /** Segment used to compute the nav `href` (must be in `segments`). */
    readonly primarySegment: string
  } | null
}

/** Concrete nav keys present in `OrgAdmin.nav.*` (excludes overview/aria). */
export type OrgAdminNavKey =
  | "members"
  | "audit"
  | "feedback"
  | "integrations"
  | "settings"

export type OrgAdminNavItem = {
  readonly capabilityId: OrgAdminCapabilityId
  readonly href: Route
  readonly navKey: OrgAdminNavKey
  readonly order: number
}

/** Canonical event namespaces for the IAM/ERP/governance audit + delivery surface. */
export type OrgAdminEventNamespace =
  | "iam"
  | "org"
  | "erp"
  | "governance"
  | "integration"
  | "workflow"
  | "system"

/**
 * Canonical lifecycle for {@link OrgEventDelivery} rows. Synchronous deliveries
 * still pass through `queued -> sending -> delivered|failed` so retry/queue
 * implementations remain swap-compatible.
 */
export type OrgEventDeliveryState =
  | "queued"
  | "sending"
  | "delivered"
  | "failed"
  | "expired"
  | "disabled"

/** Public projection of an `org_event_endpoint` row for UI/Server Actions. */
export type OrgEventEndpointSummary = {
  readonly id: string
  readonly organizationId: string
  readonly name: string
  readonly url: string
  readonly events: readonly string[]
  readonly signatureVersion: string
  readonly enabled: boolean
  readonly createdAt: Date
  readonly updatedAt: Date
}

/** Public projection of an `org_event_delivery` row for UI listings. */
export type OrgEventDeliverySummary = {
  readonly id: string
  readonly endpointId: string
  readonly eventType: string
  readonly payloadHash: string
  readonly signatureVersion: string
  readonly state: OrgEventDeliveryState
  readonly attempts: number
  readonly httpStatus: number | null
  readonly errorMessage: string | null
  readonly durationMs: number | null
  readonly nextAttemptAt: Date | null
  readonly createdAt: Date
  readonly completedAt: Date | null
}

/**
 * Canonical lifecycle for {@link OrgImportJobSummary}. Synchronous adapters
 * still pass through `uploaded -> running -> completed | failed`; async
 * implementations can park jobs in `uploaded` until a worker picks them up.
 */
export type OrgImportJobState =
  | "uploaded"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"

/**
 * Per-row outcome inside an import job. `pending` is the staged state before
 * the adapter applies the row.
 */
export type OrgImportRowState = "pending" | "applied" | "failed" | "skipped"

/**
 * Stable identifiers for every adapter the platform exposes. Adding an
 * adapter requires extending this union, registering it in
 * {@link IMPORT_ADAPTERS}, and providing a row Zod schema + `applyRow` impl.
 */
export type OrgImportAdapterId = "member_invite" | "onething_import"

/** Public projection of an `import_job` row for UI listings. */
export type OrgImportJobSummary = {
  readonly id: string
  readonly organizationId: string
  readonly adapter: OrgImportAdapterId
  readonly state: OrgImportJobState
  readonly totalRows: number
  readonly successCount: number
  readonly failureCount: number
  readonly inputDigest: string
  readonly createdByUserId: string | null
  readonly metadata: Record<string, unknown> | null
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly completedAt: Date | null
}

/** Public projection of an `import_job_row` row. */
export type OrgImportJobRowSummary = {
  readonly id: string
  readonly jobId: string
  readonly rowIndex: number
  readonly payload: Record<string, unknown>
  readonly state: OrgImportRowState
  readonly resourceType: string | null
  readonly resourceId: string | null
}

/** Org membership row for the dashboard org switcher and `/console` landing. */
export type UserOrgSummary = {
  id: string
  slug: string
  name: string
  logo: string | null
  role: string
}

/** Public projection of an `import_job_failure` row. */
export type OrgImportJobFailureSummary = {
  readonly id: string
  readonly jobId: string
  readonly rowId: string | null
  readonly code: string
  readonly message: string
  readonly field: string | null
  readonly createdAt: Date
}
