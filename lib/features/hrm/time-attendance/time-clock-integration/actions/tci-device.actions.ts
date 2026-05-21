"use server"

import { requireOrgSession } from "#lib/auth"

import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import {
  revokeTimeClockDevice,
  upsertTimeClockDevice,
} from "../data/tci-device-commands.server"
import { upsertTimeClockDeviceFormSchema } from "../schemas/tci.schema"

export type TimeClockDeviceMutationFormState =
  | { ok: true; deviceId: string }
  | { ok: false; errors: Record<string, string | undefined> }

export async function upsertTimeClockDeviceAction(
  _prev: TimeClockDeviceMutationFormState | undefined,
  formData: FormData
): Promise<TimeClockDeviceMutationFormState> {
  const session = await requireOrgSession()
  const gate = await requireHrmPermission({
    object: "time_clock_device",
    function: "update",
    errorMessage: "Time clock device admin permission required.",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })

  const parsed = upsertTimeClockDeviceFormSchema.safeParse({
    id: formData.get("id") || undefined,
    externalDeviceId: formData.get("externalDeviceId"),
    name: formData.get("name"),
    deviceType: formData.get("deviceType"),
    locationRef: formData.get("locationRef") || null,
    state: formData.get("state") || undefined,
    integrationCredentialRef: formData.get("integrationCredentialRef") || null,
  })
  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      externalDeviceId: errs.externalDeviceId?.[0],
      name: errs.name?.[0],
      deviceType: errs.deviceType?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  return upsertTimeClockDevice(
    {
      organizationId: session.organizationId,
      userId: session.userId,
      sessionId: session.sessionId,
    },
    parsed.data
  )
}

export async function revokeTimeClockDeviceAction(
  _prev: TimeClockDeviceMutationFormState | undefined,
  formData: FormData
): Promise<TimeClockDeviceMutationFormState> {
  const session = await requireOrgSession()
  const gate = await requireHrmPermission({
    object: "time_clock_device",
    function: "update",
    errorMessage: "Time clock device admin permission required.",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })

  const deviceId = formData.get("deviceId")
  if (typeof deviceId !== "string" || !deviceId) {
    return hrmActionFailure({ deviceId: "Device is required." })
  }

  return revokeTimeClockDevice(
    {
      organizationId: session.organizationId,
      userId: session.userId,
      sessionId: session.sessionId,
    },
    deviceId
  )
}
