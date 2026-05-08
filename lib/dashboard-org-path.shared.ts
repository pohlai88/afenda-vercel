import type { AppPath } from "#lib/i18n/locales.shared"

/**
 * Admin workbench segments under `/o/{slug}/admin/{segment}`.
 * Keep in sync with `ORG_ADMIN_CAPABILITIES` in `#features/org-admin/constants`.
 */
export const ORG_ADMIN_PATH_SEGMENTS = new Set([
  "members",
  "audit",
  "settings",
  "integrations",
])

function isAllowedForwardedOrgAdminSegment(segment: string): boolean {
  return ORG_ADMIN_PATH_SEGMENTS.has(segment)
}

/** Single-segment ERP modules under `/o/{slug}/dashboard/{module}`. */
export const ORG_DASHBOARD_MODULES = [
  "contacts",
  "knowledge",
  "lynx",
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
    return "/dashboard" as AppPath
  }
  if (
    tailFromO.includes("..") ||
    tailFromO.includes("//") ||
    tailFromO.includes("\\")
  ) {
    return "/dashboard" as AppPath
  }
  const parts = tailFromO.split("/").filter(Boolean)
  if (parts.length >= 1 && parts[0] === "admin") {
    if (parts.length === 1) {
      return "/admin" as AppPath
    }
    if (parts.length === 2 && isAllowedForwardedOrgAdminSegment(parts[1])) {
      return `/admin/${parts[1]}` as AppPath
    }
    return "/dashboard" as AppPath
  }
  if (!tailFromO.startsWith("/dashboard")) {
    return "/dashboard" as AppPath
  }
  if (parts.length < 1 || parts[0] !== "dashboard") {
    return "/dashboard" as AppPath
  }
  if (parts.length === 1) {
    return "/dashboard" as AppPath
  }
  if (parts.length === 2 && MODULE_SET.has(parts[1])) {
    return `/dashboard/${parts[1]}` as AppPath
  }
  return "/dashboard" as AppPath
}
