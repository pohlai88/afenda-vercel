import "server-only"

import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmApproval,
  hrmEmployee,
  hrmOvertimeCalculationSnapshot,
  hrmOvertimeRequest,
  hrmOvertimeType,
} from "#lib/db/schema"
import { OTM_REQUEST_APPROVAL_SUBJECT_KIND } from "../otm.contract"
import { readOtmApprovalStage } from "./otm-approval-routing.shared"
import { getOtmPolicyForOrg } from "./otm-policy.server"
import {
  hrmOtmDayCategorySchema,
  hrmOtmRequestStateSchema,
} from "../schemas/otm-workflow-state.shared"
import type { HrmOtmRequestState } from "../schemas/otm-workflow-state.shared"
import type {
  OtmAttendanceReconcileRow,
  OtmEmployeeChoiceRow,
  OtmEmployeeContextRow,
  OtmTypeChoiceRow,
  OrgOtmRequestRow,
} from "./otm.types.shared"

export type {
  OtmEmployeeChoiceRow,
  OtmEmployeeContextRow,
  OtmTypeChoiceRow,
  OrgOtmRequestRow,
} from "./otm.types.shared"

export async function listActiveOtmTypes(
  organizationId: string
): Promise<OtmTypeChoiceRow[]> {
  return db
    .select({
      id: hrmOvertimeType.id,
      code: hrmOvertimeType.code,
      label: hrmOvertimeType.label,
      dayCategory: hrmOvertimeType.dayCategory,
    })
    .from(hrmOvertimeType)
    .where(
      and(
        eq(hrmOvertimeType.organizationId, organizationId),
        isNull(hrmOvertimeType.archivedAt)
      )
    )
    .orderBy(asc(hrmOvertimeType.code))
}

export async function countActiveOtmTypes(
  organizationId: string
): Promise<number> {
  const rows = await listActiveOtmTypes(organizationId)
  return rows.length
}

export async function getOtmTypeForOrg(
  organizationId: string,
  overtimeTypeId: string
) {
  return db.query.hrmOvertimeType.findFirst({
    where: and(
      eq(hrmOvertimeType.organizationId, organizationId),
      eq(hrmOvertimeType.id, overtimeTypeId),
      isNull(hrmOvertimeType.archivedAt)
    ),
  })
}

export async function listActiveEmployeeChoicesForOtm(
  organizationId: string
): Promise<OtmEmployeeChoiceRow[]> {
  return db
    .select({
      id: hrmEmployee.id,
      employeeNumber: hrmEmployee.employeeNumber,
      legalName: hrmEmployee.legalName,
    })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        isNull(hrmEmployee.archivedAt)
      )
    )
    .orderBy(asc(hrmEmployee.employeeNumber))
}

export async function findOtmEmployeeForUser(
  organizationId: string,
  userId: string
): Promise<OtmEmployeeContextRow | null> {
  const row = await db.query.hrmEmployee.findFirst({
    where: and(
      eq(hrmEmployee.organizationId, organizationId),
      eq(hrmEmployee.linkedUserId, userId),
      isNull(hrmEmployee.archivedAt)
    ),
    columns: {
      id: true,
      employeeNumber: true,
      legalName: true,
      managerEmployeeId: true,
      hrOwnerEmployeeId: true,
      archivedAt: true,
    },
  })

  return row ?? null
}

export async function getOtmEmployeeForOrg(
  organizationId: string,
  employeeId: string
): Promise<OtmEmployeeContextRow | null> {
  const row = await db.query.hrmEmployee.findFirst({
    where: and(
      eq(hrmEmployee.organizationId, organizationId),
      eq(hrmEmployee.id, employeeId)
    ),
    columns: {
      id: true,
      employeeNumber: true,
      legalName: true,
      managerEmployeeId: true,
      hrOwnerEmployeeId: true,
      archivedAt: true,
    },
  })

  return row ?? null
}

export {
  resolveOtmApproverUserId,
  resolveOtmHrApproverUserId,
  resolveOtmManagerChainApproverUserId,
} from "./otm-approver-routing.server"

