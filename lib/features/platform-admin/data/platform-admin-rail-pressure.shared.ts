/**
 * Pure threshold derivations for platform-admin rail nav badges.
 *
 * Doctrine — Phase 2 of the Working Memory Rail
 * (`docs/_draft/working-memory-rail-plan.md` §10):
 *
 *   > Pressure badges carry semantic tone, not raw integers.
 *   > `tone: "default" | "attention" | "critical"` is mandatory in
 *   > Phase 2 builders, derived inside
 *   > `<module>-rail-pressure.queries.server.ts` via threshold rules
 *   > (count + age buckets + SLA buckets). Operators read tone first.
 *
 * The platform-admin operator is the **cross-tenant** operator. The
 * pressure surface here intentionally avoids leaking per-tenant noise:
 *
 *   - `users` — currently restricted accounts (active bans). Bans are
 *     state, not pressure, but the badge keeps the operator aware that
 *     access is being denied; an imminent expiry escalates because the
 *     operator may need to decide whether to extend before auto-unban.
 *   - `organizations` — **orphan tenancies**: orgs without any owner /
 *     admin member. These are structurally broken and actively block
 *     downstream administrative work. Aging escalates because the
 *     operator needs manual intervention to unblock the tenant.
 *
 * These helpers translate aggregated raw stats into a
 * `PlatformAdminRailPressureBadge | null`. They are deliberately:
 *
 *   - **Pure** — no DB, no `server-only`, no time-of-day reads. The
 *     query layer (`platform-admin-rail-pressure.queries.server.ts`)
 *     snapshots `now` and aggregates raw stats; this module turns them
 *     into UI semantics.
 *   - **Conditional** — `null` means *no badge renders*. Zero pressure
 *     is silence, not a `0` chrome dot. Conditional density is the
 *     rail's architectural property
 *     (`working-memory-rail-plan.md` §3.5).
 *   - **Unit-testable** — every threshold boundary has a deterministic
 *     test in `tests/unit/platform-admin-rail-pressure.test.ts`.
 *     Threshold tuning never requires a DB seed.
 *
 * Constants below are reviewed product policy. Adjusting them requires
 * updating the named tests in the same change.
 */

import type {
  PlatformAdminRailPressureBadge,
  PlatformAdminRailPressureTone,
} from "../types"

/**
 * Phase 2 threshold policy — platform-admin workbench. Constants live
 * alongside the helpers so a single file change captures both intent
 * and derivation.
 */
export const PLATFORM_ADMIN_RAIL_PRESSURE_THRESHOLDS = {
  /**
   * A temporary ban whose `banExpires` falls within this window
   * escalates the `users` badge to `critical`. The operator should
   * decide whether to extend or let auto-unban proceed; a 24h window
   * matches one global support shift cycle and lets long-running bans
   * (multi-day / permanent) stay calm.
   */
  banExpiringSoonHours: 24,
  /**
   * An orphan org older than this elevates the `organizations` badge
   * to `critical`. A fresh orphan during onboarding (just-created org
   * before invite acceptance) is expected; one that has sat without
   * any owner / admin for a week needs manual operator rescue.
   */
  orphanOrgCriticalAgeDays: 7,
} as const

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Aggregate inputs for the `users` nav badge. Ages are in
 * **milliseconds** so the threshold math stays unit-safe across queries
 * that snapshot wall-clock once.
 */
export type BanPressureInput = {
  /**
   * Count of active bans (`banned = true` AND
   * `banExpires IS NULL OR banExpires > now`).
   */
  readonly activeBanCount: number
  /**
   * Shortest time-to-expiry across active temporary bans in
   * milliseconds (positive = expiring in the future), or `null` when
   * all active bans are permanent (`banExpires IS NULL`) or there are
   * no active bans.
   */
  readonly soonestBanExpiryMs: number | null
}

/**
 * Aggregate inputs for the `organizations` nav badge.
 */
export type OrphanOrgPressureInput = {
  /**
   * Count of organizations with no `owner`/`admin` member. These are
   * structurally broken tenancies that cannot self-administer.
   */
  readonly orphanCount: number
  /**
   * Age (since `createdAt`) of the oldest orphan in milliseconds, or
   * `null` when `orphanCount === 0`.
   */
  readonly oldestOrphanAgeMs: number | null
}

/**
 * Derives the `users` nav badge from active-ban aggregates.
 *
 *   - `null`       when there are zero active bans (calm state).
 *   - `attention`  when one or more accounts are restricted and no
 *                  temporary ban is expiring inside the review window.
 *   - `critical`   when at least one temporary ban will auto-unban
 *                  inside `banExpiringSoonHours` — the operator owes a
 *                  decision before the system silently flips state.
 *
 * Active bans never resolve to `"default"` because they are operator
 * decisions worth surfacing; the rail keeps the policy visible while
 * any account is restricted.
 */
export function derivePlatformAdminBanPressure(
  input: BanPressureInput
): PlatformAdminRailPressureBadge | null {
  if (input.activeBanCount <= 0) {
    return null
  }

  const expiringSoonThresholdMs =
    PLATFORM_ADMIN_RAIL_PRESSURE_THRESHOLDS.banExpiringSoonHours * HOUR_MS

  const tone: PlatformAdminRailPressureTone =
    input.soonestBanExpiryMs !== null &&
    input.soonestBanExpiryMs >= 0 &&
    input.soonestBanExpiryMs <= expiringSoonThresholdMs
      ? "critical"
      : "attention"

  return { count: input.activeBanCount, tone }
}

/**
 * Derives the `organizations` nav badge from orphan-tenant aggregates.
 *
 *   - `null`       when no orphan organizations exist.
 *   - `attention`  when one or more orphans exist but the oldest is
 *                  still inside the onboarding-grace window.
 *   - `critical`   when the oldest orphan is older than
 *                  `orphanOrgCriticalAgeDays` — manual operator rescue
 *                  is overdue.
 *
 * Orphan orgs are always operator obligations — `"default"` is never
 * appropriate here.
 */
export function derivePlatformAdminOrphanOrgPressure(
  input: OrphanOrgPressureInput
): PlatformAdminRailPressureBadge | null {
  if (input.orphanCount <= 0) {
    return null
  }

  const criticalAgeMs =
    PLATFORM_ADMIN_RAIL_PRESSURE_THRESHOLDS.orphanOrgCriticalAgeDays * DAY_MS

  const tone: PlatformAdminRailPressureTone =
    input.oldestOrphanAgeMs !== null && input.oldestOrphanAgeMs >= criticalAgeMs
      ? "critical"
      : "attention"

  return { count: input.orphanCount, tone }
}
