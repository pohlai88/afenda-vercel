"use server"

import { requireOrgSession } from "#lib/auth"

import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { RemoteCheckinDeviceMutationFormState } from "../../../types"
import {
  registerRemoteCheckinDevice,
  revokeRemoteCheckinDevice,
} from "../data/remote-checkin-device-commands.server"
import { findRemoteCheckinEmployeeForUser } from "../data/geolocation.queries.server"
import { upsertRemoteCheckinDeviceFormSchema } from "../schemas/geolocation.schema"

export async function registerRemoteCheckinDeviceAction(
  _prev: RemoteCheckinDeviceMutationFormState | undefined,
  formData: FormData
): Promise<RemoteCheckinDeviceMutationFormState> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const submittedEmployeeId = formData.get("employeeId")
  let employeeId: string | null = null

  if (typeof submittedEmployeeId === "string" && submittedEmployeeId.length > 0) {
    const gate = await requireHrmPermission({
      object: "remote_checkin",
      function: "create",
      errorMessage:
        "Remote check-in create permission required to register devices on behalf of others.",
    })
    if (!gate.ok) return hrmActionFailure({ form: gate.error })
    employeeId = submittedEmployeeId
  } else {
    const employee = await findRemoteCheckinEmployeeForUser(
      organizationId,
      userId
    )
    if (!employee) {
      return hrmActionFailure({
        form: "Your user is not linked to an active employee record.",
      })
    }
    employeeId = employee.id
  }

  const parsed = upsertRemoteCheckinDeviceFormSchema.safeParse({
    deviceId: formData.get("deviceId") || null,
    employeeId,
    deviceLabel: formData.get("deviceLabel"),
    deviceFingerprint: formData.get("deviceFingerprint"),
    state: formData.get("state") || undefined,
  })
  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      employeeId: errs.employeeId?.[0],
      deviceLabel: errs.deviceLabel?.[0],
      deviceFingerprint: errs.deviceFingerprint?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  return registerRemoteCheckinDevice(
    { organizationId, userId, sessionId },
    parsed.data
  )
}

export async function revokeRemoteCheckinDeviceAction(
  _prev: RemoteCheckinDeviceMutationFormState | undefined,
  formData: FormData
): Promise<RemoteCheckinDeviceMutationFormState> {
  const gate = await requireHrmPermission({
    object: "remote_checkin",
    function: "update",
    errorMessage:
      "Remote check-in update permission required to revoke devices.",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { organizationId, userId, sessionId } = gate.session

  const deviceId = formData.get("deviceId")
  if (typeof deviceId !== "string" || deviceId.length === 0) {
    return hrmActionFailure({ deviceId: "Device id is required." })
  }
  const reasonRaw = formData.get("reason")
  const reason =
    typeof reasonRaw === "string" && reasonRaw.length > 0 ? reasonRaw : null

  return revokeRemoteCheckinDevice(
    { organizationId, userId, sessionId },
    { deviceId, reason }
  )
}
