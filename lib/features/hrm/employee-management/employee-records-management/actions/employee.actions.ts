"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { logUnexpectedServerError } from "#lib/logger.server"
import { ORG_APPS_HRM_EMPLOYEES } from "#lib/org-apps-module-paths"
import { db } from "#lib/db"
import { hrmEmployee } from "#lib/db/schema"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import {
  toLocaleOrgAppsRevalidatePattern,
  toLocalePath,
} from "#lib/i18n/locales.shared"

import { isoDateOnlyToUtcDate } from "../../../_module-governance/hrm-calendar-dates.server"
import { organizationHrmEmployeePath } from "../../../constants"
import { terminateBenefitEnrollmentsForEmploymentEnd } from "../../../payroll-compensation/benefits-administration/data/benefit-employment-bridge.server"
import { insertDefaultOffboardingInstance } from "../../offboarding-exit-management/data/offboarding.mutations.server"
import { assertOptionalHrmPlacementFkBelongsToOrg } from "../../../_internal-cross-cutting/hrm-org-fk.server"
import { updateEmployeeCoreFieldsWithHistory } from "../data/employee-core-update.mutations.server"
import {
  assertNoEmployeeDuplicates,
  duplicateMatchErrorMessage,
} from "../data/employee-duplicate-check.server"
import { requireEmployeeRecordMutationGate } from "../data/employee-record-action-guard.server"
import {
  createEmployeeMutation,
  rehireEmployeeMutation,
} from "../data/employee.mutations.server"
import {
  archiveEmployeeFormSchema,
  createEmployeeFormSchema,
  rehireEmployeeFormSchema,
  updateEmployeeFormSchema,
} from "../schemas/employee.schema"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { EmployeeMutationFormState } from "../../../types"
import { HRM_EMPLOYEE_RECORDS_AUDIT } from "../employee-records.contract"
import {
  recordEmployeeLifecycleEvent,
  recordEmployeeRecordChangeHistory,
} from "../data/employee-record-history.server"
import {
  mutableEmployeeRecordErrorMessage,
  requireMutableEmployeeRecord,
} from "../data/employee-record-mutability.server"

