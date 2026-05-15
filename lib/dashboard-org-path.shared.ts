import type { AppPath } from "#lib/i18n/locales.shared"

import { HRM_DASHBOARD_CAPABILITY_SEGMENT_SET } from "#lib/hrm-dashboard.shared"
import { ORBIT_DASHBOARD_SURFACE_SEGMENT_SET } from "#lib/planner-dashboard.shared"

/**
 * Admin workbench segments under `/o/{slug}/admin/{segment}`.
 * Keep in sync with `ORG_ADMIN_CAPABILITIES` in `#features/org-admin/constants`.
 */
export const ORG_ADMIN_PATH_SEGMENTS = new Set([
  "members",
  "audit",
  "feedback",
  "settings",
  "access",
  "integrations",
  "knowledge",
])

function isAllowedForwardedOrgAdminSegment(segment: string): boolean {
  return ORG_ADMIN_PATH_SEGMENTS.has(segment)
}

/** Narrow UUID check for sanitizing `/dashboard/hrm/employees/{id}` tails only. */
function isLikelyDatabaseUuid(segment: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    segment
  )
}

/** Single-segment ERP modules under `/o/{slug}/dashboard/{module}`. */
export const ORG_DASHBOARD_MODULES = [
  "contacts",
  "orbit",
  "knowledge",
  "lynx",
  "hrm",
  "sale",
  "purchase",
  "inventory",
  "accounting",
] as const

export type OrgDashboardModule = (typeof ORG_DASHBOARD_MODULES)[number]

const MODULE_SET = new Set<string>(ORG_DASHBOARD_MODULES)

/**
 * Sanitize path after `/o/{slug}` from a trusted forwarded pathname header.
 * Prevents odd tails if headers are ever wrong or duplicated.
 */
export function sanitizePathAfterOrgSlug(tailFromO: string): AppPath {
  if (!tailFromO || tailFromO === "") {
    return "/nexus" as AppPath
  }
  if (
    tailFromO.includes("..") ||
    tailFromO.includes("//") ||
    tailFromO.includes("\\")
  ) {
    return "/nexus" as AppPath
  }
  const parts = tailFromO.split("/").filter(Boolean)
  if (parts.length >= 1 && parts[0] === "admin") {
    if (parts.length === 1) {
      return "/admin" as AppPath
    }
    if (parts.length === 2 && isAllowedForwardedOrgAdminSegment(parts[1])) {
      return `/admin/${parts[1]}` as AppPath
    }
    if (parts[1] === "knowledge") {
      if (parts.length === 3 && parts[2] === "sources") {
        return "/admin/knowledge/sources" as AppPath
      }
      if (
        parts.length === 5 &&
        parts[2] === "sources" &&
        parts[3] === "runs" &&
        isLikelyDatabaseUuid(parts[4]!)
      ) {
        return `/admin/knowledge/sources/runs/${parts[4]}` as AppPath
      }
    }
    return "/nexus" as AppPath
  }
  if (parts.length >= 1 && parts[0] === "nexus") {
    return "/nexus" as AppPath
  }
  if (!tailFromO.startsWith("/dashboard")) {
    return "/nexus" as AppPath
  }
  if (parts.length < 1 || parts[0] !== "dashboard") {
    return "/dashboard" as AppPath
  }
  if (parts.length === 1) {
    return "/dashboard" as AppPath
  }
  if (
    parts.length >= 2 &&
    parts[1] === "hrm" &&
    tailFromO.startsWith("/dashboard/hrm")
  ) {
    if (parts.length === 2) {
      return "/dashboard/hrm" as AppPath
    }
    if (
      parts.length === 4 &&
      parts[2] === "employees" &&
      isLikelyDatabaseUuid(parts[3]!)
    ) {
      return `/dashboard/hrm/employees/${parts[3]}` as AppPath
    }
    // Phase 3K: per-evidence compliance lifecycle drill-down. Mirrors the
    // employees/{id} allowlist — narrow UUID gate so headers cannot smuggle
    // arbitrary tails through cross-tenant redirects.
    if (
      parts.length === 4 &&
      parts[2] === "compliance" &&
      isLikelyDatabaseUuid(parts[3]!)
    ) {
      return `/dashboard/hrm/compliance/${parts[3]}` as AppPath
    }
    // Phase 4: per-claim drill-down (`/dashboard/hrm/claims/{claimId}`).
    if (
      parts.length === 4 &&
      parts[2] === "claims" &&
      isLikelyDatabaseUuid(parts[3]!)
    ) {
      return `/dashboard/hrm/claims/${parts[3]}` as AppPath
    }
    if (
      parts.length === 3 &&
      HRM_DASHBOARD_CAPABILITY_SEGMENT_SET.has(parts[2]!)
    ) {
      return `/dashboard/hrm/${parts[2]}` as AppPath
    }
    return "/dashboard/hrm" as AppPath
  }
  if (
    parts.length >= 2 &&
    parts[1] === "orbit" &&
    tailFromO.startsWith("/dashboard/orbit")
  ) {
    if (parts.length === 2) {
      return "/dashboard/orbit" as AppPath
    }
    if (
      parts.length === 3 &&
      ORBIT_DASHBOARD_SURFACE_SEGMENT_SET.has(parts[2]!)
    ) {
      return `/dashboard/orbit/${parts[2]}` as AppPath
    }
    return "/dashboard/orbit" as AppPath
  }
  if (parts.length === 2 && MODULE_SET.has(parts[1])) {
    return `/dashboard/${parts[1]}` as AppPath
  }
  return "/dashboard" as AppPath
}
