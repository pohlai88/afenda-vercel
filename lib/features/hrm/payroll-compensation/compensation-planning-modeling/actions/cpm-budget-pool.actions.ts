"use server"

import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmCompensationBudgetPool, hrmCompensationCycle } from "#lib/db/schema"

import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import { HRM_COMPENSATION_PLANNING_AUDIT } from "../compensation-planning.contract"
import { revalidateCompensationPlanningSurfaces } from "../data/cpm-revalidate.server"
import {
  createCompensationBudgetPoolFormSchema,
  type CreateCompensationBudgetPoolFormState,
} from "../schemas/cpm.schema"

export async function createCompensationBudgetPoolAction(
  _prev: CreateCompensationBudgetPoolFormState | undefined,
  formData: FormData
): Promise<CreateCompensationBudgetPoolFormState> {
  const gate = await requireHrmPermission({
    object: "compensation_planning",
    function: "create",
    errorMessage:
      "Compensation planning create permission required to add budget pools.",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })

  const { session } = gate
  const { organizationId, userId } = session

  const parsed = createCompensationBudgetPoolFormSchema.safeParse({
    cycleId: formData.get("cycleId"),
    scopeType: formData.get("scopeType"),
    scopeId: formData.get("scopeId"),
    allocatedAmount: formData.get("allocatedAmount"),
    currency: formData.get("currency") || "MYR",
  })

  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      scopeType: errs.scopeType?.[0],
      scopeId: errs.scopeId?.[0],
      allocatedAmount: errs.allocatedAmount?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const { data } = parsed

  const cycle = await db.query.hrmCompensationCycle.findFirst({
    where: and(
      eq(hrmCompensationCycle.organizationId, organizationId),
      eq(hrmCompensationCycle.id, data.cycleId)
    ),
    columns: { id: true },
  })

  if (!cycle) {
    return hrmActionFailure({ form: "Compensation cycle not found." })
  }

  const poolId = crypto.randomUUID()

  try {
    await db.insert(hrmCompensationBudgetPool).values({
      id: poolId,
      organizationId,
      cycleId: data.cycleId,
      scopeType: data.scopeType,
      scopeId: data.scopeId,
      allocatedAmount: String(data.allocatedAmount),
      usedAmount: "0",
      currency: data.currency,
      createdByUserId: userId,
      updatedByUserId: userId,
    })
  } catch {
    return hrmActionFailure({
      form: "A budget pool for this scope already exists on the cycle.",
    })
  }

  await writeIamAuditEventFromNextHeaders({
    action: HRM_COMPENSATION_PLANNING_AUDIT.budget_pool.create,
    organizationId,
    actorUserId: userId,
    actorSessionId: session.sessionId,
    resourceType: "hrm_compensation_budget_pool",
    resourceId: poolId,
    metadata: {
      cycleId: data.cycleId,
      scopeType: data.scopeType,
      scopeId: data.scopeId,
      allocatedAmount: data.allocatedAmount,
      currency: data.currency,
    },
  })

  revalidateCompensationPlanningSurfaces()
  return { ok: true, poolId }
}
