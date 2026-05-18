import { z } from "zod"

const idSchema = z.string().trim().min(1)
const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a YYYY-MM-DD date.")
const currencySchema = z
  .string()
  .trim()
  .length(3)
  .transform((value) => value.toUpperCase())
const optionalTextSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().min(1).nullable().optional()
)
const moneySchema = z.number().finite().nonnegative()
const ratioSchema = z.number().finite().positive()

export const SALARY_BENCHMARKING_MAPPING_STATES = [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "archived",
] as const

export const SALARY_BENCHMARKING_COMPENSATION_SCOPES = [
  "base_salary",
  "total_cash",
  "total_compensation",
] as const

export const SALARY_BENCHMARKING_MARKET_POSITIONS = [
  "below_market",
  "at_market",
  "above_market",
  "outlier",
] as const

export const SALARY_BENCHMARKING_TARGET_PERCENTILES = [
  "minimum",
  "p25",
  "p50",
  "median",
  "midpoint",
  "p75",
  "p90",
  "maximum",
] as const

export const salaryBenchmarkMappingStateSchema = z.enum(
  SALARY_BENCHMARKING_MAPPING_STATES
)
export const salaryBenchmarkCompensationScopeSchema = z.enum(
  SALARY_BENCHMARKING_COMPENSATION_SCOPES
)
export const salaryBenchmarkMarketPositionSchema = z.enum(
  SALARY_BENCHMARKING_MARKET_POSITIONS
)
export const salaryBenchmarkTargetPercentileSchema = z.enum(
  SALARY_BENCHMARKING_TARGET_PERCENTILES
)

export const salaryBenchmarkSurveySchema = z
  .object({
    id: idSchema,
    provider: z.string().trim().min(2).max(160),
    surveyYear: z.number().int().min(1900).max(9999),
    surveyName: optionalTextSchema,
    industry: optionalTextSchema,
    companySizeSegment: optionalTextSchema,
    revenueSegment: optionalTextSchema,
    countryCode: z
      .string()
      .trim()
      .min(2)
      .max(3)
      .transform((value) => value.toUpperCase()),
    location: optionalTextSchema,
    currency: currencySchema,
    effectiveDate: isoDateSchema,
    sourceVersion: z.string().trim().min(1).max(120),
    confidenceLevel: z.number().finite().min(0).max(1).optional(),
  })
  .strict()

export const salaryBenchmarkRowSchema = z
  .object({
    id: idSchema,
    surveyId: idSchema,
    benchmarkVersion: z.string().trim().min(1).max(120),
    jobFamily: z.string().trim().min(1).max(160),
    benchmarkJobCode: z.string().trim().min(1).max(80),
    benchmarkJobTitle: z.string().trim().min(1).max(160),
    benchmarkLevel: z.string().trim().min(1).max(80),
    industry: optionalTextSchema,
    countryCode: z
      .string()
      .trim()
      .min(2)
      .max(3)
      .transform((value) => value.toUpperCase()),
    location: optionalTextSchema,
    currency: currencySchema,
    minimum: moneySchema.optional(),
    midpoint: moneySchema.optional(),
    median: moneySchema.optional(),
    average: moneySchema.optional(),
    maximum: moneySchema.optional(),
    p25: moneySchema.optional(),
    p50: moneySchema.optional(),
    p75: moneySchema.optional(),
    p90: moneySchema.optional(),
    sampleSize: z.number().int().positive().optional(),
    effectiveDate: isoDateSchema,
  })
  .strict()

export const salaryBenchmarkMappingSchema = z
  .object({
    id: idSchema,
    benchmarkId: idSchema,
    internalJobId: idSchema,
    internalJobTitle: z.string().trim().min(1).max(160),
    internalJobFamily: z.string().trim().min(1).max(160),
    internalGrade: z.string().trim().min(1).max(80),
    legalEntityCode: optionalTextSchema,
    countryCode: z
      .string()
      .trim()
      .min(2)
      .max(3)
      .transform((value) => value.toUpperCase()),
    location: optionalTextSchema,
    employmentCategory: optionalTextSchema,
    state: salaryBenchmarkMappingStateSchema,
    approvedByUserId: optionalTextSchema,
    approvedAt: optionalTextSchema,
    sourceVersion: z.string().trim().min(1).max(120),
  })
  .strict()

