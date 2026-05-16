import type { Route } from "next"

import {
  HRM_DASHBOARD_CAPABILITY_SEGMENT_SET,
  type HrmDashboardCapabilitySegment,
} from "#lib/hrm-dashboard.shared"
import { normalizeOrgSlugParam } from "#lib/org-slug.shared"

import {
  ORG_DASHBOARD_HRM,
  organizationDashboardPath,
} from "#lib/dashboard-module-paths"
import { buildErpPermissionKey } from "#features/erp-rbac"

import type { HrmCapability, HrmNavKey } from "./types"
import { HRM_NAV_NAMESPACE } from "./types"

/**
 * Canonical HRM capability registry — routes, audit prefixes, nav order, and contract tests.
 * One row per `/dashboard/hrm/{segment}` segment (see `#lib/hrm-dashboard.shared`).
 */
export const HRM_CAPABILITIES = [
  {
    id: "workforce",
    segments: ["employees"] as const,
    auditPrefix: "erp.hrm.employee",
    nav: { navKey: "employees", order: 10, primarySegment: "employees" },
    requiredPermission: buildErpPermissionKey({
      module: "hrm",
      object: "employee",
      function: "search",
    }),
  },
  {
    id: "organization",
    segments: ["organization"] as const,
    auditPrefix: "erp.hrm.organization",
    nav: { navKey: "organization", order: 15, primarySegment: "organization" },
    requiredPermission: buildErpPermissionKey({
      module: "hrm",
      object: "organization",
      function: "read",
    }),
  },
  {
    id: "onboarding",
    segments: ["onboarding"] as const,
    auditPrefix: "erp.hrm.onboarding",
    nav: { navKey: "onboarding", order: 16, primarySegment: "onboarding" },
    requiredPermission: buildErpPermissionKey({
      module: "hrm",
      object: "onboarding",
      function: "read",
    }),
  },
  {
    id: "recruitment",
    segments: ["recruitment"] as const,
    auditPrefix: "erp.hrm.recruitment",
    nav: { navKey: "recruitment", order: 18, primarySegment: "recruitment" },
    requiredPermission: buildErpPermissionKey({
      module: "hrm",
      object: "recruitment",
      function: "search",
    }),
  },
  {
    id: "leave",
    segments: ["leave"] as const,
    auditPrefix: "erp.hrm.leave",
    nav: { navKey: "leave", order: 20, primarySegment: "leave" },
    requiredPermission: buildErpPermissionKey({
      module: "hrm",
      object: "leave",
      function: "search",
    }),
  },
  {
    id: "attendance",
    segments: ["attendance"] as const,
    auditPrefix: "erp.hrm.attendance",
    nav: { navKey: "attendance", order: 30, primarySegment: "attendance" },
    requiredPermission: buildErpPermissionKey({
      module: "hrm",
      object: "attendance",
      function: "search",
    }),
  },
  {
    id: "benefits",
    segments: ["benefits"] as const,
    auditPrefix: "erp.hrm.benefit",
    nav: { navKey: "benefits", order: 38, primarySegment: "benefits" },
    requiredPermission: buildErpPermissionKey({
      module: "hrm",
      object: "benefit",
      function: "search",
    }),
  },
  {
    id: "claims",
    segments: ["claims"] as const,
    auditPrefix: "erp.hrm.claim",
    nav: { navKey: "claims", order: 35, primarySegment: "claims" },
    requiredPermission: buildErpPermissionKey({
      module: "hrm",
      object: "claim",
      function: "search",
    }),
  },
  {
    id: "imports",
    segments: ["imports"] as const,
    auditPrefix: "erp.hrm.import",
    nav: { navKey: "imports", order: 37, primarySegment: "imports" },
    requiredPermission: buildErpPermissionKey({
      module: "hrm",
      object: "import",
      function: "search",
    }),
  },
  {
    id: "payroll",
    segments: ["payroll"] as const,
    auditPrefix: "erp.hrm.payroll",
    nav: { navKey: "payroll", order: 40, primarySegment: "payroll" },
    requiredPermission: buildErpPermissionKey({
      module: "hrm",
      object: "payroll",
      function: "search",
    }),
  },
  {
    id: "performance",
    segments: ["performance"] as const,
    auditPrefix: "erp.hrm.performance",
    nav: { navKey: "performance", order: 45, primarySegment: "performance" },
    requiredPermission: buildErpPermissionKey({
      module: "hrm",
      object: "performance",
      function: "search",
    }),
  },
  {
    id: "kpi",
    segments: ["kpi"] as const,
    auditPrefix: "erp.hrm.kpi",
    nav: { navKey: "kpi", order: 46, primarySegment: "kpi" },
    requiredPermission: buildErpPermissionKey({
      module: "hrm",
      object: "kpi",
      function: "search",
    }),
  },
  {
    id: "skills",
    segments: ["skills"] as const,
    auditPrefix: "erp.hrm.skill",
    nav: { navKey: "skills", order: 48, primarySegment: "skills" },
    requiredPermission: buildErpPermissionKey({
      module: "hrm",
      object: "skill",
      function: "search",
    }),
  },
  {
    id: "training",
    segments: ["training"] as const,
    auditPrefix: "erp.hrm.training",
    nav: { navKey: "training", order: 49, primarySegment: "training" },
    requiredPermission: buildErpPermissionKey({
      module: "hrm",
      object: "training",
      function: "search",
    }),
  },
  {
    id: "advances",
    segments: ["advances"] as const,
    auditPrefix: "erp.hrm.salary_advance",
    nav: { navKey: "advances", order: 47, primarySegment: "advances" },
    requiredPermission: buildErpPermissionKey({
      module: "hrm",
      object: "salary_advance",
      function: "search",
    }),
  },
  {
    id: "compliance",
    segments: ["compliance"] as const,
    auditPrefix: "erp.hrm.compliance",
    nav: { navKey: "compliance", order: 50, primarySegment: "compliance" },
    requiredPermission: buildErpPermissionKey({
      module: "hrm",
      object: "compliance",
      function: "search",
    }),
  },
  {
    id: "documents",
    segments: ["documents"] as const,
    auditPrefix: "erp.hrm.document",
    nav: { navKey: "documents", order: 60, primarySegment: "documents" },
    requiredPermission: buildErpPermissionKey({
      module: "hrm",
      object: "document",
      function: "search",
    }),
  },
  {
    id: "signatures",
    segments: ["signatures"] as const,
    auditPrefix: "erp.hrm.signature",
    nav: { navKey: "signatures", order: 62, primarySegment: "signatures" },
    requiredPermission: buildErpPermissionKey({
      module: "hrm",
      object: "signature",
      function: "search",
    }),
  },
  {
    id: "policies",
    segments: ["policies"] as const,
    auditPrefix: "erp.hrm.policy",
    nav: { navKey: "policies", order: 70, primarySegment: "policies" },
    requiredPermission: buildErpPermissionKey({
      module: "hrm",
      object: "policy",
      function: "search",
    }),
  },
  {
    id: "snapshot",
    segments: ["snapshot"] as const,
    auditPrefix: "erp.hrm.snapshot",
    nav: { navKey: "snapshot", order: 80, primarySegment: "snapshot" },
    requiredPermission: buildErpPermissionKey({
      module: "hrm",
      object: "snapshot",
      function: "read",
    }),
  },
] as const satisfies readonly HrmCapability[]

