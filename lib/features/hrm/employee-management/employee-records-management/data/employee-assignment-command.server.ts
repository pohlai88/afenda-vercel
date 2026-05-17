import "server-only"

import { and, eq, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmEmployee, hrmEmployeeAssignment } from "#lib/db/schema"

import {
  calendarDayBeforeIso,
  formatUtcDateOnly,
  isoDateOnlyToUtcDate,
} from "../../../_module-governance/hrm-calendar-dates.server"
import {
  recordEmployeeLifecycleEvent,
  recordEmployeeRecordChangeHistory,
  type EmployeeRecordChange,
  type EmployeeRecordChangeMeta,
} from "./employee-record-history.server"

export type EmployeeAssignmentCommandClient = Pick<
  typeof db,
  "select" | "update" | "insert"
>

export type EmployeeEffectiveAssignmentNext = {
  readonly currentDepartmentId?: string | null
  readonly currentPositionId?: string | null
  readonly currentJobGradeId?: string | null
  readonly managerEmployeeId?: string | null
  readonly dottedLineManagerId?: string | null
  readonly hrOwnerEmployeeId?: string | null
  readonly employmentType?: string | null
  readonly workerCategory?: string | null
  readonly employeeLevel?: string | null
  readonly costCenterCode?: string | null
  readonly workLocationCode?: string | null
}

export type UpsertEmployeeEffectiveAssignmentResult = {
  readonly assignmentId: string | null
  readonly changedFields: string[]
}

const EMPLOYEE_FIELD_MAP = {
  currentDepartmentId: hrmEmployee.currentDepartmentId,
  currentPositionId: hrmEmployee.currentPositionId,
  currentJobGradeId: hrmEmployee.currentJobGradeId,
  managerEmployeeId: hrmEmployee.managerEmployeeId,
  dottedLineManagerId: hrmEmployee.dottedLineManagerId,
  hrOwnerEmployeeId: hrmEmployee.hrOwnerEmployeeId,
  employmentType: hrmEmployee.employmentType,
  workerCategory: hrmEmployee.workerCategory,
  employeeLevel: hrmEmployee.employeeLevel,
} as const

function hasNextField<K extends keyof EmployeeEffectiveAssignmentNext>(
  next: EmployeeEffectiveAssignmentNext,
  key: K
): next is EmployeeEffectiveAssignmentNext &
  Required<Pick<EmployeeEffectiveAssignmentNext, K>> {
  return Object.prototype.hasOwnProperty.call(next, key)
}

