import type { AppPath } from "#lib/i18n/locales.shared"

import { HRM_APPS_CAPABILITY_SEGMENT_SET } from "#features/hrm/hrm-apps-path.shared"
import { ORBIT_SURFACE_SEGMENT_SET } from "#features/planner/planner-orbit-path.shared"

/** Admin segments under `/o/{slug}/admin/{segment}`. */
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

function isLikelyDatabaseUuid(segment: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    segment
  )
}

/** Single-segment ERP modules under `/o/{slug}/apps/{module}`. */
export const ORG_APPS_MODULES = [
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

export type OrgAppsModule = (typeof ORG_APPS_MODULES)[number]

const MODULE_SET = new Set<string>(ORG_APPS_MODULES)

function sanitizeAppsTail(tailFromO: string, parts: string[]): AppPath {
  if (parts.length < 1 || parts[0] !== "apps") {
    return "/apps" as AppPath
  }
  if (parts.length === 1) {
    return "/apps" as AppPath
  }
  if (
    parts.length >= 2 &&
    parts[1] === "hrm" &&
    tailFromO.startsWith("/apps/hrm")
  ) {
    if (parts.length === 2) {
      return "/apps/hrm" as AppPath
    }
    if (
      parts.length === 4 &&
      parts[2] === "employees" &&
      isLikelyDatabaseUuid(parts[3]!)
    ) {
      return `/apps/hrm/employees/${parts[3]}` as AppPath
    }
    if (
      parts.length === 4 &&
      parts[2] === "compliance" &&
      isLikelyDatabaseUuid(parts[3]!)
    ) {
      return `/apps/hrm/compliance/${parts[3]}` as AppPath
    }
    if (
      parts.length === 4 &&
      parts[2] === "claims" &&
      isLikelyDatabaseUuid(parts[3]!)
    ) {
      return `/apps/hrm/claims/${parts[3]}` as AppPath
    }
    if (
      parts.length === 3 &&
      HRM_APPS_CAPABILITY_SEGMENT_SET.has(parts[2]!)
    ) {
      return `/apps/hrm/${parts[2]}` as AppPath
    }
    return "/apps/hrm" as AppPath
  }
  if (
    parts.length >= 2 &&
    parts[1] === "orbit" &&
    tailFromO.startsWith("/apps/orbit")
  ) {
    if (parts.length === 2) {
      return "/apps/orbit" as AppPath
    }
    if (parts.length === 3 && ORBIT_SURFACE_SEGMENT_SET.has(parts[2]!)) {
      return `/apps/orbit/${parts[2]}` as AppPath
    }
    return "/apps/orbit" as AppPath
  }
  if (parts.length === 2 && MODULE_SET.has(parts[1])) {
    return `/apps/${parts[1]}` as AppPath
  }
  return "/apps" as AppPath
}

/**
 * Sanitize path after `/o/{slug}` from a trusted forwarded pathname header.
 * Legacy `/dashboard` tails normalize to `/apps` here only (HTTP redirects live in next.config).
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
  if (parts.length >= 1 && parts[0] === "account") {
    if (parts.length === 1) {
      return "/account" as AppPath
    }
    if (parts.length === 2 && (parts[1] === "identity" || parts[1] === "security")) {
      return `/account/${parts[1]}` as AppPath
    }
    return "/account" as AppPath
  }
  if (parts.length >= 1 && parts[0] === "operator") {
    return parts.length === 1
      ? ("/platform" as AppPath)
      : (`/platform/${parts[1]}` as AppPath)
  }
  if (tailFromO.startsWith("/apps")) {
    return sanitizeAppsTail(tailFromO, parts)
  }
  if (tailFromO.startsWith("/dashboard")) {
    const appsTail = tailFromO.replace(/^\/dashboard/, "/apps")
    return sanitizeAppsTail(appsTail, appsTail.split("/").filter(Boolean))
  }
  if (tailFromO.startsWith("/marketplace")) {
    return "/nexus" as AppPath
  }
  return "/nexus" as AppPath
}
