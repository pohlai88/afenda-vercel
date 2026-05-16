import { describe, expect, it } from "vitest"

import {
  calculateTypedKpiScore,
  formatKpiDecimal,
  normalizeKpiMetricCode,
} from "../../lib/features/hrm/schemas/kpi.schema"

describe("calculateTypedKpiScore", () => {
  it("higher_is_better: ratio when target > 0", () => {
    const r = calculateTypedKpiScore({
      target: 10,
      achieved: 15,
      direction: "higher_is_better",
      weight: 1,
    })
    expect(r.scorePercent).toBe(150)
    expect(r.variance).toBe(5)
    expect(r.weightedScore).toBe(150)
  })

  it("higher_is_better: target 0, achieved > 0 → 200% capped", () => {
    const r = calculateTypedKpiScore({
      target: 0,
      achieved: 5,
      direction: "higher_is_better",
      weight: 1,
    })
    expect(r.scorePercent).toBe(200)
  })

  it("higher_is_better: target 0, achieved 0 → 100%", () => {
    const r = calculateTypedKpiScore({
      target: 0,
      achieved: 0,
      direction: "higher_is_better",
      weight: 1,
    })
    expect(r.scorePercent).toBe(100)
  })

  it("lower_is_better: achieved 0 → 200% capped", () => {
    const r = calculateTypedKpiScore({
      target: 10,
      achieved: 0,
      direction: "lower_is_better",
      weight: 1,
    })
    expect(r.scorePercent).toBe(200)
  })

  it("lower_is_better: target 0, achieved > 0 → 0%", () => {
    const r = calculateTypedKpiScore({
      target: 0,
      achieved: 5,
      direction: "lower_is_better",
      weight: 1,
    })
    expect(r.scorePercent).toBe(0)
  })

  it("lower_is_better: ratio when achieved > 0", () => {
    const r = calculateTypedKpiScore({
      target: 10,
      achieved: 5,
      direction: "lower_is_better",
      weight: 1,
    })
    expect(r.scorePercent).toBe(200)
  })

  it("target_is_best: on target → 100%", () => {
    const r = calculateTypedKpiScore({
      target: 10,
      achieved: 10,
      direction: "target_is_best",
      weight: 2,
    })
    expect(r.scorePercent).toBe(100)
    expect(r.weightedScore).toBe(200)
  })

  it("target_is_best: target 0, achieved 0 → 100%", () => {
    const r = calculateTypedKpiScore({
      target: 0,
      achieved: 0,
      direction: "target_is_best",
      weight: 1,
    })
    expect(r.scorePercent).toBe(100)
  })

  it("target_is_best: target 0, achieved non-zero → 0%", () => {
    const r = calculateTypedKpiScore({
      target: 0,
      achieved: 3,
      direction: "target_is_best",
      weight: 1,
    })
    expect(r.scorePercent).toBe(0)
  })

  it("clamps score percent to 200 max", () => {
    const r = calculateTypedKpiScore({
      target: 1,
      achieved: 500,
      direction: "higher_is_better",
      weight: 0.5,
    })
    expect(r.scorePercent).toBe(200)
  })

  it("clamps score percent to 0 min", () => {
    const r = calculateTypedKpiScore({
      target: 10,
      achieved: 100,
      direction: "target_is_best",
      weight: 1,
    })
    expect(r.scorePercent).toBe(0)
  })
})

describe("normalizeKpiMetricCode + formatKpiDecimal", () => {
  it("normalizes to uppercase trimmed", () => {
    expect(normalizeKpiMetricCode("  rev_growth  ")).toBe("REV_GROWTH")
  })

  it("formats decimals", () => {
    expect(formatKpiDecimal(1.234567, 4)).toBe("1.2346")
  })
})
