"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { ORG_DASHBOARD_HRM_EMPLOYEES } from "#lib/dashboard-module-paths"
import { db } from "#lib/db"
import { hrmEmployee, hrmEmployeeChangeHistory } from "#lib/db/schema"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import {
  toLocaleOrgDashboardRevalidatePattern,
  toLocalePath,
} from "#lib/i18n/locales.shared"

import { organizationHrmEmployeePath } from "../constants"
import { requireHrmOrgTenantFromForm } from "../data/hrm-action-guard.server"
import { assertOptionalHrmPlacementFkBelongsToOrg } from "../data/hrm-org-fk.server"
import {
  archiveEmployeeFormSchema,
  createEmployeeFormSchema,
  updateEmployeeFormSchema,
} from "../schemas/employee.schema"
import { hrmActionFailure } from "../schemas/hrm-action-result.shared"
import type { EmployeeMutationFormState } from "../types"

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  )
}

export async function createEmployeeAction(
  _prev: EmployeeMutationFormState | undefined,
  formData: FormData
): Promise<EmployeeMutationFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const { session, orgSlug } = gate
  const { organizationId, userId, sessionId } = session

  const parsed = createEmployeeFormSchema.safeParse({
    employeeNumber: formData.get("employeeNumber"),
    legalName: formData.get("legalName"),
    preferredName: formData.get("preferredName"),
    email: formData.get("email"),
    currentDepartmentId: formData.get("currentDepartmentId"),
    currentPositionId: formData.get("currentPositionId"),
    currentJobGradeId: formData.get("currentJobGradeId"),
  })

  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      employeeNumber: fe.employeeNumber?.[0],
      legalName: fe.legalName?.[0],
      email: fe.email?.[0],
      form:
        fe.currentDepartmentId?.[0] ??
        fe.currentPositionId?.[0] ??
        fe.currentJobGradeId?.[0],
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

  let row: { id: string }
  try {
    ;[row] = await db
      .insert(hrmEmployee)
      .values({
        organizationId,
        employeeNumber: parsed.data.employeeNumber,
        legalName: parsed.data.legalName,
        preferredName: parsed.data.preferredName ?? null,
        email: parsed.data.email ?? null,
        currentDepartmentId: parsed.data.currentDepartmentId ?? null,
        currentPositionId: parsed.data.currentPositionId ?? null,
        currentJobGradeId: parsed.data.currentJobGradeId ?? null,
        createdByUserId: userId,
        updatedByUserId: userId,
      })
      .returning({ id: hrmEmployee.id })
  } catch (err) {
    if (isUniqueViolation(err)) {
      return hrmActionFailure({
        employeeNumber: "Employee number already exists for this organization.",
      })
    }
    return hrmActionFailure({ form: "Could not create employee. Try again." })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.employee.create",
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
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_EMPLOYEES),
    "page"
  )

  const locale = await getRequestAppLocale()
  redirect(toLocalePath(locale, organizationHrmEmployeePath(orgSlug, row.id)))
}

