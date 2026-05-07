import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("#lib/db", () => ({
  db: {
    select: vi.fn(),
  },
}))

import { assertInvitationForUser } from "#lib/auth/invitation-guard.server"
import { db } from "#lib/db"

describe("assertInvitationForUser", () => {
  beforeEach(() => {
    vi.mocked(db.select).mockReset()
  })

  it("returns ok when invitation matches email and is pending", async () => {
    const limit = vi.fn().mockResolvedValue([
      {
        organizationId: "org_1",
        email: "Invitee@Example.com",
        status: "pending",
        expiresAt: new Date(Date.now() + 60_000),
      },
    ])
    const where = vi.fn().mockReturnValue({ limit })
    const from = vi.fn().mockReturnValue({ where })
    vi.mocked(db.select).mockReturnValue({ from } as never)

    const r = await assertInvitationForUser("inv_1", "invitee@example.com")
    expect(r).toEqual({ ok: true, organizationId: "org_1" })
  })

  it("returns error when email does not match", async () => {
    const limit = vi.fn().mockResolvedValue([
      {
        organizationId: "org_1",
        email: "other@example.com",
        status: "pending",
        expiresAt: new Date(Date.now() + 60_000),
      },
    ])
    const where = vi.fn().mockReturnValue({ limit })
    const from = vi.fn().mockReturnValue({ where })
    vi.mocked(db.select).mockReturnValue({ from } as never)

    const r = await assertInvitationForUser("inv_1", "invitee@example.com")
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toContain("different email")
    }
  })

  it("returns error when expired", async () => {
    const limit = vi.fn().mockResolvedValue([
      {
        organizationId: "org_1",
        email: "a@b.com",
        status: "pending",
        expiresAt: new Date(Date.now() - 60_000),
      },
    ])
    const where = vi.fn().mockReturnValue({ limit })
    const from = vi.fn().mockReturnValue({ where })
    vi.mocked(db.select).mockReturnValue({ from } as never)

    const r = await assertInvitationForUser("inv_1", "a@b.com")
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toContain("expired")
    }
  })

  it("returns error when not found", async () => {
    const limit = vi.fn().mockResolvedValue([])
    const where = vi.fn().mockReturnValue({ limit })
    const from = vi.fn().mockReturnValue({ where })
    vi.mocked(db.select).mockReturnValue({ from } as never)

    const r = await assertInvitationForUser("missing", "a@b.com")
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toContain("not found")
    }
  })
})
