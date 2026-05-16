import "server-only"

import { and, asc, desc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmEmployee,
  hrmKpiMetric,
  hrmKpiPeriod,
  hrmKpiScore,
} from "#lib/db/schema"

import {
  kpiMetricAggregationSchema,
  kpiMetricDirectionSchema,
  kpiMetricStateSchema,
  kpiMetricValueTypeSchema,
  kpiPeriodStateSchema,
  type HrmKpiAggregation,
  type HrmKpiDirection,
  type HrmKpiMetricState,
  type HrmKpiPeriodState,
  type HrmKpiValueType,
} from "../schemas/kpi.schema"

export type KpiMetricRow = {
  id: string
  code: string
  name: string
  description: string | null
  unit: string
  valueType: HrmKpiValueType
  direction: HrmKpiDirection
  aggregation: HrmKpiAggregation
  defaultWeight: string
  state: HrmKpiMetricState
  archivedAt: Date | null
}

export async function listKpiMetricsForOrg(
  organizationId: string
): Promise<KpiMetricRow[]> {
  const rows = await db
    .select({
      id: hrmKpiMetric.id,
      code: hrmKpiMetric.code,
      name: hrmKpiMetric.name,
      description: hrmKpiMetric.description,
      unit: hrmKpiMetric.unit,
      valueType: hrmKpiMetric.valueType,
      direction: hrmKpiMetric.direction,
      aggregation: hrmKpiMetric.aggregation,
      defaultWeight: hrmKpiMetric.defaultWeight,
      state: hrmKpiMetric.state,
      archivedAt: hrmKpiMetric.archivedAt,
    })
    .from(hrmKpiMetric)
    .where(eq(hrmKpiMetric.organizationId, organizationId))
    .orderBy(asc(hrmKpiMetric.code))

  return rows.map((row) => ({
    ...row,
    valueType: kpiMetricValueTypeSchema.parse(row.valueType),
    direction: kpiMetricDirectionSchema.parse(row.direction),
    aggregation: kpiMetricAggregationSchema.parse(row.aggregation),
    state: kpiMetricStateSchema.parse(row.state),
  }))
}

export async function listActiveKpiMetricsForOrg(
  organizationId: string
): Promise<KpiMetricRow[]> {
  const metrics = await listKpiMetricsForOrg(organizationId)
  return metrics.filter((metric) => metric.state === "active")
}

export type KpiPeriodRow = {
  id: string
  name: string
  periodStart: Date
  periodEnd: Date
  state: HrmKpiPeriodState
  evidenceHash: string | null
  lockedAt: Date | null
  closedAt: Date | null
}

export async function listKpiPeriodsForOrg(
  organizationId: string
): Promise<KpiPeriodRow[]> {
  const rows = await db
    .select({
      id: hrmKpiPeriod.id,
      name: hrmKpiPeriod.name,
      periodStart: hrmKpiPeriod.periodStart,
      periodEnd: hrmKpiPeriod.periodEnd,
      state: hrmKpiPeriod.state,
      evidenceHash: hrmKpiPeriod.evidenceHash,
      lockedAt: hrmKpiPeriod.lockedAt,
      closedAt: hrmKpiPeriod.closedAt,
    })
    .from(hrmKpiPeriod)
    .where(eq(hrmKpiPeriod.organizationId, organizationId))
    .orderBy(desc(hrmKpiPeriod.createdAt))

  return rows.map((row) => ({
    ...row,
    state: kpiPeriodStateSchema.parse(row.state),
  }))
}

export type KpiScoreListRow = {
  id: string
  periodId: string
  employeeId: string
  employeeLegalName: string
  metricId: string | null
  metricCode: string
  metricName: string | null
  unit: string | null
  targetValue: string | null
  achievedValue: string | null
  targetNumeric: string | null
  achievedNumeric: string | null
  varianceNumeric: string | null
  scorePercent: string | null
  weight: string | null
  weightedScore: string | null
  notes: string | null
}

