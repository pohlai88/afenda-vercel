import { parseBenefitEligibilityRules } from "./benefit-eligibility.shared"

export type BenefitEnrollmentLifecycleState = "pending" | "active"

/** Initial row state after enroll / new-hire seed (HRM-BEN-019). */
export function resolveInitialBenefitEnrollmentState(
  eligibilityRules: unknown
): BenefitEnrollmentLifecycleState {
  const rules = parseBenefitEligibilityRules(eligibilityRules)
  return rules?.requiresEnrollmentApproval === true ? "pending" : "active"
}

export function planRequiresEnrollmentApproval(
  eligibilityRules: unknown
): boolean {
  return (
    parseBenefitEligibilityRules(eligibilityRules)
      ?.requiresEnrollmentApproval === true
  )
}
