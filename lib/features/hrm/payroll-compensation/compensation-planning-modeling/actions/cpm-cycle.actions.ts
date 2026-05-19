"use server"

import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmCompensationCycle } from "#lib/db/schema"

import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import { HRM_COMPENSATION_PLANNING_AUDIT } from "../compensation-planning.contract"
import { revalidateCompensationPlanningSurfaces } from "../data/cpm-revalidate.server"
import { syncCompensationCycleParticipants } from "../data/cpm.queries.server"
import {
  createCompensationCycleFormSchema,
  type CreateCompensationCycleFormState,
} from "../schemas/cpm.schema"

export async function createCompensationCycleAction(
  _prev: CreateCompensationCycleFormState | undefined,
  formData: FormData
): Promise<CreateCompensationCycleFormState> {
  const gate = await requireHrmPermission({
    object: "compensation_planning",
    function: "create",
    errorMessage:
      "Compensation planning create permission required to add cycles.",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })

  const { session } = gate
  const { organizationId, userId } = session

  const parsed = createCompensationCycleFormSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    cycleType: formData.get("cycleType"),
    effectiveDate: formData.get("effectiveDate"),
  })

  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      code: errs.code?.[0],
      name: errs.name?.[0],
      cycleType: errs.cycleType?.[0],
      effectiveDate: errs.effectiveDate?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const { data } = parsed

  const existing = await db.query.hrmCompensationCycle.findFirst({
    where: and(
      eq(hrmCompensationCycle.organizationId, organizationId),
      eq(hrmCompensationCycle.code, data.code)
    ),
    columns: { id: true },
  })

  if (existing) {
    return hrmActionFailure({ code: "A cycle with this code already exists." })
  }

  const cycleId = crypto.randomUUID()

  await db.insert(hrmCompensationCycle).values({
    id: cycleId,
    organizationId,
    code: data.code,
    name: data.name,
    cycleType: data.cycleType,
    effectiveDate: data.effectiveDate,
    state: "draft",
    eligibilityRules: {},
    createdByUserId: userId,
    updatedByUserId: userId,
  })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_COMPENSATION_PLANNING_AUDIT.cycle.create,
    organizationId,
    actorUserId: userId,
    actorSessionId: session.sessionId,
    resourceType: "hrm_compensation_cycle",
    resourceId: cycleId,
    metadata: {
      code: data.code,
      cycleType: data.cycleType,
      effectiveDate: data.effectiveDate,
    },
  })

  revalidateCompensationPlanningSurfaces()
  return { ok: true, cycleId }
}

export async function syncCompensationCycleParticipantsAction(
  cycleId: string
): Promise<{ ok: true; processed: number } | { ok: false; error: string }> {
  const gate = await requireHrmPermission({
    object: "compensation_planning",
    function: "update",
    errorMessage:
      "Compensation planning update permission required to refresh participants.",
  })
  if (!gate.ok) return { ok: false, error: gate.error }

  const { organizationId } = gate.session
  const trimmedCycleId = cycleId.trim()
  if (!trimmedCycleId) {
    return { ok: false, error: "Cycle id is required." }
  }

  const result = await syncCompensationCycleParticipants(
    organizationId,
    trimmedCycleId
  )

  revalidateCompensationPlanningSurfaces()
  return { ok: true, processed: result.processed }
}