export async function createEmployeeAction(
  _prev: EmployeeMutationFormState | undefined,
  formData: FormData
): Promise<EmployeeMutationFormState> {
  const gate = await requireEmployeeRecordMutationGate(formData, {
    permission: "create",
    errorMessage: "HRM workforce create permission required.",
  })
  if (!gate.ok) return gate.response
  const { orgSlug, organizationId, userId, sessionId } = gate

  const parsed = createEmployeeFormSchema.safeParse({
    employeeNumber: formData.get("employeeNumber"),
    legalName: formData.get("legalName"),
    preferredName: formData.get("preferredName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    employmentStartDate: formData.get("employmentStartDate"),
    currentDepartmentId: formData.get("currentDepartmentId"),
    currentPositionId: formData.get("currentPositionId"),
    currentJobGradeId: formData.get("currentJobGradeId"),
    dateOfBirth: formData.get("dateOfBirth"),
    gender: formData.get("gender"),
    nationality: formData.get("nationality"),
    identityDocumentType: formData.get("identityDocumentType"),
    identityDocumentNumber: formData.get("identityDocumentNumber"),
  })

  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      employeeNumber: fe.employeeNumber?.[0],
      legalName: fe.legalName?.[0],
      email: fe.email?.[0],
      form:
        fe.employmentStartDate?.[0] ??
        fe.currentDepartmentId?.[0] ??
        fe.currentPositionId?.[0] ??
        fe.currentJobGradeId?.[0] ??
        fe.identityDocumentType?.[0] ??
        fe.identityDocumentNumber?.[0],
    })
  }

  const fk = await assertOptionalHrmPlacementFkBelongsToOrg(organizationId, {
    departmentId: parsed.data.currentDepartmentId,
    positionId: parsed.data.currentPositionId,
    gradeId: parsed.data.currentJobGradeId,
  })
  if (!fk.ok) {
    return hrmActionFailure({ form: fk.message })
  }

  const duplicates = await assertNoEmployeeDuplicates({
    organizationId,
    email: parsed.data.email,
    phone: parsed.data.phone,
  })
  if (!duplicates.ok) {
    return hrmActionFailure({
      email: duplicateMatchErrorMessage(duplicates.matches),
    })
  }

  const employmentStartDate = parsed.data.employmentStartDate
    ? isoDateOnlyToUtcDate(parsed.data.employmentStartDate)
    : null

  const created = await createEmployeeMutation({
    organizationId,
    actorUserId: userId,
    employeeNumber: parsed.data.employeeNumber,
    legalName: parsed.data.legalName,
    preferredName: parsed.data.preferredName,
    email: parsed.data.email,
    phone: parsed.data.phone,
    employmentStartDate,
    currentDepartmentId: parsed.data.currentDepartmentId,
    currentPositionId: parsed.data.currentPositionId,
    currentJobGradeId: parsed.data.currentJobGradeId,
    dateOfBirth: parsed.data.dateOfBirth
      ? isoDateOnlyToUtcDate(parsed.data.dateOfBirth)
      : null,
    gender: parsed.data.gender ?? null,
    nationality: parsed.data.nationality ?? null,
    identityDocumentType: parsed.data.identityDocumentType ?? null,
    identityDocumentNumber: parsed.data.identityDocumentNumber ?? null,
  })

  if (!created.ok) {
    if (created.code === "duplicate_employee_number") {
      return hrmActionFailure({
        employeeNumber: "Employee number already exists for this organization.",
      })
    }
    if (created.code === "duplicate_email") {
      return hrmActionFailure({ email: created.message })
    }
    if (created.code === "duplicate_identity") {
      return hrmActionFailure({ form: created.message })
    }
    return hrmActionFailure({ form: "Could not create employee. Try again." })
  }

  const row = { id: created.employeeId }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_EMPLOYEE_RECORDS_AUDIT.employee.create,
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "hrm_employee",
      resourceId: row.id,
      metadata: {
        employeeNumber: parsed.data.employeeNumber,
        hasEmail: Boolean(parsed.data.email),
        hasPreferredName: Boolean(parsed.data.preferredName),
        hasDepartment: Boolean(parsed.data.currentDepartmentId),
        hasPosition: Boolean(parsed.data.currentPositionId),
        hasJobGrade: Boolean(parsed.data.currentJobGradeId),
      },
    })
  )

  revalidatePath(
    toLocaleOrgAppsRevalidatePattern(ORG_APPS_HRM_EMPLOYEES),
    "page"
  )

  const locale = await getRequestAppLocale()
  redirect(toLocalePath(locale, organizationHrmEmployeePath(orgSlug, row.id)))
}

