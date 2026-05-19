import type {
  PlannerDisplayPriority,
  PlannerPressureDimensions,
} from "../types"

export function calculatePlannerPressureScore(
  pressure: PlannerPressureDimensions
): number {
  const positive =
    pressure.urgency * 6 +
    pressure.impact * 6 +
    pressure.severity * 7 +
    pressure.confidence * 3 +
    pressure.escalationLevel * 5 +
    pressure.temporalProximity * 4 +
    pressure.ownershipPressure * 3

  const penalty = pressure.effort * 2
  return Math.max(0, positive - penalty)
}

export function derivePlannerDisplayPriority(
  pressureScore: number
): PlannerDisplayPriority {
  if (pressureScore >= 85) return "critical"
  if (pressureScore >= 55) return "high"
  if (pressureScore >= 28) return "medium"
  return "low"
}
