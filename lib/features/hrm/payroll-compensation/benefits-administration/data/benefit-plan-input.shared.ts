import { benefitEligibilityRulesSchema } from "../schema/benefit-eligibility-rules.schema"

export function normalizeBenefitScopeCodes(
  values: readonly string[] | undefined
): string[] | null {
  if (!values?.length) {
    return null
  }
  const normalized = [
    ...new Set(
      values
        .map((value) => value.trim().toUpperCase())
        .filter((value) => value.length > 0)
    ),
  ]
  return normalized.length > 0 ? normalized : null
}

export function parseBenefitScopeCodesInput(
  raw: string | undefined
): string[] | null {
  if (!raw?.trim()) {
    return null
  }
  return normalizeBenefitScopeCodes(
    raw
      .split(/[,;\n]/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
  )
}

export function buildPlanEligibilityRulesPayload(params: {
  existingJson?: Record<string, unknown> | null
  requiresEnrollmentApproval?: boolean
  newHireAutoEnroll?: boolean
}): Record<string, unknown> | null {
  const merged: Record<string, unknown> = {
    ...(params.existingJson ?? {}),
  }

  if (params.requiresEnrollmentApproval === true) {
    merged.requiresEnrollmentApproval = true
  } else if (params.requiresEnrollmentApproval === false) {
    delete merged.requiresEnrollmentApproval
  }

  if (params.newHireAutoEnroll === true) {
    merged.newHireAutoEnroll = true
  } else if (params.newHireAutoEnroll === false) {
    delete merged.newHireAutoEnroll
  }

  const parsed = benefitEligibilityRulesSchema.safeParse(merged)
  if (!parsed.success) {
    return Object.keys(merged).length > 0 ? merged : null
  }

  return Object.keys(parsed.data).length > 0
    ? (parsed.data as Record<string, unknown>)
    : null
}

export function readPlanEligibilityFlag(
  eligibilityRules: unknown,
  key: "requiresEnrollmentApproval" | "newHireAutoEnroll"
): boolean {
  if (typeof eligibilityRules !== "object" || eligibilityRules === null) {
    return false
  }
  return (eligibilityRules as Record<string, unknown>)[key] === true
}
