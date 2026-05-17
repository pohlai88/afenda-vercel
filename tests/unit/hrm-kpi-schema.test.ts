import { describe, expect, it } from "vitest"

import {
  activateKpiPeriodFormSchema,
  archiveKpiMetricFormSchema,
  calculateTypedKpiScore,
  closeKpiPeriodFormSchema,
  createKpiMetricFormSchema,
  createKpiPeriodFormSchema,
  formatKpiDecimal,
  kpiMetricSchema,
  lockKpiPeriodFormSchema,
  normalizeKpiMetricCode,
  upsertKpiScoreFormSchema,
  upsertTypedKpiScoreFormSchema,
} from "../../lib/features/hrm/talent-management/competency-skills-framework/schemas/kpi.schema"

const METRIC_ID = "11111111-1111-4111-8111-111111111111"
const PERIOD_ID = "22222222-2222-4222-8222-222222222222"
const EMPLOYEE_ID = "33333333-3333-4333-8333-333333333333"

describe("KPI schema helpers", () => {
  it("normalizes metric codes to trimmed uppercase", () => {
    expect(normalizeKpiMetricCode("  rev_growth  ")).toBe("REV_GROWTH")
  })

  it("formats decimals with fixed places via round-trip", () => {
    expect(formatKpiDecimal(1.234567, 2)).toBe("1.23")
    expect(formatKpiDecimal(1.005, 2)).toBe("1.01")
  })

  it("scores higher_is_better with zero target edge cases", () => {
    const zeroBoth = calculateTypedKpiScore({
      target: 0,
      achieved: 0,
      direction: "higher_is_better",
      weight: 0.5,
    })
    expect(zeroBoth.scorePercent).toBe(100)

    const zeroPositive = calculateTypedKpiScore({
      target: 0,
      achieved: 5,
      direction: "higher_is_better",
      weight: 1,
    })
    expect(zeroPositive.scorePercent).toBe(200)
  })

  it("scores lower_is_better and target_is_best", () => {
    const lower = calculateTypedKpiScore({
      target: 10,
      achieved: 5,
      direction: "lower_is_better",
      weight: 1,
    })
    expect(lower.scorePercent).toBe(200)

    const targetBest = calculateTypedKpiScore({
      target: 100,
      achieved: 90,
      direction: "target_is_best",
      weight: 1,
    })
    expect(targetBest.scorePercent).toBe(90)
  })
})

describe("KPI Zod schemas", () => {
  it("accepts a full kpiMetricSchema row", () => {
    const parsed = kpiMetricSchema.safeParse({
      id: METRIC_ID,
      code: "REV_GROWTH",
      name: "Revenue growth",
      description: null,
      unit: "%",
      valueType: "percent",
      direction: "higher_is_better",
      aggregation: "average",
      defaultWeight: "1",
      state: "active",
    })
    expect(parsed.success).toBe(true)
  })

  it("rejects metric codes that do not start with alphanumeric", () => {
    const bad = createKpiMetricFormSchema.safeParse({
      orgSlug: "acme",
      code: "_BAD",
      name: "x",
      unit: "u",
      valueType: "decimal",
      direction: "higher_is_better",
      aggregation: "sum",
    })
    expect(bad.success).toBe(false)
  })

  it("enforces period date ordering on createKpiPeriodFormSchema", () => {
    const bad = createKpiPeriodFormSchema.safeParse({
      orgSlug: "acme",
      name: "Q1",
      periodStart: "2026-04-01",
      periodEnd: "2026-03-01",
    })
    expect(bad.success).toBe(false)

    const good = createKpiPeriodFormSchema.safeParse({
      orgSlug: "acme",
      name: "Q1",
      periodStart: "2026-01-01",
      periodEnd: "2026-03-31",
    })
    expect(good.success).toBe(true)
  })

  it("accepts lifecycle and score form payloads", () => {
    expect(
      activateKpiPeriodFormSchema.safeParse({
        orgSlug: "acme",
        periodId: PERIOD_ID,
      }).success
    ).toBe(true)
    expect(
      lockKpiPeriodFormSchema.safeParse({
        orgSlug: "acme",
        periodId: PERIOD_ID,
      }).success
    ).toBe(true)
    expect(
      closeKpiPeriodFormSchema.safeParse({
        orgSlug: "acme",
        periodId: PERIOD_ID,
      }).success
    ).toBe(true)
    expect(
      archiveKpiMetricFormSchema.safeParse({
        orgSlug: "acme",
        metricId: METRIC_ID,
      }).success
    ).toBe(true)

    expect(
      upsertKpiScoreFormSchema.safeParse({
        orgSlug: "acme",
        periodId: PERIOD_ID,
        employeeId: EMPLOYEE_ID,
        metricCode: "ATTENDANCE",
        targetValue: "10",
        achievedValue: "9",
      }).success
    ).toBe(true)

    expect(
      upsertTypedKpiScoreFormSchema.safeParse({
        orgSlug: "acme",
        periodId: PERIOD_ID,
        employeeId: EMPLOYEE_ID,
        metricId: METRIC_ID,
        targetDecimal: "10",
        achievedDecimal: "9.5",
        weight: "0.25",
      }).success
    ).toBe(true)
  })
})
