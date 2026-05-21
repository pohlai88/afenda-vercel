"use client"

import { AttendanceCorrectionDialog } from "../../leave-attendance-management/components/attendance-correction-dialog"
import {
  ATTENDANCE_MANUAL_EVENT_TYPES,
  isAttendanceManualEventType,
} from "../../leave-attendance-management/data/attendance-display.shared"

export function TimeClockExceptionLamCorrection({
  resolvedEventId,
  occurredAtIso,
  eventType,
}: {
  resolvedEventId: string
  occurredAtIso: string
  eventType: string
}) {
  const lamEventType = isAttendanceManualEventType(eventType)
    ? eventType
    : ATTENDANCE_MANUAL_EVENT_TYPES[0]

  return (
    <AttendanceCorrectionDialog
      originalEventId={resolvedEventId}
      occurredAtIso={occurredAtIso}
      eventType={lamEventType}
    />
  )
}
