"use server"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmShiftRecurrenceRule } from "#lib/db/schema"

import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { SftRecurrenceMutationFormState } from "../../../types"
import { HRM_SFT_AUDIT } from "../sft.contract"
import {
  applyRecurrenceRuleSchema,
  applyRotationCycleSchema,
  createRecurrenceRuleSchema,
} from "../schemas/sft.schema"
import {
  applyRecurrenceRule,
  applyRotationCycle,
} from "../data/sft-recurrence.server"
import { revalidateSftSurfaces } from "../data/sft-revalidate.server"

export async function createRecurrenceRuleAction(
  _prev: SftRecurrenceMutationFormState | undefined,
  formData: FormData
): Promise<SftRecurrenceMutationFormState> {
  const gate = await requireHrmPermission({
    object: "shift_schedule",
    function: "create",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate

  const parsed = createRecurrenceRuleSchema.safeParse({
    employeeId: formData.get("employeeId"),
    shiftTemplateId: formData.get("shiftTemplateId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") || null,
    weekday: formData.get("weekday"),
  })

  if (!parsed.success) {
    return hrmActionFailure({ form: parsed.error.issues[0]?.message })
  }

  const ruleId = crypto.randomUUID()
  await db.insert(hrmShiftRecurrenceRule).values({
    id: ruleId,
    organizationId: session.organizationId,
    employeeId: parsed.data.employeeId,
    shiftTemplateId: parsed.data.shiftTemplateId,
    startDate: parsed.data.startDate,
    endDate: parsed.data.endDate ?? null,
    weekday: parsed.data.weekday,
    createdByUserId: session.userId,
    updatedByUserId: session.userId,
  })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_SFT_AUDIT.recurrenceCreate,
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    organizationId: session.organizationId,
    resourceType: "hrm_shift_recurrence_rule",
    resourceId: ruleId,
    metadata: {
      employeeId: parsed.data.employeeId,
      shiftTemplateId: parsed.data.shiftTemplateId,
      weekday: parsed.data.weekday,
    },
  })

  revalidateSftSurfaces()
  return { ok: true, applied: 0, skipped: 0 }
}

export async function applyRecurrenceRuleAction(
  _prev: SftRecurrenceMutationFormState | undefined,
  formData: FormData
): Promise<SftRecurrenceMutationFormState> {
  const gate = await requireHrmPermission({
    object: "shift_schedule",
    function: "update",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate

  const parsed = applyRecurrenceRuleSchema.safeParse({
    ruleId: formData.get("ruleId"),
    rangeStart: formData.get("rangeStart"),
    rangeEnd: formData.get("rangeEnd"),
  })

  if (!parsed.success) {
    return hrmActionFailure({ form: parsed.error.issues[0]?.message })
  }

  const result = await applyRecurrenceRule({
    organizationId: session.organizationId,
    ruleId: parsed.data.ruleId,
    rangeStart: parsed.data.rangeStart,
    rangeEnd: parsed.data.rangeEnd,
    actorUserId: session.userId,
  })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_SFT_AUDIT.recurrenceApply,
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    organizationId: session.organizationId,
    resourceType: "hrm_shift_recurrence_rule",
    resourceId: parsed.data.ruleId,
    metadata: result,
  })

  revalidateSftSurfaces()
  return { ok: true, ...result }
}

export async function applyRotationCycleAction(
  _prev: SftRecurrenceMutationFormState | undefined,
  formData: FormData
): Promise<SftRecurrenceMutationFormState> {
  const gate = await requireHrmPermission({
    object: "shift_schedule",
    function: "update",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate

  const parsed = applyRotationCycleSchema.safeParse({
    rotationCycleId: formData.get("rotationCycleId"),
    employeeId: formData.get("employeeId"),
    rangeStart: formData.get("rangeStart"),
    rangeEnd: formData.get("rangeEnd"),
  })

  if (!parsed.success) {
    return hrmActionFailure({ form: parsed.error.issues[0]?.message })
  }

  const result = await applyRotationCycle({
    organizationId: session.organizationId,
    rotationCycleId: parsed.data.rotationCycleId,
    employeeId: parsed.data.employeeId,
    rangeStart: parsed.data.rangeStart,
    rangeEnd: parsed.data.rangeEnd,
    actorUserId: session.userId,
  })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_SFT_AUDIT.rotationApply,
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    organizationId: session.organizationId,
    resourceType: "hrm_shift_rotation_cycle",
    resourceId: parsed.data.rotationCycleId,
    metadata: result,
  })

  revalidateSftSurfaces()
  return { ok: true, ...result }
}
