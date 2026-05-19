import {
  calculatePlannerPressureScore,
  derivePlannerDisplayPriority,
} from "../ranking/planner-ranking.shared"
import type { PlannerPressureDimensions } from "../types"

export function normalizePlannerPressure(
  pressure: Partial<PlannerPressureDimensions> | null | undefined
): PlannerPressureDimensions {
  return {
    urgency: pressure?.urgency ?? 2,
    impact: pressure?.impact ?? 2,
    severity: pressure?.severity ?? 2,
    confidence: pressure?.confidence ?? 3,
    effort: pressure?.effort ?? 2,
    escalationLevel: pressure?.escalationLevel ?? 1,
    temporalProximity: pressure?.temporalProximity ?? 1,
    ownershipPressure: pressure?.ownershipPressure ?? 1,
  }
}

export function hydratePlannerPressure(
  pressure: Partial<PlannerPressureDimensions>
) {
  const normalized = normalizePlannerPressure(pressure)
  const pressureScore = calculatePlannerPressureScore(normalized)
  return {
    pressure: normalized,
    pressureScore,
    displayPriority: derivePlannerDisplayPriority(pressureScore),
  }
}
