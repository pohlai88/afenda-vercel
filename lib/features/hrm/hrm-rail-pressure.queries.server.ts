import "server-only"

import { cache } from "react"
import { and, count, eq, inArray, isNull, min } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmApproval, hrmComplianceEvidence } from "#lib/db/schema"
import { logUnexpectedServerError } from "#lib/logger.server"

import type { HrmRailPressureMap } from "./types"
import { PAYROLL_PERIOD_LOCK_SUBJECT_KIND } from "./payroll-compensation/payroll-processing/schemas/payroll-period.schema"

import { countPendingBenefitEnrollmentsForOrganization } from "./payroll-compensation/benefits-administration/data/benefit.queries.server"
import {
  deriveHrmBenefitsPressure,
  deriveHrmCompliancePressure,
  deriveHrmLeavePressure,
  deriveHrmPayrollPressure,
  type CompliancePressureInput,
  type LeavePressureInput,
  type PayrollPressureInput,
} from "./hrm-rail-pressure.shared"

/** Subject-kind discriminator for leave-decision approval rows. */
const LEAVE_REQUEST_SUBJECT_KIND = "leave_request" as const

/** Statutory-evidence submission states that count as pressure. */
const COMPLIANCE_SUBMITTED_STATE = "submitted" as const
const COMPLIANCE_FAILED_STATE = "failed" as const

/**
 * Read-side of Phase 2 rail pressure for the HRM workbench.
 *
 * Composes four index-friendly aggregates in a single `Promise.all`:
 *
 *   1. Pending leave-decision approvals (`hrm_approval` rows with
 *      `subjectKind = 'leave_request'`).
 *   2. Pending payroll-period lock approvals (`hrm_approval` rows with
 *      `subjectKind = 'payroll_period_lock'`).
 *   3. Statutory evidence rows awaiting bureau acknowledgement or in
 *      a failed delivery state (`hrm_compliance_evidence`).
 *   4. Pending benefit enrollments (`hrm_benefit_enrollment.state =
 *      'pending'`) for the Benefits workbench backlog badge.
 *
 * The query layer is **the only place** that reads the wall clock; it
 * snapshots `now` once and passes derived durations to the pure
 * threshold helpers in `hrm-rail-pressure.shared.ts`. That keeps the
 * threshold tests deterministic and lets the snapshot survive layout
 * client-cache replays in lock-step with the layout RSC payload.
 *
 * Wrapped in `React.cache` so multiple consumers in the same request
 * (the layout, Suspense-streamed enrichment, page-level reuse) hit a
 * single round trip. Layout-scoped Server Actions revalidate with
 * `revalidatePath(..., "layout")` so the rail badges refresh after
 * leave / payroll / compliance mutations.
 *
 * Any sub-query failure is logged via `logUnexpectedServerError` and
 * degrades that concern to "no badge" — the rail never blocks the
 * workbench shell on a transient DB hiccup.
 */
export const getHrmRailPressureCounts = cache(
  async (organizationId: string): Promise<HrmRailPressureMap> => {
    const now = new Date()

    const [leaveStats, payrollStats, complianceStats, benefitsPending] =
      await Promise.all([
        queryLeavePressure(organizationId, now),
        queryPayrollPressure(organizationId, now),
        queryCompliancePressure(organizationId, now),
        queryBenefitsPressure(organizationId),
      ])

    const map: HrmRailPressureMap = {}

    const leave = deriveHrmLeavePressure(leaveStats)
    if (leave !== null) {
      map.leave = leave
    }

    const payroll = deriveHrmPayrollPressure(payrollStats)
    if (payroll !== null) {
      map.payroll = payroll
    }

    const compliance = deriveHrmCompliancePressure(complianceStats)
    if (compliance !== null) {
      map.compliance = compliance
    }

    const benefits = deriveHrmBenefitsPressure({
      pendingEnrollmentCount: benefitsPending,
    })
    if (benefits !== null) {
      map.benefits = benefits
    }

    return map
  }
)

/**
 * Single round-trip for the `leave` nav badge. Counts pending leave
 * decisions and records the oldest `requestedAt` so the threshold
 * helper can choose `attention` vs `critical` by age.
 *
 * Index hit: `hrm_approval_org_state_approver_idx` covers
 * `(organizationId, state, currentApproverUserId)` — the `subjectKind`
 * filter is a residual predicate handled by the planner.
 */
