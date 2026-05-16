import { z } from "zod"

const uuid = z.string().uuid()
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const metricCode = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Z0-9][A-Z0-9_.-]*$/, {
    message: "Use uppercase letters, numbers, dot, underscore, or hyphen.",
  })
const decimalText = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine((value) => Number.isFinite(Number(value)), {
    message: "Enter a valid number.",
  })

export const HRM_KPI_METRIC_STATES = ["active", "archived"] as const
export type HrmKpiMetricState = (typeof HRM_KPI_METRIC_STATES)[number]
export const kpiMetricStateSchema = z.enum(HRM_KPI_METRIC_STATES)

export const HRM_KPI_VALUE_TYPES = [
  "decimal",
  "integer",
  "percent",
  "currency",
] as const
export type HrmKpiValueType = (typeof HRM_KPI_VALUE_TYPES)[number]
export const kpiMetricValueTypeSchema = z.enum(HRM_KPI_VALUE_TYPES)

export const HRM_KPI_DIRECTIONS = [
  "higher_is_better",
  "lower_is_better",
  "target_is_best",
] as const
export type HrmKpiDirection = (typeof HRM_KPI_DIRECTIONS)[number]
export const kpiMetricDirectionSchema = z.enum(HRM_KPI_DIRECTIONS)

export const HRM_KPI_AGGREGATIONS = ["sum", "average", "latest"] as const
export type HrmKpiAggregation = (typeof HRM_KPI_AGGREGATIONS)[number]
export const kpiMetricAggregationSchema = z.enum(HRM_KPI_AGGREGATIONS)

export const HRM_KPI_PERIOD_STATES = [
  "draft",
  "active",
  "locked",
  "closed",
] as const
export type HrmKpiPeriodState = (typeof HRM_KPI_PERIOD_STATES)[number]
export const kpiPeriodStateSchema = z.enum(HRM_KPI_PERIOD_STATES)

export function normalizeKpiMetricCode(value: string): string {
  return value.trim().toUpperCase()
}

function roundDecimal(value: number, places: number): number {
  const factor = 10 ** places
  return Math.round((value + Number.EPSILON) * factor) / factor
}

function clampScorePercent(value: number): number {
  return Math.min(200, Math.max(0, value))
}

export function calculateTypedKpiScore(input: {
  target: number
  achieved: number
  direction: HrmKpiDirection
  weight: number
}): {
  variance: number
  scorePercent: number
  weightedScore: number
} {
  const variance = input.achieved - input.target
  let scorePercent: number

  if (input.direction === "higher_is_better") {
    scorePercent =
      input.target === 0
        ? input.achieved > 0
          ? 200
          : 100
        : (input.achieved / input.target) * 100
  } else if (input.direction === "lower_is_better") {
    scorePercent =
      input.achieved === 0
        ? 200
        : input.target === 0
          ? 0
          : (input.target / input.achieved) * 100
  } else {
    scorePercent =
      input.target === 0
        ? input.achieved === 0
          ? 100
          : 0
        : (1 - Math.abs(input.achieved - input.target) / Math.abs(input.target)) *
          100
  }

  const boundedScorePercent = clampScorePercent(scorePercent)
  return {
    variance: roundDecimal(variance, 6),
    scorePercent: roundDecimal(boundedScorePercent, 4),
    weightedScore: roundDecimal(boundedScorePercent * input.weight, 6),
  }
}

export function formatKpiDecimal(value: number, places: number): string {
  return roundDecimal(value, places).toFixed(places)
}

export const kpiMetricSchema = z.object({
  id: uuid,
  code: metricCode,
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  unit: z.string().min(1).max(64),
  valueType: kpiMetricValueTypeSchema,
  direction: kpiMetricDirectionSchema,
  aggregation: kpiMetricAggregationSchema,
  defaultWeight: decimalText,
  state: kpiMetricStateSchema,
})

export const createKpiMetricFormSchema = z.object({
  orgSlug: z.string().min(1),
  code: metricCode,
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  unit: z.string().min(1).max(64),
  valueType: kpiMetricValueTypeSchema,
  direction: kpiMetricDirectionSchema,
  aggregation: kpiMetricAggregationSchema,
  defaultWeight: decimalText.optional(),
})

export const archiveKpiMetricFormSchema = z.object({
  orgSlug: z.string().min(1),
  metricId: uuid,
})

export const createKpiPeriodFormSchema = z
  .object({
    orgSlug: z.string().min(1),
    name: z.string().min(1).max(200),
    periodStart: isoDate,
    periodEnd: isoDate,
  })
  .superRefine((v, ctx) => {
    if (v.periodEnd < v.periodStart) {
      ctx.addIssue({
        code: "custom",
        path: ["periodEnd"],
        message: "Period end must be on or after period start.",
      })
    }
  })

export const activateKpiPeriodFormSchema = z.object({
  orgSlug: z.string().min(1),
  periodId: uuid,
})

export const lockKpiPeriodFormSchema = z.object({
  orgSlug: z.string().min(1),
  periodId: uuid,
})

export const closeKpiPeriodFormSchema = z.object({
  orgSlug: z.string().min(1),
  periodId: uuid,
})

export const upsertKpiScoreFormSchema = z.object({
  orgSlug: z.string().min(1),
  periodId: uuid,
  employeeId: uuid,
  metricCode,
  targetValue: z.string().max(64).optional(),
  achievedValue: z.string().max(64).optional(),
  notes: z.string().max(2000).optional(),
})

export const upsertTypedKpiScoreFormSchema = z.object({
  orgSlug: z.string().min(1),
  periodId: uuid,
  employeeId: uuid,
  metricId: uuid,
  targetDecimal: decimalText,
  achievedDecimal: decimalText,
  weight: decimalText.optional(),
  notes: z.string().max(2000).optional(),
})

export type HrmKpiMetricInput = z.infer<typeof kpiMetricSchema>
export type CreateKpiMetricFormInput = z.infer<
  typeof createKpiMetricFormSchema
>
export type ArchiveKpiMetricFormInput = z.infer<
  typeof archiveKpiMetricFormSchema
>
export type CreateKpiPeriodFormInput = z.infer<typeof createKpiPeriodFormSchema>
export type ActivateKpiPeriodFormInput = z.infer<
  typeof activateKpiPeriodFormSchema
>
export type LockKpiPeriodFormInput = z.infer<typeof lockKpiPeriodFormSchema>
export type CloseKpiPeriodFormInput = z.infer<typeof closeKpiPeriodFormSchema>
export type UpsertKpiScoreFormInput = z.infer<typeof upsertKpiScoreFormSchema>
export type UpsertTypedKpiScoreFormInput = z.infer<
  typeof upsertTypedKpiScoreFormSchema
>
