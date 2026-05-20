"use server"

import { eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmShiftSchedulingPolicy } from "#lib/db/schema"

import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { SftPolicyFormState } from "../../../types"
import { HRM_SFT_AUDIT } from "../sft.contract"
import { upsertShiftSchedulingPolicySchema } from "../schemas/sft.schema"
import { getOrCreateShiftSchedulingPolicy } from "../data/sft-policy.server"
import { revalidateSftSurfaces } from "../data/sft-revalidate.server"

export async function updateShiftSchedulingPolicyAction(
  _prev: SftPolicyFormState | undefined,
  formData: FormData
): Promise<SftPolicyFormState> {
  const gate = await requireHrmPermission({
    object: "shift_schedule",
    function: "update",
    errorMessage: "HRM shift schedule update permission required.",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate

  const parsed = upsertShiftSchedulingPolicySchema.safeParse({
    minRestMinutesBetweenShifts:
      formData.get("minRestMinutesBetweenShifts") ?? undefined,
    maxScheduledMinutesPerWeek:
      formData.get("maxScheduledMinutesPerWeek") ?? undefined,
    warnOnConflict: formData.get("warnOnConflict") ?? undefined,
    blockOnConflict: formData.get("blockOnConflict") ?? undefined,
  })

  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      minRestMinutesBetweenShifts: flat.minRestMinutesBetweenShifts?.[0],
      maxScheduledMinutesPerWeek: flat.maxScheduledMinutesPerWeek?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const existing = await getOrCreateShiftSchedulingPolicy(
    session.organizationId
  )

  await db
    .update(hrmShiftSchedulingPolicy)
    .set({
      minRestMinutesBetweenShifts: parsed.data.minRestMinutesBetweenShifts,
      maxScheduledMinutesPerWeek: parsed.data.maxScheduledMinutesPerWeek,
      warnOnConflict: parsed.data.warnOnConflict,
      blockOnConflict: parsed.data.blockOnConflict,
      updatedByUserId: session.userId,
      updatedAt: new Date(),
    })
    .where(eq(hrmShiftSchedulingPolicy.id, existing.id))

  await writeIamAuditEventFromNextHeaders({
    action: HRM_SFT_AUDIT.policyUpdate,
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    organizationId: session.organizationId,
    resourceType: "hrm_shift_scheduling_policy",
    resourceId: existing.id,
    metadata: {
      minRestMinutesBetweenShifts: parsed.data.minRestMinutesBetweenShifts,
      maxScheduledMinutesPerWeek: parsed.data.maxScheduledMinutesPerWeek,
    },
  })

  revalidateSftSurfaces()
  return { ok: true }
}