export const salaryBenchmarkEmployeeCompensationSchema = z
  .object({
    id: idSchema,
    employeeId: idSchema,
    employeeNumber: z.string().trim().min(1).max(80),
    employeeName: z.string().trim().min(1).max(160),
    department: optionalTextSchema,
    managerName: optionalTextSchema,
    legalEntityCode: optionalTextSchema,
    countryCode: z
      .string()
      .trim()
      .min(2)
      .max(3)
      .transform((value) => value.toUpperCase()),
    location: optionalTextSchema,
    jobFamily: z.string().trim().min(1).max(160),
    jobTitle: z.string().trim().min(1).max(160),
    grade: z.string().trim().min(1).max(80),
    employmentCategory: optionalTextSchema,
    tenureMonths: z.number().int().nonnegative().optional(),
    performanceRating: optionalTextSchema,
    baseSalary: moneySchema,
    totalCash: moneySchema.optional(),
    totalCompensation: moneySchema.optional(),
    currency: currencySchema,
    internalRangeMidpoint: moneySchema.optional(),
  })
  .strict()

export const salaryBenchmarkThresholdsSchema = z
  .object({
    belowMarketRatio: ratioSchema.default(0.95),
    aboveMarketRatio: ratioSchema.default(1.15),
    outlierLowRatio: ratioSchema.default(0.75),
    outlierHighRatio: ratioSchema.default(1.5),
    targetPercentile: salaryBenchmarkTargetPercentileSchema.default("median"),
    recommendationFloorRatio: ratioSchema.default(1),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.outlierLowRatio > value.belowMarketRatio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Outlier low ratio must be less than or equal to below-market ratio.",
        path: ["outlierLowRatio"],
      })
    }
    if (value.aboveMarketRatio > value.outlierHighRatio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Above-market ratio must be less than or equal to outlier high ratio.",
        path: ["aboveMarketRatio"],
      })
    }
  })

export const salaryBenchmarkAnalysisInputSchema = z
  .object({
    benchmark: salaryBenchmarkRowSchema,
    mapping: salaryBenchmarkMappingSchema,
    employee: salaryBenchmarkEmployeeCompensationSchema,
    compensationScope:
      salaryBenchmarkCompensationScopeSchema.default("base_salary"),
    thresholds: salaryBenchmarkThresholdsSchema.default(() =>
      salaryBenchmarkThresholdsSchema.parse({})
    ),
    currencyConversionReference: optionalTextSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.employee.currency !== value.benchmark.currency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Employee and benchmark currencies must match or provide a conversion reference.",
        path: ["currencyConversionReference"],
      })
    }
  })

export type SalaryBenchmarkSurvey = z.infer<typeof salaryBenchmarkSurveySchema>
export type SalaryBenchmarkRow = z.infer<typeof salaryBenchmarkRowSchema>
export type SalaryBenchmarkMapping = z.infer<
  typeof salaryBenchmarkMappingSchema
>
export type SalaryBenchmarkEmployeeCompensation = z.infer<
  typeof salaryBenchmarkEmployeeCompensationSchema
>
export type SalaryBenchmarkThresholds = z.infer<
  typeof salaryBenchmarkThresholdsSchema
>
export type SalaryBenchmarkAnalysisInput = z.input<
  typeof salaryBenchmarkAnalysisInputSchema
>
export type SalaryBenchmarkAnalysisModel = z.infer<
  typeof salaryBenchmarkAnalysisInputSchema
>
export type SalaryBenchmarkCompensationScope = z.infer<
  typeof salaryBenchmarkCompensationScopeSchema
>
export type SalaryBenchmarkMarketPosition = z.infer<
  typeof salaryBenchmarkMarketPositionSchema
>
export type SalaryBenchmarkTargetPercentile = z.infer<
  typeof salaryBenchmarkTargetPercentileSchema
>
