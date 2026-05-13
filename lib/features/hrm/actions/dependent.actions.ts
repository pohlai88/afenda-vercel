"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { ORG_DASHBOARD_HRM_EMPLOYEE_DETAIL } from "#lib/dashboard-module-paths"
import { db } from "#lib/db"
import { hrmDependent, hrmEmployee } from "#lib/db/schema"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import { requireHrmOrgTenantFromForm } from "../data/hrm-action-guard.server"
import {
  archiveDependentFormSchema,
  createDependentFormSchema,
} from "../schemas/dependent.schema"
import { hrmActionFailure } from "../schemas/hrm-action-result.shared"
import type { ContractMutationFormState } from "../types"

function revalidateEmployeeDetailSurface() {
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_EMPLOYEE_DETAIL),
    "page"
  )
}

export async function createDependentAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const { session } = gate
  const { organizationId, userId, sessionId } = session

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

  const [emp] = await db
    .select({ id: hrmEmployee.id })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        eq(hrmEmployee.id, parsed.data.employeeId)
      )
    )
    .limit(1)
  if (!emp) {
    return hrmActionFailure({ form: "Employee not found." })
  }

  const id = crypto.randomUUID()
  const dob =
    parsed.data.dateOfBirth && parsed.data.dateOfBirth.length === 10
      ? new Date(`${parsed.data.dateOfBirth}T00:00:00.000Z`)
      : null

  await db.insert(hrmDependent).values({
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

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.dependent.create",
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
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const { session } = gate
  const { organizationId, userId, sessionId } = session

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

  await db
    .update(hrmDependent)
    .set({
      archivedAt: new Date(),
      updatedByUserId: userId,
      updatedAt: new Date(),
    })
    .where(eq(hrmDependent.id, parsed.data.dependentId))

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.dependent.archive",
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
