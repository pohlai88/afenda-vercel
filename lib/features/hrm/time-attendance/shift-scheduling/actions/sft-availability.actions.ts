"use server"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmShiftAvailability } from "#lib/db/schema"

import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { SftAvailabilityFormState } from "../../../types"
import { HRM_SFT_AUDIT } from "../sft.contract"
import { revalidateSftSurfaces } from "../data/sft-revalidate.server"

export async function createShiftAvailabilityAction(
  _prev: SftAvailabilityFormState | undefined,
  formData: FormData
): Promise<SftAvailabilityFormState> {
  const gate = await requireHrmPermission({
    object: "shift_schedule",
    function: "create",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate

  const employeeId = String(formData.get("employeeId") ?? "").trim()
  const attendanceDate = String(formData.get("attendanceDate") ?? "").trim()
  const kind = String(formData.get("kind") ?? "unavailable").trim()
  const reason = String(formData.get("reason") ?? "").trim() || null

  if (!employeeId || !attendanceDate) {
    return hrmActionFailure({ form: "Employee and date are required." })
  }
  if (kind !== "unavailable" && kind !== "preferred") {
    return hrmActionFailure({ form: "Invalid availability kind." })
  }

  const rowId = crypto.randomUUID()
  await db.insert(hrmShiftAvailability).values({
    id: rowId,
    organizationId: session.organizationId,
    employeeId,
    attendanceDate,
    kind,
    reason,
    createdByUserId: session.userId,
    updatedByUserId: session.userId,
  })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_SFT_AUDIT.availabilityCreate,
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    organizationId: session.organizationId,
    resourceType: "hrm_shift_availability",
    resourceId: rowId,
    metadata: { employeeId, attendanceDate, kind },
  })

  revalidateSftSurfaces()
  return { ok: true, availabilityId: rowId }
}