export async function updateEmployeeAction(
  _prev: EmployeeMutationFormState | undefined,
  formData: FormData
): Promise<EmployeeMutationFormState> {
  const gate = await requireEmployeeRecordMutationGate(formData, {
    permission: "update",
    errorMessage: "HRM workforce update permission required.",
  })
  if (!gate.ok) return gate.response
  const { orgSlug, organizationId, userId, sessionId } = gate

  const parsed = updateEmployeeFormSchema.safeParse({
    employeeId: formData.get("employeeId"),
    employeeNumber: formData.get("employeeNumber"),
    legalName: formData.get("legalName"),
    preferredName: formData.get("preferredName"),
    email: formData.get("email"),
    employmentStartDate: formData.get("employmentStartDate"),
    currentDepartmentId: formData.get("currentDepartmentId"),
    currentPositionId: formData.get("currentPositionId"),
    currentJobGradeId: formData.get("currentJobGradeId"),
  })

  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      employeeId: fe.employeeId?.[0],
      employeeNumber: fe.employeeNumber?.[0],
      legalName: fe.legalName?.[0],
      email: fe.email?.[0],
      form:
        fe.currentDepartmentId?.[0] ??
        fe.currentPositionId?.[0] ??
        fe.currentJobGradeId?.[0],
    })
  }

  const mutable = await requireMutableEmployeeRecord({
    organizationId,
    employeeId: parsed.data.employeeId,
  })
  if (!mutable.ok) {
    return hrmActionFailure({
      form: mutableEmployeeRecordErrorMessage(mutable),
    })
  }

  const fk = await assertOptionalHrmPlacementFkBelongsToOrg(organizationId, {
    departmentId: parsed.data.currentDepartmentId,
    positionId: parsed.data.currentPositionId,
    gradeId: parsed.data.currentJobGradeId,
  })
  if (!fk.ok) {
    return hrmActionFailure({ form: fk.message })
  }

  const [existing] = await db
    .select({
      id: hrmEmployee.id,
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
        eq(hrmEmployee.organizationId, organizationId),
        eq(hrmEmployee.id, parsed.data.employeeId)
      )
    )
    .limit(1)

  if (!existing) {
    return hrmActionFailure({ form: "Employee not found." })
  }
  if (existing.archivedAt) {
    return hrmActionFailure({ form: "Archived employees cannot be edited." })
  }

  const nextPreferred = parsed.data.preferredName ?? null
  const nextEmail = parsed.data.email?.trim().toLowerCase() ?? null
  const nextDept = parsed.data.currentDepartmentId ?? null
  const nextPos = parsed.data.currentPositionId ?? null
  const nextGrade = parsed.data.currentJobGradeId ?? null

  const updated = await updateEmployeeCoreFieldsWithHistory({
    organizationId,
    employeeId: parsed.data.employeeId,
    actorUserId: userId,
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
      employeeNumber: parsed.data.employeeNumber,
      legalName: parsed.data.legalName,
      preferredName: nextPreferred,
      email: nextEmail,
      currentDepartmentId: nextDept,
      currentPositionId: nextPos,
      currentJobGradeId: nextGrade,
    },
  })

  if (!updated.ok) {
    if (updated.code === "duplicate_employee_number") {
      return hrmActionFailure({
        employeeNumber: updated.message,
      })
    }
    if (updated.code === "duplicate_email") {
      return hrmActionFailure({ email: updated.message })
    }
    return hrmActionFailure({ form: updated.message })
  }

  const { changedFields } = updated

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_EMPLOYEE_RECORDS_AUDIT.employee.update,
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "hrm_employee",
      resourceId: parsed.data.employeeId,
      metadata: {
        employeeNumber: parsed.data.employeeNumber,
        changedFields,
        hasEmail: Boolean(nextEmail),
      },
    })
  )

  revalidatePath(
    toLocaleOrgAppsRevalidatePattern(ORG_APPS_HRM_EMPLOYEES),
    "page"
  )

  const locale = await getRequestAppLocale()
  redirect(
    toLocalePath(
      locale,
      organizationHrmEmployeePath(orgSlug, parsed.data.employeeId)
    )
  )
}

