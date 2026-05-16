import { z } from "zod"

import {
  BENEFIT_CONTRIBUTION_TYPES,
  BENEFIT_COVERAGE_LEVELS,
  BENEFIT_KINDS,
  BENEFIT_LIFE_EVENT_TYPES,
} from "../data/benefit-helpers.shared"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const contributionTypeSchema = z.enum(BENEFIT_CONTRIBUTION_TYPES)

function emptyToUndefined(value: unknown): unknown {
  if (value === "" || value === null || value === undefined) {
    return undefined
  }
  return value
}

/** Optional non-negative decimal from form fields (empty → omitted). */
const optionalNonNegativeDecimal = z.preprocess(
  emptyToUndefined,
  z.coerce.number().finite().nonnegative().optional()
)

const optionalJsonRecord = z.preprocess((value) => {
  const normalized = emptyToUndefined(value)
  if (normalized === undefined) return undefined
  if (typeof normalized === "object") return normalized
  if (typeof normalized !== "string") return normalized
  try {
    return JSON.parse(normalized)
  } catch {
    return normalized
  }
}, z.record(z.string(), z.unknown()).optional())

export const createBenefitPlanFormSchema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .max(64, "Code must be at most 64 characters")
    .regex(/^[a-z0-9][a-z0-9._-]*$/i, "Code must start with alphanumeric"),
  name: z.string().min(1, "Name is required").max(256),
  description: z.preprocess(emptyToUndefined, z.string().max(4000).optional()),
  benefitKind: z.enum(BENEFIT_KINDS),
  benefitType: z.preprocess(emptyToUndefined, z.string().max(128).optional()),
  planYear: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1900).max(2200).optional()
  ),
  carrierName: z.preprocess(emptyToUndefined, z.string().max(256).optional()),
  providerName: z.preprocess(emptyToUndefined, z.string().max(256).optional()),
  policyReference: z.preprocess(
    emptyToUndefined,
    z.string().max(256).optional()
  ),
  eligibilityRules: optionalJsonRecord,
  rateTableVersion: z.preprocess(
    emptyToUndefined,
    z.string().max(128).optional()
  ),
  rateTable: optionalJsonRecord,
  employerContributionType: contributionTypeSchema.default("none"),
  employerContributionValue: optionalNonNegativeDecimal,
  employeeContributionType: contributionTypeSchema.default("none"),
  employeeContributionValue: optionalNonNegativeDecimal,
  coverageLevels: z.array(z.enum(BENEFIT_COVERAGE_LEVELS)).max(8).optional(),
  waitingPeriodDays: z.coerce.number().int().min(0).max(3650).default(0),
  maxAnnualAmount: optionalNonNegativeDecimal,
  effectiveFrom: z.preprocess(
    emptyToUndefined,
    z.string().regex(ISO_DATE, "Effective from must be YYYY-MM-DD").optional()
  ),
})

export type CreateBenefitPlanFormValues = z.infer<
  typeof createBenefitPlanFormSchema
>

export const updateBenefitPlanFormSchema = createBenefitPlanFormSchema.extend({
  planId: z.string().uuid("Plan ID must be a valid UUID"),
})

export type UpdateBenefitPlanFormValues = z.infer<
  typeof updateBenefitPlanFormSchema
>

export const archiveBenefitPlanFormSchema = z.object({
  planId: z.string().uuid("Plan ID must be a valid UUID"),
})

export const enrollBenefitFormSchema = z.object({
  employeeId: z.string().uuid("Employee ID must be a valid UUID"),
  planId: z.string().uuid("Plan ID must be a valid UUID"),
  coverageLevel: z.enum(BENEFIT_COVERAGE_LEVELS),
  effectiveFrom: z.preprocess(
    emptyToUndefined,
    z.string().regex(ISO_DATE, "Effective from must be YYYY-MM-DD").optional()
  ),
  employerContributionAmount: optionalNonNegativeDecimal,
  employeeContributionAmount: optionalNonNegativeDecimal,
})

export type EnrollBenefitFormValues = z.infer<typeof enrollBenefitFormSchema>

export const waiveBenefitEnrollmentFormSchema = z.object({
  enrollmentId: z.string().uuid("Enrollment ID must be a valid UUID"),
  waivedReason: z.preprocess(emptyToUndefined, z.string().max(2000).optional()),
})

export const terminateBenefitEnrollmentFormSchema = z.object({
  enrollmentId: z.string().uuid("Enrollment ID must be a valid UUID"),
  terminationReason: z.preprocess(
    emptyToUndefined,
    z.string().max(2000).optional()
  ),
  terminatedAt: z.preprocess(
    emptyToUndefined,
    z.string().regex(ISO_DATE, "Termination date must be YYYY-MM-DD").optional()
  ),
})

export const activateBenefitEnrollmentFormSchema = z.object({
  enrollmentId: z.string().uuid("Enrollment ID must be a valid UUID"),
})

export const recordLifeEventFormSchema = z.object({
  employeeId: z.string().uuid("Employee ID must be a valid UUID"),
  eventType: z.enum(BENEFIT_LIFE_EVENT_TYPES),
  eventDate: z.string().regex(ISO_DATE, "Event date must be YYYY-MM-DD"),
  notes: z.preprocess(emptyToUndefined, z.string().max(4000).optional()),
  documentIds: z.array(z.string().uuid()).max(20).optional().default([]),
})

export type RecordLifeEventFormValues = z.infer<
  typeof recordLifeEventFormSchema
>

export const verifyLifeEventFormSchema = z.object({
  lifeEventId: z.string().uuid("Life event ID must be a valid UUID"),
  verificationStatus: z.enum(["verified", "rejected"]),
  verificationNote: z.preprocess(
    emptyToUndefined,
    z.string().max(2000).optional()
  ),
})

export type VerifyLifeEventFormValues = z.infer<
  typeof verifyLifeEventFormSchema
>

export const portalEnrollBenefitSchema = z.object({
  planId: z.string().uuid("Plan ID must be a valid UUID"),
  coverageLevel: z.enum(BENEFIT_COVERAGE_LEVELS),
  effectiveFrom: z.preprocess(
    emptyToUndefined,
    z.string().regex(ISO_DATE, "Effective from must be YYYY-MM-DD").optional()
  ),
})

export const portalWaiveBenefitEnrollmentSchema = z.object({
  enrollmentId: z.string().uuid("Enrollment ID must be a valid UUID"),
})

export const portalRecordLifeEventSchema = z.object({
  eventType: z.enum(BENEFIT_LIFE_EVENT_TYPES),
  eventDate: z.string().regex(ISO_DATE, "Event date must be YYYY-MM-DD"),
  notes: z.preprocess(emptyToUndefined, z.string().max(4000).optional()),
})
