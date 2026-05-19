import { describe, expect, it } from "vitest"

import {
  canPromotePlannerSignal,
  canTransitionPlannerSignalLifecycle,
  isPlannerSignalActive,
} from "#features/orbit/signals/planner-signal.shared"

describe("planner signal lifecycle doctrine", () => {
  it("keeps detected and correlated signals promotable", () => {
    expect(canPromotePlannerSignal("detected")).toBe(true)
    expect(canPromotePlannerSignal("correlated")).toBe(true)
    expect(canPromotePlannerSignal("deferred")).toBe(false)
    expect(canPromotePlannerSignal("dismissed")).toBe(false)
  })

  it("permits only defined lifecycle transitions", () => {
    expect(canTransitionPlannerSignalLifecycle("detected", "correlated")).toBe(
      true
    )
    expect(canTransitionPlannerSignalLifecycle("detected", "promoted")).toBe(
      true
    )
    expect(canTransitionPlannerSignalLifecycle("deferred", "correlated")).toBe(
      true
    )
    expect(canTransitionPlannerSignalLifecycle("suppressed", "deferred")).toBe(
      true
    )

    expect(canTransitionPlannerSignalLifecycle("promoted", "detected")).toBe(
      false
    )
    expect(canTransitionPlannerSignalLifecycle("expired", "correlated")).toBe(
      false
    )
    expect(canTransitionPlannerSignalLifecycle("dismissed", "suppressed")).toBe(
      false
    )
  })

  it("treats only active signal states as operationally live", () => {
    expect(isPlannerSignalActive("detected")).toBe(true)
    expect(isPlannerSignalActive("correlated")).toBe(true)
    expect(isPlannerSignalActive("deferred")).toBe(true)
    expect(isPlannerSignalActive("suppressed")).toBe(true)
    expect(isPlannerSignalActive("promoted")).toBe(false)
    expect(isPlannerSignalActive("auto_resolved")).toBe(false)
  })
})