async function queryLeavePressure(
  organizationId: string,
  now: Date
): Promise<LeavePressureInput> {
  try {
    const [row] = await db
      .select({
        pendingCount: count(hrmApproval.id),
        oldestRequestedAt: min(hrmApproval.requestedAt),
      })
      .from(hrmApproval)
      .where(
        and(
          eq(hrmApproval.organizationId, organizationId),
          eq(hrmApproval.state, "pending"),
          eq(hrmApproval.subjectKind, LEAVE_REQUEST_SUBJECT_KIND)
        )
      )

    return {
      pendingApprovalsCount: Number(row?.pendingCount ?? 0),
      oldestPendingAgeMs: resolveAgeMs(row?.oldestRequestedAt, now),
    }
  } catch (err) {
    logUnexpectedServerError(
      "hrm-rail-pressure: leave stats query failed",
      err,
      { organizationId }
    )
    return { pendingApprovalsCount: 0, oldestPendingAgeMs: null }
  }
}

/**
 * Single round-trip for the `payroll` nav badge. Same shape as the
 * leave aggregate but discriminated on `payroll_period_lock` subject
 * kind.
 */
async function queryPayrollPressure(
  organizationId: string,
  now: Date
): Promise<PayrollPressureInput> {
  try {
    const [row] = await db
      .select({
        pendingCount: count(hrmApproval.id),
        oldestRequestedAt: min(hrmApproval.requestedAt),
      })
      .from(hrmApproval)
      .where(
        and(
          eq(hrmApproval.organizationId, organizationId),
          eq(hrmApproval.state, "pending"),
          eq(hrmApproval.subjectKind, PAYROLL_PERIOD_LOCK_SUBJECT_KIND)
        )
      )

    return {
      pendingLockApprovalsCount: Number(row?.pendingCount ?? 0),
      oldestPendingAgeMs: resolveAgeMs(row?.oldestRequestedAt, now),
    }
  } catch (err) {
    logUnexpectedServerError(
      "hrm-rail-pressure: payroll stats query failed",
      err,
      { organizationId }
    )
    return { pendingLockApprovalsCount: 0, oldestPendingAgeMs: null }
  }
}

/**
 * Raw statutory-evidence aggregates for dashboards that need submitted vs
 * failed separately (rail badge combines them into one count).
 *
 * Submitted-but-not-acknowledged rows surface from `submissionState =
 * 'submitted'` AND `acknowledgedAt IS NULL` so the rail badge mirrors
 * the same gating the existing `hrm-compliance-aging-watch` cron uses.
 */
export async function getCompliancePressureAggregateForOrg(
  organizationId: string
): Promise<CompliancePressureInput> {
  const now = new Date()
  return queryCompliancePressure(organizationId, now)
}

async function queryBenefitsPressure(organizationId: string): Promise<number> {
  try {
    return await countPendingBenefitEnrollmentsForOrganization(organizationId)
  } catch (err) {
    logUnexpectedServerError(
      "hrm-rail-pressure: benefits pending enrollment query failed",
      err,
      { organizationId }
    )
    return 0
  }
}

async function queryCompliancePressure(
  organizationId: string,
  now: Date
): Promise<CompliancePressureInput> {
  try {
    const [submitted, failed] = await Promise.all([
      db
        .select({
          n: count(hrmComplianceEvidence.id),
          oldestSubmittedAt: min(hrmComplianceEvidence.updatedAt),
        })
        .from(hrmComplianceEvidence)
        .where(
          and(
            eq(hrmComplianceEvidence.organizationId, organizationId),
            inArray(hrmComplianceEvidence.submissionState, [
              COMPLIANCE_SUBMITTED_STATE,
            ]),
            isNull(hrmComplianceEvidence.acknowledgedAt)
          )
        )
        .then((rows) => ({
          count: Number(rows[0]?.n ?? 0),
          oldestSubmittedAt: rows[0]?.oldestSubmittedAt ?? null,
        })),

      db
        .select({ n: count(hrmComplianceEvidence.id) })
        .from(hrmComplianceEvidence)
        .where(
          and(
            eq(hrmComplianceEvidence.organizationId, organizationId),
            eq(hrmComplianceEvidence.submissionState, COMPLIANCE_FAILED_STATE)
          )
        )
        .then((rows) => Number(rows[0]?.n ?? 0)),
    ])

    return {
      submittedAwaitingCount: submitted.count,
      oldestSubmittedAgeMs: resolveAgeMs(submitted.oldestSubmittedAt, now),
      failedCount: failed,
    }
  } catch (err) {
    logUnexpectedServerError(
      "hrm-rail-pressure: compliance stats query failed",
      err,
      { organizationId }
    )
    return {
      submittedAwaitingCount: 0,
      oldestSubmittedAgeMs: null,
      failedCount: 0,
    }
  }
}

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
