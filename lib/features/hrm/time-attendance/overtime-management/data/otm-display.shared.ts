import type { HrmOtmDayCategory } from "../schemas/otm-workflow-state.shared"

const TIME_PATTERN = /^(\d{2}):(\d{2})$/

export function computeOvertimeDurationMinutes(
  startTime: string,
  endTime: string
): number | null {
  const startParts = TIME_PATTERN.exec(startTime.trim())
  const endParts = TIME_PATTERN.exec(endTime.trim())
  if (!startParts || !endParts) return null

  const startMinutes =
    Number.parseInt(startParts[1]!, 10) * 60 + Number.parseInt(startParts[2]!, 10)
  let endMinutes =
    Number.parseInt(endParts[1]!, 10) * 60 + Number.parseInt(endParts[2]!, 10)

  if (startMinutes === endMinutes) return null

  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60
  }

  const duration = endMinutes - startMinutes
  if (duration < 1 || duration > 24 * 60) return null
  return duration
}

export function formatOvertimeDurationMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

export function formatOvertimeTimeRange(input: {
  workDate: string
  startTime: string
  endTime: string
}): string {
  return `${input.workDate} · ${input.startTime}–${input.endTime}`
}

export function otmDayCategoryLabel(
  category: HrmOtmDayCategory,
  labels: Record<HrmOtmDayCategory, string>
): string {
  return labels[category] ?? category
}
