import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmEmployee,
  hrmEmployeeContactProfile,
  hrmEmployeeIdentityDocument,
  hrmEmployeePersonalProfile,
} from "#lib/db/schema"

import {
  assertNoEmployeeDuplicates,
  duplicateMatchErrorMessage,
} from "./employee-duplicate-check.server"
import {
  recordEmployeeLifecycleEvent,
  recordEmployeeRecordChangeHistory,
} from "./employee-record-history.server"
import { recordEmployeeRehireLifecycleEvent } from "./employee-rehire-lifecycle.server"
import { upsertEmployeeEffectiveAssignment } from "./employee-assignment-command.server"
import { updateEmployeeCoreFieldsWithHistory } from "./employee-core-update.mutations.server"

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
  dateOfBirth?: Date | null
  gender?: string | null
  nationality?: string | null
  identityDocumentType?: string | null
  identityDocumentNumber?: string | null
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

function hasInitialPlacement(input: CreateEmployeeMutationInput): boolean {
  return Boolean(
    input.currentDepartmentId ||
    input.currentPositionId ||
    input.currentJobGradeId
  )
}

async function insertEmployeeMasterRecord(
  input: CreateEmployeeMutationInput,
  client: HrmEmployeeMutationDbClient
): Promise<string> {
  const id = crypto.randomUUID()
  const normalizedEmail = input.email?.trim().toLowerCase() ?? null
  const normalizedPhone = input.phone?.trim() ?? null
  const identityDocumentType = input.identityDocumentType?.trim() ?? null
  const identityDocumentNumber = input.identityDocumentNumber?.trim() ?? null
  const issuingCountry = input.nationality ?? "UNSPECIFIED"

  await client.insert(hrmEmployee).values({
    id,
    organizationId: input.organizationId,
    employeeNumber: input.employeeNumber,
    legalName: input.legalName,
    preferredName: input.preferredName ?? null,
    dateOfBirth: input.dateOfBirth ?? null,
    gender: input.gender ?? null,
    nationality: input.nationality ?? null,
    idDocumentType: identityDocumentType,
    idDocumentNumber: identityDocumentNumber,
    email: normalizedEmail,
    phone: normalizedPhone,
    employmentStartDate: input.employmentStartDate ?? null,
    createdByUserId: input.actorUserId,
    updatedByUserId: input.actorUserId,
  })

  let primaryIdentityDocumentId: string | null = null
  if (identityDocumentType && identityDocumentNumber) {
    const [identityDocument] = await client
      .insert(hrmEmployeeIdentityDocument)
      .values({
        id: crypto.randomUUID(),
        organizationId: input.organizationId,
        employeeId: id,
        documentType: identityDocumentType,
        documentNumber: identityDocumentNumber,
        issuingCountry,
        isPrimary: true,
        createdByUserId: input.actorUserId,
        updatedByUserId: input.actorUserId,
      })
      .returning({ id: hrmEmployeeIdentityDocument.id })
    if (!identityDocument) throw new Error("identity_document_insert_failed")
    primaryIdentityDocumentId = identityDocument.id
  }

  if (
    input.dateOfBirth ||
    input.gender ||
    input.nationality ||
    primaryIdentityDocumentId
  ) {
    await client.insert(hrmEmployeePersonalProfile).values({
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      employeeId: id,
      dateOfBirth: input.dateOfBirth ?? null,
      gender: input.gender ?? null,
      nationality: input.nationality ?? null,
      primaryIdentityDocumentId,
      createdByUserId: input.actorUserId,
      updatedByUserId: input.actorUserId,
    })
  }

  if (normalizedEmail || normalizedPhone) {
    await client.insert(hrmEmployeeContactProfile).values({
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      employeeId: id,
      workEmail: normalizedEmail,
      workPhone: normalizedPhone,
      createdByUserId: input.actorUserId,
      updatedByUserId: input.actorUserId,
    })
  }

  await recordEmployeeLifecycleEvent(
    {
      organizationId: input.organizationId,
      employeeId: id,
      kind: "hire",
      previousStatus: null,
      newStatus: "active",
      effectiveDate: input.employmentStartDate ?? null,
      actorUserId: input.actorUserId,
      isEffectiveDated: Boolean(input.employmentStartDate),
    },
    client
  )

  await recordEmployeeRecordChangeHistory(
    {
      organizationId: input.organizationId,
      employeeId: id,
      changedByUserId: input.actorUserId,
      changes: [
        {
          fieldName: "employeeNumber",
          oldValue: null,
          newValue: input.employeeNumber,
        },
        { fieldName: "legalName", oldValue: null, newValue: input.legalName },
        {
          fieldName: "preferredName",
          oldValue: null,
          newValue: input.preferredName ?? null,
        },
        {
          fieldName: "dateOfBirth",
          oldValue: null,
          newValue: input.dateOfBirth?.toISOString().slice(0, 10) ?? null,
        },
        { fieldName: "gender", oldValue: null, newValue: input.gender ?? null },
        {
          fieldName: "nationality",
          oldValue: null,
          newValue: input.nationality ?? null,
        },
        {
          fieldName: "identityDocument.documentType",
          oldValue: null,
          newValue: identityDocumentType,
        },
        {
          fieldName: "identityDocument.documentNumber",
          oldValue: null,
          newValue: identityDocumentNumber,
        },
        {
          fieldName: "workEmail",
          oldValue: null,
          newValue: normalizedEmail,
        },
        {
          fieldName: "workPhone",
          oldValue: null,
          newValue: normalizedPhone,
        },
        {
          fieldName: "employmentStartDate",
          oldValue: null,
          newValue:
            input.employmentStartDate?.toISOString().slice(0, 10) ?? null,
        },
      ],
      meta: {
        effectiveDate: input.employmentStartDate ?? null,
        reason: "Initial employee record",
      },
    },
    client
  )

  if (hasInitialPlacement(input)) {
    await upsertEmployeeEffectiveAssignment(
      {
        organizationId: input.organizationId,
        employeeId: id,
        actorUserId: input.actorUserId,
        effectiveFrom: input.employmentStartDate ?? new Date(),
        next: {
          currentDepartmentId: input.currentDepartmentId ?? null,
          currentPositionId: input.currentPositionId ?? null,
          currentJobGradeId: input.currentJobGradeId ?? null,
        },
        meta: {
          effectiveDate: input.employmentStartDate ?? null,
          reason: "Initial employee placement",
        },
      },
      client
    )
  }

  return id
}

