import type { AppPath } from "#lib/i18n/locales.shared"
import { normalizeOrgSlugParam } from "#lib/org-slug.shared"

/**
 * Locale-internal pathname for an org-scoped dashboard URL (`localePrefix: "always"`).
 * Use with `Link` / `redirect` from `#i18n/navigation`.
 */
export function organizationDashboardPath(
  orgSlug: string,
  modulePath:
    | "contacts"
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
export const ORG_DASHBOARD_SALE = "/sale" as const
export const ORG_DASHBOARD_PURCHASE = "/purchase" as const
export const ORG_DASHBOARD_INVENTORY = "/inventory" as const
export const ORG_DASHBOARD_ACCOUNTING = "/accounting" as const
