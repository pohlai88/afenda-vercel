import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmEmployee } from "#lib/db/schema"

import {
  assertNoEmployeeDuplicates,
  duplicateMatchErrorMessage,
} from "./employee-duplicate-check.server"
import { recordEmployeeRehireLifecycleEvent } from "./employee-rehire-lifecycle.server"

export type HrmEmployeeMutationDbClient = Pick<
  typeof db,
  "insert" | "update" | "select"
>

export type CreateEmployeeMutationInput = {
  organizationId: string
  actorUserId: string
  employeeNumber: string
  legalName: string
  preferredName?: string | null
  email?: string | null
  phone?: string | null
  employmentStartDate?: Date | null
  currentDepartmentId?: string | null
  currentPositionId?: string | null
  currentJobGradeId?: string | null
}

export type CreateEmployeeMutationResult =
  | { ok: true; employeeId: string }
  | { ok: false; code: "duplicate_employee_number"; message: string }
  | { ok: false; code: "duplicate_email"; message: string }
  | { ok: false; code: "duplicate_identity"; message: string }
  | { ok: false; code: "unknown"; message: string }

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  )
}

/**
 * Insert a new employee row. Caller is responsible for tenant guard and audit
 * event emission. Returns the new `employeeId` on success.
 * Runs pre-insert duplicate detection for work email (HRM-EMP-REC-015).
 */
export async function createEmployeeMutation(
  input: CreateEmployeeMutationInput,
  client: HrmEmployeeMutationDbClient = db
): Promise<CreateEmployeeMutationResult> {
  const duplicateCheck = await assertNoEmployeeDuplicates({
    organizationId: input.organizationId,
    email: input.email,
    phone: input.phone,
    excludeEmployeeId: undefined,
  })
  if (!duplicateCheck.ok) {
    return {
      ok: false,
      code: "duplicate_email",
      message: duplicateMatchErrorMessage(duplicateCheck.matches),
    }
  }

  const id = crypto.randomUUID()
  const normalizedEmail = input.email?.trim().toLowerCase() ?? null
  const normalizedPhone = input.phone?.trim() ?? null

  try {
    await client.insert(hrmEmployee).values({
      id,
      organizationId: input.organizationId,
      employeeNumber: input.employeeNumber,
      legalName: input.legalName,
      preferredName: input.preferredName ?? null,
      email: normalizedEmail,
      phone: normalizedPhone,
      employmentStartDate: input.employmentStartDate ?? null,
      currentDepartmentId: input.currentDepartmentId ?? null,
      currentPositionId: input.currentPositionId ?? null,
      currentJobGradeId: input.currentJobGradeId ?? null,
      createdByUserId: input.actorUserId,
      updatedByUserId: input.actorUserId,
    })
  } catch (err) {
    if (isUniqueViolation(err)) {
      return {
        ok: false,
        code: "duplicate_employee_number",
        message: `Employee number "${input.employeeNumber}" already exists for this organization.`,
      }
    }
    return {
      ok: false,
      code: "unknown",
      message:
        err instanceof Error ? err.message : "Could not create employee.",
    }
  }

  return { ok: true, employeeId: id }
}

export type UpdateEmployeeMutationInput = {
  organizationId: string
  employeeId: string
  actorUserId: string
  employeeNumber: string
  legalName: string
  preferredName?: string | null
  email?: string | null
  currentDepartmentId?: string | null
  currentPositionId?: string | null
  currentJobGradeId?: string | null
}

export type UpdateEmployeeMutationResult =
  | { ok: true }
  | { ok: false; code: "not_found"; message: string }
  | { ok: false; code: "archived"; message: string }
  | { ok: false; code: "duplicate_employee_number"; message: string }
  | { ok: false; code: "duplicate_email"; message: string }
  | { ok: false; code: "unknown"; message: string }

