import "server-only"

import { aggregateAttendanceDay } from "../../leave-attendance-management/data/attendance-aggregator.server"
import { resolveAttendanceShiftContext } from "../../leave-attendance-management/data/attendance-shift.queries.server"

export async function resolveScheduledShiftMinutesForWorkDate(input: {
  organizationId: string
  employeeId: string
  workDate: string
}): Promise<number | null> {
  const shiftContext = await resolveAttendanceShiftContext({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    attendanceDate: input.workDate,
  })

  if (!shiftContext) return null

  const draft = aggregateAttendanceDay([], shiftContext)
  return draft.scheduledMinutes
}
