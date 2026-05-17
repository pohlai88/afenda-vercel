import "server-only"

import { and, desc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmEmployeeChangeHistory, hrmLifecycleEvent } from "#lib/db/schema"

import { listEmployeeAssignmentHistory } from "../../organizational-chart-hierarchy/data/org-structure.queries.server"
import type { EmployeeEmploymentHistoryEntry } from "../../../types"

/** Unified employment history timeline for metadata surfaces (HRM-EMP-REC-011). */
export async function listEmployeeEmploymentHistory(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly limit?: number
}): Promise<EmployeeEmploymentHistoryEntry[]> {
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500)

  const [lifecycleRows, assignmentRows, changeRows] = await Promise.all([
    db
      .select({
        id: hrmLifecycleEvent.id,
        kind: hrmLifecycleEvent.kind,
        previousStatus: hrmLifecycleEvent.previousStatus,
        newStatus: hrmLifecycleEvent.newStatus,
        effectiveDate: hrmLifecycleEvent.effectiveDate,
        reason: hrmLifecycleEvent.reason,
        approvalReference: hrmLifecycleEvent.approvalReference,
        createdAt: hrmLifecycleEvent.createdAt,
      })
      .from(hrmLifecycleEvent)
      .where(
        and(
          eq(hrmLifecycleEvent.organizationId, input.organizationId),
          eq(hrmLifecycleEvent.employeeId, input.employeeId)
        )
      )
      .orderBy(desc(hrmLifecycleEvent.createdAt))
      .limit(limit),
    listEmployeeAssignmentHistory(input.organizationId, input.employeeId),
    db
      .select({
        id: hrmEmployeeChangeHistory.id,
        fieldName: hrmEmployeeChangeHistory.fieldName,
        effectiveDate: hrmEmployeeChangeHistory.effectiveDate,
        reason: hrmEmployeeChangeHistory.reason,
        approvalReference: hrmEmployeeChangeHistory.approvalReference,
        changedAt: hrmEmployeeChangeHistory.changedAt,
      })
      .from(hrmEmployeeChangeHistory)
      .where(
        and(
          eq(hrmEmployeeChangeHistory.organizationId, input.organizationId),
          eq(hrmEmployeeChangeHistory.employeeId, input.employeeId)
        )
      )
      .orderBy(desc(hrmEmployeeChangeHistory.changedAt))
      .limit(limit),
  ])

  const entries: EmployeeEmploymentHistoryEntry[] = []

  for (const row of lifecycleRows) {
    entries.push({
      kind: "lifecycle",
      id: row.id,
      occurredAt: row.createdAt,
      effectiveDate: row.effectiveDate,
      eventKind: row.kind,
      previousStatus: row.previousStatus,
      newStatus: row.newStatus,
      reason: row.reason,
      approvalReference: row.approvalReference,
    })
  }

  for (const row of assignmentRows) {
    entries.push({
      kind: "assignment",
      id: row.id,
      occurredAt: row.createdAt,
      effectiveFrom: row.effectiveFrom,
      effectiveTo: row.effectiveTo,
      departmentCode: row.departmentCode,
      positionCode: row.positionCode,
      jobGradeCode: row.jobGradeCode,
      managerLabel: row.managerLabel,
      costCenterCode: row.costCenterCode,
      workLocationCode: row.workLocationCode,
      reason: row.reason,
    })
  }

  const placementFields = new Set([
    "currentDepartmentId",
    "currentPositionId",
    "currentJobGradeId",
    "managerEmployeeId",
    "employmentStatus",
    "employmentType",
    "employmentStartDate",
  ])

  for (const row of changeRows) {
    if (!placementFields.has(row.fieldName)) continue
    entries.push({
      kind: "field_change",
      id: row.id,
      occurredAt: row.changedAt,
      effectiveDate: row.effectiveDate,
      fieldName: row.fieldName,
      reason: row.reason,
      approvalReference: row.approvalReference,
    })
  }

  entries.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())

  return entries.slice(0, limit)
}
