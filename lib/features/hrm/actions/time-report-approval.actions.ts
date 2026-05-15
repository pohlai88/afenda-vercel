"use server"

import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmApproval, hrmTimeReport } from "#lib/db/schema"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import { requireHrmAdmin } from "../data/hrm-admin-guard.server"
import {
  HRM_TIME_REPORT_APPROVAL_SUBJECT_KIND,
  timeReportApprovalDecisionSchema,
  timeReportRejectDecisionSchema,
} from "../schemas/time-report.schema"
import type { TimeReportApprovalFormState } from "../types"

function timeReportApprovalFailure(
  errors: Extract<TimeReportApprovalFormState, { ok: false }>["errors"]
): TimeReportApprovalFormState {
  return { ok: false, errors }
}

function revalidateLeaveAndTimeReports() {
  revalidatePath(toLocaleOrgDashboardRevalidatePattern("/hrm/leave"), "layout")
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern("/hrm/employees/[employeeId]"),
    "page"
  )
}

/**
 * Tier B — approves a submitted time report (OT / business trip).
 * Audit: `erp.hrm.approval.approve` with `subjectKind: time_report`.
 */
export async function approveTimeReportAction(
  _prev: TimeReportApprovalFormState | undefined,
  formData: FormData
): Promise<TimeReportApprovalFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) return timeReportApprovalFailure({ form: gate.error })
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const parsed = timeReportApprovalDecisionSchema.safeParse({
    reportId: formData.get("reportId"),
    decisionNote: formData.get("decisionNote") || null,
  })

  if (!parsed.success) {
    return timeReportApprovalFailure({
      reportId: parsed.error.issues[0]?.message,
    })
  }

  const { reportId, decisionNote } = parsed.data

  const row = await db.query.hrmTimeReport.findFirst({
    where: and(
      eq(hrmTimeReport.id, reportId),
      eq(hrmTimeReport.organizationId, organizationId)
    ),
    columns: {
      id: true,
      state: true,
      currentApprovalId: true,
      employeeId: true,
    },
  })

  if (!row) {
    return timeReportApprovalFailure({ reportId: "Time report not found." })
  }

  if (row.state !== "submitted") {
    return timeReportApprovalFailure({
      reportId: `Cannot approve a time report with state "${row.state}". Expected "submitted".`,
    })
  }

  const now = new Date()

  await db.transaction(async (tx) => {
    await tx
      .update(hrmTimeReport)
      .set({
        state: "approved",
        approvedByUserId: userId,
        approvedAt: now,
        updatedAt: now,
        updatedByUserId: userId,
      })
      .where(eq(hrmTimeReport.id, reportId))

    if (row.currentApprovalId) {
      await tx
        .update(hrmApproval)
        .set({
          state: "approved",
          decisionByUserId: userId,
          decisionAt: now,
          decisionNote,
          updatedAt: now,
          updatedByUserId: userId,
        })
        .where(eq(hrmApproval.id, row.currentApprovalId))
    }
  })

  await writeIamAuditEventFromNextHeaders({
    action: "erp.hrm.approval.approve",
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_approval",
    resourceId: row.currentApprovalId ?? reportId,
    metadata: {
      subjectKind: HRM_TIME_REPORT_APPROVAL_SUBJECT_KIND,
      subjectId: reportId,
      employeeId: row.employeeId,
    },
  })

  revalidateLeaveAndTimeReports()
  return { ok: true, reportId }
}

/**
 * Tier B — rejects a submitted time report.
 * Audit: `erp.hrm.approval.reject`.
 */
export async function rejectTimeReportAction(
  _prev: TimeReportApprovalFormState | undefined,
  formData: FormData
): Promise<TimeReportApprovalFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) return timeReportApprovalFailure({ form: gate.error })
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const parsed = timeReportRejectDecisionSchema.safeParse({
    reportId: formData.get("reportId"),
    rejectedReason: formData.get("rejectedReason"),
    decisionNote: formData.get("decisionNote") || null,
  })

  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return timeReportApprovalFailure({
      reportId: errs.reportId?.[0],
      rejectedReason: errs.rejectedReason?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const { reportId, rejectedReason, decisionNote } = parsed.data

  const row = await db.query.hrmTimeReport.findFirst({
    where: and(
      eq(hrmTimeReport.id, reportId),
      eq(hrmTimeReport.organizationId, organizationId)
    ),
    columns: {
      id: true,
      state: true,
      currentApprovalId: true,
      employeeId: true,
    },
  })

  if (!row) {
    return timeReportApprovalFailure({ reportId: "Time report not found." })
  }

  if (row.state !== "submitted") {
    return timeReportApprovalFailure({
      reportId: `Cannot reject a time report with state "${row.state}". Expected "submitted".`,
    })
  }

  const now = new Date()

  await db.transaction(async (tx) => {
    await tx
      .update(hrmTimeReport)
      .set({
        state: "rejected",
        rejectedReason,
        updatedAt: now,
        updatedByUserId: userId,
      })
      .where(eq(hrmTimeReport.id, reportId))

    if (row.currentApprovalId) {
      await tx
        .update(hrmApproval)
        .set({
          state: "rejected",
          decisionByUserId: userId,
          decisionAt: now,
          decisionNote,
          updatedAt: now,
          updatedByUserId: userId,
        })
        .where(eq(hrmApproval.id, row.currentApprovalId))
    }
  })

  await writeIamAuditEventFromNextHeaders({
    action: "erp.hrm.approval.reject",
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_approval",
    resourceId: row.currentApprovalId ?? reportId,
    metadata: {
      subjectKind: HRM_TIME_REPORT_APPROVAL_SUBJECT_KIND,
      subjectId: reportId,
      employeeId: row.employeeId,
      rejectedReason,
    },
  })

  revalidateLeaveAndTimeReports()
  return { ok: true, reportId }
}
