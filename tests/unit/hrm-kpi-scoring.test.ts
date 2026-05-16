import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("#lib/db", () => ({
  db: {},
}))

import {
  summarizeKpiScores,
  type KpiScoreListRow,
} from "../../lib/features/hrm/data/kpi.queries.server"
import { calculateTypedKpiScore } from "../../lib/features/hrm/schemas/kpi.schema"

const baseRow = {
  id: "s1",
  periodId: "p1",
  employeeId: "e1",
  employeeLegalName: "Test",
  metricId: null,
  metricCode: "M1",
  metricName: null,
  unit: null,
  targetValue: null,
  achievedValue: null,
  targetNumeric: null,
  achievedNumeric: null,
  varianceNumeric: null,
  scorePercent: null,
  notes: null,
} as const satisfies Omit<KpiScoreListRow, "weight" | "weightedScore">

describe("summarizeKpiScores", () => {
  it("returns zeros for an empty score list", () => {
    expect(summarizeKpiScores([])).toEqual({
      scoreCount: 0,
      totalWeight: 0,
      totalWeightedScore: 0,
      averageScorePercent: null,
    })
  })

  it("aggregates weight and weighted score into average percent", () => {
    const rows: KpiScoreListRow[] = [
      {
        ...baseRow,
        id: "a",
        weight: "0.5",
        weightedScore: "40",
        scorePercent: "80",
      },
      {
        ...baseRow,
        id: "b",
        weight: "0.5",
        weightedScore: "50",
        scorePercent: "100",
      },
    ]
    const summary = summarizeKpiScores(rows)
    expect(summary.scoreCount).toBe(2)
    expect(summary.totalWeight).toBe(1)
    expect(summary.totalWeightedScore).toBe(90)
    expect(summary.averageScorePercent).toBe(90)
  })

  it("treats non-numeric weight strings as zero", () => {
    const rows: KpiScoreListRow[] = [
      {
        ...baseRow,
        id: "x",
        weight: "not-a-number",
        weightedScore: "10",
        scorePercent: "50",
      },
    ]
    const summary = summarizeKpiScores(rows)
    expect(summary.totalWeight).toBe(0)
    expect(summary.averageScorePercent).toBeNull()
  })
})

describe("calculateTypedKpiScore integration with summarizeKpiScores inputs", () => {
  it("keeps weightedScore consistent with scorePercent * weight", () => {
    const { scorePercent, weightedScore } = calculateTypedKpiScore({
      target: 100,
      achieved: 120,
      direction: "higher_is_better",
      weight: 0.4,
    })
    const row: KpiScoreListRow = {
      ...baseRow,
      id: "c",
      weight: "0.4",
      weightedScore: weightedScore.toFixed(6),
      scorePercent: scorePercent.toFixed(4),
    }
    const summary = summarizeKpiScores([row])
    expect(summary.totalWeight).toBeCloseTo(0.4, 5)
    expect(summary.totalWeightedScore).toBeCloseTo(weightedScore, 5)
  })
})
