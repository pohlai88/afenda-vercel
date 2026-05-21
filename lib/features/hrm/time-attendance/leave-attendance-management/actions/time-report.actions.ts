"use server"

import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmApproval, hrmEmployee, hrmTimeReport } from "#lib/db/schema"
import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"

import { HRM_TIME_REPORT_OVERTIME_RETIRED_MESSAGE } from "../data/time-report-policy.shared"
import { buildTimeReportApprovalSnapshot } from "../data/time-report-approval-snapshot.shared"
import { requireHrmAdmin } from "../../../_module-governance/hrm-admin-guard.server"
import {
  HRM_TIME_REPORT_APPROVAL_SUBJECT_KIND,
  cancelTimeReportFormSchema,
  submitTimeReportFormSchema,
} from "../schemas/time-report.schema"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type {
  CancelTimeReportFormState,
  TimeReportMutationFormState,
} from "../../../types"

function revalidateLeaveAndTimeReports() {
  revalidatePath(toLocaleOrgAppsRevalidatePattern("/hrm/leave"), "layout")
  revalidatePath(
    toLocaleOrgAppsRevalidatePattern("/hrm/employees/[employeeId]"),
    "page"
  )
}

/**
 * Tier B (admin-gated) — submits a business-trip time report on behalf of an
 * employee. Creates `hrm_time_report` + pending `hrm_approval`.
 * Overtime claims use Overtime Management — not LAM time reports.
 * Audit: `erp.hrm.time_report.create` + `erp.hrm.approval.request`.
 */
export async function submitTimeReportAction(
  _prev: TimeReportMutationFormState | undefined,
  formData: FormData
): Promise<TimeReportMutationFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const parsed = submitTimeReportFormSchema.safeParse({
    employeeId: formData.get("employeeId"),
    reportKind: formData.get("reportKind"),
    workDate: formData.get("workDate") || null,
    overtimeMinutes: formData.get("overtimeMinutes") || null,
    tripStartDate: formData.get("tripStartDate") || null,
    tripEndDate: formData.get("tripEndDate") || null,
    destination: formData.get("destination") || null,
    reason: formData.get("reason") || null,
  })

  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      form: parsed.error.issues[0]?.message,
      employeeId: fe.employeeId?.[0],
      reportKind: fe.reportKind?.[0],
      workDate: fe.workDate?.[0],
      overtimeMinutes: fe.overtimeMinutes?.[0],
      tripStartDate: fe.tripStartDate?.[0],
      tripEndDate: fe.tripEndDate?.[0],
    })
  }

  const data = parsed.data

  if (data.reportKind === "overtime") {
    return hrmActionFailure({
      reportKind: HRM_TIME_REPORT_OVERTIME_RETIRED_MESSAGE,
    })
  }

  const employee = await db.query.hrmEmployee.findFirst({
    where: and(
      eq(hrmEmployee.id, data.employeeId),
      eq(hrmEmployee.organizationId, organizationId)
    ),
    columns: {
      id: true,
      employeeNumber: true,
      legalName: true,
      archivedAt: true,
    },
  })

  if (!employee) {
    return hrmActionFailure({ employeeId: "Employee not found." })
  }
  if (employee.archivedAt) {
    return hrmActionFailure({
      employeeId: "Cannot submit a time report for an archived employee.",
    })
  }

  const reportId = crypto.randomUUID()
  const approvalId = crypto.randomUUID()
  const now = new Date()

  const snapshot = buildTimeReportApprovalSnapshot({
    reportKind: data.reportKind,
    employeeId: employee.id,
    employeeNumber: employee.employeeNumber,
    employeeFullName: employee.legalName,
    workDate: null,
    overtimeMinutes: null,
    tripStartDate: data.tripStartDate ?? null,
    tripEndDate: data.tripEndDate ?? null,
    destination: data.destination ?? null,
    reason: data.reason ?? null,
    requestedAt: now,
  })

  await db.transaction(async (tx) => {
    await tx.insert(hrmApproval).values({
      id: approvalId,
      organizationId,
      subjectKind: HRM_TIME_REPORT_APPROVAL_SUBJECT_KIND,
      subjectId: reportId,
      state: "pending",
      requestedByUserId: userId,
      snapshot,
      createdByUserId: userId,
      updatedByUserId: userId,
    })

    await tx.insert(hrmTimeReport).values({
      id: reportId,
      organizationId,
      employeeId: data.employeeId,
      reportKind: data.reportKind,
      workDate: null,
      overtimeMinutes: null,
      tripStartDate: data.tripStartDate!,
      tripEndDate: data.tripEndDate!,
      destination: data.destination ?? null,
      reason: data.reason ?? null,
      state: "submitted",
      currentApprovalId: approvalId,
      createdByUserId: userId,
      updatedByUserId: userId,
    })
  })

  await writeIamAuditEventFromNextHeaders({
    action: "erp.hrm.time_report.create",
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_time_report",
    resourceId: reportId,
    metadata: {
      employeeId: data.employeeId,
      reportKind: data.reportKind,
    },
  })

  await writeIamAuditEventFromNextHeaders({
    action: "erp.hrm.approval.request",
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_approval",
    resourceId: approvalId,
    metadata: {
      subjectKind: HRM_TIME_REPORT_APPROVAL_SUBJECT_KIND,
      subjectId: reportId,
    },
  })

  revalidateLeaveAndTimeReports()
  return { ok: true, reportId }
}

