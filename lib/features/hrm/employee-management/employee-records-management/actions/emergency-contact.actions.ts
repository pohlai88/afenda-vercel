"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, eq, isNull } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { ORG_APPS_HRM_EMPLOYEE_DETAIL } from "#lib/org-apps-module-paths"
import { db } from "#lib/db"
import { hrmEmployeeEmergencyContact } from "#lib/db/schema"
import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"

import { requireEmployeeRecordMutationGate } from "../data/employee-record-action-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { EmployeeMasterMutationFormState } from "../../../types"
import { HRM_EMPLOYEE_RECORDS_AUDIT } from "../employee-records.contract"
import {
  mutableEmployeeRecordErrorMessage,
  requireMutableEmployeeRecord,
} from "../data/employee-record-mutability.server"
import { recordEmployeeRecordChangeHistory } from "../data/employee-record-history.server"
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

  const mutable = await requireMutableEmployeeRecord({
    organizationId,
    employeeId: parsed.data.employeeId,
  })
  if (!mutable.ok) {
    return hrmActionFailure({
      form: mutableEmployeeRecordErrorMessage(mutable),
    })
  }

  let contactId = parsed.data.contactId

  try {
    await db.transaction(async (tx) => {
      const [existing] = contactId
        ? await tx
            .select({
              legalName: hrmEmployeeEmergencyContact.legalName,
              relationship: hrmEmployeeEmergencyContact.relationship,
              phone: hrmEmployeeEmergencyContact.phone,
              alternatePhone: hrmEmployeeEmergencyContact.alternatePhone,
              email: hrmEmployeeEmergencyContact.email,
              isPrimary: hrmEmployeeEmergencyContact.isPrimary,
            })
            .from(hrmEmployeeEmergencyContact)
            .where(
              and(
                eq(hrmEmployeeEmergencyContact.organizationId, organizationId),
                eq(
                  hrmEmployeeEmergencyContact.employeeId,
                  parsed.data.employeeId
                ),
                eq(hrmEmployeeEmergencyContact.id, contactId),
                isNull(hrmEmployeeEmergencyContact.archivedAt)
              )
            )
            .limit(1)
        : [null]
      if (contactId && !existing) throw new Error("emergency_contact_not_found")

      if (parsed.data.isPrimary) {
        await tx
          .update(hrmEmployeeEmergencyContact)
          .set({ isPrimary: false })
          .where(
            and(
              eq(hrmEmployeeEmergencyContact.organizationId, organizationId),
              eq(
                hrmEmployeeEmergencyContact.employeeId,
                parsed.data.employeeId
              ),
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

      await recordEmployeeRecordChangeHistory(
        {
          organizationId,
          employeeId: parsed.data.employeeId,
          changedByUserId: userId,
          changes: [
            {
              fieldName: "emergencyContact.legalName",
              oldValue: existing?.legalName ?? null,
              newValue: parsed.data.legalName,
            },
            {
              fieldName: "emergencyContact.relationship",
              oldValue: existing?.relationship ?? null,
              newValue: parsed.data.relationship,
            },
            {
              fieldName: "emergencyContact.phone",
              oldValue: existing?.phone ?? null,
              newValue: parsed.data.phone,
            },
            {
              fieldName: "emergencyContact.alternatePhone",
              oldValue: existing?.alternatePhone ?? null,
              newValue: parsed.data.alternatePhone ?? null,
            },
            {
              fieldName: "emergencyContact.email",
              oldValue: existing?.email ?? null,
              newValue: parsed.data.email ?? null,
            },
            {
              fieldName: "emergencyContact.isPrimary",
              oldValue: existing?.isPrimary ?? null,
              newValue: parsed.data.isPrimary,
            },
          ],
        },
        tx
      )
    })
  } catch (err) {
    if (err instanceof Error && err.message === "emergency_contact_not_found") {
      return hrmActionFailure({ form: "Emergency contact not found." })
    }
    throw err
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: parsed.data.contactId
        ? HRM_EMPLOYEE_RECORDS_AUDIT.emergencyContact.update
        : HRM_EMPLOYEE_RECORDS_AUDIT.emergencyContact.create,
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
    toLocaleOrgAppsRevalidatePattern(ORG_APPS_HRM_EMPLOYEE_DETAIL),
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

  const mutable = await requireMutableEmployeeRecord({
    organizationId,
    employeeId: parsed.data.employeeId,
  })
  if (!mutable.ok) {
    return hrmActionFailure({
      form: mutableEmployeeRecordErrorMessage(mutable),
    })
  }

  const archivedAt = new Date()
  try {
    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: hrmEmployeeEmergencyContact.id })
        .from(hrmEmployeeEmergencyContact)
        .where(
          and(
            eq(hrmEmployeeEmergencyContact.organizationId, organizationId),
            eq(hrmEmployeeEmergencyContact.id, parsed.data.contactId),
            eq(hrmEmployeeEmergencyContact.employeeId, parsed.data.employeeId),
            isNull(hrmEmployeeEmergencyContact.archivedAt)
          )
        )
        .limit(1)
      if (!existing) throw new Error("emergency_contact_not_found")

      await tx
        .update(hrmEmployeeEmergencyContact)
        .set({ archivedAt, updatedByUserId: userId, updatedAt: archivedAt })
        .where(eq(hrmEmployeeEmergencyContact.id, parsed.data.contactId))
      await recordEmployeeRecordChangeHistory(
        {
          organizationId,
          employeeId: parsed.data.employeeId,
          changedByUserId: userId,
          changes: [
            {
              fieldName: "emergencyContact.archivedAt",
              oldValue: null,
              newValue: archivedAt.toISOString(),
            },
          ],
        },
        tx
      )
    })
  } catch (err) {
    if (err instanceof Error && err.message === "emergency_contact_not_found") {
      return hrmActionFailure({ form: "Emergency contact not found." })
    }
    throw err
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_EMPLOYEE_RECORDS_AUDIT.emergencyContact.deprecate,
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "hrm_employee",
      resourceId: parsed.data.employeeId,
      metadata: { contactId: parsed.data.contactId },
    })
  )

  revalidatePath(
    toLocaleOrgAppsRevalidatePattern(ORG_APPS_HRM_EMPLOYEE_DETAIL),
    "page"
  )

  return { ok: true }
}
