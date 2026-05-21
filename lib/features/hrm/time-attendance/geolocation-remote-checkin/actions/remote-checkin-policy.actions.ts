"use server"

import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { RemoteCheckinPolicyMutationFormState } from "../../../types"
import { upsertRemoteCheckinPolicy } from "../data/remote-checkin-policy-commands.server"
import { upsertRemoteCheckinPolicyFormSchema } from "../schemas/geolocation.schema"

export async function upsertRemoteCheckinPolicyAction(
  _prev: RemoteCheckinPolicyMutationFormState | undefined,
  formData: FormData
): Promise<RemoteCheckinPolicyMutationFormState> {
  const gate = await requireHrmPermission({
    object: "remote_checkin",
    function: "update",
    errorMessage:
      "Remote check-in update permission required to configure policies.",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { organizationId, userId, sessionId } = gate.session

  const parsed = upsertRemoteCheckinPolicyFormSchema.safeParse({
    policyId: formData.get("policyId") || null,
    scopeKind: formData.get("scopeKind"),
    scopeRef: formData.get("scopeRef") || null,
    minGpsAccuracyMeters: formData.get("minGpsAccuracyMeters") ?? 100,
    allowedRadiusBufferMeters: formData.get("allowedRadiusBufferMeters") ?? 50,
    shiftWindowMinutes: formData.get("shiftWindowMinutes") ?? 60,
    breakWindowMinutes: formData.get("breakWindowMinutes") ?? 30,
    requireRegisteredDevice:
      formData.get("requireRegisteredDevice") === "on" ||
      formData.get("requireRegisteredDevice") === "true",
    requireSelfie:
      formData.get("requireSelfie") === "on" ||
      formData.get("requireSelfie") === "true",
    detectSpoofing:
      formData.get("detectSpoofing") === "on" ||
      formData.get("detectSpoofing") === "true",
    allowEligibilityException:
      formData.get("allowEligibilityException") === "on" ||
      formData.get("allowEligibilityException") === "true",
    isActive:
      formData.get("isActive") === "on" || formData.get("isActive") === "true",
  })
  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      scopeKind: errs.scopeKind?.[0],
      scopeRef: errs.scopeRef?.[0],
      minGpsAccuracyMeters: errs.minGpsAccuracyMeters?.[0],
      allowedRadiusBufferMeters: errs.allowedRadiusBufferMeters?.[0],
      breakWindowMinutes: errs.breakWindowMinutes?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  return upsertRemoteCheckinPolicy(
    { organizationId, userId, sessionId },
    parsed.data
  )
}