export async function listKpiScoresForPeriod(
  organizationId: string,
  periodId: string
): Promise<KpiScoreListRow[]> {
  const rows = await db
    .select({
      id: hrmKpiScore.id,
      periodId: hrmKpiScore.periodId,
      employeeId: hrmKpiScore.employeeId,
      employeeLegalName: hrmEmployee.legalName,
      metricId: hrmKpiScore.metricId,
      legacyMetricCode: hrmKpiScore.metricCode,
      metricCode: hrmKpiMetric.code,
      metricName: hrmKpiMetric.name,
      unit: hrmKpiMetric.unit,
      targetValue: hrmKpiScore.targetValue,
      achievedValue: hrmKpiScore.achievedValue,
      targetNumeric: hrmKpiScore.targetNumeric,
      achievedNumeric: hrmKpiScore.achievedNumeric,
      varianceNumeric: hrmKpiScore.varianceNumeric,
      scorePercent: hrmKpiScore.scorePercent,
      weight: hrmKpiScore.weight,
      weightedScore: hrmKpiScore.weightedScore,
      notes: hrmKpiScore.notes,
    })
    .from(hrmKpiScore)
    .innerJoin(hrmEmployee, eq(hrmEmployee.id, hrmKpiScore.employeeId))
    .leftJoin(hrmKpiMetric, eq(hrmKpiMetric.id, hrmKpiScore.metricId))
    .where(
      and(
        eq(hrmKpiScore.organizationId, organizationId),
        eq(hrmKpiScore.periodId, periodId)
      )
    )
    .orderBy(asc(hrmEmployee.legalName), asc(hrmKpiScore.metricCode))

  return rows.map((row) => ({
    ...row,
    metricCode: row.metricCode ?? row.legacyMetricCode,
  }))
}

export type KpiScoreSummary = {
  scoreCount: number
  totalWeight: number
  totalWeightedScore: number
  averageScorePercent: number | null
}

function numeric(value: string | null): number {
  if (value === null) return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function summarizeKpiScores(
  scores: readonly KpiScoreListRow[]
): KpiScoreSummary {
  const totalWeight = scores.reduce((sum, row) => sum + numeric(row.weight), 0)
  const totalWeightedScore = scores.reduce(
    (sum, row) => sum + numeric(row.weightedScore),
    0
  )
  return {
    scoreCount: scores.length,
    totalWeight,
    totalWeightedScore,
    averageScorePercent:
      totalWeight > 0 ? totalWeightedScore / totalWeight : null,
  }
}

export type KpiEvidenceSnapshot = {
  period: {
    id: string
    name: string
    periodStart: string
    periodEnd: string
    state: HrmKpiPeriodState
  }
  summary: KpiScoreSummary
  scores: readonly {
    employeeId: string
    employeeLegalName: string
    metricId: string | null
    metricCode: string
    metricName: string | null
    targetNumeric: string | null
    achievedNumeric: string | null
    varianceNumeric: string | null
    scorePercent: string | null
    weight: string | null
    weightedScore: string | null
  }[]
}

export async function buildKpiEvidenceSnapshotForPeriod(
  organizationId: string,
  periodId: string
): Promise<KpiEvidenceSnapshot | null> {
  const periods = await listKpiPeriodsForOrg(organizationId)
  const selected = periods.find((row) => row.id === periodId)
  if (!selected) return null

  const scores = await listKpiScoresForPeriod(organizationId, periodId)
  return {
    period: {
      id: selected.id,
      name: selected.name,
      periodStart: selected.periodStart.toISOString().slice(0, 10),
      periodEnd: selected.periodEnd.toISOString().slice(0, 10),
      state: selected.state,
    },
    summary: summarizeKpiScores(scores),
    scores: scores.map((score) => ({
      employeeId: score.employeeId,
      employeeLegalName: score.employeeLegalName,
      metricId: score.metricId,
      metricCode: score.metricCode,
      metricName: score.metricName,
      targetNumeric: score.targetNumeric,
      achievedNumeric: score.achievedNumeric,
      varianceNumeric: score.varianceNumeric,
      scorePercent: score.scorePercent,
      weight: score.weight,
      weightedScore: score.weightedScore,
    })),
  }
}
