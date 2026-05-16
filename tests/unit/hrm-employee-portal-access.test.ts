import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("next/server", () => ({ after: vi.fn((cb: () => void) => cb()) }))
vi.mock("#lib/auth", () => ({
  writeIamAuditEventFromNextHeaders: vi.fn(),
  requireOrgSession: vi.fn(),
}))
vi.mock("../../lib/features/hrm/data/employee-portal-access.server", () => ({
  ensureEmployeePortalForOrganization: vi.fn(),
  getEmployeePortalAccessForEmployee: vi.fn(),
}))

import {
  grantEmployeePortalAccessAction,
  revokeEmployeePortalAccessAction,
} from "../../lib/features/hrm/actions/employee-portal-access.actions"

describe("employee portal access actions", () => {
  it("exports grant and revoke portal access actions", () => {
    expect(typeof grantEmployeePortalAccessAction).toBe("function")
    expect(typeof revokeEmployeePortalAccessAction).toBe("function")
  })
})