const SEGMENT_LIST: readonly HrmDashboardCapabilitySegment[] =
  HRM_CAPABILITIES.flatMap((c) => [...c.segments])
const SEGMENT_SET = new Set<HrmDashboardCapabilitySegment>(SEGMENT_LIST)

const SEGMENT_TO_CAPABILITY = new Map<
  HrmDashboardCapabilitySegment,
  HrmCapability
>()
for (const capability of HRM_CAPABILITIES) {
  for (const segment of capability.segments) {
    SEGMENT_TO_CAPABILITY.set(segment, capability)
  }
}

/** Locale-internal tail after `/dashboard`, including leading slash (for `revalidatePath` patterns). */
export { ORG_DASHBOARD_HRM }

/** Locale-internal URL for the HRM workspace root (`/o/{slug}/dashboard/hrm`). */
export function organizationHrmRootPath(orgSlug: string): Route {
  return organizationDashboardPath(orgSlug, "hrm")
}

/**
 * Locale-internal pathname for a capability under HRM (`localePrefix: "always"`).
 * Use `"overview"` for the HRM landing route (same URL as {@link organizationHrmRootPath}).
 */
export function organizationHrmPath(
  orgSlug: string,
  segment: HrmDashboardCapabilitySegment | "overview"
): Route {
  const slug = normalizeOrgSlugParam(orgSlug)
  if (!slug) {
    throw new Error("organizationHrmPath: invalid org slug")
  }
  const base = `/o/${slug}/dashboard/hrm`
  if (segment === "overview") {
    return base as Route
  }
  if (!SEGMENT_SET.has(segment)) {
    throw new Error(`organizationHrmPath: unknown HRM segment "${segment}"`)
  }
  return `${base}/${segment}` as Route
}

/** Locale-internal claims URL (`/dashboard/hrm/claims`). */
export function organizationHrmClaimsPath(orgSlug: string): Route {
  return organizationHrmPath(orgSlug, "claims")
}

