import { z } from "zod"

import {
  salaryBenchmarkCompensationScopeSchema,
  salaryBenchmarkMappingSchema,
  salaryBenchmarkRowSchema,
  salaryBenchmarkSurveySchema,
  salaryBenchmarkThresholdsSchema,
} from "./salary-benchmarking.schema"

const idSchema = z.string().trim().min(1)

export const uploadSalaryBenchmarkSurveyFormSchema = salaryBenchmarkSurveySchema
  .omit({ id: true })
  .extend({
    surveyYear: z.preprocess((value) => {
      if (value == null || value === "") return value
      const parsed = typeof value === "number" ? value : Number(value)
      return Number.isFinite(parsed) ? parsed : value
    }, z.number().int().min(1900).max(9999)),
    confidenceLevel: z
      .union([z.string(), z.number()])
      .optional()
      .transform((value) => {
        if (value == null || value === "") return undefined
        const parsed = typeof value === "number" ? value : Number(value)
        return Number.isFinite(parsed) ? parsed : undefined
      }),
  })

const moneyFromFormSchema = z.preprocess((value) => {
  if (value == null || value === "") return undefined
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : value
}, z.number().finite().nonnegative().optional())

export const uploadSalaryBenchmarkRowFormSchema = salaryBenchmarkRowSchema
  .omit({ id: true })
  .extend({
    minimum: moneyFromFormSchema,
    midpoint: moneyFromFormSchema,
    median: moneyFromFormSchema,
    average: moneyFromFormSchema,
    maximum: moneyFromFormSchema,
    p25: moneyFromFormSchema,
    p50: moneyFromFormSchema,
    p75: moneyFromFormSchema,
    p90: moneyFromFormSchema,
    sampleSize: z.preprocess((value) => {
      if (value == null || value === "") return undefined
      const parsed = typeof value === "number" ? value : Number(value)
      return Number.isFinite(parsed) ? parsed : value
    }, z.number().int().positive().optional()),
  })

export const upsertSalaryBenchmarkMappingFormSchema =
  salaryBenchmarkMappingSchema.omit({
    id: true,
    approvedByUserId: true,
    approvedAt: true,
    state: true,
  })

export const salaryBenchmarkMappingDecisionFormSchema = z.object({
  mappingId: idSchema,
})

export const generateSalaryBenchmarkAnalysisFormSchema = z.object({
  compensationScope:
    salaryBenchmarkCompensationScopeSchema.default("base_salary"),
  analysisVersion: z.string().trim().min(1).max(120).optional(),
  thresholds: salaryBenchmarkThresholdsSchema.optional(),
  currencyConversionReference: z.string().trim().min(1).max(160).optional(),
})

export const handoffSalaryBenchmarkRecommendationFormSchema = z.object({
  snapshotId: idSchema,
})
