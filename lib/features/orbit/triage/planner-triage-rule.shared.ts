import type {
  OrbitSurface,
  PlannerBlockedState,
  PlannerDisplayPriority,
  PlannerSignalClass,
} from "../types"
import type { PlannerAutomationAttentionKind } from "../automation/planner-automation-attention.shared"

export type PlannerTriageRule = {
  id: string
  label: string
  priority: number
  routeToSurface: OrbitSurface
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

export type PlannerTriageOperatingLane =
  | "automation_attention"
  | "blocked_recovery"
  | "high_pressure"
  | "signal_intake"
  | "manual_follow_up"

export type PlannerTriageOperatingRecord = {
  kind: "item" | "signal"
  pressureScore: number
  displayPriority?: PlannerDisplayPriority
  signalClass?: PlannerSignalClass
  blockedState?: PlannerBlockedState | null
  automationKinds?: readonly PlannerAutomationAttentionKind[]
}

export type PlannerTriageOperatingSummary = {
  automationAttentionCount: number
  blockedRecoveryCount: number
  highPressureCount: number
  signalIntakeCount: number
  manualFollowUpCount: number
}

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

export function derivePlannerTriageOperatingLane(
  record: PlannerTriageOperatingRecord
): PlannerTriageOperatingLane {
  if ((record.automationKinds?.length ?? 0) > 0) {
    return "automation_attention"
  }
  if (record.kind === "item" && record.blockedState) {
    return "blocked_recovery"
  }
  if (
    record.pressureScore >= 70 ||
    record.displayPriority === "critical" ||
    record.displayPriority === "high"
  ) {
    return "high_pressure"
  }
  if (record.kind === "signal") {
    return "signal_intake"
  }
  return "manual_follow_up"
}

export function summarizePlannerTriageOperatingLanes(
  records: readonly PlannerTriageOperatingRecord[]
): PlannerTriageOperatingSummary {
  const summary: PlannerTriageOperatingSummary = {
    automationAttentionCount: 0,
    blockedRecoveryCount: 0,
    highPressureCount: 0,
    signalIntakeCount: 0,
    manualFollowUpCount: 0,
  }

  for (const record of records) {
    switch (derivePlannerTriageOperatingLane(record)) {
      case "automation_attention":
        summary.automationAttentionCount += 1
        break
      case "blocked_recovery":
        summary.blockedRecoveryCount += 1
        break
      case "high_pressure":
        summary.highPressureCount += 1
        break
      case "signal_intake":
        summary.signalIntakeCount += 1
        break
      case "manual_follow_up":
        summary.manualFollowUpCount += 1
        break
      default:
        throw new Error("Unexpected planner triage operating lane")
    }
  }

  return summary
}