export async function updateEmployeeMutation(
  input: UpdateEmployeeMutationInput
): Promise<UpdateEmployeeMutationResult> {
  const [existing] = await db
    .select({ id: hrmEmployee.id, archivedAt: hrmEmployee.archivedAt })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, input.organizationId),
        eq(hrmEmployee.id, input.employeeId)
      )
    )
    .limit(1)

  if (!existing) {
    return { ok: false, code: "not_found", message: "Employee not found." }
  }
  if (existing.archivedAt) {
    return {
      ok: false,
      code: "archived",
      message: "Archived employees cannot be edited.",
    }
  }

  const duplicateCheck = await assertNoEmployeeDuplicates({
    organizationId: input.organizationId,
    email: input.email,
    excludeEmployeeId: input.employeeId,
  })
  if (!duplicateCheck.ok) {
    return {
      ok: false,
      code: "duplicate_email",
      message: duplicateMatchErrorMessage(duplicateCheck.matches),
    }
  }

  const normalizedEmail = input.email?.trim().toLowerCase() ?? null

  try {
    await db
      .update(hrmEmployee)
      .set({
        employeeNumber: input.employeeNumber,
        legalName: input.legalName,
        preferredName: input.preferredName ?? null,
        email: normalizedEmail,
        currentDepartmentId: input.currentDepartmentId ?? null,
        currentPositionId: input.currentPositionId ?? null,
        currentJobGradeId: input.currentJobGradeId ?? null,
        updatedByUserId: input.actorUserId,
      })
      .where(
        and(
          eq(hrmEmployee.organizationId, input.organizationId),
          eq(hrmEmployee.id, input.employeeId)
        )
      )
  } catch (err) {
    if (isUniqueViolation(err)) {
      return {
        ok: false,
        code: "duplicate_employee_number",
        message: `Employee number "${input.employeeNumber}" already exists for this organization.`,
      }
    }
    return {
      ok: false,
      code: "unknown",
      message:
        err instanceof Error ? err.message : "Could not update employee.",
    }
  }

  return { ok: true }
}

export type RehireEmployeeMutationInput = {
  organizationId: string
  employeeId: string
  actorUserId: string
  /** New employment start date for the rehire. */
  rehireDate: Date
  /** Optional reason captured in the audit trail. */
  reason?: string | null
}

export type RehireEmployeeMutationResult =
  | { ok: true }
  | { ok: false; code: "not_found"; message: string }
  | { ok: false; code: "not_archived"; message: string }
  | { ok: false; code: "unknown"; message: string }

/**
 * Rehire a separated employee (HRM-EMP-REC-016).
 * Clears `archivedAt`/`archivedReason`, sets a new `employmentStartDate`,
 * resets status to `"active"`. History is preserved — prior assignment rows
 * and change history rows remain intact.
 */
export async function rehireEmployeeMutation(
  input: RehireEmployeeMutationInput
): Promise<RehireEmployeeMutationResult> {
  const [existing] = await db
    .select({
      id: hrmEmployee.id,
      archivedAt: hrmEmployee.archivedAt,
      employmentStatus: hrmEmployee.employmentStatus,
    })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, input.organizationId),
        eq(hrmEmployee.id, input.employeeId)
      )
    )
    .limit(1)

  if (!existing) {
    return { ok: false, code: "not_found", message: "Employee not found." }
  }
  if (!existing.archivedAt) {
    return {
      ok: false,
      code: "not_archived",
      message:
        "Employee is not separated. Only separated employees can be rehired.",
    }
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(hrmEmployee)
        .set({
          archivedAt: null,
          archivedReason: null,
          archivedByUserId: null,
          employmentStatus: "active",
          employmentStartDate: input.rehireDate,
          updatedByUserId: input.actorUserId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(hrmEmployee.organizationId, input.organizationId),
            eq(hrmEmployee.id, input.employeeId)
          )
        )

      await recordEmployeeRehireLifecycleEvent(
        {
          organizationId: input.organizationId,
          employeeId: input.employeeId,
          actorUserId: input.actorUserId,
          rehireDate: input.rehireDate,
          previousStatus: existing.employmentStatus,
          reason: input.reason,
        },
        tx
      )
    })
  } catch (err) {
    return {
      ok: false,
      code: "unknown",
      message:
        err instanceof Error ? err.message : "Could not rehire employee.",
    }
  }

  return { ok: true }
}
