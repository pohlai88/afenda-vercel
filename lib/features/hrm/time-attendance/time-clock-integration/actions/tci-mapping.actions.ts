"use server"

import { requireOrgSession } from "#lib/auth"

import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import { upsertTimeClockMapping } from "../data/tci-mapping-commands.server"
import { upsertTimeClockMappingFormSchema } from "../schemas/tci.schema"

import type { TimeClockMutationFormState } from "./tci-device.actions"

export async function upsertTimeClockMappingAction(
  _prev: TimeClockMutationFormState | undefined,
  formData: FormData
): Promise<TimeClockMutationFormState> {
  const session = await requireOrgSession()
  const gate = await requireHrmPermission({
    object: "time_clock_mapping",
    function: "update",
    errorMessage: "Time clock mapping admin permission required.",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })

  const parsed = upsertTimeClockMappingFormSchema.safeParse({
    id: formData.get("id") || undefined,
    deviceId: formData.get("deviceId"),
    employeeId: formData.get("employeeId"),
    clockUserId: formData.get("clockUserId"),
    badgeId: formData.get("badgeId") || null,
    biometricRef: formData.get("biometricRef") || null,
    state: formData.get("state") || undefined,
  })
  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      deviceId: errs.deviceId?.[0],
      employeeId: errs.employeeId?.[0],
      clockUserId: errs.clockUserId?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  return upsertTimeClockMapping(
    {
      organizationId: session.organizationId,
      userId: session.userId,
      sessionId: session.sessionId,
    },
    parsed.data
  )
}
