import { z } from "zod"

import { BENEFIT_COVERAGE_LEVELS } from "../data/benefit-helpers.shared"

const coverageLevelSchema = z.enum(BENEFIT_COVERAGE_LEVELS)

const moneyStringSchema = z
  .union([z.string(), z.number()])
  .transform((value) => {
    const parsed =
      typeof value === "number" ? value : Number.parseFloat(String(value))
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error("Amount must be a non-negative number")
    }
    return parsed.toFixed(2)
  })

/** Per-tier contribution amounts keyed by coverage level. */
export const benefitRateTableTierSchema = z.object({
  coverageLevel: coverageLevelSchema,
  employerContributionAmount: moneyStringSchema.optional(),
  employeeContributionAmount: moneyStringSchema.optional(),
  /** Optional dependent-count band (inclusive min). */
  minDependents: z.coerce.number().int().min(0).optional(),
  maxDependents: z.coerce.number().int().min(0).optional(),
})

export const benefitRateTableSchema = z.object({
  version: z.string().max(128).optional(),
  tiers: z.array(benefitRateTableTierSchema).min(1),
})

export type BenefitRateTable = z.infer<typeof benefitRateTableSchema>
export type BenefitRateTableTier = z.infer<typeof benefitRateTableTierSchema>

export function parseBenefitRateTable(
  value: Record<string, unknown> | null | undefined
): BenefitRateTable | null {
  if (!value || typeof value !== "object") return null
  const parsed = benefitRateTableSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}
