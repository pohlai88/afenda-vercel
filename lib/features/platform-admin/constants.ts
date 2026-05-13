import type { AppPath } from "#lib/i18n/locales.shared"
import { normalizeOrgSlugParam } from "#lib/org-slug.shared"

import type {
  PlatformAdminCapability,
  PlatformAdminCapabilityId,
  PlatformAdminNavItem,
  PlatformAdminNavKey,
} from "./types"

/**
 * Canonical platform-admin capability registry — single source of truth for
 * the global `/operator/*` surface. Sidebar, breadcrumbs, route validators and
 * audit prefixes are derived from this list.
 *
 * IDs are stable strings (referenced from i18n + audit). Add capabilities by
 * appending to this list and updating `PlatformAdminCapabilityId`.
 */
export const PLATFORM_ADMIN_CAPABILITIES = [
  {
    id: "directory",
    segments: ["users"],
    auditPrefix: "iam.user.",
    nav: { navKey: "users", order: 1, primarySegment: "users" },
  },
  {
    id: "organizations",
    segments: ["organizations"],
    auditPrefix: "iam.organization.",
    nav: { navKey: "organizations", order: 2, primarySegment: "organizations" },
  },
  {
    id: "audit",
    segments: ["audit"],
    auditPrefix: "iam.audit.",
    nav: null,
  },
  {
    id: "system",
    segments: ["system"],
    auditPrefix: "iam.system.",
    nav: null,
  },
] as const satisfies readonly PlatformAdminCapability[]

export type RegisteredPlatformAdminCapability =
  (typeof PLATFORM_ADMIN_CAPABILITIES)[number]

/** All registered capability ids, derived from {@link PLATFORM_ADMIN_CAPABILITIES}. */
export const PLATFORM_ADMIN_CAPABILITY_IDS: readonly PlatformAdminCapabilityId[] =
  PLATFORM_ADMIN_CAPABILITIES.map((capability) => capability.id)

/** All admin path segments owned by registered capabilities (deduped, sorted). */
export const PLATFORM_ADMIN_ALLOWED_SEGMENTS: readonly string[] = Array.from(
  new Set(
    PLATFORM_ADMIN_CAPABILITIES.flatMap((capability) => capability.segments)
  )
).sort()

export function isAllowedPlatformAdminSegment(
  segment: string
): segment is (typeof PLATFORM_ADMIN_ALLOWED_SEGMENTS)[number] {
  return PLATFORM_ADMIN_ALLOWED_SEGMENTS.includes(segment)
}

export function getPlatformAdminCapabilityById(
  id: PlatformAdminCapabilityId
): RegisteredPlatformAdminCapability | undefined {
  return PLATFORM_ADMIN_CAPABILITIES.find((capability) => capability.id === id)
}

/** Build a locale-internal `/operator/{segment}` path. Strips leading slashes. */
export function platformAdminPath(segment?: string): AppPath {
  if (!segment) {
    return "/operator" as AppPath
  }
  const trimmed = segment.replace(/^\/+/, "")
  return `/operator/${trimmed}` as AppPath
}

/** Canonical org-scoped platform admin path under the active org shell. */
export function organizationOperatorPath(
  orgSlug: string,
  segment?: string
): AppPath {
  const slug = normalizeOrgSlugParam(orgSlug)
  if (!slug) {
    throw new Error("organizationOperatorPath: invalid org slug")
  }
  if (!segment) {
    return `/o/${slug}/operator` as AppPath
  }
  const trimmed = segment.replace(/^\/+/, "")
  return `/o/${slug}/operator/${trimmed}` as AppPath
}

/** Sidebar nav items derived from {@link PLATFORM_ADMIN_CAPABILITIES}. */
export const PLATFORM_ADMIN_NAV_ITEMS: readonly PlatformAdminNavItem[] =
  PLATFORM_ADMIN_CAPABILITIES.flatMap<PlatformAdminNavItem>((capability) => {
    if (!capability.nav) return []
    return [
      {
        capabilityId: capability.id,
        href: platformAdminPath(capability.nav.primarySegment),
        navKey: capability.nav.navKey as PlatformAdminNavKey,
        order: capability.nav.order,
      },
    ]
  }).sort((a, b) => a.order - b.order)

// ---------------------------------------------------------------------------
// User directory listing
// ---------------------------------------------------------------------------

/** Default page size for the user directory listing. */
export const PLATFORM_ADMIN_USERS_PAGE_SIZE = 25

/** Hard cap to prevent unbounded page sizes from search params. */
export const PLATFORM_ADMIN_USERS_MAX_PAGE_SIZE = 100

/** Cap on `searchValue` length to bound query cost. */
export const PLATFORM_ADMIN_USERS_SEARCH_MAX_LENGTH = 120
