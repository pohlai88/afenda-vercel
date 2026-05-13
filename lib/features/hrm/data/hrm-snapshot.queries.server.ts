import "server-only"

import { and, count, eq, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmEmployee } from "#lib/db/schema"

import {
  countApprovedUnpaidClaimsForOrg,
  countPendingClaimsForOrg,
} from "./claim.queries.server"
import {
  getCompliancePressureAggregateForOrg,
  getHrmRailPressureCounts,
} from "./hrm-rail-pressure.queries.server"
import { listPayrollPeriodsForOrg } from "./payroll.queries.server"

export type HrmSnapshotBoard = {
  readonly activeEmployeeCount: number
  readonly pendingLeaveApprovals: number
  readonly pendingPayrollLockApprovals: number
  readonly complianceSubmittedAwaiting: number
  readonly complianceFailed: number
  readonly pendingClaimSubmissions: number
  readonly approvedUnpaidClaims: number
  readonly latestPayrollPeriod: {
    readonly id: string
    readonly periodStart: string
    readonly periodEnd: string
    readonly state: string
    readonly currency: string
    readonly rulePackVersion: string | null
  } | null
}

/**
 * Read-only HR snapshot for the dense dashboard projection (Tier B).
 * Composes existing rail aggregates with lightweight claim + headcount reads.
 */
export async function getHrmSnapshotBoard(
  organizationId: string
): Promise<HrmSnapshotBoard> {
  const [
    rail,
    complianceRaw,
    activeEmployeeCount,
    pendingClaimSubmissions,
    approvedUnpaidClaims,
    periods,
  ] = await Promise.all([
    getHrmRailPressureCounts(organizationId),
    getCompliancePressureAggregateForOrg(organizationId),
    countActiveEmployeesForOrg(organizationId),
    countPendingClaimsForOrg(organizationId),
    countApprovedUnpaidClaimsForOrg(organizationId),
    listPayrollPeriodsForOrg(organizationId),
  ])

  const latest = periods[0]

  return {
    activeEmployeeCount,
    pendingLeaveApprovals: rail.leave?.count ?? 0,
    pendingPayrollLockApprovals: rail.payroll?.count ?? 0,
    complianceSubmittedAwaiting: complianceRaw.submittedAwaitingCount,
    complianceFailed: complianceRaw.failedCount,
    pendingClaimSubmissions,
    approvedUnpaidClaims,
    latestPayrollPeriod: latest
      ? {
          id: latest.id,
          periodStart: latest.periodStart,
          periodEnd: latest.periodEnd,
          state: latest.state,
          currency: latest.currency,
          rulePackVersion: latest.rulePackVersion,
        }
      : null,
  }
}

async function countActiveEmployeesForOrg(
  organizationId: string
): Promise<number> {
  const [row] = await db
    .select({ n: count(hrmEmployee.id) })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        isNull(hrmEmployee.archivedAt)
      )
    )
  return Number(row?.n ?? 0)
}
