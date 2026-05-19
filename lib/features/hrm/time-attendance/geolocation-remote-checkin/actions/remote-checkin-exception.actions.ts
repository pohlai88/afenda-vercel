"use server"

import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { RemoteCheckinExceptionDecisionFormState } from "../../../types"
import { decideRemoteCheckinException } from "../data/remote-checkin-exception-commands.server"
import { remoteCheckinExceptionDecisionFormSchema } from "../schemas/geolocation.schema"

export async function decideRemoteCheckinExceptionAction(
  _prev: RemoteCheckinExceptionDecisionFormState | undefined,
  formData: FormData
): Promise<RemoteCheckinExceptionDecisionFormState> {
  const gate = await requireHrmPermission({
    object: "remote_checkin",
    function: "update",
    errorMessage:
      "Remote check-in update permission required to decide exceptions.",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { organizationId, userId, sessionId } = gate.session

  const parsed = remoteCheckinExceptionDecisionFormSchema.safeParse({
    exceptionId: formData.get("exceptionId"),
    decision: formData.get("decision"),
    decisionReason: formData.get("decisionReason") || null,
    correctedEventType: formData.get("correctedEventType") || null,
    correctedOccurredAtIso: formData.get("correctedOccurredAtIso") || null,
    correctedLatitude: formData.get("correctedLatitude") || null,
    correctedLongitude: formData.get("correctedLongitude") || null,
  })

  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      exceptionId: errs.exceptionId?.[0],
      decisionReason: errs.decisionReason?.[0],
      correctedLatitude: errs.correctedLatitude?.[0],
      correctedLongitude: errs.correctedLongitude?.[0],
      correctedEventType: errs.correctedEventType?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  return decideRemoteCheckinException(
    { organizationId, userId, sessionId },
    parsed.data
  )
}
