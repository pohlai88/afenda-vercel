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
    minimumOrgRole: "member",
  },
  {
    id: "leave",
    segments: ["leave"] as const,
    auditPrefix: "erp.hrm.leave",
    nav: { navKey: "leave", order: 20, primarySegment: "leave" },
    minimumOrgRole: "member",
  },
  {
    id: "attendance",
    segments: ["attendance"] as const,
    auditPrefix: "erp.hrm.attendance",
    nav: { navKey: "attendance", order: 30, primarySegment: "attendance" },
    minimumOrgRole: "member",
  },
  {
    id: "payroll",
    segments: ["payroll"] as const,
    auditPrefix: "erp.hrm.payroll",
    nav: { navKey: "payroll", order: 40, primarySegment: "payroll" },
    minimumOrgRole: "admin",
  },
  {
    id: "compliance",
    segments: ["compliance"] as const,
    auditPrefix: "erp.hrm.compliance",
    nav: { navKey: "compliance", order: 50, primarySegment: "compliance" },
    minimumOrgRole: "admin",
  },
  {
    id: "documents",
    segments: ["documents"] as const,
    auditPrefix: "erp.hrm.document",
    nav: { navKey: "documents", order: 60, primarySegment: "documents" },
    minimumOrgRole: "member",
  },
  {
    id: "policies",
    segments: ["policies"] as const,
    auditPrefix: "erp.hrm.policy",
    nav: { navKey: "policies", order: 70, primarySegment: "policies" },
    minimumOrgRole: "admin",
  },
  {
    id: "snapshot",
    segments: ["snapshot"] as const,
    auditPrefix: "erp.hrm.snapshot",
    nav: { navKey: "snapshot", order: 80, primarySegment: "snapshot" },
    minimumOrgRole: "member",
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
