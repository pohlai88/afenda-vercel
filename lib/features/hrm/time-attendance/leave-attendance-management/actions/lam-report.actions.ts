"use server"

import { after } from "next/server"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { requireOrgSession } from "#lib/auth"
import { canUseErpPermission } from "#features/erp-rbac/server"

import { listRecentAttendanceEventsForOrg } from "../data/attendance.queries.server"
import {
  buildAttendanceEventsReportCsv,
  buildLeaveRequestsReportCsv,
} from "../data/lam-report-export.shared"
import { listAllLeaveRequestsForOrg } from "../data/leave-request.queries.server"
import { HRM_LAM_AUDIT } from "../hrm-lam.contract"

export async function exportLeaveRequestsReportAction(): Promise<
  { ok: true; csv: string; filename: string } | { ok: false; error: string }
> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const allowed = await canUseErpPermission({
    organizationId,
    userId,
    permission: { module: "hrm", object: "leave", function: "read" },
  })
  if (!allowed) {
    return { ok: false, error: "You are not authorized to export leave requests." }
  }

  const rows = await listAllLeaveRequestsForOrg(organizationId, { limit: 500 })
  const asOf = new Date().toISOString().slice(0, 10)
  const csv = buildLeaveRequestsReportCsv(rows)
  const filename = `leave-requests-${asOf}.csv`

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_LAM_AUDIT.report.leaveExport,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_leave_report",
      resourceId: `requests-${asOf}`,
      metadata: { rowCount: rows.length, format: "csv" },
    })
  )

  return { ok: true, csv, filename }
}

export async function exportAttendanceSummaryReportAction(): Promise<
  { ok: true; csv: string; filename: string } | { ok: false; error: string }
> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const allowed = await canUseErpPermission({
    organizationId,
    userId,
    permission: { module: "hrm", object: "attendance", function: "read" },
  })
  if (!allowed) {
    return {
      ok: false,
      error: "You are not authorized to export attendance events.",
    }
  }

  const rows = await listRecentAttendanceEventsForOrg(organizationId, {
    limit: 500,
  })
  const asOf = new Date().toISOString().slice(0, 10)
  const csv = buildAttendanceEventsReportCsv(rows)
  const filename = `attendance-events-${asOf}.csv`

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_LAM_AUDIT.report.attendanceExport,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_attendance_report",
      resourceId: `events-${asOf}`,
      metadata: { rowCount: rows.length, format: "csv" },
    })
  )

  return { ok: true, csv, filename }
}
