import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireHrmAdmin: vi.fn(),
  getBenefitEnrollmentForOrganization: vi.fn(),
  getBenefitPlanForOrganization: vi.fn(),
  listBenefitEnrollmentCoverageRowsForEmployeePlan: vi.fn(),
  listClosedPayrollPeriodsOverlappingRange: vi.fn(),
  evaluateBenefitEligibilityForEmployee: vi.fn(),
  getEmployeeForOrganization: vi.fn(),
  update: vi.fn(),
  writeIamAuditEventFromNextHeaders: vi.fn(),
  revalidatePath: vi.fn(),
  after: vi.fn((callback: () => unknown) => callback()),
}))

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock("next/server", () => ({
  after: mocks.after,
}))

vi.mock("#lib/auth", () => ({
  writeIamAuditEventFromNextHeaders: mocks.writeIamAuditEventFromNextHeaders,
}))

vi.mock("#lib/db", () => ({
  db: {
    update: mocks.update,
  },
}))

vi.mock(
  "../../lib/features/hrm/_module-governance/hrm-admin-guard.server.ts",
  () => ({
    requireHrmAdmin: mocks.requireHrmAdmin,
  })
)

vi.mock(
  "../../lib/features/hrm/payroll-compensation/benefits-administration/data/benefit.queries.server.ts",
  () => ({
    getBenefitEnrollmentForOrganization:
      mocks.getBenefitEnrollmentForOrganization,
    getBenefitPlanForOrganization: mocks.getBenefitPlanForOrganization,
    listBenefitEnrollmentCoverageRowsForEmployeePlan:
      mocks.listBenefitEnrollmentCoverageRowsForEmployeePlan,
  })
)

vi.mock(
  "../../lib/features/hrm/payroll-compensation/payroll-processing/data/payroll.queries.server.ts",
  () => ({
    listClosedPayrollPeriodsOverlappingRange:
      mocks.listClosedPayrollPeriodsOverlappingRange,
  })
)

vi.mock(
  "../../lib/features/hrm/payroll-compensation/benefits-administration/data/benefit-enterprise.queries.server.ts",
  () => ({
    evaluateBenefitEligibilityForEmployee:
      mocks.evaluateBenefitEligibilityForEmployee,
  })
)

vi.mock(
  "../../lib/features/hrm/employee-management/employee-records-management/data/employee.queries.server.ts",
  () => ({
    getEmployeeForOrganization: mocks.getEmployeeForOrganization,
  })
)

import {
  activateBenefitEnrollmentAction,
  terminateBenefitEnrollmentAction,
} from "../../lib/features/hrm/payroll-compensation/benefits-administration/actions/benefit-enrollment.actions"

function buildTransitionFormData(fields: Record<string, string>) {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value)
  }
  return formData
}

function buildUpdateChain() {
  const where = vi.fn().mockResolvedValue(undefined)
  const set = vi.fn().mockReturnValue({ where })
  mocks.update.mockReturnValue({ set })
  return { set, where }
}

describe("benefit enrollment actions", () => {
  beforeEach(() => {
    mocks.requireHrmAdmin.mockReset()
    mocks.getBenefitEnrollmentForOrganization.mockReset()
    mocks.getBenefitPlanForOrganization.mockReset()
    mocks.listBenefitEnrollmentCoverageRowsForEmployeePlan.mockReset()
    mocks.listClosedPayrollPeriodsOverlappingRange.mockReset()
    mocks.evaluateBenefitEligibilityForEmployee.mockReset()
    mocks.getEmployeeForOrganization.mockReset()
    mocks.update.mockReset()
    mocks.writeIamAuditEventFromNextHeaders.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.after.mockClear()

    mocks.requireHrmAdmin.mockResolvedValue({
      ok: true,
      session: {
        organizationId: "org-1",
        userId: "user-1",
        sessionId: "session-1",
      },
    })
    mocks.listBenefitEnrollmentCoverageRowsForEmployeePlan.mockResolvedValue([])
    mocks.getBenefitPlanForOrganization.mockResolvedValue({
      eligibilityRules: { requiresEnrollmentApproval: true },
    })
    mocks.listClosedPayrollPeriodsOverlappingRange.mockResolvedValue([])
    buildUpdateChain()
  })

  it("blocks activation when a closed payroll period overlaps the coverage start", async () => {
    mocks.getBenefitEnrollmentForOrganization.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      state: "pending",
      benefitId: "22222222-2222-4222-8222-222222222222",
      employeeId: "33333333-3333-4333-8333-333333333333",
      effectiveFrom: new Date("2026-02-01T12:00:00.000Z"),
      enrolledAt: new Date("2026-01-15T12:00:00.000Z"),
      terminatedAt: null,
    })
    mocks.listClosedPayrollPeriodsOverlappingRange.mockResolvedValue([
      {
        id: "period-1",
        periodStart: "2026-02-01",
        periodEnd: "2026-02-28",
        state: "locked",
      },
    ])

    const result = await activateBenefitEnrollmentAction(
      undefined,
      buildTransitionFormData({
        enrollmentId: "11111111-1111-4111-8111-111111111111",
      })
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.form).toBe(
        "Cannot activate this enrollment because payroll period 2026-02-01 to 2026-02-28 is locked."
      )
    }
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.writeIamAuditEventFromNextHeaders).not.toHaveBeenCalled()
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  it("blocks termination when a closed payroll period overlaps the termination date", async () => {
    mocks.getBenefitEnrollmentForOrganization.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      state: "active",
      benefitId: "22222222-2222-4222-8222-222222222222",
      employeeId: "33333333-3333-4333-8333-333333333333",
      effectiveFrom: new Date("2026-01-01T12:00:00.000Z"),
      enrolledAt: new Date("2026-01-01T12:00:00.000Z"),
      terminatedAt: null,
    })
    mocks.listClosedPayrollPeriodsOverlappingRange.mockResolvedValue([
      {
        id: "period-2",
        periodStart: "2026-03-01",
        periodEnd: "2026-03-31",
        state: "finalized",
      },
    ])

    const result = await terminateBenefitEnrollmentAction(
      undefined,
      buildTransitionFormData({
        enrollmentId: "11111111-1111-4111-8111-111111111111",
        terminatedAt: "2026-03-15",
      })
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.form).toBe(
        "Cannot terminate this enrollment because payroll period 2026-03-01 to 2026-03-31 is finalized."
      )
    }
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.writeIamAuditEventFromNextHeaders).not.toHaveBeenCalled()
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })
})
