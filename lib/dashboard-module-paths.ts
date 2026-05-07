import type { AppPath } from "#lib/i18n/locales.shared"
import { ORG_ADMIN_PATH_SEGMENTS } from "#lib/dashboard-org-path.shared"
import { normalizeOrgSlugParam } from "#lib/org-slug.shared"

/**
 * Locale-internal pathname for an org-scoped dashboard URL (`localePrefix: "always"`).
 * Use with `Link` / `redirect` from `#i18n/navigation`.
 */
/**
 * Locale-internal pathname for the org admin workbench (`localePrefix: "always"`).
 * Client-safe — use from dashboard shell instead of the `#features/org-admin` barrel
 * so Server Actions / `server-only` query modules are not pulled into the client graph.
 * Segment allowlist mirrors {@link ORG_ADMIN_PATH_SEGMENTS}.
 */
export function organizationAdminPath(
  orgSlug: string,
  section: "overview" | string
): AppPath {
  const slug = normalizeOrgSlugParam(orgSlug)
  if (!slug) {
    throw new Error("organizationAdminPath: invalid org slug")
  }
  const base = `/o/${slug}/admin`
  if (section === "overview") {
    return base as AppPath
  }
  if (!ORG_ADMIN_PATH_SEGMENTS.has(section)) {
    throw new Error(`organizationAdminPath: unknown admin segment "${section}"`)
  }
  return `${base}/${section}` as AppPath
}

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
): AppPath {
  const slug = normalizeOrgSlugParam(orgSlug)
  if (!slug) {
    throw new Error("organizationDashboardPath: invalid org slug")
  }
  const base = `/o/${slug}/dashboard`
  if (modulePath === "home") {
    return base as AppPath
  }
  return `${base}/${modulePath}` as AppPath
}

/** Tails for `toLocaleOrgDashboardRevalidatePattern` (leading slash). */
export const ORG_DASHBOARD_CONTACTS = "/contacts" as const
export const ORG_DASHBOARD_KNOWLEDGE = "/knowledge" as const
export const ORG_DASHBOARD_LYNX = "/lynx" as const
export const ORG_DASHBOARD_SALE = "/sale" as const
export const ORG_DASHBOARD_PURCHASE = "/purchase" as const
export const ORG_DASHBOARD_INVENTORY = "/inventory" as const
export const ORG_DASHBOARD_ACCOUNTING = "/accounting" as const
