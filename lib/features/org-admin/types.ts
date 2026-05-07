import type { AppPath } from "#lib/i18n/locales.shared"

/** Stable capability identifiers for the organizational control plane. */
export type OrgAdminCapabilityId =
  | "identity"
  | "governance"
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
export type OrgAdminNavKey = "members" | "audit" | "integrations" | "settings"

export type OrgAdminNavItem = {
  readonly capabilityId: OrgAdminCapabilityId
  readonly href: AppPath
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
