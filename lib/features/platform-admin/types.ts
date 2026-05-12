import type { WorkbenchRailBadgeTone } from "#components/workbench"
import type { AppPath } from "#lib/i18n/locales.shared"

/** Stable capability identifiers for the global platform-admin surface. */
export type PlatformAdminCapabilityId =
  | "directory"
  | "organizations"
  | "audit"
  | "system"

/** Namespace prefix for `PlatformAdmin.nav.<key>` i18n entries. */
export const PLATFORM_ADMIN_NAV_NAMESPACE = "PlatformAdmin.nav" as const

/**
 * One row in the canonical platform-admin capability registry. Routes,
 * sidebar, breadcrumbs, sanitizer, redirects and contract tests are all
 * derived from this type.
 */
export type PlatformAdminCapability = {
  readonly id: PlatformAdminCapabilityId
  /** Path segments the capability owns under `/operator/{segment}`. */
  readonly segments: readonly string[]
  /** Required prefix for IAM audit actions written by this capability. */
  readonly auditPrefix: string
  /** Sidebar metadata. `null` means the capability has no dedicated nav entry. */
  readonly nav: {
    /** Suffix joined to {@link PLATFORM_ADMIN_NAV_NAMESPACE}. */
    readonly navKey: string
    readonly order: number
    /** Segment used to compute the nav `href` (must be in `segments`). */
    readonly primarySegment: string
  } | null
}

/** Concrete nav keys present in `PlatformAdmin.nav.*` (excludes overview/aria). */
export type PlatformAdminNavKey = "users" | "organizations"

export type PlatformAdminNavItem = {
  readonly capabilityId: PlatformAdminCapabilityId
  readonly href: AppPath
  readonly navKey: PlatformAdminNavKey
  readonly order: number
}

/** Public projection of a Better Auth user for the directory page. */
export type PlatformAdminUserSummary = {
  readonly id: string
  readonly email: string
  readonly name: string
  readonly emailVerified: boolean
  readonly role: string | null
  readonly banned: boolean
  readonly banReason: string | null
  readonly banExpires: Date | null
  readonly createdAt: Date
}

/** Pagination envelope for `listUsersForPlatformAdmin`. */
export type PlatformAdminUserPage = {
  readonly users: readonly PlatformAdminUserSummary[]
  readonly total: number
  readonly limit: number
  readonly offset: number
}

/** Cross-tenant organization summary for the `organizations` capability. */
export type PlatformAdminOrganizationSummary = {
  readonly id: string
  readonly name: string
  readonly slug: string
  readonly memberCount: number
  readonly createdAt: Date
}

/**
 * Semantic urgency carried by every platform-admin rail nav badge.
 * Re-exports the shell-level tone vocabulary so callers in
 * `lib/features/platform-admin/` never deep-import
 * `#components/workbench/rail`.
 *
 * Operators read tone (color) before number — the threshold helpers in
 * `platform-admin-rail-pressure.shared.ts` are the only legitimate
 * source of `attention` / `critical`. UI components must not invent
 * new tones.
 */
export type PlatformAdminRailPressureTone = WorkbenchRailBadgeTone

/**
 * Single nav badge payload. `count` is the integer surfaced in the UI
 * when present; `tone` is the semantic urgency operators read first.
 * A null entry in `PlatformAdminRailPressureMap` means the nav item
 * has no pressure — the badge hides entirely (conditional density).
 */
export type PlatformAdminRailPressureBadge = {
  readonly count: number
  readonly tone: PlatformAdminRailPressureTone
}

/**
 * Per-nav-key pressure map produced by `getPlatformAdminRailPressureCounts`.
 * Sparse by design — empty slots hide. The rail-slot builder is a pure
 * mapper from this shape onto `WorkbenchRailNavItem.badge`.
 *
 * Keyed by `PlatformAdminNavKey` (`users` / `organizations`); other
 * keys are absent unless wired in a later phase.
 */
export type PlatformAdminRailPressureMap = Partial<
  Record<PlatformAdminNavKey, PlatformAdminRailPressureBadge>
>
