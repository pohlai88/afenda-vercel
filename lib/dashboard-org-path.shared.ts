import type { AppPath } from "#lib/i18n/locales.shared"

/** Single-segment ERP modules under `/o/{slug}/dashboard/{module}`. */
export const ORG_DASHBOARD_MODULES = [
  "contacts",
  "sale",
  "purchase",
  "inventory",
  "accounting",
] as const

export type OrgDashboardModule = (typeof ORG_DASHBOARD_MODULES)[number]

const MODULE_SET = new Set<string>(ORG_DASHBOARD_MODULES)

/**
 * Validates legacy `[[...segments]]` under `/dashboard` (one allowed module or default).
 */
export function legacyDashboardSegmentsToTail(
  segments: string[] | undefined
): AppPath {
  if (!segments?.length) {
    return "/contacts" as AppPath
  }
  if (segments.length !== 1) {
    return "/contacts" as AppPath
  }
  const [one] = segments
  if (!one || one.includes("/") || one.includes("..") || one.includes("\\")) {
    return "/contacts" as AppPath
  }
  if (!MODULE_SET.has(one)) {
    return "/contacts" as AppPath
  }
  return `/${one}` as AppPath
}

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
  if (!tailFromO.startsWith("/dashboard")) {
    return "/dashboard" as AppPath
  }
  const parts = tailFromO.split("/").filter(Boolean)
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
