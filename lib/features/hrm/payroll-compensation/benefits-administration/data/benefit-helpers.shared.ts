/**
 * Benefits administration — shared vocabulary (no `server-only`).
 * Mirrors VietERP service granularity where useful; DB stores lowercase snake values.
 */

/** Enterprise benefit category (HRM-BEN-002). */
export const BENEFIT_CATEGORIES = [
  "health",
  "insurance",
  "retirement",
  "welfare",
  "transport",
  "meal",
  "housing",
  "education",
  "wellness",
] as const

export type BenefitCategory = (typeof BENEFIT_CATEGORIES)[number]

export const BENEFIT_KINDS = [
  "medical",
  "dental",
  "optical",
  "wellness",
  "retirement",
  "other",
] as const

export type BenefitKind = (typeof BENEFIT_KINDS)[number]

/** Default category when creating plans from legacy kind-only rows. */
export const BENEFIT_KIND_DEFAULT_CATEGORY: Record<
  BenefitKind,
  BenefitCategory
> = {
  medical: "health",
  dental: "health",
  optical: "health",
  wellness: "wellness",
  retirement: "retirement",
  other: "welfare",
}

export const BENEFIT_ENROLLMENT_STATES = [
  "pending",
  "active",
  "waived",
  "suspended",
  "terminated",
  "expired",
] as const

export type BenefitEnrollmentState = (typeof BENEFIT_ENROLLMENT_STATES)[number]

export const BENEFIT_COVERAGE_LEVELS = [
  "employee_only",
  "employee_spouse",
  "employee_children",
  "employee_family",
] as const

export type BenefitCoverageLevel = (typeof BENEFIT_COVERAGE_LEVELS)[number]

/** Canonical life-event types (includes spouse_job_loss per VietERP service layer). */
export const BENEFIT_LIFE_EVENT_TYPES = [
  "marriage",
  "divorce",
  "birth_adoption",
  "death_of_dependent",
  "loss_of_coverage",
  "spouse_job_loss",
  "change_in_employment_status",
  "other",
] as const

export type BenefitLifeEventType = (typeof BENEFIT_LIFE_EVENT_TYPES)[number]

export const BENEFIT_CONTRIBUTION_TYPES = [
  "flat_amount",
  "percentage",
  "none",
] as const

export type BenefitContributionType =
  (typeof BENEFIT_CONTRIBUTION_TYPES)[number]

export const BENEFIT_LIFE_EVENT_VERIFICATION_STATUSES = [
  "pending",
  "verified",
  "rejected",
] as const

export type BenefitLifeEventVerificationStatus =
  (typeof BENEFIT_LIFE_EVENT_VERIFICATION_STATUSES)[number]

export const BENEFIT_CLAIM_STATUSES = [
  "submitted",
  "approved",
  "rejected",
  "paid",
] as const

export type BenefitClaimStatus = (typeof BENEFIT_CLAIM_STATUSES)[number]

export function isBenefitClaimStatus(
  value: string
): value is BenefitClaimStatus {
  return (BENEFIT_CLAIM_STATUSES as readonly string[]).includes(value)
}

export function isBenefitCategory(value: string): value is BenefitCategory {
  return (BENEFIT_CATEGORIES as readonly string[]).includes(value)
}

export function isBenefitKind(value: string): value is BenefitKind {
  return (BENEFIT_KINDS as readonly string[]).includes(value)
}

export function resolveBenefitCategoryFromKind(
  kind: BenefitKind
): BenefitCategory {
  return BENEFIT_KIND_DEFAULT_CATEGORY[kind]
}

export function isBenefitEnrollmentState(
  value: string
): value is BenefitEnrollmentState {
  return (BENEFIT_ENROLLMENT_STATES as readonly string[]).includes(value)
}

export function isBenefitCoverageLevel(
  value: string
): value is BenefitCoverageLevel {
  return (BENEFIT_COVERAGE_LEVELS as readonly string[]).includes(value)
}

export function isBenefitLifeEventType(
  value: string
): value is BenefitLifeEventType {
  return (BENEFIT_LIFE_EVENT_TYPES as readonly string[]).includes(value)
}

export function isBenefitContributionType(
  value: string
): value is BenefitContributionType {
  return (BENEFIT_CONTRIBUTION_TYPES as readonly string[]).includes(value)
}

export function isBenefitLifeEventVerificationStatus(
  value: string
): value is BenefitLifeEventVerificationStatus {
  return (
    BENEFIT_LIFE_EVENT_VERIFICATION_STATUSES as readonly string[]
  ).includes(value)
}
