import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  after: vi.fn((callback: () => unknown) => callback()),
  closeBenefitOpenEnrollmentWindow: vi.fn(),
  getBenefitEnrollmentForOrganization: vi.fn(),
  getBenefitPlanForOrganization: vi.fn(),
  getBenefitProviderForOrganization: vi.fn(),
  archiveBenefitPlanRow: vi.fn(),
  insertBenefitClaimReference: vi.fn(),
  insertBenefitOpenEnrollmentWindow: vi.fn(),
  insertBenefitPlan: vi.fn(),
  insertBenefitProvider: vi.fn(),
  requireHrmAdmin: vi.fn(),
  revalidatePath: vi.fn(),
  resolveBenefitCategoryFromKindInput: vi.fn(),
  updateBenefitClaimReferenceRow: vi.fn(),
  updateBenefitPlanRow: vi.fn(),
  updateBenefitProviderRow: vi.fn(),
  writeIamAuditEventFromNextHeaders: vi.fn(),
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

vi.mock("#lib/i18n/locales.shared", () => ({
  toLocaleOrgAppsRevalidatePattern: (path: string) => path,
}))

vi.mock("#lib/db", () => ({
  db: {},
}))

vi.mock(
  "../../lib/features/hrm/_module-governance/hrm-admin-guard.server.ts",
  () => ({
    requireHrmAdmin: mocks.requireHrmAdmin,
  })
)

vi.mock(
  "../../lib/features/hrm/payroll-compensation/benefits-administration/data/benefit-open-enrollment.mutations.server.ts",
  () => ({
    closeBenefitOpenEnrollmentWindow: mocks.closeBenefitOpenEnrollmentWindow,
    insertBenefitOpenEnrollmentWindow: mocks.insertBenefitOpenEnrollmentWindow,
  })
)

vi.mock(
  "../../lib/features/hrm/payroll-compensation/benefits-administration/data/benefit-provider.mutations.server.ts",
  () => ({
    insertBenefitProvider: mocks.insertBenefitProvider,
    updateBenefitProviderRow: mocks.updateBenefitProviderRow,
  })
)

vi.mock(
  "../../lib/features/hrm/payroll-compensation/benefits-administration/data/benefit-plan.mutations.server.ts",
  () => ({
    archiveBenefitPlanRow: mocks.archiveBenefitPlanRow,
    insertBenefitPlan: mocks.insertBenefitPlan,
    resolveBenefitCategoryFromKindInput:
      mocks.resolveBenefitCategoryFromKindInput,
    updateBenefitPlanRow: mocks.updateBenefitPlanRow,
  })
)

vi.mock(
  "../../lib/features/hrm/payroll-compensation/benefits-administration/data/benefit-provider.queries.server.ts",
  () => ({
    getBenefitProviderForOrganization: mocks.getBenefitProviderForOrganization,
  })
)

vi.mock(
  "../../lib/features/hrm/payroll-compensation/benefits-administration/data/benefit-claim-reference.mutations.server.ts",
  () => ({
    insertBenefitClaimReference: mocks.insertBenefitClaimReference,
    updateBenefitClaimReferenceRow: mocks.updateBenefitClaimReferenceRow,
  })
)

vi.mock(
  "../../lib/features/hrm/payroll-compensation/benefits-administration/data/benefit.queries.server.ts",
  () => ({
    getBenefitEnrollmentForOrganization:
      mocks.getBenefitEnrollmentForOrganization,
    getBenefitPlanForOrganization: mocks.getBenefitPlanForOrganization,
  })
)

import { createBenefitClaimReferenceAction } from "../../lib/features/hrm/payroll-compensation/benefits-administration/actions/benefit-claim-reference.actions"
import { createBenefitOpenEnrollmentAction } from "../../lib/features/hrm/payroll-compensation/benefits-administration/actions/benefit-open-enrollment.actions"
import { createBenefitPlanAction } from "../../lib/features/hrm/payroll-compensation/benefits-administration/actions/benefit-plan.actions"
import { createBenefitProviderAction } from "../../lib/features/hrm/payroll-compensation/benefits-administration/actions/benefit-provider.actions"

function formData(fields: Record<string, string | string[]>): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        data.append(key, entry)
      }
    } else {
      data.set(key, value)
    }
  }
  return data
}

