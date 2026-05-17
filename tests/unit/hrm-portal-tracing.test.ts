import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  runWithNodeOtelSpan: vi.fn(
    async (
      _name: string,
      _attrs: Record<string, unknown>,
      fn: () => Promise<unknown>
    ) => fn()
  ),
  addBreadcrumb: vi.fn(),
  info: vi.fn(),
}))

vi.mock("server-only", () => ({}))

vi.mock("#lib/otel-span.server", () => ({
  runWithNodeOtelSpan: mocks.runWithNodeOtelSpan,
}))

vi.mock("@sentry/nextjs", () => ({
  addBreadcrumb: mocks.addBreadcrumb,
}))

vi.mock("#lib/logger.server", () => ({
  rootLogger: { info: mocks.info },
}))

import {
  withEmployeePortalActionSpan,
  withPortalMutationSpan,
} from "../../lib/features/hrm/employee-management/employee-selfservice-portal/data/portal-mutation-tracing.server.ts"

describe("withPortalMutationSpan", () => {
  beforeEach(() => {
    mocks.runWithNodeOtelSpan.mockClear()
    mocks.addBreadcrumb.mockClear()
    mocks.info.mockClear()
  })

  it("opens one OTel span and one Sentry breadcrumb per mutation", async () => {
    const result = await withPortalMutationSpan(
      {
        spanName: "hrm.portal.claims.submit",
        section: "claims",
        organizationId: "org-1",
        employeeId: "emp-1",
      },
      async () => "ok"
    )

    expect(result).toBe("ok")
    expect(mocks.runWithNodeOtelSpan).toHaveBeenCalledTimes(1)
    expect(mocks.addBreadcrumb).toHaveBeenCalledTimes(1)
    expect(mocks.info).toHaveBeenCalledTimes(1)
    expect(mocks.info.mock.calls[0]?.[1]).toBe("hrm_portal_mutation")
  })

  it("derives span name from section and verb for portal actions", async () => {
    await withEmployeePortalActionSpan(
      {
        portal: { organizationId: "org-1" },
        employee: { id: "emp-1" },
      },
      "profile",
      "banking.update",
      async () => "ok"
    )

    expect(mocks.runWithNodeOtelSpan).toHaveBeenCalledWith(
      "hrm.portal.profile.banking.update",
      expect.objectContaining({ "portal.section": "profile" }),
      expect.any(Function)
    )
  })
})
