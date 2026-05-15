import { describe, expect, it } from "vitest"

import {
  evaluateBenefitEligibility,
  parseBenefitEligibilityRules,
  summarizeBenefitEligibilityFailure,
} from "../../lib/features/hrm/data/benefit-eligibility.shared"
import { buildBenefitPlanEnterpriseVersion } from "../../lib/features/hrm/data/benefit-plan-version.shared"
import { projectBenefitPayrollLinesForPeriod } from "../../lib/features/hrm/data/benefit-payroll-projection.shared"
import { buildBenefitCensusReport } from "../../lib/features/hrm/data/benefit-reporting.shared"
import {
  buildLifeEventEnrollmentWindow,
  resolveBenefitElectionAccess,
} from "../../lib/features/hrm/data/benefit-self-service.shared"

describe("HRM benefits enterprise primitives", () => {
  it("parses persisted eligibility rules defensively", () => {
    expect(
      parseBenefitEligibilityRules({
        allowedCountryCodes: ["MY", ""],
        allowedContractTypes: ["full_time"],
        minimumFtePercent: 80,
        requireDependentForNonEmployeeCoverage: false,
        ignored: "field",
      })
    ).toEqual({
      allowedCountryCodes: ["MY"],
      allowedContractTypes: ["full_time"],
      minimumFtePercent: 80,
      requireDependentForNonEmployeeCoverage: false,
    })
  })

  it("evaluates eligibility from org employee context and dependent coverage", () => {
    const result = evaluateBenefitEligibility({
      plan: {
        id: "plan-medical",
        code: "MEDICAL",
        name: "Medical",
        isActive: true,
        effectiveFrom: "2026-01-01",
        waitingPeriodDays: 30,
        coverageLevels: ["employee_only", "employee_family"],
      },
      employee: {
        id: "emp-1",
        archivedAt: null,
        employmentStatus: "active",
        employmentStartDate: "2026-01-01",
        countryCode: "MY",
        currentDepartmentId: "dept-ops",
        currentJobGradeId: "grade-a",
        activeContractType: "full_time",
        normalWorkingHoursPerWeek: "40.00",
      },
      asOf: "2026-02-15",
      requestedCoverageLevel: "employee_family",
      dependentCount: 0,
      rules: {
        allowedCountryCodes: ["MY"],
        allowedContractTypes: ["full_time"],
        minimumFtePercent: 80,
      },
    })

    expect(result.eligible).toBe(false)
    expect(result.reasons.map((reason) => reason.code)).toContain(
      "dependent_required"
    )
    expect(result.eligibleCoverageLevels).toEqual(["employee_only"])
    expect(summarizeBenefitEligibilityFailure(result)).toContain(
      "Requested coverage requires at least one dependent."
    )
  })

  it("allows a verified life-event election inside the change window", () => {
    const window = buildLifeEventEnrollmentWindow({
      lifeEventId: "life-event-1",
      eventDate: "2026-03-01",
      verificationStatus: "verified",
      daysAfterEvent: 30,
    })

    const access = resolveBenefitElectionAccess({
      window,
      planId: "plan-medical",
      at: "2026-03-20",
      eligibility: {
        eligible: true,
        reasons: [],
        offeredCoverageLevels: ["employee_only"],
        eligibleCoverageLevels: ["employee_only"],
      },
    })

    expect(access.allowed).toBe(true)
  })

  it("projects prorated employee deductions and employer contributions", () => {
    const lines = projectBenefitPayrollLinesForPeriod({
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
      enrollments: [
        {
          enrollmentId: "enroll-1",
          benefitId: "benefit-1",
          benefitCode: "medical-plus",
          benefitName: "Medical Plus",
          employeeId: "emp-1",
          state: "active",
          effectiveFrom: "2026-01-16",
          terminatedAt: null,
          employeeContributionAmount: "100.00",
          employerContributionAmount: "250.00",
          currency: "MYR",
        },
      ],
    })

    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatchObject({
      lineKind: "employee_deduction",
      code: "BENEFIT_MEDICAL_PLUS_EE",
      amount: "-51.61",
    })
    expect(lines[1]).toMatchObject({
      lineKind: "employer_contribution",
      code: "BENEFIT_MEDICAL_PLUS_ER",
      amount: "129.03",
    })
    expect(lines[0]?.metadata).toMatchObject({
      enrollmentId: "enroll-1",
      coverageStart: "2026-01-16",
      coverageEnd: "2026-01-31",
    })
  })

  it("builds census totals and coverage gaps from existing benefit rows", () => {
    const report = buildBenefitCensusReport({
      asOf: "2026-05-01",
      plans: [
        {
          id: "plan-medical",
          organizationId: "org-1",
          code: "MEDICAL",
          name: "Medical",
          description: null,
          benefitKind: "medical",
          benefitType: null,
          planYear: 2026,
          carrierName: "Afenda Health",
          providerName: "Panel Network",
          policyReference: "POL-2026-MED",
          eligibilityRules: {
            allowedCountryCodes: ["MY"],
          },
          rateTableVersion: "2026-v1",
          rateTable: {
            employee_only: {
              employee: "100.00",
              employer: "250.00",
            },
          },
          employerContributionType: "flat_amount",
          employerContributionValue: "250.00",
          employeeContributionType: "flat_amount",
          employeeContributionValue: "100.00",
          coverageLevels: ["employee_only"],
          waitingPeriodDays: 0,
          maxAnnualAmount: null,
          effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
          isActive: true,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ],
      enrollments: [
        {
          enrollmentId: "enroll-1",
          organizationId: "org-1",
          benefitId: "plan-medical",
          benefitCode: "MEDICAL",
          benefitName: "Medical",
          employeeId: "emp-1",
          employeeNumber: "E001",
          employeeLegalName: "Ada",
          state: "active",
          coverageLevel: "employee_only",
          effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
          enrolledAt: new Date("2026-01-01T00:00:00.000Z"),
          terminatedAt: null,
        },
        {
          enrollmentId: "enroll-future",
          organizationId: "org-1",
          benefitId: "plan-medical",
          benefitCode: "MEDICAL",
          benefitName: "Medical",
          employeeId: "emp-2",
          employeeNumber: "E002",
          employeeLegalName: "Grace",
          state: "active",
          coverageLevel: "employee_only",
          effectiveFrom: new Date("2026-06-01T00:00:00.000Z"),
          enrolledAt: new Date("2026-05-20T00:00:00.000Z"),
          terminatedAt: null,
        },
      ],
      lifeEvents: [],
      payrollEnrollments: [
        {
          enrollmentId: "enroll-1",
          benefitId: "plan-medical",
          benefitCode: "MEDICAL",
          benefitName: "Medical",
          employeeId: "emp-1",
          state: "active",
          effectiveFrom: "2026-01-01",
          terminatedAt: null,
          employeeContributionAmount: "100.00",
          employerContributionAmount: "250.00",
        },
        {
          enrollmentId: "enroll-future",
          benefitId: "plan-medical",
          benefitCode: "MEDICAL",
          benefitName: "Medical",
          employeeId: "emp-2",
          state: "active",
          effectiveFrom: "2026-06-01",
          terminatedAt: null,
          employeeContributionAmount: "100.00",
          employerContributionAmount: "250.00",
        },
      ],
      employeeIds: ["emp-1", "emp-2"],
    })

    expect(report.activePlanCount).toBe(1)
    expect(report.coveredEmployeeCount).toBe(1)
    expect(report.coverageGapEmployeeIds).toEqual(["emp-2"])
    expect(report.monthlyEmployeeContributionTotal).toBe("100.00")
    expect(report.monthlyEmployerContributionTotal).toBe("250.00")
  })

  it("derives a plan-year effective version from the current plan catalog", () => {
    const version = buildBenefitPlanEnterpriseVersion({
      id: "plan-medical",
      organizationId: "org-1",
      code: "MEDICAL",
      name: "Medical",
      description: null,
      benefitKind: "medical",
      benefitType: null,
      planYear: 2026,
      carrierName: "Afenda Health",
      providerName: "Panel Network",
      policyReference: "POL-2026-MED",
      eligibilityRules: {
        allowedCountryCodes: ["MY"],
      },
      rateTableVersion: "2026-v1",
      rateTable: {
        employee_only: {
          employee: "100.00",
          employer: "250.00",
        },
      },
      employerContributionType: "flat_amount",
      employerContributionValue: "250.00",
      employeeContributionType: "flat_amount",
      employeeContributionValue: "100.00",
      coverageLevels: ["employee_only"],
      waitingPeriodDays: 0,
      maxAnnualAmount: null,
      effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
      isActive: true,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    })

    expect(version.planYear).toBe(2026)
    expect(version.versionKey).toBe("MEDICAL:2026-v1")
    expect(version.carrierName).toBe("Afenda Health")
    expect(version.policyReference).toBe("POL-2026-MED")
    expect(version.rateVersion.version).toBe("2026-v1")
    expect(version.eligibilityBasis).toContain("dependent_status")
  })
})