describe("benefit persistence-backed actions", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) {
      mock.mockReset()
    }
    mocks.after.mockImplementation((callback: () => unknown) => callback())
    mocks.requireHrmAdmin.mockResolvedValue({
      ok: true,
      session: {
        organizationId: "org-1",
        userId: "user-1",
        sessionId: "session-1",
      },
    })
    mocks.resolveBenefitCategoryFromKindInput.mockImplementation(
      (_kind: string, category: string | undefined) => category ?? "health"
    )
  })

  it("creates benefit providers through the provider mutation", async () => {
    mocks.insertBenefitProvider.mockResolvedValue({ id: "provider-1" })

    const result = await createBenefitProviderAction(
      undefined,
      formData({
        code: "provider-a",
        name: "Provider A",
        countryCodes: "my, sg",
        externalReference: "EXT-1",
      })
    )

    expect(result).toEqual({ ok: true, planId: "provider-1" })
    expect(mocks.insertBenefitProvider).toHaveBeenCalledWith({
      organizationId: "org-1",
      code: "provider-a",
      name: "Provider A",
      countryCodes: ["MY", "SG"],
      externalReference: "EXT-1",
      createdByUserId: "user-1",
    })
  })

  it("creates open enrollment windows after validating selected active plans", async () => {
    mocks.getBenefitPlanForOrganization.mockResolvedValue({ isActive: true })
    mocks.insertBenefitOpenEnrollmentWindow.mockResolvedValue({
      id: "window-1",
    })

    const result = await createBenefitOpenEnrollmentAction(
      undefined,
      formData({
        name: "Annual enrollment",
        startsOn: "2026-01-01",
        endsOn: "2026-01-31",
        planIds: [
          "11111111-1111-4111-8111-111111111111",
          "22222222-2222-4222-8222-222222222222",
        ],
      })
    )

    expect(result).toEqual({ ok: true, windowId: "window-1" })
    expect(mocks.insertBenefitOpenEnrollmentWindow).toHaveBeenCalledWith({
      organizationId: "org-1",
      name: "Annual enrollment",
      startsOn: new Date("2026-01-01T12:00:00.000Z"),
      endsOn: new Date("2026-01-31T12:00:00.000Z"),
      planIds: [
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
      ],
      createdByUserId: "user-1",
    })
  })

  it("preserves checked plan governance flags at the action boundary", async () => {
    mocks.insertBenefitPlan.mockResolvedValue({ id: "plan-1" })

    const result = await createBenefitPlanAction(
      undefined,
      formData({
        code: "medical-plus",
        name: "Medical Plus",
        benefitKind: "medical",
        benefitCategory: "health",
        requiresEnrollmentApproval: ["false", "true"],
        newHireAutoEnroll: ["false", "true"],
        employerContributionType: "none",
        employeeContributionType: "none",
        waitingPeriodDays: "0",
      })
    )

    expect(result).toEqual({ ok: true, planId: "plan-1" })
    expect(mocks.insertBenefitPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        eligibilityRules: {
          requiresEnrollmentApproval: true,
          newHireAutoEnroll: true,
        },
      })
    )
  })

  it("creates benefit claim references through the claim reference mutation", async () => {
    mocks.getBenefitEnrollmentForOrganization.mockResolvedValue({
      id: "enrollment-1",
    })
    mocks.getBenefitProviderForOrganization.mockResolvedValue({
      id: "33333333-3333-4333-8333-333333333333",
      isActive: true,
    })
    mocks.insertBenefitClaimReference.mockResolvedValue({
      id: "claim-reference-1",
    })

    const result = await createBenefitClaimReferenceAction(
      undefined,
      formData({
        enrollmentId: "11111111-1111-4111-8111-111111111111",
        providerId: "33333333-3333-4333-8333-333333333333",
        externalClaimId: "CLM-001",
        claimStatus: "approved",
        claimedAmount: "120.5",
        currency: "MYR",
        paymentReference: "PAY-001",
      })
    )

    expect(result).toEqual({ ok: true })
    expect(mocks.insertBenefitClaimReference).toHaveBeenCalledWith({
      organizationId: "org-1",
      enrollmentId: "11111111-1111-4111-8111-111111111111",
      providerId: "33333333-3333-4333-8333-333333333333",
      externalClaimId: "CLM-001",
      claimStatus: "approved",
      claimedAmount: "120.50",
      currency: "MYR",
      paymentReference: "PAY-001",
      documentIds: [],
      createdByUserId: "user-1",
    })
  })
})
