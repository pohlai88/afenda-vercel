"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { ORG_APPS_HRM_EMPLOYEE_DETAIL } from "#lib/org-apps-module-paths"
import { db } from "#lib/db"
import { hrmDependent } from "#lib/db/schema"
import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"

import { requireEmployeeRecordMutationGate } from "../data/employee-record-action-guard.server"
import {
  archiveDependentFormSchema,
  createDependentFormSchema,
} from "../schemas/dependent.schema"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { ContractMutationFormState } from "../../../types"
import { HRM_EMPLOYEE_RECORDS_AUDIT } from "../employee-records.contract"
import {
  mutableEmployeeRecordErrorMessage,
  requireMutableEmployeeRecord,
} from "../data/employee-record-mutability.server"
import { recordEmployeeRecordChangeHistory } from "../data/employee-record-history.server"

function revalidateEmployeeDetailSurface() {
  revalidatePath(
    toLocaleOrgAppsRevalidatePattern(ORG_APPS_HRM_EMPLOYEE_DETAIL),
    "page"
  )
}

export async function createDependentAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireEmployeeRecordMutationGate(formData, {
    permission: "update",
    errorMessage: "HRM employee update permission required.",
  })
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = createDependentFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    employeeId: formData.get("employeeId"),
    legalName: formData.get("legalName"),
    relationship: formData.get("relationship"),
    dateOfBirth: formData.get("dateOfBirth"),
    taxDependent: formData.get("taxDependent"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid dependent input." })
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

  const id = crypto.randomUUID()
  const dob =
    parsed.data.dateOfBirth && parsed.data.dateOfBirth.length === 10
      ? new Date(`${parsed.data.dateOfBirth}T00:00:00.000Z`)
      : null

  await db.transaction(async (tx) => {
    await tx.insert(hrmDependent).values({
      id,
      organizationId,
      employeeId: parsed.data.employeeId,
      legalName: parsed.data.legalName,
      relationship: parsed.data.relationship,
      dateOfBirth: dob,
      taxDependent: parsed.data.taxDependent ?? false,
      createdByUserId: userId,
      updatedByUserId: userId,
    })
    await recordEmployeeRecordChangeHistory(
      {
        organizationId,
        employeeId: parsed.data.employeeId,
        changedByUserId: userId,
        changes: [
          {
            fieldName: "dependent.legalName",
            oldValue: null,
            newValue: parsed.data.legalName,
          },
          {
            fieldName: "dependent.relationship",
            oldValue: null,
            newValue: parsed.data.relationship,
          },
          {
            fieldName: "dependent.taxDependent",
            oldValue: null,
            newValue: parsed.data.taxDependent ?? false,
          },
        ],
      },
      tx
    )
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_EMPLOYEE_RECORDS_AUDIT.dependent.create,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_dependent",
      resourceId: id,
      metadata: { employeeId: parsed.data.employeeId },
    })
  )

  revalidateEmployeeDetailSurface()
  return { ok: true }
}

export async function archiveDependentAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireEmployeeRecordMutationGate(formData, {
    permission: "update",
    errorMessage: "HRM employee update permission required.",
  })
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = archiveDependentFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    dependentId: formData.get("dependentId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid request." })
  }

  const [row] = await db
    .select({
      id: hrmDependent.id,
      employeeId: hrmDependent.employeeId,
      archivedAt: hrmDependent.archivedAt,
    })
    .from(hrmDependent)
    .where(
      and(
        eq(hrmDependent.organizationId, organizationId),
        eq(hrmDependent.id, parsed.data.dependentId)
      )
    )
    .limit(1)

  if (!row || row.archivedAt) {
    return hrmActionFailure({ form: "Dependent not found." })
  }

  const mutable = await requireMutableEmployeeRecord({
    organizationId,
    employeeId: row.employeeId,
  })
  if (!mutable.ok) {
    return hrmActionFailure({
      form: mutableEmployeeRecordErrorMessage(mutable),
    })
  }

  const archivedAt = new Date()
  await db.transaction(async (tx) => {
    await tx
      .update(hrmDependent)
      .set({
        archivedAt,
        updatedByUserId: userId,
        updatedAt: archivedAt,
      })
      .where(eq(hrmDependent.id, parsed.data.dependentId))
    await recordEmployeeRecordChangeHistory(
      {
        organizationId,
        employeeId: row.employeeId,
        changedByUserId: userId,
        changes: [
          {
            fieldName: "dependent.archivedAt",
            oldValue: null,
            newValue: archivedAt.toISOString(),
          },
        ],
      },
      tx
    )
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_EMPLOYEE_RECORDS_AUDIT.dependent.deprecate,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_dependent",
      resourceId: parsed.data.dependentId,
      metadata: { employeeId: row.employeeId },
    })
  )

  revalidateEmployeeDetailSurface()
  return { ok: true }
}

/** RSC `<form action>` — Next form actions accept a single `FormData` argument. */
export async function submitCreateDependent(formData: FormData) {
  await createDependentAction(undefined, formData)
}

/** RSC `<form action>` wrapper. */
export async function submitArchiveDependent(formData: FormData) {
  await archiveDependentAction(undefined, formData)
}
