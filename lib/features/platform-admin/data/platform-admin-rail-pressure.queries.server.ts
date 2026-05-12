import "server-only"

import { cache } from "react"
import {
  and,
  count,
  eq,
  gt,
  inArray,
  isNull,
  min,
  notExists,
  or,
  sql,
} from "drizzle-orm"

import { db } from "#lib/db"
import {
  neonAuthMember,
  neonAuthOrganization,
  neonAuthUser,
} from "#lib/db/schema-neon-auth"
import { logUnexpectedServerError } from "#lib/logger.server"

import type { PlatformAdminRailPressureMap } from "../types"

import {
  derivePlatformAdminBanPressure,
  derivePlatformAdminOrphanOrgPressure,
  type BanPressureInput,
  type OrphanOrgPressureInput,
} from "./platform-admin-rail-pressure.shared"

/**
 * Org roles that grant administrative authority over the tenant.
 * Sourced from Better Auth's organization-plugin role vocabulary.
 * Both `"owner"` and `"admin"` count as "the tenant has an
 * administrator" for orphan-detection purposes.
 */
const TENANT_ADMIN_ROLES = ["owner", "admin"] as const

/**
 * Read-side of Phase 2 rail pressure for the **platform-admin** (global
 * operator) workbench.
 *
 * Composes two index-friendly aggregates inside a single `Promise.all`:
 *
 *   1. **Active bans on `neon_auth.user`** — count + soonest expiry,
 *      filtered to currently-enforced bans (permanent OR
 *      `banExpires > now`).
 *   2. **Orphan organizations** — `neon_auth.organization` rows where
 *      no `neon_auth.member` has role `owner` or `admin`. The
 *      `NOT EXISTS` correlated sub-select keeps each tenant evaluated
 *      independently.
 *
 * The query layer is **the only place** that reads the wall clock; it
 * snapshots `now` once and passes derived durations to the pure
 * threshold helpers in `platform-admin-rail-pressure.shared.ts`. That
 * keeps the threshold tests deterministic and lets the snapshot
 * survive layout client-cache replays in lock-step with the layout
 * RSC payload.
 *
 * Wrapped in `React.cache` so multiple consumers in the same request
 * (the layout, Suspense-streamed enrichment, page-level reuse) hit a
 * single round trip. Layout-scoped Server Actions revalidate with
 * `revalidatePath(..., "layout")` so the rail badges refresh after
 * ban / role / unban mutations.
 *
 * Any sub-query failure is logged via `logUnexpectedServerError` and
 * degrades that concern to "no badge" — the operator workbench never
 * blocks on a transient DB hiccup.
 */
export const getPlatformAdminRailPressureCounts = cache(
  async (): Promise<PlatformAdminRailPressureMap> => {
    const now = new Date()

    const [banStats, orphanStats] = await Promise.all([
      queryBanPressure(now),
      queryOrphanOrgPressure(now),
    ])

    const map: PlatformAdminRailPressureMap = {}

    const users = derivePlatformAdminBanPressure(banStats)
    if (users !== null) {
      map.users = users
    }

    const organizations = derivePlatformAdminOrphanOrgPressure(orphanStats)
    if (organizations !== null) {
      map.organizations = organizations
    }

    return map
  }
)

/**
 * Single round-trip for the `users` nav badge. Counts currently-active
 * bans (permanent + future-dated) and captures the soonest expiry so
 * the threshold helper can escalate to `critical` when an auto-unban
 * is imminent.
 *
 * Active = `banned IS TRUE` AND (`banExpires IS NULL` OR `banExpires > now`).
 * `MIN(banExpires)` is computed over the same filter — permanent bans
 * (NULL `banExpires`) are excluded from the min by SQL semantics, so a
 * `null` result here means "all active bans are permanent (or there
 * are none)".
 */
async function queryBanPressure(now: Date): Promise<BanPressureInput> {
  try {
    const [row] = await db
      .select({
        activeBanCount: count(neonAuthUser.id),
        soonestExpiresAt: min(neonAuthUser.banExpires),
      })
      .from(neonAuthUser)
      .where(
        and(
          eq(neonAuthUser.banned, true),
          or(isNull(neonAuthUser.banExpires), gt(neonAuthUser.banExpires, now))
        )
      )

    const activeBanCount = Number(row?.activeBanCount ?? 0)
    const soonestBanExpiryMs = resolveDurationUntilMs(
      row?.soonestExpiresAt,
      now
    )

    return { activeBanCount, soonestBanExpiryMs }
  } catch (err) {
    logUnexpectedServerError(
      "platform-admin-rail-pressure: ban stats query failed",
      err
    )
    return { activeBanCount: 0, soonestBanExpiryMs: null }
  }
}

/**
 * Single round-trip for the `organizations` nav badge. Uses a
 * correlated `NOT EXISTS` sub-select against
 * `neon_auth.member` to find orgs with no administrative member.
 *
 * Drizzle's `notExists(...)` emits `NOT EXISTS (SELECT 1 …)` which the
 * planner can satisfy via the index on
 * `(member.organizationId, member.role)` (Better Auth's default
 * indexing). `MIN(o.createdAt)` over the same predicate yields the
 * oldest orphan so the threshold helper can escalate to `critical`
 * when a tenant has been sitting in limbo too long.
 */
async function queryOrphanOrgPressure(
  now: Date
): Promise<OrphanOrgPressureInput> {
  try {
    const [row] = await db
      .select({
        orphanCount: count(neonAuthOrganization.id),
        oldestCreatedAt: min(neonAuthOrganization.createdAt),
      })
      .from(neonAuthOrganization)
      .where(
        notExists(
          db
            .select({ presence: sql`1` })
            .from(neonAuthMember)
            .where(
              and(
                eq(neonAuthMember.organizationId, neonAuthOrganization.id),
                inArray(neonAuthMember.role, [...TENANT_ADMIN_ROLES])
              )
            )
        )
      )

    const orphanCount = Number(row?.orphanCount ?? 0)
    const oldestOrphanAgeMs = resolveAgeMs(row?.oldestCreatedAt, now)

    return { orphanCount, oldestOrphanAgeMs }
  } catch (err) {
    logUnexpectedServerError(
      "platform-admin-rail-pressure: orphan-org stats query failed",
      err
    )
    return { orphanCount: 0, oldestOrphanAgeMs: null }
  }
}

/**
 * Forward-looking duration: how many milliseconds until `value`
 * relative to `now`. Returns `null` when `value` is absent (permanent
 * state). Negative durations (already expired) clamp to `0` so the
 * threshold helper treats them as "expiring immediately" rather than
 * inverting sign semantics.
 */
function resolveDurationUntilMs(
  value: Date | null | undefined,
  now: Date
): number | null {
  if (!value) {
    return null
  }
  const ms = value.getTime() - now.getTime()
  return ms >= 0 ? ms : 0
}

/**
 * Backward-looking duration: how many milliseconds have elapsed since
 * `value`. Returns `null` when `value` is absent.
 */
function resolveAgeMs(
  value: Date | null | undefined,
  now: Date
): number | null {
  if (!value) {
    return null
  }
  const ageMs = now.getTime() - value.getTime()
  return ageMs >= 0 ? ageMs : 0
}
