import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock("next-intl/navigation", () => ({
  createNavigation: () => ({
    Link: () => null,
    redirect: vi.fn(),
    usePathname: () => "/",
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
    getPathname: vi.fn(() => "/"),
  }),
}))

vi.mock("#i18n/navigation", () => ({
  Link: ({ children }: { children?: unknown }) => children,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("workflow", () => ({
  FatalError: class FatalError extends Error {},
}))

vi.mock("#features/execution", () => ({
  EXECUTION_AUDIT_ACTIONS: {
    PAYROLL_FINALIZE_RUN_FAILED: "erp.execution.payroll_finalize.run.failed",
  },
}))

vi.mock("#features/planner/server", () => ({
  createPlannerSignalLink: vi.fn(),
  insertPlannerSignal: vi.fn().mockResolvedValue({ id: "signal-1" }),
}))

vi.mock("../../lib/features/hrm/constants", () => ({
  organizationHrmPath: (slug: string, segment: string) =>
    `/o/${slug}/dashboard/hrm/${segment}`,
}))

vi.mock("#lib/auth", () => ({
  writeIamAuditEvent: vi.fn(),
}))

vi.mock("#lib/i18n/locales.shared", () => ({
  toLocaleOrgDashboardRevalidatePattern: vi.fn(
    (path: string) => `/[locale]/o/[orgSlug]/dashboard${path}`
  ),
}))

vi.mock("#lib/org-slug.server", () => ({
  getOrganizationSlugById: vi.fn(),
}))

vi.mock("../../lib/features/hrm/payroll-compensation/payroll-processing/data/payroll-engine.server.ts", () => ({
  computePayrollRun: vi.fn(),
}))

vi.mock("../../lib/features/hrm/payroll-compensation/multi-country-payroll/data/payroll-rule-pack.server.ts", () => ({
  resolveRulePack: vi.fn(),
}))

vi.mock("../../lib/features/hrm/payroll-compensation/payroll-processing/data/payroll.queries.server.ts", () => ({
  getPayrollPeriod: vi.fn(),
  getPayrollRunInputSnapshot: vi.fn(),
  listPayrollRunsForPeriod: vi.fn(),
}))

vi.mock("../../lib/features/hrm/payroll-compensation/payroll-processing/data/payroll.mutations.server.ts", () => ({
  deletePayrollLinesForRun: vi.fn(),
  insertPayrollLines: vi.fn(),
  updatePayrollRun: vi.fn(),
}))

import { revalidatePath } from "next/cache"

import { writeIamAuditEvent } from "#lib/auth"

import { computePayrollRun } from "../../lib/features/hrm/payroll-compensation/payroll-processing/data/payroll-engine.server.ts"
import type {
  PayrollEngineInput,
  PayrollEngineResult,
} from "../../lib/features/hrm/payroll-compensation/payroll-processing/data/payroll-engine.server.ts"
import {
  getPayrollPeriod,
  getPayrollRunInputSnapshot,
  listPayrollRunsForPeriod,
  type PayrollPeriodRow,
} from "../../lib/features/hrm/payroll-compensation/payroll-processing/data/payroll.queries.server.ts"
import {
  deletePayrollLinesForRun,
  insertPayrollLines,
  updatePayrollRun,
} from "../../lib/features/hrm/payroll-compensation/payroll-processing/data/payroll.mutations.server.ts"
import { resolveRulePack } from "../../lib/features/hrm/payroll-compensation/multi-country-payroll/data/payroll-rule-pack.server.ts"
import { payrollFinalizeWorkflow } from "../../lib/features/hrm/payroll-compensation/payroll-processing/data/payroll-finalize.workflow.ts"

const PAYLOAD = {
  organizationId: "org-payroll",
  periodId: "period-2026-03",
  actorUserId: "user-payroll-admin",
  actorSessionId: "session-1",
} as const

// `satisfies PayrollPeriodRow` — any new required field on the type fails here,
// not deep inside a mock call. `as const` keeps literal types narrow for assertions.
const PREPARING_PERIOD = {
  id: PAYLOAD.periodId,
  organizationId: PAYLOAD.organizationId,
  periodStart: "2026-03-01",
  periodEnd: "2026-03-31",
  paymentDate: "2026-04-07",
  currency: "MYR",
  state: "preparing",
  lockedByUserId: null,
  lockedAt: null,
  finalizedRunId: null,
  rulePackVersion: null,
  postedByUserId: null,
  postedAt: null,
  postedJournalBatchId: null,
  createdByUserId: PAYLOAD.actorUserId,
  createdAt: new Date("2026-03-01T00:00:00.000Z"),
  updatedAt: new Date("2026-03-01T00:00:00.000Z"),
} as const satisfies PayrollPeriodRow

// `satisfies PayrollEngineInput` — keeps the engine input contract honest at the
// fixture level. `as const` narrows union fields (e.g. socsoCategory → 1) for
// any downstream assertions without widening to the full union.
const SNAPSHOT = {
  organizationId: PAYLOAD.organizationId,
  periodId: PAYLOAD.periodId,
  employeeId: "emp-1",
  contractId: "contract-1",
  profileId: "profile-1",
  countryCode: "MY",
  basicSalaryAmount: "5000.00",
  basicSalaryCurrency: "MYR",
  periodEnd: "2026-03-31",
  unpaidLeaveMinutes: 0,
  scheduledMinutes: 10560,
  overtimeMinutes: 0,
  epfMemberCategory: "MY_PR_BELOW60",
  employeeAgeBand: "below60",
  socsoCategory: 1,
  eisEligible: true,
  hrdfApplicable: false,
  taxResidency: "resident",
  monthNumber: 3,
  yearNumber: 2026,
  ytdRemuneration: "10000.00",
  ytdPcbPaid: "260.00",
  ytdEpfEmployee: "1100.00",
  pcbTp1AdditionalReliefMonthly: "0.00",
  pcbTp3AdditionalDeductionMonthly: "0.00",
  approvedUnpaidClaims: [],
  approvedSalaryAdvanceInstallments: [],
} as const satisfies PayrollEngineInput

const COMPUTED_RESULT: PayrollEngineResult = {
  grossPay: "5000.00",
  netPay: "4285.00",
  employerCost: "5747.50",
  validationIssues: [],
  inputDigest: "a".repeat(64),
  lines: [
    {
      lineKind: "earning",
      code: "BASIC",
      description: "Basic salary",
      amount: "5000.00",
    },
    {
      lineKind: "employee_deduction",
      code: "EPF_EE",
      description: "Employee EPF",
      amount: "-550.00",
    },
  ],
}

describe("payrollFinalizeWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getPayrollPeriod).mockResolvedValue(PREPARING_PERIOD)
    vi.mocked(getPayrollRunInputSnapshot).mockResolvedValue(SNAPSHOT)
    vi.mocked(resolveRulePack).mockReturnValue({
      version: "MY-2026-01",
    } as ReturnType<typeof resolveRulePack>)
    vi.mocked(computePayrollRun).mockResolvedValue(COMPUTED_RESULT)
  })

  it("replaces existing lines before inserting computed lines for a draft run", async () => {
    vi.mocked(listPayrollRunsForPeriod)
      .mockResolvedValueOnce([
        {
          id: "run-1",
          organizationId: PAYLOAD.organizationId,
          periodId: PAYLOAD.periodId,
          employeeId: "emp-1",
          employeeLegalName: "A Payroll",
          employeeNumber: "E-001",
          contractId: "contract-1",
          profileId: "profile-1",
          state: "draft",
          grossPay: "0.00",
          netPay: "0.00",
          employerCost: "0.00",
          inputDigest: null,
          computedAt: null,
          computedByUserId: null,
          overriddenFromBureau: false,
          validationIssues: [],
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "run-1",
          organizationId: PAYLOAD.organizationId,
          periodId: PAYLOAD.periodId,
          employeeId: "emp-1",
          employeeLegalName: "A Payroll",
          employeeNumber: "E-001",
          contractId: "contract-1",
          profileId: "profile-1",
          state: "computed",
          grossPay: "5000.00",
          netPay: "4285.00",
          employerCost: "5747.50",
          inputDigest: COMPUTED_RESULT.inputDigest,
          computedAt: new Date("2026-03-31T00:00:00.000Z"),
          computedByUserId: PAYLOAD.actorUserId,
          overriddenFromBureau: false,
          validationIssues: [],
        },
      ])

    await payrollFinalizeWorkflow(PAYLOAD)

    expect(deletePayrollLinesForRun).toHaveBeenCalledWith(
      PAYLOAD.organizationId,
      "run-1"
    )
    expect(insertPayrollLines).toHaveBeenCalledWith(
      PAYLOAD.organizationId,
      "run-1",
      COMPUTED_RESULT.lines
    )
    expect(updatePayrollRun).toHaveBeenCalledWith(
      PAYLOAD.organizationId,
      "run-1",
      expect.objectContaining({
        state: "computed",
        inputDigest: COMPUTED_RESULT.inputDigest,
      })
    )
    expect(
      vi.mocked(deletePayrollLinesForRun).mock.invocationCallOrder[0]
    ).toBeLessThan(vi.mocked(insertPayrollLines).mock.invocationCallOrder[0]!)
  })

  it("does not recompute or duplicate lines when no draft runs remain", async () => {
    vi.mocked(listPayrollRunsForPeriod).mockResolvedValue([
      {
        id: "run-1",
        organizationId: PAYLOAD.organizationId,
        periodId: PAYLOAD.periodId,
        employeeId: "emp-1",
        employeeLegalName: "A Payroll",
        employeeNumber: "E-001",
        contractId: "contract-1",
        profileId: "profile-1",
        state: "computed",
        grossPay: "5000.00",
        netPay: "4285.00",
        employerCost: "5747.50",
        inputDigest: COMPUTED_RESULT.inputDigest,
        computedAt: new Date("2026-03-31T00:00:00.000Z"),
        computedByUserId: PAYLOAD.actorUserId,
        overriddenFromBureau: false,
        validationIssues: [],
      },
    ])

    await payrollFinalizeWorkflow(PAYLOAD)

    expect(getPayrollRunInputSnapshot).not.toHaveBeenCalled()
    expect(computePayrollRun).not.toHaveBeenCalled()
    expect(deletePayrollLinesForRun).not.toHaveBeenCalled()
    expect(insertPayrollLines).not.toHaveBeenCalled()
    expect(updatePayrollRun).not.toHaveBeenCalled()
    expect(writeIamAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "erp.hrm.payroll_run.preview",
        metadata: expect.objectContaining({ phase: "completed" }),
      })
    )
    expect(revalidatePath).toHaveBeenCalledWith(
      "/[locale]/o/[orgSlug]/dashboard/hrm/payroll",
      "page"
    )
  })

  it("stops without mutating lines when the period is no longer preparing", async () => {
    vi.mocked(getPayrollPeriod).mockResolvedValue({
      ...PREPARING_PERIOD,
      state: "locked",
    })

    await payrollFinalizeWorkflow(PAYLOAD)

    expect(listPayrollRunsForPeriod).not.toHaveBeenCalled()
    expect(deletePayrollLinesForRun).not.toHaveBeenCalled()
    expect(insertPayrollLines).not.toHaveBeenCalled()
    expect(updatePayrollRun).not.toHaveBeenCalled()
  })
})
