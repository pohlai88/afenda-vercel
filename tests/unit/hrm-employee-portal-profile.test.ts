import { beforeEach, describe, expect, it, vi } from "vitest"

import { EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR } from "../../lib/features/hrm/data/employee-portal-access.shared"

const mocks = vi.hoisted(() => ({
  getEmployeePortalContext: vi.fn(),
  dbTransaction: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("next/server", () => ({ after: vi.fn((cb: () => void) => cb()) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("#lib/auth", () => ({
  writeIamAuditEventFromNextHeaders: vi.fn(),
  requireRecentAuthStepUp: vi.fn(),
}))
vi.mock("#lib/i18n/request-locale.server", () => ({
  getRequestAppLocale: vi.fn(async () => "en"),
}))
vi.mock("#lib/db", () => ({
  db: { transaction: mocks.dbTransaction },
}))
vi.mock("../../lib/features/hrm/data/employee-portal-access.server", () => ({
  getEmployeePortalContext: mocks.getEmployeePortalContext,
}))
vi.mock("../../lib/features/hrm/data/payroll-profile.queries.server", () => ({
  getCurrentPayrollProfileForEmployee: vi.fn(),
}))
vi.mock("../../lib/features/hrm/data/payroll-profile.mutations.server", () => ({
  upsertPayrollProfileMutation: vi.fn(),
}))

import { updatePortalPersonalProfileAction } from "../../lib/features/hrm/actions/employee-portal-profile.actions"

const portalContext = {
  portal: {
    organizationId: "org-1",
    userId: "user-1",
    sessionId: "session-1",
    portalSlug: "acme-employee",
  },
  employee: { id: "emp-1" },
} as const

describe("employee portal profile actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getEmployeePortalContext.mockResolvedValue(portalContext)
    mocks.dbTransaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<void>) => {
        const tx = {
          select: vi.fn(() => ({
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn(async () => [{ id: "emp-1", archivedAt: null }]),
              })),
            })),
          })),
          update: vi.fn(() => ({
            set: vi.fn(() => ({ where: vi.fn(async () => undefined) })),
          })),
          insert: vi.fn(() => ({
            values: vi.fn(() => ({
              onConflictDoUpdate: vi.fn(async () => undefined),
            })),
          })),
        }
        await fn(tx)
      }
    )
  })

  it("rejects invalid portal slug", async () => {
    mocks.getEmployeePortalContext.mockResolvedValue(null)
    const fd = new FormData()
    fd.set("portalSlug", "missing")
    const result = await updatePortalPersonalProfileAction(undefined, fd)
    expect(result).toEqual({
      ok: false,
      errors: { form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR },
    })
  })
})