export async function listOtmRequestsForOrg(
  organizationId: string,
  options: {
    states?: readonly HrmOtmRequestState[]
    limit?: number
    assignedApproverUserId?: string
    employeeId?: string
  } = {}
): Promise<OrgOtmRequestRow[]> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200)
  const stateFilter =
    options.states && options.states.length > 0
      ? inArray(hrmOvertimeRequest.state, [...options.states])
      : undefined

  const assignedRequestIds = options.assignedApproverUserId
    ? (
        await db.query.hrmApproval.findMany({
          where: and(
            eq(hrmApproval.organizationId, organizationId),
            eq(hrmApproval.subjectKind, OTM_REQUEST_APPROVAL_SUBJECT_KIND),
            eq(hrmApproval.state, "pending"),
            eq(
              hrmApproval.currentApproverUserId,
              options.assignedApproverUserId
            )
          ),
          columns: { subjectId: true },
        })
      ).map((row) => row.subjectId)
    : null

  if (assignedRequestIds && assignedRequestIds.length === 0) return []

  const requests = await db.query.hrmOvertimeRequest.findMany({
    where: and(
      eq(hrmOvertimeRequest.organizationId, organizationId),
      stateFilter,
      options.employeeId
        ? eq(hrmOvertimeRequest.employeeId, options.employeeId)
        : undefined,
      assignedRequestIds
        ? inArray(hrmOvertimeRequest.id, assignedRequestIds)
        : undefined
    ),
    columns: {
      id: true,
      employeeId: true,
      workDate: true,
      startTime: true,
      endTime: true,
      durationMinutes: true,
      timingKind: true,
      dayCategory: true,
      reason: true,
      state: true,
      requestedAt: true,
      currentApprovalId: true,
    },
    orderBy: [desc(hrmOvertimeRequest.requestedAt)],
    limit,
  })

  if (requests.length === 0) return []

  const employeeIds = [...new Set(requests.map((row) => row.employeeId))]
  const approvalIds = [
    ...new Set(
      requests.flatMap((row) =>
        row.currentApprovalId ? [row.currentApprovalId] : []
      )
    ),
  ]

  const policy = await getOtmPolicyForOrg(organizationId)

  const [employees, approvals] = await Promise.all([
    db.query.hrmEmployee.findMany({
      where: and(
        eq(hrmEmployee.organizationId, organizationId),
        inArray(hrmEmployee.id, employeeIds)
      ),
      columns: { id: true, employeeNumber: true, legalName: true },
    }),
    approvalIds.length > 0
      ? db.query.hrmApproval.findMany({
          where: and(
            eq(hrmApproval.organizationId, organizationId),
            inArray(hrmApproval.id, approvalIds)
          ),
          columns: { id: true, currentApproverUserId: true, snapshot: true },
        })
      : Promise.resolve([]),
  ])

  const employeeMap = new Map(
    employees.map((employee) => [
      employee.id,
      { number: employee.employeeNumber, name: employee.legalName },
    ])
  )
  const approvalMap = new Map(
    approvals.map((approval) => [
      approval.id,
      {
        currentApproverUserId: approval.currentApproverUserId,
        approvalStage: readOtmApprovalStage(
          approval.snapshot,
          policy
        ),
      },
    ])
  )

  return requests.map((row) => {
    const employee = employeeMap.get(row.employeeId)
    const parsedState = hrmOtmRequestStateSchema.safeParse(row.state)
    const parsedDayCategory = hrmOtmDayCategorySchema.safeParse(row.dayCategory)
    return {
      id: row.id,
      employeeId: row.employeeId,
      employeeNumber: employee?.number ?? null,
      employeeFullName: employee?.name ?? null,
      workDate: row.workDate,
      startTime: row.startTime,
      endTime: row.endTime,
      durationMinutes: row.durationMinutes,
      timingKind: row.timingKind,
      dayCategory: parsedDayCategory.success
        ? parsedDayCategory.data
        : "normal_day",
      reason: row.reason,
      state: parsedState.success ? parsedState.data : "submitted",
      requestedAt: row.requestedAt,
      currentApprovalId: row.currentApprovalId,
      currentApproverUserId: row.currentApprovalId
        ? (approvalMap.get(row.currentApprovalId)?.currentApproverUserId ?? null)
        : null,
      approvalStage: row.currentApprovalId
        ? (approvalMap.get(row.currentApprovalId)?.approvalStage ?? "hr")
        : null,
    }
  })
}

export async function listOtmApprovedForPayrollMarking(
  organizationId: string,
  limit = 100
): Promise<OrgOtmRequestRow[]> {
  return listOtmRequestsForOrg(organizationId, {
    states: ["approved"],
    limit,
  })
}

export async function listOtmAttendanceReconcileRows(
  organizationId: string,
  limit = 100
): Promise<OtmAttendanceReconcileRow[]> {
  const requests = await listOtmRequestsForOrg(organizationId, {
    states: ["approved", "payroll_ready", "paid"],
    limit,
  })

  if (requests.length === 0) return []

  const snapshots = await db.query.hrmOvertimeCalculationSnapshot.findMany({
    where: and(
      eq(hrmOvertimeCalculationSnapshot.organizationId, organizationId),
      inArray(
        hrmOvertimeCalculationSnapshot.requestId,
        requests.map((row) => row.id)
      )
    ),
    columns: {
      requestId: true,
      payableMinutes: true,
      attendanceMinutes: true,
      attendanceVarianceMinutes: true,
    },
  })

  const snapshotMap = new Map(snapshots.map((row) => [row.requestId, row]))

  return requests.map((row) => {
    const snapshot = snapshotMap.get(row.id)
    return {
      requestId: row.id,
      employeeFullName: row.employeeFullName,
      workDate: row.workDate,
      payableMinutes: snapshot?.payableMinutes ?? row.durationMinutes,
      attendanceMinutes: snapshot?.attendanceMinutes ?? null,
      varianceMinutes: snapshot?.attendanceVarianceMinutes ?? null,
    }
  })
}