export async function archiveEmployeeAction(
  _prev: EmployeeMutationFormState | undefined,
  formData: FormData
): Promise<EmployeeMutationFormState> {
  const gate = await requireEmployeeRecordMutationGate(formData, {
    permission: "update",
    errorMessage: "HRM workforce update permission required to archive.",
  })
  if (!gate.ok) return gate.response
  const { orgSlug, organizationId, userId, sessionId } = gate

  const parsed = archiveEmployeeFormSchema.safeParse({
    employeeId: formData.get("employeeId"),
    archivedReason: formData.get("archivedReason"),
  })

  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      employeeId: fe.employeeId?.[0],
      archivedReason: fe.archivedReason?.[0],
    })
  }

  const [existing] = await db
    .select({
      id: hrmEmployee.id,
      archivedAt: hrmEmployee.archivedAt,
      employeeNumber: hrmEmployee.employeeNumber,
      employmentStatus: hrmEmployee.employmentStatus,
      currentEmploymentContractId: hrmEmployee.currentEmploymentContractId,
    })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        eq(hrmEmployee.id, parsed.data.employeeId)
      )
    )
    .limit(1)

  if (!existing) {
    return hrmActionFailure({ form: "Employee not found." })
  }
  if (existing.archivedAt) {
    return hrmActionFailure({ form: "Employee is already archived." })
  }

  const archivedAt = new Date()

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(hrmEmployee)
        .set({
          archivedAt,
          archivedByUserId: userId,
          archivedReason: parsed.data.archivedReason ?? null,
          employmentStatus: "terminated",
          updatedByUserId: userId,
        })
        .where(eq(hrmEmployee.id, parsed.data.employeeId))

      await recordEmployeeLifecycleEvent(
        {
          organizationId,
          employeeId: parsed.data.employeeId,
          kind: "separation",
          previousStatus: existing.employmentStatus,
          newStatus: "terminated",
          effectiveDate: archivedAt,
          reason: parsed.data.archivedReason ?? null,
          actorUserId: userId,
          isEffectiveDated: true,
        },
        tx
      )

      await recordEmployeeRecordChangeHistory(
        {
          organizationId,
          employeeId: parsed.data.employeeId,
          changedByUserId: userId,
          changes: [
            {
              fieldName: "employmentStatus",
              oldValue: existing.employmentStatus,
              newValue: "terminated",
            },
            {
              fieldName: "archivedAt",
              oldValue: null,
              newValue: archivedAt.toISOString(),
            },
            {
              fieldName: "archivedReason",
              oldValue: null,
              newValue: parsed.data.archivedReason ?? null,
            },
          ],
          meta: {
            effectiveDate: archivedAt,
            reason: parsed.data.archivedReason ?? null,
          },
        },
        tx
      )

      await insertDefaultOffboardingInstance(tx, {
        organizationId,
        employeeId: parsed.data.employeeId,
        terminationDate: archivedAt,
        createdByUserId: userId,
        contractId: existing.currentEmploymentContractId,
      })
    })
  } catch (err) {
    logUnexpectedServerError("archiveEmployeeAction", err, {
      organizationId,
      employeeId: parsed.data.employeeId,
    })
    return hrmActionFailure({ form: "Could not archive employee. Try again." })
  }

  after(async () => {
    await terminateBenefitEnrollmentsForEmploymentEnd({
      organizationId,
      employeeId: parsed.data.employeeId,
      terminatedAt: archivedAt,
      updatedByUserId: userId,
    })
    await writeIamAuditEventFromNextHeaders({
      action: HRM_EMPLOYEE_RECORDS_AUDIT.employee.deprecate,
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "hrm_employee",
      resourceId: parsed.data.employeeId,
      metadata: {
        employeeNumber: existing.employeeNumber,
        hasArchivedReason: Boolean(parsed.data.archivedReason),
      },
    })
  })

  revalidatePath(
    toLocaleOrgAppsRevalidatePattern(ORG_APPS_HRM_EMPLOYEES),
    "page"
  )

  const locale = await getRequestAppLocale()
  redirect(
    toLocalePath(
      locale,
      organizationHrmEmployeePath(orgSlug, parsed.data.employeeId)
    )
  )
}

/**
 * Rehire a separated employee (HRM-EMP-REC-016).
 * Clears archived status, resets employment to active, preserves full history.
 */
export async function rehireEmployeeAction(
  _prev: EmployeeMutationFormState | undefined,
  formData: FormData
): Promise<EmployeeMutationFormState> {
  const gate = await requireEmployeeRecordMutationGate(formData, {
    permission: "update",
    errorMessage: "HRM workforce update permission required to rehire.",
  })
  if (!gate.ok) return gate.response
  const { orgSlug, organizationId, userId, sessionId } = gate

  const parsed = rehireEmployeeFormSchema.safeParse({
    employeeId: formData.get("employeeId"),
    rehireDate: formData.get("rehireDate"),
    reason: formData.get("reason"),
  })

  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      form: fe.employeeId?.[0] ?? fe.rehireDate?.[0] ?? fe.reason?.[0],
    })
  }

  const result = await rehireEmployeeMutation({
    organizationId,
    employeeId: parsed.data.employeeId,
    actorUserId: userId,
    rehireDate: new Date(parsed.data.rehireDate),
    reason: parsed.data.reason ?? null,
  })

  if (!result.ok) {
    const msg =
      result.code === "not_found"
        ? "Employee not found."
        : result.code === "not_archived"
          ? "This employee is still active and cannot be rehired."
          : "Could not rehire employee. Try again."
    return hrmActionFailure({ form: msg })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_EMPLOYEE_RECORDS_AUDIT.employee.create_rehire,
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "hrm_employee",
      resourceId: parsed.data.employeeId,
      metadata: {
        rehireDate: parsed.data.rehireDate,
        hasReason: Boolean(parsed.data.reason),
      },
    })
  )

  revalidatePath(
    toLocaleOrgAppsRevalidatePattern(ORG_APPS_HRM_EMPLOYEES),
    "page"
  )

  const locale = await getRequestAppLocale()
  redirect(
    toLocalePath(
      locale,
      organizationHrmEmployeePath(orgSlug, parsed.data.employeeId)
    )
  )
}
