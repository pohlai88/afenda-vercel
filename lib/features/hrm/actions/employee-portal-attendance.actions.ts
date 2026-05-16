"use server"

import { applyAttendanceEventCorrection } from "../data/attendance-correction-mutation.server"
import { getEmployeePortalContext } from "../data/employee-portal-access.server"
import { EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR } from "../data/employee-portal-access.shared"
import { correctAttendanceEventSchema } from "../schemas/attendance-event.schema"
import { hrmActionFailure } from "../schemas/hrm-action-result.shared"
import type { AttendanceCorrectionFormState } from "../types"

export async function requestPortalEmployeeAttendanceCorrectionAction(
  _prev: AttendanceCorrectionFormState | undefined,
  formData: FormData
): Promise<AttendanceCorrectionFormState> {
  const rawPortalSlug = formData.get("portalSlug")
  if (typeof rawPortalSlug !== "string" || rawPortalSlug.trim() === "") {
    return hrmActionFailure({
      form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR,
    })
  }

  const context = await getEmployeePortalContext(rawPortalSlug)
  if (!context) {
    return hrmActionFailure({
      form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR,
    })
  }

  const raw = {
    originalEventId: formData.get("originalEventId"),
    eventType: formData.get("eventType"),
    occurredAt: formData.get("occurredAt"),
    correctionReason: formData.get("correctionReason"),
  }

  const parsed = correctAttendanceEventSchema.safeParse(raw)
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      originalEventId: flat.originalEventId?.[0],
      eventType: flat.eventType?.[0],
      occurredAt: flat.occurredAt?.[0],
      correctionReason: flat.correctionReason?.[0],
    })
  }

  return applyAttendanceEventCorrection({
    organizationId: context.portal.organizationId,
    userId: context.portal.userId,
    sessionId: context.portal.sessionId,
    data: parsed.data,
    restrictToEmployeeId: context.employee.id,
  })
}