/**
 * Insert a new employee row. Caller is responsible for tenant guard and audit
 * event emission. Returns the new `employeeId` on success.
 * Runs pre-insert duplicate detection for work email (HRM-EMP-REC-015).
 */
export async function createEmployeeMutation(
  input: CreateEmployeeMutationInput,
  client?: HrmEmployeeMutationDbClient
): Promise<CreateEmployeeMutationResult> {
  const duplicateCheck = await assertNoEmployeeDuplicates({
    organizationId: input.organizationId,
    email: input.email,
    phone: input.phone,
    identityDocumentNumber: input.identityDocumentNumber,
    identityDocumentType: input.identityDocumentType,
    excludeEmployeeId: undefined,
  })
  if (!duplicateCheck.ok) {
    const matchedIdentity = duplicateCheck.matches.some(
      (match) => match.matchedOn === "identity_document"
    )
    return {
      ok: false,
      code: matchedIdentity ? "duplicate_identity" : "duplicate_email",
      message: duplicateMatchErrorMessage(duplicateCheck.matches),
    }
  }

  try {
    const employeeId = client
      ? await insertEmployeeMasterRecord(input, client)
      : await db.transaction((tx) => insertEmployeeMasterRecord(input, tx))
    return { ok: true, employeeId }
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
    .select({
      archivedAt: hrmEmployee.archivedAt,
      employeeNumber: hrmEmployee.employeeNumber,
      legalName: hrmEmployee.legalName,
      preferredName: hrmEmployee.preferredName,
      email: hrmEmployee.email,
      currentDepartmentId: hrmEmployee.currentDepartmentId,
      currentPositionId: hrmEmployee.currentPositionId,
      currentJobGradeId: hrmEmployee.currentJobGradeId,
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
  if (existing.archivedAt) {
    return {
      ok: false,
      code: "archived",
      message: "Archived employees cannot be edited.",
    }
  }

  const updated = await updateEmployeeCoreFieldsWithHistory({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    actorUserId: input.actorUserId,
    existing: {
      archivedAt: existing.archivedAt,
      employeeNumber: existing.employeeNumber,
      legalName: existing.legalName,
      preferredName: existing.preferredName ?? null,
      email: existing.email ?? null,
      currentDepartmentId: existing.currentDepartmentId ?? null,
      currentPositionId: existing.currentPositionId ?? null,
      currentJobGradeId: existing.currentJobGradeId ?? null,
    },
    next: {
      employeeNumber: input.employeeNumber,
      legalName: input.legalName,
      preferredName: input.preferredName ?? null,
      email: input.email?.trim().toLowerCase() ?? null,
      currentDepartmentId: input.currentDepartmentId ?? null,
      currentPositionId: input.currentPositionId ?? null,
      currentJobGradeId: input.currentJobGradeId ?? null,
    },
  })

  if (!updated.ok) {
    return {
      ok: false,
      code: updated.code,
      message: updated.message,
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
      await recordEmployeeRecordChangeHistory(
        {
          organizationId: input.organizationId,
          employeeId: input.employeeId,
          changedByUserId: input.actorUserId,
          changes: [
            {
              fieldName: "archivedAt",
              oldValue: existing.archivedAt?.toISOString() ?? null,
              newValue: null,
            },
            {
              fieldName: "employmentStatus",
              oldValue: existing.employmentStatus,
              newValue: "active",
            },
            {
              fieldName: "employmentStartDate",
              oldValue: null,
              newValue: input.rehireDate.toISOString().slice(0, 10),
            },
          ],
          meta: {
            effectiveDate: input.rehireDate,
            reason: input.reason ?? null,
          },
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
