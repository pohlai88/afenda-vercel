import "server-only"

import { and, count, eq, gte } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmApproval, hrmAttendanceDay } from "#lib/db/schema"

import { PAYROLL_PERIOD_LOCK_SUBJECT_KIND } from "../schemas/payroll-period.schema"

const LEAVE_REQUEST_SUBJECT_KIND = "leave_request" as const
const CLAIM_SUBJECT_KIND = "claim" as const
const TIME_REPORT_SUBJECT_KIND = "time_report" as const

export type HrmOperatorOrgSnapshot = {
  readonly pendingLeaveApprovals: number
  readonly pendingClaimApprovals: number
  readonly pendingPayrollLockApprovals: number
  readonly pendingTimeReportApprovals: number
  readonly openAttendanceDays: number
}

/**
 * Org-scoped workforce snapshot for Lynx operator tools — read-only aggregates.
 */
export async function getHrmOperatorOrgSnapshot(
  organizationId: string
): Promise<HrmOperatorOrgSnapshot> {
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - 45)

  const [leaveRow, claimRow, payrollLockRow, timeReportRow, attendanceRow] =
    await Promise.all([
      db
        .select({ c: count() })
        .from(hrmApproval)
        .where(
          and(
            eq(hrmApproval.organizationId, organizationId),
            eq(hrmApproval.state, "pending"),
            eq(hrmApproval.subjectKind, LEAVE_REQUEST_SUBJECT_KIND)
          )
        ),
      db
        .select({ c: count() })
        .from(hrmApproval)
        .where(
          and(
            eq(hrmApproval.organizationId, organizationId),
            eq(hrmApproval.state, "pending"),
            eq(hrmApproval.subjectKind, CLAIM_SUBJECT_KIND)
          )
        ),
      db
        .select({ c: count() })
        .from(hrmApproval)
        .where(
          and(
            eq(hrmApproval.organizationId, organizationId),
            eq(hrmApproval.state, "pending"),
            eq(hrmApproval.subjectKind, PAYROLL_PERIOD_LOCK_SUBJECT_KIND)
          )
        ),
      db
        .select({ c: count() })
        .from(hrmApproval)
        .where(
          and(
            eq(hrmApproval.organizationId, organizationId),
            eq(hrmApproval.state, "pending"),
            eq(hrmApproval.subjectKind, TIME_REPORT_SUBJECT_KIND)
          )
        ),
      db
        .select({ c: count() })
        .from(hrmAttendanceDay)
        .where(
          and(
            eq(hrmAttendanceDay.organizationId, organizationId),
            eq(hrmAttendanceDay.state, "open"),
            gte(
              hrmAttendanceDay.attendanceDate,
              since.toISOString().slice(0, 10)
            )
          )
        ),
    ])

  return {
    pendingLeaveApprovals: Number(leaveRow[0]?.c ?? 0),
    pendingClaimApprovals: Number(claimRow[0]?.c ?? 0),
    pendingPayrollLockApprovals: Number(payrollLockRow[0]?.c ?? 0),
    pendingTimeReportApprovals: Number(timeReportRow[0]?.c ?? 0),
    openAttendanceDays: Number(attendanceRow[0]?.c ?? 0),
  }
}
