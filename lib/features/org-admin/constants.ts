import type { AppPath } from "#lib/i18n/locales.shared"
import { normalizeOrgSlugParam } from "#lib/org-slug.shared"

import type {
  OrgAdminCapability,
  OrgAdminCapabilityId,
  OrgAdminEventNamespace,
  OrgAdminNavItem,
  OrgAdminNavKey,
} from "./types"
import { ORG_ADMIN_NAV_NAMESPACE } from "./types"

/**
 * Canonical capability registry — single source of truth for routes, sidebar,
 * sanitizer, breadcrumbs, redirects, audit prefixes, and contract tests.
 */
export const ORG_ADMIN_CAPABILITIES = [
  {
    id: "identity",
    segments: ["members"] as const,
    auditPrefix: "org.member",
    nav: { navKey: "members", order: 10, primarySegment: "members" },
  },
  {
    id: "governance",
    segments: ["audit"] as const,
    auditPrefix: "org.governance",
    nav: { navKey: "audit", order: 20, primarySegment: "audit" },
  },
  {
    id: "integrations",
    segments: ["integrations"] as const,
    auditPrefix: "org.integration",
    nav: {
      navKey: "integrations",
      order: 30,
      primarySegment: "integrations",
    },
  },
  {
    id: "organization",
    segments: ["settings"] as const,
    auditPrefix: "org.profile",
    nav: { navKey: "settings", order: 40, primarySegment: "settings" },
  },
] as const satisfies readonly OrgAdminCapability[]

/** i18n key for the workbench overview entry (no segment). */
export const ORG_ADMIN_OVERVIEW_NAV_KEY = "overview" as const

/** Canonical IAM/ERP/governance event namespaces (also used by audit + delivery). */
export const ORG_ADMIN_EVENT_NAMESPACES = [
  "iam",
  "org",
  "erp",
  "governance",
  "integration",
  "workflow",
  "system",
] as const satisfies readonly OrgAdminEventNamespace[]

const SEGMENT_LIST: readonly string[] = ORG_ADMIN_CAPABILITIES.flatMap(
  (capability) => [...capability.segments]
)
const SEGMENT_SET = new Set(SEGMENT_LIST)

const SEGMENT_TO_CAPABILITY = new Map<string, OrgAdminCapability>()
for (const capability of ORG_ADMIN_CAPABILITIES) {
  for (const segment of capability.segments) {
    SEGMENT_TO_CAPABILITY.set(segment, capability)
  }
}

const NAMESPACE_SET = new Set<string>(ORG_ADMIN_EVENT_NAMESPACES)

/** Sorted, deduplicated list of segments allowed under `/o/{slug}/admin/{segment}`. */
export function getAllowedAdminSegments(): readonly string[] {
  return [...SEGMENT_SET].sort()
}

export function getCapabilityForSegment(
  segment: string
): OrgAdminCapability | null {
  return SEGMENT_TO_CAPABILITY.get(segment) ?? null
}

export function getCapabilityById(
  id: OrgAdminCapabilityId
): OrgAdminCapability | null {
  return (
    ORG_ADMIN_CAPABILITIES.find((capability) => capability.id === id) ?? null
  )
}

/**
 * Locale-internal pathname for the org admin workbench. `"overview"` resolves
 * to the workbench root; other values must be a registered admin segment.
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
  if (!SEGMENT_SET.has(section)) {
    throw new Error(`organizationAdminPath: unknown admin segment "${section}"`)
  }
  return `${base}/${section}` as AppPath
}

/** Validates the second path segment under `/o/.../admin/` for sanitizers. */
export function isAllowedOrgAdminSegment(segment: string): boolean {
  return SEGMENT_SET.has(segment)
}

/** Sidebar items for the workbench, in stable order (excludes overview). */
export function buildOrgAdminNav(orgSlug: string): readonly OrgAdminNavItem[] {
  const items: OrgAdminNavItem[] = []
  for (const capability of ORG_ADMIN_CAPABILITIES) {
    if (!capability.nav) continue
    items.push({
      capabilityId: capability.id,
      href: organizationAdminPath(orgSlug, capability.nav.primarySegment),
      navKey: capability.nav.navKey as OrgAdminNavKey,
      order: capability.nav.order,
    })
  }
  return items.sort((a, b) => a.order - b.order)
}

/** Full i18n key for a capability/overview nav entry. */
export function orgAdminNavLabelKey(navKey: string): string {
  return `${ORG_ADMIN_NAV_NAMESPACE}.${navKey}`
}

/**
 * Audit-action namespace gate. New audit actions must start with one of
 * {@link ORG_ADMIN_EVENT_NAMESPACES} followed by `.`.
 */
export function isAllowedAuditAction(action: string): boolean {
  const dot = action.indexOf(".")
  if (dot <= 0) return false
  return NAMESPACE_SET.has(action.slice(0, dot))
}
