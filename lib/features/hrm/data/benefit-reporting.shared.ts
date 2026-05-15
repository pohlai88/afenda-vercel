import type {
  BenefitEnrollmentListRow,
  BenefitLifeEventRow,
  BenefitPlanRow,
} from "./benefit-model.shared"
import type { BenefitPayrollProjectionEnrollment } from "./benefit-payroll-projection.shared"
import { toBenefitUtcDay } from "./benefit-calendar.shared"

export type BenefitCensusReport = {
  readonly asOf: string
  readonly activePlanCount: number
  readonly inactivePlanCount: number
  readonly coveredEmployeeCount: number
  readonly pendingEnrollmentCount: number
  readonly waivedEnrollmentCount: number
  readonly terminatedEnrollmentCount: number
  readonly pendingLifeEventCount: number
  readonly coverageGapEmployeeIds: readonly string[]
  readonly monthlyEmployeeContributionTotal: string
  readonly monthlyEmployerContributionTotal: string
}

export type BuildBenefitCensusReportInput = {
  readonly plans: readonly BenefitPlanRow[]
  readonly enrollments: readonly BenefitEnrollmentListRow[]
  readonly lifeEvents: readonly BenefitLifeEventRow[]
  readonly payrollEnrollments?: readonly BenefitPayrollProjectionEnrollment[]
  readonly employeeIds?: readonly string[]
  readonly asOf: string
}

function parseAmount(value: string | null): number {
  if (value === null) return 0
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Benefit report amount must be non-negative")
  }
  return parsed
}

function formatAmount(value: number): string {
  const rounded = Math.round(value * 100) / 100
  return rounded.toFixed(2)
}

function coversDate(params: {
  readonly state: string
  readonly effectiveFrom: string | Date | null
  readonly enrolledAt?: string | Date | null
  readonly terminatedAt: string | Date | null
  readonly asOf: string
}): boolean {
  if (params.state !== "active") return false
  const asOfDay = toBenefitUtcDay(params.asOf, "asOf")
  const start = params.effectiveFrom ?? params.enrolledAt
  if (start && toBenefitUtcDay(start, "effectiveFrom") > asOfDay) {
    return false
  }
  return (
    !params.terminatedAt ||
    toBenefitUtcDay(params.terminatedAt, "terminatedAt") >= asOfDay
  )
}

export function buildBenefitCensusReport(
  input: BuildBenefitCensusReportInput
): BenefitCensusReport {
  const activeEnrollments = input.enrollments.filter((enrollment) =>
    coversDate({
      state: enrollment.state,
      effectiveFrom: enrollment.effectiveFrom,
      enrolledAt: enrollment.enrolledAt,
      terminatedAt: enrollment.terminatedAt,
      asOf: input.asOf,
    })
  )
  const coveredEmployeeIds = new Set(
    activeEnrollments.map((enrollment) => enrollment.employeeId)
  )
  const expectedEmployeeIds = new Set(input.employeeIds ?? [])
  const coverageGapEmployeeIds = [...expectedEmployeeIds].filter(
    (employeeId) => !coveredEmployeeIds.has(employeeId)
  )
  const payrollEnrollments = (input.payrollEnrollments ?? []).filter(
    (enrollment) =>
      coversDate({
        state: enrollment.state,
        effectiveFrom: enrollment.effectiveFrom,
        enrolledAt: enrollment.enrolledAt,
        terminatedAt: enrollment.terminatedAt,
        asOf: input.asOf,
      })
  )

  return {
    asOf: input.asOf,
    activePlanCount: input.plans.filter((plan) => plan.isActive).length,
    inactivePlanCount: input.plans.filter((plan) => !plan.isActive).length,
    coveredEmployeeCount: coveredEmployeeIds.size,
    pendingEnrollmentCount: input.enrollments.filter(
      (enrollment) => enrollment.state === "pending"
    ).length,
    waivedEnrollmentCount: input.enrollments.filter(
      (enrollment) => enrollment.state === "waived"
    ).length,
    terminatedEnrollmentCount: input.enrollments.filter(
      (enrollment) => enrollment.state === "terminated"
    ).length,
    pendingLifeEventCount: input.lifeEvents.filter(
      (event) => event.verificationStatus === "pending"
    ).length,
    coverageGapEmployeeIds,
    monthlyEmployeeContributionTotal: formatAmount(
      payrollEnrollments.reduce(
        (sum, enrollment) =>
          sum + parseAmount(enrollment.employeeContributionAmount),
        0
      )
    ),
    monthlyEmployerContributionTotal: formatAmount(
      payrollEnrollments.reduce(
        (sum, enrollment) =>
          sum + parseAmount(enrollment.employerContributionAmount),
        0
      )
    ),
  }
}
