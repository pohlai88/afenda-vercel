import { describe, expect, it } from "vitest"

import {
  ORG_ADMIN_RAIL_PRESSURE_THRESHOLDS,
  deriveOrgAdminIntegrationsPressure,
  deriveOrgAdminMembersPressure,
  type IntegrationsPressureInput,
  type InvitationPressureInput,
} from "#features/org-admin/data/org-admin-rail-pressure.shared"

/**
 * Phase 2 of the Working Memory Rail (`docs/_draft/working-memory-rail-plan.md`)
 * locks two doctrines:
 *
 *   1. Empty slots **must** hide (conditional density). A zero-pressure
 *      derivation returns `null`, not `{ count: 0, tone: "default" }`.
 *   2. Pressure badges carry **semantic tone**. Operators read color
 *      before number — `attention` / `critical` must reflect threshold
 *      crossings (age + count) rather than arbitrary mappings.
 *
 * Each test below pins one boundary so changing a threshold constant
 * requires updating a named test (and reviewing the policy intent).
 * The threshold helpers stay pure — no DB, no `server-only`, no clock
 * reads — so this entire file runs in the default Node Vitest pool.
 */

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000

const STALE_INVITATION_BOUNDARY_MS =
  ORG_ADMIN_RAIL_PRESSURE_THRESHOLDS.invitationStaleDays * DAY_MS

const INTEGRATION_CRITICAL_BOUNDARY_MS =
  ORG_ADMIN_RAIL_PRESSURE_THRESHOLDS.integrationFailureCriticalAgeHours *
  HOUR_MS

const INVITATION_COUNT_CRITICAL_THRESHOLD =
  ORG_ADMIN_RAIL_PRESSURE_THRESHOLDS.invitationCountCriticalThreshold

function invitationInput(
  overrides: Partial<InvitationPressureInput> = {}
): InvitationPressureInput {
  return {
    pendingCount: 0,
    oldestPendingAgeMs: null,
    ...overrides,
  }
}

function integrationsInput(
  overrides: Partial<IntegrationsPressureInput> = {}
): IntegrationsPressureInput {
  return {
    activeImportJobsCount: 0,
    recentFailedJobsCount: 0,
    recentFailedDeliveriesCount: 0,
    oldestFailureAgeMs: null,
    ...overrides,
  }
}

describe("deriveOrgAdminMembersPressure", () => {
  it("returns null when there are no pending invitations", () => {
    expect(deriveOrgAdminMembersPressure(invitationInput())).toBeNull()
  })

  it("returns null even when oldestPendingAgeMs is set but count is zero", () => {
    // Stale-age signal alone never resurrects an empty badge — the queue
    // is empty, so the rail stays calm.
    expect(
      deriveOrgAdminMembersPressure(
        invitationInput({
          oldestPendingAgeMs: STALE_INVITATION_BOUNDARY_MS * 2,
        })
      )
    ).toBeNull()
  })

  it("returns attention when fresh pending invitations exist", () => {
    const badge = deriveOrgAdminMembersPressure(
      invitationInput({ pendingCount: 2, oldestPendingAgeMs: HOUR_MS })
    )
    expect(badge).toEqual({ count: 2, tone: "attention" })
  })

  it("returns critical when oldest pending invitation crosses the staleness boundary", () => {
    const badge = deriveOrgAdminMembersPressure(
      invitationInput({
        pendingCount: 1,
        oldestPendingAgeMs: STALE_INVITATION_BOUNDARY_MS,
      })
    )
    expect(badge).toEqual({ count: 1, tone: "critical" })
  })

  it("returns critical when pending count crosses the burst threshold even if all rows are fresh", () => {
    const badge = deriveOrgAdminMembersPressure(
      invitationInput({
        pendingCount: INVITATION_COUNT_CRITICAL_THRESHOLD,
        oldestPendingAgeMs: HOUR_MS,
      })
    )
    expect(badge?.tone).toBe("critical")
    expect(badge?.count).toBe(INVITATION_COUNT_CRITICAL_THRESHOLD)
  })

  it("stays attention just below the burst threshold", () => {
    const badge = deriveOrgAdminMembersPressure(
      invitationInput({
        pendingCount: INVITATION_COUNT_CRITICAL_THRESHOLD - 1,
        oldestPendingAgeMs: HOUR_MS,
      })
    )
    expect(badge?.tone).toBe("attention")
  })
})

describe("deriveOrgAdminIntegrationsPressure", () => {
  it("returns null when neither active jobs nor recent failures exist", () => {
    expect(deriveOrgAdminIntegrationsPressure(integrationsInput())).toBeNull()
  })

  it("returns default tone when only in-flight jobs are present (informational)", () => {
    const badge = deriveOrgAdminIntegrationsPressure(
      integrationsInput({ activeImportJobsCount: 2 })
    )
    expect(badge).toEqual({ count: 2, tone: "default" })
  })

  it("returns attention when a recent failure exists below the critical SLA", () => {
    const badge = deriveOrgAdminIntegrationsPressure(
      integrationsInput({
        recentFailedJobsCount: 1,
        oldestFailureAgeMs: HOUR_MS,
      })
    )
    expect(badge).toEqual({ count: 1, tone: "attention" })
  })

  it("escalates to critical when a failure has aged past the SLA boundary", () => {
    const badge = deriveOrgAdminIntegrationsPressure(
      integrationsInput({
        recentFailedDeliveriesCount: 1,
        oldestFailureAgeMs: INTEGRATION_CRITICAL_BOUNDARY_MS,
      })
    )
    expect(badge).toEqual({ count: 1, tone: "critical" })
  })

  it("combines failures + active work into a single count while tone reflects worst state", () => {
    // Three deliveries failed two hours ago (attention tier) and four
    // jobs are currently in flight. The badge surfaces a single integer
    // so operators see the integration is BOTH working AND broken at once.
    const badge = deriveOrgAdminIntegrationsPressure(
      integrationsInput({
        activeImportJobsCount: 4,
        recentFailedDeliveriesCount: 3,
        oldestFailureAgeMs: 2 * HOUR_MS,
      })
    )
    expect(badge).toEqual({ count: 7, tone: "attention" })
  })

  it("treats null oldestFailureAgeMs as not-yet-critical even when failures exist", () => {
    // Defensive: the query layer always populates oldestFailureAgeMs when
    // failures > 0, but if a future change ever decouples them, the
    // helper must not throw.
    const badge = deriveOrgAdminIntegrationsPressure(
      integrationsInput({
        recentFailedJobsCount: 1,
        oldestFailureAgeMs: null,
      })
    )
    expect(badge?.tone).toBe("attention")
  })
})
