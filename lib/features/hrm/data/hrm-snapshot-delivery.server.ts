import "server-only"

import { and, count, eq, gte, isNotNull, isNull, sql } from "drizzle-orm"

import { writeIamAuditEvent } from "#lib/auth"
import { db } from "#lib/db"
import { hrmEmployee, hrmEmploymentContract } from "#lib/db/schema"
import type {
  CronTickInput,
  CronTickScannedEmittedSummary,
} from "#lib/erp/cron-tick.shared"

import { getHrmSnapshotBoard } from "./hrm-snapshot.queries.server"
import {
  HRM_SNAPSHOT_DELIVERY_AUDIT_ACTION,
  HRM_SNAPSHOT_DELIVERY_BATCH_LIMIT,
  shouldRunHrmSnapshotDelivery,
} from "./hrm-snapshot-delivery.shared"

export type HrmSnapshotDeliveryTickSummary = CronTickScannedEmittedSummary & {
  readonly cadence: "weekly" | "monthly" | "skipped"
  readonly skippedWrongSchedule: boolean
}

async function listOrganizationsWithActiveEmployees(
  batchLimit: number
): Promise<readonly { organizationId: string }[]> {
  return db
    .selectDistinct({ organizationId: hrmEmployee.organizationId })
    .from(hrmEmployee)
    .where(isNull(hrmEmployee.archivedAt))
    .limit(batchLimit)
}

async function countTerminationsInWindow(
  organizationId: string,
  sinceIso: string
): Promise<number> {
  const [row] = await db
    .select({ n: count(hrmEmploymentContract.id) })
    .from(hrmEmploymentContract)
    .where(
      and(
        eq(hrmEmploymentContract.organizationId, organizationId),
        isNotNull(hrmEmploymentContract.terminationDate),
        gte(hrmEmploymentContract.terminationDate, sql`${sinceIso}::date`)
      )
    )
  return Number(row?.n ?? 0)
}

function turnoverWindowStartIso(
  now: Date,
  cadence: "weekly" | "monthly"
): string {
  const d = new Date(now)
  if (cadence === "weekly") {
    d.setUTCDate(d.getUTCDate() - 7)
  } else {
    d.setUTCMonth(d.getUTCMonth() - 1)
  }
  return d.toISOString().slice(0, 10)
}

/**
 * Scheduled HR snapshot delivery — records headcount + turnover summary per org
 * via IAM audit (email channel deferred; metadata is the operator contract).
 */
export async function runHrmSnapshotDeliveryTick(
  input: CronTickInput & { readonly cadence: "weekly" | "monthly" }
): Promise<HrmSnapshotDeliveryTickSummary> {
  const now = input.now ?? new Date()
  if (!shouldRunHrmSnapshotDelivery(now, input.cadence)) {
    return {
      scanned: 0,
      emitted: 0,
      cadence: "skipped",
      skippedWrongSchedule: true,
    }
  }

  const orgs = await listOrganizationsWithActiveEmployees(
    input.batchLimit ?? HRM_SNAPSHOT_DELIVERY_BATCH_LIMIT
  )
  const sinceIso = turnoverWindowStartIso(now, input.cadence)
  let emitted = 0

  for (const { organizationId } of orgs) {
    const [board, terminations] = await Promise.all([
      getHrmSnapshotBoard(organizationId),
      countTerminationsInWindow(organizationId, sinceIso),
    ])

    try {
      await writeIamAuditEvent({
        action: HRM_SNAPSHOT_DELIVERY_AUDIT_ACTION,
        actorUserId: null,
        organizationId,
        resourceType: "hrm_snapshot",
        resourceId: organizationId,
        metadata: {
          cadence: input.cadence,
          activeEmployeeCount: board.activeEmployeeCount,
          terminationsInWindow: terminations,
          pendingLeaveApprovals: board.pendingLeaveApprovals,
          pendingClaimSubmissions: board.pendingClaimSubmissions,
          complianceFailed: board.complianceFailed,
          latestPayrollState: board.latestPayrollPeriod?.state ?? null,
        },
      })
      emitted += 1
    } catch {
      // best-effort per org
    }
  }

  return {
    scanned: orgs.length,
    emitted,
    cadence: input.cadence,
    skippedWrongSchedule: false,
  }
}
