import { describe, expect, it } from "vitest"

import {
  PLATFORM_ADMIN_RAIL_PRESSURE_THRESHOLDS,
  derivePlatformAdminBanPressure,
  derivePlatformAdminOrphanOrgPressure,
  type BanPressureInput,
  type OrphanOrgPressureInput,
} from "#features/platform-admin/data/platform-admin-rail-pressure.shared"

/**
 * Phase 2 of the Working Memory Rail (`docs/_draft/working-memory-rail-plan.md`)
 * locks two doctrines for every workbench:
 *
 *   1. Empty slots **must** hide (conditional density). A zero-pressure
 *      derivation returns `null`, not `{ count: 0, tone: "default" }`.
 *   2. Pressure badges carry **semantic tone**. Operators read color
 *      before number — `attention` / `critical` must reflect threshold
 *      crossings (count + age + SLA) rather than arbitrary mappings.
 *
 * Platform-admin's two pressure surfaces are global operator
 * obligations:
 *
 *   - **`users`** — currently restricted accounts (active bans). A
 *     temporary ban expiring inside the review window escalates
 *     because the operator owes a decision before silent auto-unban.
 *   - **`organizations`** — orphan tenancies (no owner/admin member).
 *     Structurally broken; aging escalates because manual rescue is
 *     overdue.
 *
 * These helpers stay pure — no DB, no `server-only`, no clock reads —
 * so this entire file runs in the default Node Vitest pool.
 */

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

const BAN_EXPIRING_SOON_BOUNDARY_MS =
  PLATFORM_ADMIN_RAIL_PRESSURE_THRESHOLDS.banExpiringSoonHours * HOUR_MS

const ORPHAN_ORG_CRITICAL_BOUNDARY_MS =
  PLATFORM_ADMIN_RAIL_PRESSURE_THRESHOLDS.orphanOrgCriticalAgeDays * DAY_MS

function banInput(overrides: Partial<BanPressureInput> = {}): BanPressureInput {
  return {
    activeBanCount: 0,
    soonestBanExpiryMs: null,
    ...overrides,
  }
}

function orphanInput(
  overrides: Partial<OrphanOrgPressureInput> = {}
): OrphanOrgPressureInput {
  return {
    orphanCount: 0,
    oldestOrphanAgeMs: null,
    ...overrides,
  }
}

describe("derivePlatformAdminBanPressure", () => {
  it("returns null when there are zero active bans (conditional density)", () => {
    expect(
      derivePlatformAdminBanPressure(
        banInput({ activeBanCount: 0, soonestBanExpiryMs: null })
      )
    ).toBeNull()
  })

  it("returns attention when bans are active and none expire soon", () => {
    expect(
      derivePlatformAdminBanPressure(
        banInput({
          activeBanCount: 2,
          soonestBanExpiryMs: BAN_EXPIRING_SOON_BOUNDARY_MS + 1,
        })
      )
    ).toEqual({ count: 2, tone: "attention" })
  })

  it("treats permanent-only bans as attention (no expiry tier crossed)", () => {
    expect(
      derivePlatformAdminBanPressure(
        banInput({ activeBanCount: 3, soonestBanExpiryMs: null })
      )
    ).toEqual({ count: 3, tone: "attention" })
  })

  it("escalates to critical exactly at the expiry boundary", () => {
    expect(
      derivePlatformAdminBanPressure(
        banInput({
          activeBanCount: 1,
          soonestBanExpiryMs: BAN_EXPIRING_SOON_BOUNDARY_MS,
        })
      )
    ).toEqual({ count: 1, tone: "critical" })
  })

  it("escalates to critical for a ban that is already past expiry (auto-unban imminent)", () => {
    expect(
      derivePlatformAdminBanPressure(
        banInput({ activeBanCount: 1, soonestBanExpiryMs: 0 })
      )
    ).toEqual({ count: 1, tone: "critical" })
  })
})

describe("derivePlatformAdminOrphanOrgPressure", () => {
  it("returns null when no orphan orgs exist", () => {
    expect(derivePlatformAdminOrphanOrgPressure(orphanInput())).toBeNull()
  })

  it("returns attention when fresh orphans exist (onboarding grace)", () => {
    expect(
      derivePlatformAdminOrphanOrgPressure(
        orphanInput({
          orphanCount: 2,
          oldestOrphanAgeMs: ORPHAN_ORG_CRITICAL_BOUNDARY_MS - 1,
        })
      )
    ).toEqual({ count: 2, tone: "attention" })
  })

  it("escalates to critical exactly at the orphan-age boundary", () => {
    expect(
      derivePlatformAdminOrphanOrgPressure(
        orphanInput({
          orphanCount: 1,
          oldestOrphanAgeMs: ORPHAN_ORG_CRITICAL_BOUNDARY_MS,
        })
      )
    ).toEqual({ count: 1, tone: "critical" })
  })

  it("treats orphan count > 0 with missing age as attention (fresh)", () => {
    expect(
      derivePlatformAdminOrphanOrgPressure(
        orphanInput({ orphanCount: 1, oldestOrphanAgeMs: null })
      )
    ).toEqual({ count: 1, tone: "attention" })
  })
})
