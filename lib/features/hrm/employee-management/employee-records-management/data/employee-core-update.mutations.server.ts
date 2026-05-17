import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmEmployee, hrmEmployeeChangeHistory } from "#lib/db/schema"

import {
  assertNoEmployeeDuplicates,
  duplicateMatchErrorMessage,
} from "./employee-duplicate-check.server"
import { upsertEmployeeEffectiveAssignment } from "./employee-assignment-command.server"

export type EmployeeCoreFieldSnapshot = {
  employeeNumber: string
  legalName: string
  preferredName: string | null
  email: string | null
  currentDepartmentId: string | null
  currentPositionId: string | null
  currentJobGradeId: string | null
}

export type UpdateEmployeeCoreFieldsInput = {
  organizationId: string
  employeeId: string
  actorUserId: string
  existing: EmployeeCoreFieldSnapshot & { archivedAt: Date | null }
  next: EmployeeCoreFieldSnapshot
  effectiveFrom?: Date | null
  reason?: string | null
}

export type UpdateEmployeeCoreFieldsResult =
  | { ok: true; changedFields: string[] }
  | { ok: false; code: "duplicate_email"; message: string }
  | { ok: false; code: "duplicate_employee_number"; message: string }
  | { ok: false; code: "unknown"; message: string }

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  )
}

function buildChangeHistoryRows(
  existing: EmployeeCoreFieldSnapshot,
  next: EmployeeCoreFieldSnapshot
): { fieldName: string; oldValue: unknown; newValue: unknown }[] {
  const rows: { fieldName: string; oldValue: unknown; newValue: unknown }[] = []

  if (existing.employeeNumber !== next.employeeNumber) {
    rows.push({
      fieldName: "employeeNumber",
      oldValue: existing.employeeNumber,
      newValue: next.employeeNumber,
    })
  }
  if (existing.legalName !== next.legalName) {
    rows.push({
      fieldName: "legalName",
      oldValue: existing.legalName,
      newValue: next.legalName,
    })
  }
  if (existing.preferredName !== next.preferredName) {
    rows.push({
      fieldName: "preferredName",
      oldValue: existing.preferredName,
      newValue: next.preferredName,
    })
  }
  if (existing.email !== next.email) {
    rows.push({
      fieldName: "email",
      oldValue: existing.email,
      newValue: next.email,
    })
  }
  return rows
}

/**
 * Updates core employee row fields and appends change-history rows atomically.
 * Caller must verify tenant membership and archive state before invoking.
 */
export async function updateEmployeeCoreFieldsWithHistory(
  input: UpdateEmployeeCoreFieldsInput
): Promise<UpdateEmployeeCoreFieldsResult> {
  const duplicates = await assertNoEmployeeDuplicates({
    organizationId: input.organizationId,
    email: input.next.email ?? undefined,
    excludeEmployeeId: input.employeeId,
  })
  if (!duplicates.ok) {
    return {
      ok: false,
      code: "duplicate_email",
      message: duplicateMatchErrorMessage(duplicates.matches),
    }
  }

  const historyRows = buildChangeHistoryRows(input.existing, input.next)
  const changedFields = historyRows.map((row) => row.fieldName)
  const assignmentChanged =
    input.existing.currentDepartmentId !== input.next.currentDepartmentId ||
    input.existing.currentPositionId !== input.next.currentPositionId ||
    input.existing.currentJobGradeId !== input.next.currentJobGradeId

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(hrmEmployee)
        .set({
          employeeNumber: input.next.employeeNumber,
          legalName: input.next.legalName,
          preferredName: input.next.preferredName,
          email: input.next.email,
          updatedByUserId: input.actorUserId,
        })
        .where(
          and(
            eq(hrmEmployee.organizationId, input.organizationId),
            eq(hrmEmployee.id, input.employeeId)
          )
        )

      for (const row of historyRows) {
        await tx.insert(hrmEmployeeChangeHistory).values({
          id: crypto.randomUUID(),
          organizationId: input.organizationId,
          employeeId: input.employeeId,
          fieldName: row.fieldName,
          oldValue: row.oldValue === undefined ? null : row.oldValue,
          newValue: row.newValue === undefined ? null : row.newValue,
          changedByUserId: input.actorUserId,
        })
      }

      if (assignmentChanged) {
        const assignment = await upsertEmployeeEffectiveAssignment(
          {
            organizationId: input.organizationId,
            employeeId: input.employeeId,
            actorUserId: input.actorUserId,
            effectiveFrom: input.effectiveFrom ?? new Date(),
            next: {
              currentDepartmentId: input.next.currentDepartmentId,
              currentPositionId: input.next.currentPositionId,
              currentJobGradeId: input.next.currentJobGradeId,
            },
            meta: {
              effectiveDate: input.effectiveFrom ?? null,
              reason: input.reason ?? "Core employee placement update",
            },
          },
          tx
        )
        changedFields.push(...assignment.changedFields)
      }
    })
  } catch (err) {
    if (isUniqueViolation(err)) {
      return {
        ok: false,
        code: "duplicate_employee_number",
        message:
          "Employee number already exists for this organization.",
      }
    }
    return {
      ok: false,
      code: "unknown",
      message: "Could not update employee. Try again.",
    }
  }

  return { ok: true, changedFields }
}
