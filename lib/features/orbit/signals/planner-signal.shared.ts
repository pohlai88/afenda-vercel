import { PLANNER_ACTIVE_SIGNAL_LIFECYCLES } from "../constants"
import type { PlannerSignalLifecycle } from "../types"

const PLANNER_SIGNAL_TRANSITIONS: Record<
  PlannerSignalLifecycle,
  readonly PlannerSignalLifecycle[]
> = {
  detected: [
    "correlated",
    "deferred",
    "suppressed",
    "dismissed",
    "expired",
    "auto_resolved",
    "promoted",
  ],
  correlated: [
    "deferred",
    "suppressed",
    "dismissed",
    "expired",
    "auto_resolved",
    "promoted",
  ],
  promoted: [],
  deferred: [
    "correlated",
    "suppressed",
    "dismissed",
    "expired",
    "auto_resolved",
  ],
  suppressed: [
    "correlated",
    "deferred",
    "dismissed",
    "expired",
    "auto_resolved",
  ],
  expired: [],
  auto_resolved: [],
  dismissed: [],
}

export function isPlannerSignalActive(
  lifecycle: PlannerSignalLifecycle
): boolean {
  return (PLANNER_ACTIVE_SIGNAL_LIFECYCLES as readonly string[]).includes(
    lifecycle
  )
}

export function canPromotePlannerSignal(
  lifecycle: PlannerSignalLifecycle
): boolean {
  return lifecycle === "detected" || lifecycle === "correlated"
}

export function canTransitionPlannerSignalLifecycle(
  from: PlannerSignalLifecycle,
  to: PlannerSignalLifecycle
): boolean {
  return PLANNER_SIGNAL_TRANSITIONS[from].includes(to)
}
