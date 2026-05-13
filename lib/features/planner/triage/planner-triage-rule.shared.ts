import type {
  OrbitDashboardSurface,
  PlannerDisplayPriority,
  PlannerSignalClass,
} from "../types"
import type { PlannerAutomationAttentionKind } from "../automation/planner-automation-attention.shared"

export type PlannerTriageRule = {
  id: string
  label: string
  priority: number
  routeToSurface: OrbitDashboardSurface
  signalClass?: PlannerSignalClass
  linkedModule?: string
  entityType?: string
  minPressureScore?: number
  displayPriority?: PlannerDisplayPriority
  automationKind?: PlannerAutomationAttentionKind
}

export type PlannerTriageSubject = {
  signalClass?: PlannerSignalClass
  linkedModule?: string | null
  entityType?: string | null
  pressureScore: number
  displayPriority?: PlannerDisplayPriority
  automationKinds?: readonly PlannerAutomationAttentionKind[]
}

export type PlannerTriageLane =
  | "automation_attention"
  | "erp_linked"
  | "high_pressure"
  | "manual_triage"

export function matchPlannerTriageRule(
  subject: PlannerTriageSubject,
  rules: readonly PlannerTriageRule[]
): PlannerTriageRule | null {
  const matches = rules
    .filter((rule) => plannerTriageRuleMatches(subject, rule))
    .sort((left, right) => right.priority - left.priority)

  return matches[0] ?? null
}

export function derivePlannerTriageLane(
  subject: PlannerTriageSubject
): PlannerTriageLane {
  if ((subject.automationKinds?.length ?? 0) > 0) {
    return "automation_attention"
  }
  if (subject.linkedModule || subject.entityType) {
    return "erp_linked"
  }
  if (
    subject.pressureScore >= 70 ||
    subject.displayPriority === "critical" ||
    subject.displayPriority === "high"
  ) {
    return "high_pressure"
  }
  return "manual_triage"
}

function plannerTriageRuleMatches(
  subject: PlannerTriageSubject,
  rule: PlannerTriageRule
) {
  if (rule.signalClass && subject.signalClass !== rule.signalClass) {
    return false
  }
  if (
    rule.linkedModule &&
    subject.linkedModule?.toLowerCase() !== rule.linkedModule.toLowerCase()
  ) {
    return false
  }
  if (
    rule.entityType &&
    subject.entityType?.toLowerCase() !== rule.entityType.toLowerCase()
  ) {
    return false
  }
  if (
    rule.minPressureScore != null &&
    subject.pressureScore < rule.minPressureScore
  ) {
    return false
  }
  if (
    rule.displayPriority &&
    subject.displayPriority !== rule.displayPriority
  ) {
    return false
  }
  if (
    rule.automationKind &&
    !subject.automationKinds?.includes(rule.automationKind)
  ) {
    return false
  }

  return true
}
