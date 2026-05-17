import { z } from "zod"

import type { SchemaStability } from "./_stability.shared"

import { governedSurfaceChromeSchema } from "./surface-chrome.schema"

export const GOVERNED_CHART_CONFIGURATION_SCHEMA_ID =
  "governed.chart.configuration" as const

export const GOVERNED_CHART_CONFIGURATION_SCHEMA_STABILITY: SchemaStability =
  "beta"

export const chartDataNatureSchema = z.enum(["time-series", "categorical"])
export type ChartDataNature = z.infer<typeof chartDataNatureSchema>

export const governedChartKindSchema = z.enum(["bar", "line", "area"])

export const chartPointSchema = z
  .object({
    x: z.string().trim().min(1),
    y: z.number().finite(),
  })
  .strict()

export const chartSeriesSchema = z
  .object({
    id: z.string().trim().min(1),
    label: z.string().trim().min(1),

    /**
     * Prefer token names over raw hex where possible:
     * example: "chart-1", "chart-revenue", "chart-risk".
     */
    color: z.string().trim().min(1).optional(),

    points: z.array(chartPointSchema).min(1),
  })
  .strict()

export const governedChartConfigurationSchema = z
  .object({
    dataNature: chartDataNatureSchema,
    chartKind: governedChartKindSchema,
    title: z.string().trim().min(1).optional(),
    series: z.array(chartSeriesSchema).min(1),
    chrome: governedSurfaceChromeSchema.optional(),
  })
  .strict()
  .superRefine((config, ctx) => {
    const seen = new Set<string>()

    for (const [index, series] of config.series.entries()) {
      if (seen.has(series.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Series ids must be unique.",
          path: ["series", index, "id"],
        })
      }

      seen.add(series.id)
    }
  })

export type GovernedChartKind = z.infer<typeof governedChartKindSchema>
export type ChartPoint = z.infer<typeof chartPointSchema>
export type ChartSeries = z.infer<typeof chartSeriesSchema>

export type GovernedChartConfiguration = z.infer<
  typeof governedChartConfigurationSchema
>

export type GovernedChartConfigurationInput = z.input<
  typeof governedChartConfigurationSchema
>

export function parseGovernedChartConfiguration(raw: unknown) {
  return governedChartConfigurationSchema.safeParse(raw)
}
