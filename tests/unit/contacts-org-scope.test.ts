import { beforeEach, describe, expect, it, vi } from "vitest"

const drizzleEqMocks = vi.hoisted(() => ({
  eqCalls: [] as unknown[][],
}))

const requireErpPermissionMock = vi.hoisted(() => vi.fn())

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return {
    ...actual,
    eq: (...args: unknown[]) => {
      drizzleEqMocks.eqCalls.push(args)
      return (actual.eq as (...a: unknown[]) => unknown)(...args)
    },
  }
})

vi.mock("#lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}))

import { createContact } from "#features/contacts/actions/create-contact"
import { listContactsForOrganization } from "#features/contacts/data/contacts.queries"
import { db } from "#lib/db"

vi.mock("#lib/auth", () => ({
  requireOrgSession: vi.fn(),
  writeIamAuditEventFromNextHeaders: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("#features/erp-rbac/server", () => ({
  requireErpPermission: requireErpPermissionMock,
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

import { requireOrgSession } from "#lib/auth"

describe("contacts org isolation", () => {
  beforeEach(() => {
    vi.mocked(requireOrgSession).mockReset()
    requireErpPermissionMock.mockReset()
    vi.mocked(db.select).mockReset()
    vi.mocked(db.insert).mockReset()
    drizzleEqMocks.eqCalls = []
  })

  it("listContactsForOrganization scopes with eq(..., organizationId)", async () => {
    const orderBy = vi.fn().mockResolvedValue([{ id: "c1" }])
    const where = vi.fn().mockReturnValue({ orderBy })
    const from = vi.fn().mockReturnValue({ where })
    vi.mocked(db.select).mockReturnValue({ from } as never)

    await listContactsForOrganization("org-a")
    const orgArgs = drizzleEqMocks.eqCalls.map((c) => c[1])
    expect(orgArgs).toContain("org-a")

    drizzleEqMocks.eqCalls = []
    await listContactsForOrganization("org-b")
    const orgArgsB = drizzleEqMocks.eqCalls.map((c) => c[1])
    expect(orgArgsB).toContain("org-b")
  })

  it("createContact inserts with organizationId from ERP permission session, not FormData", async () => {
    requireErpPermissionMock.mockResolvedValue({
      ok: true,
      session: {
        userId: "user-1",
        sessionId: "sess-1",
        organizationId: "org-session",
        user: { email: "a@b.com", name: null, role: "member" },
      },
    })

    const returning = vi.fn().mockResolvedValue([{ id: "new-id" }])
    const values = vi.fn().mockReturnValue({ returning })
    vi.mocked(db.insert).mockReturnValue({ values } as never)

    const fd = new FormData()
    fd.set("name", "Acme")
    fd.set("email", "")
    fd.set("organizationId", "org-evil")

    await createContact(undefined, fd)

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org-session" })
    )
  })
})