/**
 * Tier B — cancels a submitted or approved time report; cancels pending approval.
 * Audit: `erp.hrm.time_report.cancel` (+ `erp.hrm.approval.cancel` if pending).
 */
export async function cancelTimeReportAction(
  _prev: CancelTimeReportFormState | undefined,
  formData: FormData
): Promise<CancelTimeReportFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const parsed = cancelTimeReportFormSchema.safeParse({
    reportId: formData.get("reportId"),
  })

  if (!parsed.success) {
    return hrmActionFailure({
      reportId: parsed.error.issues[0]?.message,
    })
  }

  const { reportId } = parsed.data

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
    return hrmActionFailure({ reportId: "Time report not found." })
  }

  const cancellable = ["submitted", "approved"]
  if (!cancellable.includes(row.state)) {
    return hrmActionFailure({
      reportId: `Cannot cancel a time report with state "${row.state}".`,
    })
  }

  const now = new Date()

  await db.transaction(async (tx) => {
    await tx
      .update(hrmTimeReport)
      .set({ state: "cancelled", updatedAt: now, updatedByUserId: userId })
      .where(eq(hrmTimeReport.id, reportId))

    if (row.currentApprovalId) {
      const approval = await tx.query.hrmApproval.findFirst({
        where: eq(hrmApproval.id, row.currentApprovalId),
        columns: { id: true, state: true },
      })
      if (approval?.state === "pending") {
        await tx
          .update(hrmApproval)
          .set({
            state: "cancelled",
            decisionByUserId: userId,
            decisionAt: now,
            decisionNote: "Time report cancelled.",
            updatedAt: now,
            updatedByUserId: userId,
          })
          .where(eq(hrmApproval.id, row.currentApprovalId))
      }
    }
  })

  await writeIamAuditEventFromNextHeaders({
    action: "erp.hrm.time_report.cancel",
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_time_report",
    resourceId: reportId,
    metadata: {
      previousState: row.state,
      employeeId: row.employeeId,
    },
  })

  if (row.currentApprovalId) {
    await writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.approval.cancel",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_approval",
      resourceId: row.currentApprovalId,
      metadata: {
        subjectKind: HRM_TIME_REPORT_APPROVAL_SUBJECT_KIND,
        subjectId: reportId,
      },
    })
  }

  revalidateLeaveAndTimeReports()
  return { ok: true, reportId }
}
