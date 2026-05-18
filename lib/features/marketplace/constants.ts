import type { Route } from "next"

import { normalizeOrgSlugParam } from "#lib/auth/org-slug.shared"

import {
  CAPABILITY_CATEGORIES,
  isCapabilityCategory,
  type CapabilityCategory,
} from "./marketplace.contract"

/**
 * Capability Registry — runtime constants.
 *
 * Route surface retired (ADR-0029): `/{locale}/o/{orgSlug}/marketplace/*` 308s to
 * Nexus; utility-bar resolution still uses this module via `#features/marketplace/server`.
 */

// ---------------------------------------------------------------------------
// Path builder — locale-internal, used with `next-intl` `Link` / `router`
// ---------------------------------------------------------------------------

/**
 * Locale-internal pathname for the org-scoped Marketplace surface. Pass the
 * result to `Link` / `router.push` from `#i18n/navigation`; do not prefix
 * `/{locale}` manually.
 *
 * Legacy locale-internal paths (bookmarks redirect via `next.config.ts`):
 *   - `organizationMarketplacePath(slug)` → `/o/{slug}/marketplace` (308 → nexus)
 *
 * `admin` is reserved for the governance surface (org-admin gate + step-up);
 * it is not a `CapabilityCategory`. Future categories register in
 * `CAPABILITY_CATEGORIES` (see `marketplace.contract.ts`).
 */
export type MarketplaceRoute = "admin" | CapabilityCategory

let cachedMarketplaceRoutes: Set<string> | null = null

function getMarketplaceRoutes(): Set<string> {
  if (cachedMarketplaceRoutes) return cachedMarketplaceRoutes
  cachedMarketplaceRoutes = new Set<string>(["admin", ...CAPABILITY_CATEGORIES])
  return cachedMarketplaceRoutes
}

export function isMarketplaceRoute(value: string): value is MarketplaceRoute {
  return getMarketplaceRoutes().has(value)
}

/**
 * Canonical org-scoped marketplace path under the authenticated app shell.
 */
export function organizationMarketplacePath(
  orgSlug: string,
  target?: MarketplaceRoute
): Route {
  const slug = normalizeOrgSlugParam(orgSlug)
  if (!slug) {
    throw new Error("organizationMarketplacePath: invalid org slug")
  }
  const base = `/o/${slug}/marketplace`
  if (!target) return base as Route
  return `${base}/${target}` as Route
}

// ---------------------------------------------------------------------------
// Resolver / metrics tuning
// ---------------------------------------------------------------------------

/**
 * Hard cap on the number of right-rail utility icons rendered after
 * resolution. Mirrors `NEXUS_RIGHT_RAIL_VISIBLE_LIMIT` in
 * `#features/nexus`; duplicated here so the marketplace module can
 * reason about the cap without depending on the Nexus surface
 * (composition direction is `marketplace → nexus catalog`, not the
 * reverse).
 */
export const MARKETPLACE_RAIL_VISIBLE_LIMIT = 9

/**
 * k-anonymity threshold for chain-wide adoption metrics. Below this
 * count the metric strip renders an em-dash rather than an integer
 * so a single-tenant outlier cannot be re-identified from the
 * Marketplace surface.
 */
export const MARKETPLACE_METRICS_K_ANONYMITY_THRESHOLD = 10

/**
 * Cache lifetime (seconds) for `getCapabilityChainMetrics`. Wrapped
 * with `unstable_cache` and busted explicitly via `revalidateTag`
 * whenever an org policy changes (see `org-policy.actions.ts`).
 */
export const MARKETPLACE_METRICS_REVALIDATE_SECONDS = 300

// ---------------------------------------------------------------------------
// Re-exports for convenience
// ---------------------------------------------------------------------------

export { CAPABILITY_CATEGORIES, isCapabilityCategory }
export type { CapabilityCategory }
