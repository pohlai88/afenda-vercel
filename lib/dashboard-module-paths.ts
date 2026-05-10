import type { Route } from "next"

import { ORG_ADMIN_PATH_SEGMENTS } from "#lib/dashboard-org-path.shared"
import { normalizeOrgSlugParam } from "#lib/org-slug.shared"

/**
 * Locale-internal pathname for the org admin workbench (`localePrefix: "always"`).
 * Returns a typed {@link Route} for `Link` / `redirect` from `#i18n/navigation` and
 * Next.js typed routes. Client-safe — use from dashboard shell instead of the
 * `#features/org-admin` barrel so Server Actions / `server-only` query modules are
 * not pulled into the client graph (queries live under `#features/org-admin/server`).
 * Segment allowlist mirrors {@link ORG_ADMIN_PATH_SEGMENTS}.
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
 *
 * Note: `"home"` is a **deprecated alias** during Phase 1 of the Nexus runtime
 * migration — it now resolves to the **Nexus field** (`/o/{slug}/nexus`), not
 * `/o/{slug}/dashboard` (which no longer has a `page.tsx`). New callers should
 * import `organizationNexusPath` from `#features/nexus`. See AGENTS.md §5 →
 * Nexus runtime (org root).
 */
export function organizationDashboardPath(
  orgSlug: string,
  modulePath:
    | "contacts"
    | "ithink"
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
  if (modulePath === "home") {
    return `/o/${slug}/nexus` as Route
  }
  return `/o/${slug}/dashboard/${modulePath}` as Route
}

/**
 * Single source for ERP module chrome order under `/o/{slug}/dashboard`.
 * Excludes `home` (dashboard index). Keep aligned with
 * {@link ORG_DASHBOARD_MODULES} in `dashboard-org-path.shared.ts` and
 * `Dashboard.nav` in `messages/*`.
 */
export const DASHBOARD_NAV_MODULES = [
  "ithink",
  "contacts",
  "knowledge",
  "lynx",
  "sale",
  "purchase",
  "inventory",
  "accounting",
] as const satisfies ReadonlyArray<
  Exclude<Parameters<typeof organizationDashboardPath>[1], "home">
>

export type DashboardNavModule = (typeof DASHBOARD_NAV_MODULES)[number]

/** Tails for `toLocaleOrgDashboardRevalidatePattern` (leading slash). */
export const ORG_DASHBOARD_CONTACTS = "/contacts" as const
export const ORG_DASHBOARD_ITHINK = "/ithink" as const
export const ORG_DASHBOARD_KNOWLEDGE = "/knowledge" as const
export const ORG_DASHBOARD_LYNX = "/lynx" as const
export const ORG_DASHBOARD_SALE = "/sale" as const
export const ORG_DASHBOARD_PURCHASE = "/purchase" as const
export const ORG_DASHBOARD_INVENTORY = "/inventory" as const
export const ORG_DASHBOARD_ACCOUNTING = "/accounting" as const
