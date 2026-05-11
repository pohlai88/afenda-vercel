import type { PlannerItemRow } from "../types"

export type PlannerTimelineStatus =
  | "overdue"
  | "due_today"
  | "scheduled"
  | "unscheduled"

export function classifyPlannerTimelineStatus(
  item: Pick<PlannerItemRow, "dueAt" | "scheduleStartAt">
): PlannerTimelineStatus {
  const now = new Date()
  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)

  if (item.dueAt && item.dueAt.getTime() < now.getTime()) return "overdue"
  if (item.dueAt && item.dueAt.getTime() <= endOfToday.getTime()) {
    return "due_today"
  }
  if (item.scheduleStartAt || item.dueAt) return "scheduled"
  return "unscheduled"
}