export async function upsertEmployeeEffectiveAssignment(
  input: {
    readonly organizationId: string
    readonly employeeId: string
    readonly actorUserId: string
    readonly effectiveFrom: Date
    readonly next: EmployeeEffectiveAssignmentNext
    readonly meta?: EmployeeRecordChangeMeta
    readonly applyProjection?: boolean
  },
  client: EmployeeAssignmentCommandClient = db
): Promise<UpsertEmployeeEffectiveAssignmentResult> {
  const applyProjection = input.applyProjection ?? true
  const [employee] = await client
    .select({
      id: hrmEmployee.id,
      archivedAt: hrmEmployee.archivedAt,
      currentDepartmentId: hrmEmployee.currentDepartmentId,
      currentPositionId: hrmEmployee.currentPositionId,
      currentJobGradeId: hrmEmployee.currentJobGradeId,
      managerEmployeeId: hrmEmployee.managerEmployeeId,
      dottedLineManagerId: hrmEmployee.dottedLineManagerId,
      hrOwnerEmployeeId: hrmEmployee.hrOwnerEmployeeId,
      employmentType: hrmEmployee.employmentType,
      workerCategory: hrmEmployee.workerCategory,
      employeeLevel: hrmEmployee.employeeLevel,
    })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, input.organizationId),
        eq(hrmEmployee.id, input.employeeId)
      )
    )
    .limit(1)

  if (!employee) throw new Error("employee_not_found")
  if (employee.archivedAt) throw new Error("employee_archived")

  const [currentAssignment] = await client
    .select({
      id: hrmEmployeeAssignment.id,
      effectiveFrom: hrmEmployeeAssignment.effectiveFrom,
      costCenterCode: hrmEmployeeAssignment.costCenterCode,
      workLocationCode: hrmEmployeeAssignment.workLocationCode,
    })
    .from(hrmEmployeeAssignment)
    .where(
      and(
        eq(hrmEmployeeAssignment.organizationId, input.organizationId),
        eq(hrmEmployeeAssignment.employeeId, input.employeeId),
        eq(hrmEmployeeAssignment.status, "active"),
        isNull(hrmEmployeeAssignment.effectiveTo)
      )
    )
    .limit(1)

  const changes: EmployeeRecordChange[] = []
  const employeeUpdate: Partial<typeof hrmEmployee.$inferInsert> = {
    updatedAt: new Date(),
    updatedByUserId: input.actorUserId,
  }

  for (const key of Object.keys(EMPLOYEE_FIELD_MAP) as Array<
    keyof typeof EMPLOYEE_FIELD_MAP
  >) {
    if (!hasNextField(input.next, key)) continue
    const nextValue = input.next[key] ?? null
    changes.push({
      fieldName: key,
      oldValue: employee[key] ?? null,
      newValue: nextValue,
    })
    employeeUpdate[key] = nextValue
  }

  if (hasNextField(input.next, "costCenterCode")) {
    changes.push({
      fieldName: "costCenterCode",
      oldValue: currentAssignment?.costCenterCode ?? null,
      newValue: input.next.costCenterCode ?? null,
    })
  }
  if (hasNextField(input.next, "workLocationCode")) {
    changes.push({
      fieldName: "workLocationCode",
      oldValue: currentAssignment?.workLocationCode ?? null,
      newValue: input.next.workLocationCode ?? null,
    })
  }

  if (applyProjection && Object.keys(employeeUpdate).length > 2) {
    await client
      .update(hrmEmployee)
      .set(employeeUpdate)
      .where(
        and(
          eq(hrmEmployee.organizationId, input.organizationId),
          eq(hrmEmployee.id, input.employeeId)
        )
      )
  }

  const assignmentFieldsTouched =
    hasNextField(input.next, "currentDepartmentId") ||
    hasNextField(input.next, "currentPositionId") ||
    hasNextField(input.next, "currentJobGradeId") ||
    hasNextField(input.next, "managerEmployeeId") ||
    hasNextField(input.next, "costCenterCode") ||
    hasNextField(input.next, "workLocationCode")
  const assignmentFieldsPresent =
    assignmentFieldsTouched &&
    (currentAssignment !== undefined ||
      input.next.currentDepartmentId != null ||
      input.next.currentPositionId != null ||
      input.next.currentJobGradeId != null ||
      input.next.managerEmployeeId != null ||
      input.next.costCenterCode != null ||
      input.next.workLocationCode != null)

  let assignmentId: string | null = null
  if (assignmentFieldsPresent) {
    if (
      currentAssignment &&
      currentAssignment.effectiveFrom.getTime() > input.effectiveFrom.getTime()
    ) {
      throw new Error("effective_from_before_current")
    }

    const baseAssignment = {
      departmentId: hasNextField(input.next, "currentDepartmentId")
        ? input.next.currentDepartmentId
        : employee.currentDepartmentId,
      positionId: hasNextField(input.next, "currentPositionId")
        ? input.next.currentPositionId
        : employee.currentPositionId,
      jobGradeId: hasNextField(input.next, "currentJobGradeId")
        ? input.next.currentJobGradeId
        : employee.currentJobGradeId,
      managerEmployeeId: hasNextField(input.next, "managerEmployeeId")
        ? input.next.managerEmployeeId
        : employee.managerEmployeeId,
      costCenterCode: hasNextField(input.next, "costCenterCode")
        ? input.next.costCenterCode
        : (currentAssignment?.costCenterCode ?? null),
      workLocationCode: hasNextField(input.next, "workLocationCode")
        ? input.next.workLocationCode
        : (currentAssignment?.workLocationCode ?? null),
      reason: input.meta?.reason ?? null,
      updatedAt: new Date(),
      updatedByUserId: input.actorUserId,
    }

    if (
      currentAssignment &&
      currentAssignment.effectiveFrom.getTime() ===
        input.effectiveFrom.getTime()
    ) {
      await client
        .update(hrmEmployeeAssignment)
        .set(baseAssignment)
        .where(eq(hrmEmployeeAssignment.id, currentAssignment.id))
      assignmentId = currentAssignment.id
    } else {
      if (currentAssignment) {
        await client
          .update(hrmEmployeeAssignment)
          .set({
            status: "superseded",
            effectiveTo: isoDateOnlyToUtcDate(
              calendarDayBeforeIso(formatUtcDateOnly(input.effectiveFrom))
            ),
            updatedAt: new Date(),
            updatedByUserId: input.actorUserId,
          })
          .where(eq(hrmEmployeeAssignment.id, currentAssignment.id))
      }
      const [inserted] = await client
        .insert(hrmEmployeeAssignment)
        .values({
          id: crypto.randomUUID(),
          organizationId: input.organizationId,
          employeeId: input.employeeId,
          ...baseAssignment,
          effectiveFrom: input.effectiveFrom,
          effectiveTo: null,
          status: "active",
          createdByUserId: input.actorUserId,
        })
        .returning({ id: hrmEmployeeAssignment.id })
      if (!inserted) throw new Error("assignment_insert_failed")
      assignmentId = inserted.id
    }

    await recordEmployeeLifecycleEvent(
      {
        organizationId: input.organizationId,
        employeeId: input.employeeId,
        kind: "assignment_change",
        effectiveDate: input.effectiveFrom,
        reason: input.meta?.reason ?? null,
        approvalReference: input.meta?.approvalReference ?? null,
        metadata: { assignmentId },
        actorUserId: input.actorUserId,
        isEffectiveDated: true,
      },
      client
    )
  }

  const changedFields = await recordEmployeeRecordChangeHistory(
    {
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      changedByUserId: input.actorUserId,
      changes,
      meta: {
        effectiveDate: input.meta?.effectiveDate ?? input.effectiveFrom,
        reason: input.meta?.reason ?? null,
        approvalReference: input.meta?.approvalReference ?? null,
      },
    },
    client
  )

  return { assignmentId, changedFields }
}
