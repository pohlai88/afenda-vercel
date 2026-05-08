import type { Route } from "next"

import { ORG_ADMIN_PATH_SEGMENTS } from "#lib/dashboard-org-path.shared"
import { normalizeOrgSlugParam } from "#lib/org-slug.shared"

/**
 * Locale-internal pathname for the org admin workbench (`localePrefix: "always"`).
 * Returns a typed {@link Route} for `Link` / `redirect` from `#i18n/navigation` and
 * Next.js typed routes. Client-safe — use from dashboard shell instead of the
 * `#features/org-admin` barrel so Server Actions / `server-only` query modules are
 * not pulled into the client graph. Segment allowlist mirrors {@link ORG_ADMIN_PATH_SEGMENTS}.
 */
export function organizationAdminPath(
  orgSlug: string,
  section: "overview" | string
): Route {
  const slug = normalizeOrgSlugParam(orgSlug)
  if (!slug) {
    throw new Error("organizationAdminPath: invalid org slug")
  }
  const base = `/o/${slug}/admin`
  if (section === "overview") {
    return base as Route
  }
  if (!ORG_ADMIN_PATH_SEGMENTS.has(section)) {
    throw new Error(`organizationAdminPath: unknown admin segment "${section}"`)
  }
  return `${base}/${section}` as Route
}

/**
 * Locale-internal pathname for an org-scoped dashboard URL (`localePrefix: "always"`).
 * Returns a typed {@link Route} for `Link` / `redirect` from `#i18n/navigation`.
 */
export function organizationDashboardPath(
  orgSlug: string,
  modulePath:
    | "contacts"
    | "knowledge"
    | "lynx"
    | "sale"
    | "purchase"
    | "inventory"
    | "accounting"
    | "home"
): Route {
  const slug = normalizeOrgSlugParam(orgSlug)
  if (!slug) {
    throw new Error("organizationDashboardPath: invalid org slug")
  }
  const base = `/o/${slug}/dashboard`
  if (modulePath === "home") {
    return base as Route
  }
  return `${base}/${modulePath}` as Route
}

/** Tails for `toLocaleOrgDashboardRevalidatePattern` (leading slash). */
export const ORG_DASHBOARD_CONTACTS = "/contacts" as const
export const ORG_DASHBOARD_KNOWLEDGE = "/knowledge" as const
export const ORG_DASHBOARD_LYNX = "/lynx" as const
export const ORG_DASHBOARD_SALE = "/sale" as const
export const ORG_DASHBOARD_PURCHASE = "/purchase" as const
export const ORG_DASHBOARD_INVENTORY = "/inventory" as const
export const ORG_DASHBOARD_ACCOUNTING = "/accounting" as const
