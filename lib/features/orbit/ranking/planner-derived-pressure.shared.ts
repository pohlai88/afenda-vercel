import { derivePlannerDisplayPriority } from "./planner-ranking.shared"
import type { PlannerItemRow } from "../types"

export type PlannerRelationPressureSummary = {
  blockingCount: number
  blockedByCount: number
  activeSignalCount: number
  duplicateCount: number
}

export function derivePlannerRelationPressureDelta(
  summary: PlannerRelationPressureSummary
): number {
  const delta =
    summary.blockingCount * 12 +
    summary.blockedByCount * 7 +
    summary.activeSignalCount * 5 +
    summary.duplicateCount * 2

  return Math.max(0, delta)
}

export function applyPlannerRelationPressure(
  row: PlannerItemRow,
  summary: PlannerRelationPressureSummary | null | undefined
): PlannerItemRow {
  if (!summary) {
    return row
  }

  const delta = derivePlannerRelationPressureDelta(summary)
  if (delta === 0) {
    return row
  }

  const pressureScore = row.pressureScore + delta
  return {
    ...row,
    pressureScore,
    displayPriority: derivePlannerDisplayPriority(pressureScore),
  }
}
