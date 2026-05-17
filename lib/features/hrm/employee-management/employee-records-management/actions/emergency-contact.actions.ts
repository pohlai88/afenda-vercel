"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, eq, isNull } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { ORG_DASHBOARD_HRM_EMPLOYEE_DETAIL } from "#lib/dashboard-module-paths"
import { db } from "#lib/db"
import { hrmEmployee, hrmEmployeeEmergencyContact } from "#lib/db/schema"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import { requireEmployeeRecordMutationGate } from "../data/employee-record-action-guard.server"
import { hrmActionFailure } from "../../../hrm-action-result.shared"
import type { EmployeeMasterMutationFormState } from "../../../types"
import {
  archiveEmergencyContactFormSchema,
  upsertEmergencyContactFormSchema,
} from "../schemas/emergency-contact.schema"

/**
 * Create or update an emergency contact for an employee. (HRM-EMP-REC-006)
 * When `contactId` is provided the row is updated; otherwise a new row is inserted.
 * If `isPrimary` is set, any existing primary contact for the employee is
 * demoted first within the same transaction.
 */
export async function upsertEmergencyContactAction(
  _prev: EmployeeMasterMutationFormState | undefined,
  formData: FormData
): Promise<EmployeeMasterMutationFormState> {
  const gate = await requireEmployeeRecordMutationGate(formData, {
    permission: "update",
    errorMessage: "HRM employee update permission required.",
  })
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = upsertEmergencyContactFormSchema.safeParse({
    employeeId: formData.get("employeeId"),
    contactId: formData.get("contactId"),
    legalName: formData.get("legalName"),
    relationship: formData.get("relationship"),
    phone: formData.get("phone"),
    alternatePhone: formData.get("alternatePhone"),
    email: formData.get("email"),
    isPrimary: formData.get("isPrimary"),
  })

  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      form:
        fe.legalName?.[0] ??
        fe.relationship?.[0] ??
        fe.phone?.[0] ??
        fe.email?.[0],
    })
  }

  const [employee] = await db
    .select({ id: hrmEmployee.id })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        eq(hrmEmployee.id, parsed.data.employeeId)
      )
    )
    .limit(1)

  if (!employee) {
    return hrmActionFailure({ form: "Employee not found." })
  }

  let contactId = parsed.data.contactId

  await db.transaction(async (tx) => {
    if (parsed.data.isPrimary) {
      await tx
        .update(hrmEmployeeEmergencyContact)
        .set({ isPrimary: false })
        .where(
          and(
            eq(hrmEmployeeEmergencyContact.organizationId, organizationId),
            eq(hrmEmployeeEmergencyContact.employeeId, parsed.data.employeeId),
            isNull(hrmEmployeeEmergencyContact.archivedAt)
          )
        )
    }

    if (contactId) {
      await tx
        .update(hrmEmployeeEmergencyContact)
        .set({
          legalName: parsed.data.legalName,
          relationship: parsed.data.relationship,
          phone: parsed.data.phone,
          alternatePhone: parsed.data.alternatePhone ?? null,
          email: parsed.data.email ?? null,
          isPrimary: parsed.data.isPrimary,
          updatedByUserId: userId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(hrmEmployeeEmergencyContact.organizationId, organizationId),
            eq(hrmEmployeeEmergencyContact.id, contactId)
          )
        )
    } else {
      const [inserted] = await tx
        .insert(hrmEmployeeEmergencyContact)
        .values({
          organizationId,
          employeeId: parsed.data.employeeId,
          legalName: parsed.data.legalName,
          relationship: parsed.data.relationship,
          phone: parsed.data.phone,
          alternatePhone: parsed.data.alternatePhone ?? null,
          email: parsed.data.email ?? null,
          isPrimary: parsed.data.isPrimary,
          createdByUserId: userId,
          updatedByUserId: userId,
        })
        .returning({ id: hrmEmployeeEmergencyContact.id })
      contactId = inserted.id
    }
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: parsed.data.contactId
        ? "erp.hrm.employee.emergency_contact.update"
        : "erp.hrm.employee.emergency_contact.create",
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "hrm_employee",
      resourceId: parsed.data.employeeId,
      metadata: {
        contactId,
        relationship: parsed.data.relationship,
        isPrimary: parsed.data.isPrimary,
      },
    })
  )

  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_EMPLOYEE_DETAIL),
    "page"
  )

  return { ok: true }
}

/** Archive (soft-delete) an emergency contact. */
export async function archiveEmergencyContactAction(
  _prev: EmployeeMasterMutationFormState | undefined,
  formData: FormData
): Promise<EmployeeMasterMutationFormState> {
  const gate = await requireEmployeeRecordMutationGate(formData, {
    permission: "update",
    errorMessage: "HRM employee update permission required.",
  })
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = archiveEmergencyContactFormSchema.safeParse({
    employeeId: formData.get("employeeId"),
    contactId: formData.get("contactId"),
  })

  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid request." })
  }

  await db
    .update(hrmEmployeeEmergencyContact)
    .set({ archivedAt: new Date(), updatedByUserId: userId })
    .where(
      and(
        eq(hrmEmployeeEmergencyContact.organizationId, organizationId),
        eq(hrmEmployeeEmergencyContact.id, parsed.data.contactId),
        eq(hrmEmployeeEmergencyContact.employeeId, parsed.data.employeeId)
      )
    )

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.employee.emergency_contact.archive",
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "hrm_employee",
      resourceId: parsed.data.employeeId,
      metadata: { contactId: parsed.data.contactId },
    })
  )

  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_EMPLOYEE_DETAIL),
    "page"
  )

  return { ok: true }
}
