import { z } from "zod"

export const benefitEligibilityRulesSchema = z.object({
  allowedCountryCodes: z.array(z.string().min(1)).optional(),
  allowedLegalEntityCodes: z.array(z.string().min(1)).optional(),
  allowedDepartmentIds: z.array(z.string().uuid()).optional(),
  allowedJobGradeIds: z.array(z.string().uuid()).optional(),
  allowedContractTypes: z.array(z.string().min(1)).optional(),
  minimumTenureDays: z.coerce.number().int().min(0).optional(),
  minimumFtePercent: z.coerce.number().min(0).max(100).optional(),
  requireActiveEmployee: z.boolean().optional(),
  requireDependentForNonEmployeeCoverage: z.boolean().optional(),
  newHireAutoEnroll: z.boolean().optional(),
  requiresEnrollmentApproval: z.boolean().optional(),
})

export type BenefitEligibilityRulesInput = z.infer<
  typeof benefitEligibilityRulesSchema
>

export function parseBenefitEligibilityRulesFromJson(
  value: Record<string, unknown> | null | undefined
): BenefitEligibilityRulesInput | null {
  if (!value || typeof value !== "object") return null
  const parsed = benefitEligibilityRulesSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}
