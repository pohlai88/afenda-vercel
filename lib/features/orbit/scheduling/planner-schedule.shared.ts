import type { PlannerItemRow } from "../types"

export function isPlannerItemScheduled(
  item: Pick<PlannerItemRow, "scheduleStartAt" | "dueAt">
): boolean {
  return Boolean(item.scheduleStartAt || item.dueAt)
}
