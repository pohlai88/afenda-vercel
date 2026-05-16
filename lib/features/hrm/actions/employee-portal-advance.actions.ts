"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmSalaryAdvance } from "#lib/db/schema"
import { toLocalePortalRevalidatePattern } from "#lib/portal"

import { getEmployeePortalContext } from "../data/employee-portal-access.server"
import { withEmployeePortalActionSpan } from "../data/portal-mutation-tracing.server"
import { EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR } from "../data/employee-portal-access.shared"
import { insertSalaryAdvanceRow } from "../data/salary-advance-core.server"
import { employeePortalRequestAdvanceSchema } from "../schemas/salary-advance.schema"
import { hrmActionFailure } from "../schemas/hrm-action-result.shared"
import type { PortalAdvanceFormState } from "../types"

function revalidateAdvancePortal() {
  revalidatePath(toLocalePortalRevalidatePattern("/employee/advances"), "page")
}

export async function submitEmployeePortalRequestAdvance(
  _prev: PortalAdvanceFormState | undefined,
  formData: FormData
): Promise<PortalAdvanceFormState> {
  const rawPortalSlug = formData.get("portalSlug")
  if (typeof rawPortalSlug !== "string" || rawPortalSlug.trim() === "") {
    return hrmActionFailure({ form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR })
  }

  const context = await getEmployeePortalContext(rawPortalSlug)
  if (!context) {
    return hrmActionFailure({ form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR })
  }

  const parsed = employeePortalRequestAdvanceSchema.safeParse({
    amount: formData.get("amount"),
    reason: formData.get("reason"),
    installmentCount: formData.get("installmentCount") || undefined,
    firstPeriodEndIso: formData.get("firstPeriodEndIso") || undefined,
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      form: parsed.error.issues[0]?.message,
      amount: fe.amount?.[0],
      installmentCount: fe.installmentCount?.[0],
      firstPeriodEndIso: fe.firstPeriodEndIso?.[0],
      reason: fe.reason?.[0],
    })
  }

  return withEmployeePortalActionSpan(
    context,
    "advances",
    "request",
    async () => {
      const advanceId = await insertSalaryAdvanceRow({
        organizationId: context.portal.organizationId,
        employeeId: context.employee.id,
        amount: parsed.data.amount,
        reason: parsed.data.reason?.trim() || null,
        requestedByUserId: context.portal.userId,
        installmentCount: parsed.data.installmentCount ?? null,
        firstPeriodEndIso: parsed.data.firstPeriodEndIso ?? null,
      })

      after(() =>
        writeIamAuditEventFromNextHeaders({
          action: "erp.hrm.salary_advance.request",
          actorUserId: context.portal.userId,
          actorSessionId: context.portal.sessionId,
          organizationId: context.portal.organizationId,
          resourceType: "hrm_salary_advance",
          resourceId: advanceId,
          metadata: { source: "self_service", employeeId: context.employee.id },
        })
      )

      revalidateAdvancePortal()
      return { ok: true }
    }
  )
}

export async function submitEmployeePortalCancelPendingAdvance(
  _prev: PortalAdvanceFormState | undefined,
  formData: FormData
): Promise<PortalAdvanceFormState> {
  const rawPortalSlug = formData.get("portalSlug")
  const advanceId = formData.get("advanceId")
  if (typeof rawPortalSlug !== "string" || typeof advanceId !== "string") {
    return hrmActionFailure({ form: "Invalid cancel payload." })
  }

  const context = await getEmployeePortalContext(rawPortalSlug)
  if (!context) {
    return hrmActionFailure({ form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR })
  }

  const [row] = await db
    .select({
      id: hrmSalaryAdvance.id,
      state: hrmSalaryAdvance.state,
      requestedByUserId: hrmSalaryAdvance.requestedByUserId,
    })
    .from(hrmSalaryAdvance)
    .where(
      and(
        eq(hrmSalaryAdvance.organizationId, context.portal.organizationId),
        eq(hrmSalaryAdvance.id, advanceId),
        eq(hrmSalaryAdvance.employeeId, context.employee.id)
      )
    )
    .limit(1)

  if (!row || row.state !== "pending") {
    return hrmActionFailure({ form: "Only pending advances can be cancelled." })
  }
  if (row.requestedByUserId !== context.portal.userId) {
    return hrmActionFailure({ form: "You can only cancel your own requests." })
  }

  return withEmployeePortalActionSpan(
    context,
    "advances",
    "cancel",
    async () => {
      const now = new Date()
      await db
        .update(hrmSalaryAdvance)
        .set({ state: "cancelled", updatedAt: now })
        .where(eq(hrmSalaryAdvance.id, advanceId))

      after(() =>
        writeIamAuditEventFromNextHeaders({
          action: "erp.hrm.salary_advance.cancel",
          actorUserId: context.portal.userId,
          actorSessionId: context.portal.sessionId,
          organizationId: context.portal.organizationId,
          resourceType: "hrm_salary_advance",
          resourceId: advanceId,
          metadata: { source: "self_service", employeeId: context.employee.id },
        })
      )

      revalidateAdvancePortal()
      return { ok: true }
    }
  )
}
