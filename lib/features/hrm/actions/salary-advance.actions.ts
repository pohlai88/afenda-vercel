"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { canActInOrganization } from "#lib/auth/permission.server"
import { ORG_DASHBOARD_HRM_ADVANCES } from "#lib/dashboard-module-paths"
import { db } from "#lib/db"
import { hrmEmployee, hrmSalaryAdvance } from "#lib/db/schema"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import { requireHrmOrgTenantFromForm } from "../data/hrm-action-guard.server"
import {
  decideSalaryAdvanceFormSchema,
  requestSalaryAdvanceFormSchema,
} from "../schemas/salary-advance.schema"
import { hrmActionFailure } from "../schemas/hrm-action-result.shared"
import type { ContractMutationFormState } from "../types"

function revalidateAdvances() {
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_ADVANCES),
    "page"
  )
}

export async function requestSalaryAdvanceAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const { session } = gate
  const { organizationId, userId, sessionId, user } = session

  const parsed = requestSalaryAdvanceFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    employeeId: formData.get("employeeId"),
    amount: formData.get("amount"),
    reason: formData.get("reason"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid advance request." })
  }

  const [emp] = await db
    .select({
      id: hrmEmployee.id,
      linkedUserId: hrmEmployee.linkedUserId,
    })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        eq(hrmEmployee.id, parsed.data.employeeId)
      )
    )
    .limit(1)
  if (!emp) return hrmActionFailure({ form: "Employee not found." })

  const isAdmin = await canActInOrganization(
    userId,
    user.role,
    organizationId,
    "admin"
  )
  if (!isAdmin) {
    if (!emp.linkedUserId || emp.linkedUserId !== userId) {
      return hrmActionFailure({
        form: "You can only request an advance for your own linked employee record.",
      })
    }
  }

  const advanceId = crypto.randomUUID()
  await db.insert(hrmSalaryAdvance).values({
    id: advanceId,
    organizationId,
    employeeId: emp.id,
    amount: parsed.data.amount,
    currency: "MYR",
    reason: parsed.data.reason?.trim() || null,
    state: "pending",
    requestedByUserId: userId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.salary_advance.request",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_salary_advance",
      resourceId: advanceId,
      metadata: { employeeId: emp.id },
    })
  )

  revalidateAdvances()
  return { ok: true }
}

export async function decideSalaryAdvanceAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const { session } = gate
  const { organizationId, userId, sessionId, user } = session

  const isAdmin = await canActInOrganization(
    userId,
    user.role,
    organizationId,
    "admin"
  )
  if (!isAdmin) {
    return hrmActionFailure({ form: "Only an org admin can decide advances." })
  }

  const parsed = decideSalaryAdvanceFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    advanceId: formData.get("advanceId"),
    decision: formData.get("decision"),
    decisionNote: formData.get("decisionNote"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid decision payload." })
  }

  const [row] = await db
    .select({
      id: hrmSalaryAdvance.id,
      state: hrmSalaryAdvance.state,
    })
    .from(hrmSalaryAdvance)
    .where(
      and(
        eq(hrmSalaryAdvance.organizationId, organizationId),
        eq(hrmSalaryAdvance.id, parsed.data.advanceId)
      )
    )
    .limit(1)

  if (!row || row.state !== "pending") {
    return hrmActionFailure({ form: "Advance not found or not pending." })
  }

  const nextState = parsed.data.decision === "approve" ? "approved" : "rejected"
  const now = new Date()

  await db
    .update(hrmSalaryAdvance)
    .set({
      state: nextState,
      decidedByUserId: userId,
      decidedAt: now,
      decisionNote: parsed.data.decisionNote?.trim() || null,
      updatedAt: now,
    })
    .where(eq(hrmSalaryAdvance.id, parsed.data.advanceId))

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action:
        parsed.data.decision === "approve"
          ? "erp.hrm.salary_advance.approve"
          : "erp.hrm.salary_advance.reject",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_salary_advance",
      resourceId: parsed.data.advanceId,
      metadata: {},
    })
  )

  revalidateAdvances()
  return { ok: true }
}

/** RSC `<form action>` wrapper. */
export async function submitRequestSalaryAdvance(formData: FormData) {
  await requestSalaryAdvanceAction(undefined, formData)
}

/** RSC `<form action>` wrapper. */
export async function submitDecideSalaryAdvance(formData: FormData) {
  await decideSalaryAdvanceAction(undefined, formData)
}
