import type {
  PlannerBlockedEscalationStage,
  PlannerBlockedState,
  PlannerOperationalFacts,
} from "../types"

type PlannerBlockedEscalationPolicyInput = {
  urgency: number
  impact: number
  severity: number
  escalationLevel: number
  blockedHours: number
  operationalFacts?: PlannerOperationalFacts | null
}

export function derivePlannerBlockedEscalationThresholdHours(
  input: Omit<PlannerBlockedEscalationPolicyInput, "blockedHours">
): number {
  const facts = input.operationalFacts

  if (input.escalationLevel >= 4 || input.severity >= 4) {
    return 24
  }

  if (
    input.urgency >= 4 ||
    input.impact >= 4 ||
    (facts?.blockedByCount ?? 0) > 0 ||
    (facts?.activeSignalCount ?? 0) > 0
  ) {
    return 48
  }

  if ((facts?.escalationOwnerCount ?? 0) > 0) {
    return 60
  }

  return 72
}

export function shouldEscalatePlannerBlockedItem(
  input: PlannerBlockedEscalationPolicyInput
): boolean {
  return (
    input.blockedHours >=
    derivePlannerBlockedEscalationThresholdHours({
      urgency: input.urgency,
      impact: input.impact,
      severity: input.severity,
      escalationLevel: input.escalationLevel,
      operationalFacts: input.operationalFacts,
    })
  )
}

export function derivePlannerBlockedEscalationStage(input: {
  blockedHours: number
  thresholdHours: number
}): PlannerBlockedEscalationStage {
  const elapsedOverThreshold = Math.max(
    0,
    input.blockedHours - input.thresholdHours
  )

  if (elapsedOverThreshold >= 72) return "critical"
  if (elapsedOverThreshold >= 24) return "urgent"
  return "threshold"
}

export function derivePlannerBlockedState(input: {
  lifecycle: string
  blockedAt: Date | null
  urgency: number
  impact: number
  severity: number
  escalationLevel: number
  operationalFacts?: PlannerOperationalFacts | null
  now?: Date
}): PlannerBlockedState | null {
  if (input.lifecycle !== "blocked" || !input.blockedAt) {
    return null
  }

  const now = input.now ?? new Date()
  const blockedHours = Math.max(
    1,
    Math.floor((now.getTime() - input.blockedAt.getTime()) / (60 * 60 * 1000))
  )
  const thresholdHours = derivePlannerBlockedEscalationThresholdHours({
    urgency: input.urgency,
    impact: input.impact,
    severity: input.severity,
    escalationLevel: input.escalationLevel,
    operationalFacts: input.operationalFacts,
  })

  return {
    blockedAt: input.blockedAt,
    blockedHours,
    thresholdHours,
    stage: derivePlannerBlockedEscalationStage({
      blockedHours,
      thresholdHours,
    }),
  }
}
