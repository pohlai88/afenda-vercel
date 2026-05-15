import {
  benefitDayOverlap,
  type BenefitDateInput,
} from "./benefit-calendar.shared"

export type BenefitPayrollProjectionEnrollment = {
  readonly enrollmentId: string
  readonly benefitId: string
  readonly benefitCode: string
  readonly benefitName: string
  readonly employeeId: string
  readonly state: string
  readonly effectiveFrom: BenefitDateInput | null
  readonly enrolledAt?: BenefitDateInput | null
  readonly terminatedAt: BenefitDateInput | null
  readonly employeeContributionAmount: string | null
  readonly employerContributionAmount: string | null
  readonly currency?: string | null
}

export type BenefitPayrollProjectedLine = {
  readonly lineKind: "employee_deduction" | "employer_contribution"
  readonly code: string
  readonly description: string
  readonly amount: string
  readonly metadata: {
    readonly source: "benefit_enrollment"
    readonly enrollmentId: string
    readonly benefitId: string
    readonly employeeId: string
    readonly coverageStart: string
    readonly coverageEnd: string
    readonly prorationRatio: number
    readonly currency: string
  }
}

export type ProjectBenefitPayrollLinesInput = {
  readonly enrollment: BenefitPayrollProjectionEnrollment
  readonly periodStart: BenefitDateInput
  readonly periodEnd: BenefitDateInput
  readonly prorate?: boolean
  readonly currency?: string
}

export type ProjectBenefitPayrollLinesForPeriodInput = {
  readonly enrollments: readonly BenefitPayrollProjectionEnrollment[]
  readonly periodStart: BenefitDateInput
  readonly periodEnd: BenefitDateInput
  readonly prorate?: boolean
  readonly currency?: string
}

function parseContributionAmount(value: string | null): number {
  if (value === null) return 0
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Benefit contribution amount must be non-negative")
  }
  return parsed
}

function formatAmount(value: number): string {
  const rounded = Math.round(value * 100) / 100
  if (Object.is(rounded, -0)) return "0.00"
  return rounded.toFixed(2)
}

function normalizeBenefitCode(code: string): string {
  const normalized = code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
  return normalized.length > 0 ? normalized : "BENEFIT"
}

function getCoverageStart(
  enrollment: BenefitPayrollProjectionEnrollment
): BenefitDateInput {
  const start = enrollment.effectiveFrom ?? enrollment.enrolledAt
  if (!start) {
    throw new Error("Benefit enrollment requires an effective date for payroll")
  }
  return start
}

export function projectBenefitPayrollLines(
  input: ProjectBenefitPayrollLinesInput
): BenefitPayrollProjectedLine[] {
  const { enrollment } = input
  if (enrollment.state !== "active" && enrollment.state !== "terminated") {
    return []
  }
  if (enrollment.state === "terminated" && !enrollment.terminatedAt) {
    throw new Error("Terminated benefit enrollment requires terminatedAt")
  }

  const coverageStart = getCoverageStart(enrollment)
  const coverageEnd = enrollment.terminatedAt ?? input.periodEnd
  const overlap = benefitDayOverlap({
    rangeStart: coverageStart,
    rangeEnd: coverageEnd,
    windowStart: input.periodStart,
    windowEnd: input.periodEnd,
  })
  if (!overlap) return []

  const ratio = input.prorate === false ? 1 : overlap.ratio
  const employeeAmount =
    parseContributionAmount(enrollment.employeeContributionAmount) * ratio
  const employerAmount =
    parseContributionAmount(enrollment.employerContributionAmount) * ratio
  const normalizedCode = normalizeBenefitCode(enrollment.benefitCode)
  const currency = enrollment.currency ?? input.currency ?? "MYR"
  const metadata = {
    source: "benefit_enrollment" as const,
    enrollmentId: enrollment.enrollmentId,
    benefitId: enrollment.benefitId,
    employeeId: enrollment.employeeId,
    coverageStart: overlap.start,
    coverageEnd: overlap.end,
    prorationRatio: ratio,
    currency,
  }
  const lines: BenefitPayrollProjectedLine[] = []

  if (employeeAmount > 0) {
    lines.push({
      lineKind: "employee_deduction",
      code: `BENEFIT_${normalizedCode}_EE`,
      description: `${enrollment.benefitName} employee deduction`,
      amount: formatAmount(-employeeAmount),
      metadata,
    })
  }
  if (employerAmount > 0) {
    lines.push({
      lineKind: "employer_contribution",
      code: `BENEFIT_${normalizedCode}_ER`,
      description: `${enrollment.benefitName} employer contribution`,
      amount: formatAmount(employerAmount),
      metadata,
    })
  }

  return lines
}

export function projectBenefitPayrollLinesForPeriod(
  input: ProjectBenefitPayrollLinesForPeriodInput
): BenefitPayrollProjectedLine[] {
  return input.enrollments.flatMap((enrollment) =>
    projectBenefitPayrollLines({
      enrollment,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      prorate: input.prorate,
      currency: input.currency,
    })
  )
}