export async function updateEmployeeAction(
  _prev: EmployeeMutationFormState | undefined,
  formData: FormData
): Promise<EmployeeMutationFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const { session, orgSlug } = gate
  const { organizationId, userId, sessionId } = session

  const parsed = updateEmployeeFormSchema.safeParse({
    employeeId: formData.get("employeeId"),
    employeeNumber: formData.get("employeeNumber"),
    legalName: formData.get("legalName"),
    preferredName: formData.get("preferredName"),
    email: formData.get("email"),
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
  const nextEmail = parsed.data.email ?? null
  const nextDept = parsed.data.currentDepartmentId ?? null
  const nextPos = parsed.data.currentPositionId ?? null
  const nextGrade = parsed.data.currentJobGradeId ?? null

  const changedFields: string[] = []
  if (existing.employeeNumber !== parsed.data.employeeNumber) {
    changedFields.push("employeeNumber")
  }
  if (existing.legalName !== parsed.data.legalName) {
    changedFields.push("legalName")
  }
  if ((existing.preferredName ?? null) !== nextPreferred) {
    changedFields.push("preferredName")
  }
  if ((existing.email ?? null) !== nextEmail) {
    changedFields.push("email")
  }
  if ((existing.currentDepartmentId ?? null) !== nextDept) {
    changedFields.push("currentDepartmentId")
  }
  if ((existing.currentPositionId ?? null) !== nextPos) {
    changedFields.push("currentPositionId")
  }
  if ((existing.currentJobGradeId ?? null) !== nextGrade) {
    changedFields.push("currentJobGradeId")
  }

  try {
    await db
      .update(hrmEmployee)
      .set({
        employeeNumber: parsed.data.employeeNumber,
        legalName: parsed.data.legalName,
        preferredName: nextPreferred,
        email: nextEmail,
        currentDepartmentId: nextDept,
        currentPositionId: nextPos,
        currentJobGradeId: nextGrade,
        updatedByUserId: userId,
      })
      .where(eq(hrmEmployee.id, parsed.data.employeeId))

    const historyRows: {
      fieldName: string
      oldValue: unknown
      newValue: unknown
    }[] = []
    if (existing.employeeNumber !== parsed.data.employeeNumber) {
      historyRows.push({
        fieldName: "employeeNumber",
        oldValue: existing.employeeNumber,
        newValue: parsed.data.employeeNumber,
      })
    }
    if (existing.legalName !== parsed.data.legalName) {
      historyRows.push({
        fieldName: "legalName",
        oldValue: existing.legalName,
        newValue: parsed.data.legalName,
      })
    }
    if ((existing.preferredName ?? null) !== nextPreferred) {
      historyRows.push({
        fieldName: "preferredName",
        oldValue: existing.preferredName,
        newValue: nextPreferred,
      })
    }
    if ((existing.email ?? null) !== nextEmail) {
      historyRows.push({
        fieldName: "email",
        oldValue: existing.email,
        newValue: nextEmail,
      })
    }
    if ((existing.currentDepartmentId ?? null) !== nextDept) {
      historyRows.push({
        fieldName: "currentDepartmentId",
        oldValue: existing.currentDepartmentId,
        newValue: nextDept,
      })
    }
    if ((existing.currentPositionId ?? null) !== nextPos) {
      historyRows.push({
        fieldName: "currentPositionId",
        oldValue: existing.currentPositionId,
        newValue: nextPos,
      })
    }
    if ((existing.currentJobGradeId ?? null) !== nextGrade) {
      historyRows.push({
        fieldName: "currentJobGradeId",
        oldValue: existing.currentJobGradeId,
        newValue: nextGrade,
      })
    }
    for (const h of historyRows) {
      await db.insert(hrmEmployeeChangeHistory).values({
        id: crypto.randomUUID(),
        organizationId,
        employeeId: parsed.data.employeeId,
        fieldName: h.fieldName,
        oldValue: h.oldValue === undefined ? null : h.oldValue,
        newValue: h.newValue === undefined ? null : h.newValue,
        changedByUserId: userId,
      })
    }
  } catch (err) {
    if (isUniqueViolation(err)) {
      return hrmActionFailure({
        employeeNumber: "Employee number already exists for this organization.",
      })
    }
    return hrmActionFailure({ form: "Could not update employee. Try again." })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.employee.update",
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
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_EMPLOYEES),
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
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const { session, orgSlug } = gate
  const { organizationId, userId, sessionId } = session

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
    await db
      .update(hrmEmployee)
      .set({
        archivedAt,
        archivedByUserId: userId,
        archivedReason: parsed.data.archivedReason ?? null,
        updatedByUserId: userId,
      })
      .where(eq(hrmEmployee.id, parsed.data.employeeId))
  } catch {
    return hrmActionFailure({ form: "Could not archive employee. Try again." })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.employee.archive",
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
  )

  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_EMPLOYEES),
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