/** Locale-internal signatures URL (`/dashboard/hrm/signatures`). */
export function organizationHrmSignaturesPath(orgSlug: string): Route {
  return organizationHrmPath(orgSlug, "signatures")
}

export function organizationHrmSignatureRequestPath(
  orgSlug: string,
  publicSlug: string
): Route {
  return `${organizationHrmSignaturesPath(orgSlug)}/${publicSlug}` as Route
}

/** Locale-internal employee detail URL (`/dashboard/hrm/employees/{id}`). */
export function organizationHrmEmployeePath(
  orgSlug: string,
  employeeId: string
): Route {
  const slug = normalizeOrgSlugParam(orgSlug)
  if (!slug) {
    throw new Error("organizationHrmEmployeePath: invalid org slug")
  }
  return `/o/${slug}/dashboard/hrm/employees/${employeeId}` as Route
}

// ---------------------------------------------------------------------------
// Phase 3K: per-evidence compliance lifecycle drill-down
// ---------------------------------------------------------------------------

/**
 * Narrow UUID-ish check so the path builder rejects accidental non-id
 * strings before they reach the route. Mirrors the regex used by the
 * forwarded-path sanitizer — keep the two in lockstep so any allowlist
 * change here is also surfaced cross-tenant.
 */
function isLikelyEvidenceId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

function isLikelyClaimId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

/** Locale-internal claim detail URL (`/dashboard/hrm/claims/{claimId}`). */
export function organizationHrmClaimPath(
  orgSlug: string,
  claimId: string
): Route {
  const slug = normalizeOrgSlugParam(orgSlug)
  if (!slug) {
    throw new Error("organizationHrmClaimPath: invalid org slug")
  }
  if (!isLikelyClaimId(claimId)) {
    throw new Error("organizationHrmClaimPath: claimId is not a valid UUID")
  }
  return `/o/${slug}/dashboard/hrm/claims/${claimId}` as Route
}

/** Locale-internal compliance evidence detail URL (`/dashboard/hrm/compliance/{evidenceId}`). */
export function organizationHrmComplianceDetailPath(
  orgSlug: string,
  evidenceId: string
): Route {
  const slug = normalizeOrgSlugParam(orgSlug)
  if (!slug) {
    throw new Error("organizationHrmComplianceDetailPath: invalid org slug")
  }
  if (!isLikelyEvidenceId(evidenceId)) {
    throw new Error(
      "organizationHrmComplianceDetailPath: evidenceId is not a valid UUID"
    )
  }
  return `/o/${slug}/dashboard/hrm/compliance/${evidenceId}` as Route
}

export function getAllowedHrmDashboardSubsegments(): readonly HrmDashboardCapabilitySegment[] {
  return [...SEGMENT_SET].sort((a, b) => a.localeCompare(b))
}

export function isAllowedHrmDashboardSubsegment(
  value: string
): value is HrmDashboardCapabilitySegment {
  return HRM_DASHBOARD_CAPABILITY_SEGMENT_SET.has(value)
}

export function getHrmCapabilityForSegment(
  segment: string
): HrmCapability | null {
  if (!isAllowedHrmDashboardSubsegment(segment)) return null
  return SEGMENT_TO_CAPABILITY.get(segment) ?? null
}

export function getHrmCapabilityById(
  id: HrmCapability["id"]
): HrmCapability | null {
  return HRM_CAPABILITIES.find((c) => c.id === id) ?? null
}

export type HrmNavItem = {
  readonly capabilityId: HrmCapability["id"]
  readonly href: Route
  readonly navKey: HrmNavKey
  readonly order: number
}

/** Sidebar / rail items for the HRM shell (stable sort by `order`). */
export function buildHrmNav(orgSlug: string): readonly HrmNavItem[] {
  const items: HrmNavItem[] = []
  for (const capability of HRM_CAPABILITIES) {
    items.push({
      capabilityId: capability.id,
      href: organizationHrmPath(orgSlug, capability.nav.primarySegment),
      navKey: capability.nav.navKey,
      order: capability.nav.order,
    })
  }
  return items.sort((a, b) => a.order - b.order)
}

/** Full i18n key for an HRM nav entry (`Dashboard.Hrm.nav.<navKey>`). */
export function hrmNavLabelKey(navKey: string): string {
  return `${HRM_NAV_NAMESPACE}.${navKey}`
}

/** Sorted canonical `erp.hrm.*` audit prefixes for capability registry contract tests. */
export function getHrmAuditPrefixes(): readonly string[] {
  const prefixes = HRM_CAPABILITIES.map((c) => c.auditPrefix)
  return [...new Set(prefixes)].sort()
}
