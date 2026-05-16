import "server-only"

import { eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmEmployee } from "#lib/db/schema"

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
  employmentStartDate?: Date | null
  currentDepartmentId?: string | null
  currentPositionId?: string | null
  currentJobGradeId?: string | null
}

export type CreateEmployeeMutationResult =
  | { ok: true; employeeId: string }
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

/**
 * Insert a new employee row. Caller is responsible for tenant guard and audit
 * event emission. Returns the new `employeeId` on success.
 */
export async function createEmployeeMutation(
  input: CreateEmployeeMutationInput,
  client: HrmEmployeeMutationDbClient = db
): Promise<CreateEmployeeMutationResult> {
  const id = crypto.randomUUID()

  try {
    await client.insert(hrmEmployee).values({
      id,
      organizationId: input.organizationId,
      employeeNumber: input.employeeNumber,
      legalName: input.legalName,
      preferredName: input.preferredName ?? null,
      email: input.email ?? null,
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
  | { ok: false; code: "unknown"; message: string }

export async function updateEmployeeMutation(
  input: UpdateEmployeeMutationInput
): Promise<UpdateEmployeeMutationResult> {
  const [existing] = await db
    .select({ id: hrmEmployee.id, archivedAt: hrmEmployee.archivedAt })
    .from(hrmEmployee)
    .where(eq(hrmEmployee.id, input.employeeId))
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

  try {
    await db
      .update(hrmEmployee)
      .set({
        employeeNumber: input.employeeNumber,
        legalName: input.legalName,
        preferredName: input.preferredName ?? null,
        email: input.email ?? null,
        currentDepartmentId: input.currentDepartmentId ?? null,
        currentPositionId: input.currentPositionId ?? null,
        currentJobGradeId: input.currentJobGradeId ?? null,
        updatedByUserId: input.actorUserId,
      })
      .where(eq(hrmEmployee.id, input.employeeId))
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
