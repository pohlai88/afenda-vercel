import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Capability Registry — Server Action IDOR contract.
 *
 * Mirrors `tests/unit/contacts-org-scope.test.ts`:
 *
 *   - `setUserCapabilityPreferenceAction` must derive `(organizationId,
 *     userId)` from `requireOrgSession` and never accept them from the
 *     payload (closes cross-tenant preference writes).
 *   - Unknown `capabilityId` returns `unknown_capability` and never
 *     hits the DB (would otherwise leave dangling preferences for ids
 *     no resolver can see).
 */

const drizzleMocks = vi.hoisted(() => ({
  eqCalls: [] as unknown[][],
}))

vi.mock("drizzle-orm", async () => {
  const actual = await vi.importActual<typeof import("drizzle-orm")>("drizzle-orm")
  return {
    ...actual,
    eq: (...args: unknown[]) => {
      drizzleMocks.eqCalls.push(args)
      return (actual.eq as (...a: unknown[]) => unknown)(...args)
    },
  }
})

vi.mock("#lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock("#lib/auth", () => ({
  requireOrgSession: vi.fn(),
  writeIamAuditEventFromNextHeaders: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock("next/server", () => ({
  after: (fn: () => unknown) => fn(),
}))

import { setUserCapabilityPreferenceAction } from "#features/marketplace/actions/user-preference.actions"
import { db } from "#lib/db"
import { requireOrgSession } from "#lib/auth"

describe("setUserCapabilityPreferenceAction — IDOR contract", () => {
  beforeEach(() => {
    vi.mocked(requireOrgSession).mockReset()
    vi.mocked(db.select).mockReset()
    vi.mocked(db.insert).mockReset()
    vi.mocked(db.update).mockReset()
    drizzleMocks.eqCalls = []
  })

  it("scopes the existence check by (organizationId, userId) from the session", async () => {
    vi.mocked(requireOrgSession).mockResolvedValue({
      userId: "user-from-session",
      sessionId: "sess-1",
      organizationId: "org-from-session",
      user: { email: "a@b.com", name: null, role: "member" },
    })

    const limit = vi.fn().mockResolvedValue([])
    const where = vi.fn().mockReturnValue({ limit })
    const from = vi.fn().mockReturnValue({ where })
    vi.mocked(db.select).mockReturnValue({ from } as never)

    const returning = vi.fn().mockResolvedValue([{ id: "new-pref-id" }])
    const values = vi.fn().mockReturnValue({ returning })
    vi.mocked(db.insert).mockReturnValue({ values } as never)

    const result = await setUserCapabilityPreferenceAction({
      capabilityId: "right.help",
      state: "hidden",
    })

    expect(result.ok).toBe(true)

    // Existence check used the session-scoped organizationId + userId.
    const eqArgs = drizzleMocks.eqCalls.map((c) => c[1])
    expect(eqArgs).toContain("org-from-session")
    expect(eqArgs).toContain("user-from-session")

    // Insert used the session-scoped tuple, not anything from the input.
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-from-session",
        userId: "user-from-session",
        capabilityId: "right.help",
        state: "hidden",
      })
    )
  })

  it("ignores organizationId / userId hints in the input payload", async () => {
    vi.mocked(requireOrgSession).mockResolvedValue({
      userId: "user-from-session",
      sessionId: "sess-1",
      organizationId: "org-from-session",
      user: { email: "a@b.com", name: null, role: "member" },
    })

    const limit = vi.fn().mockResolvedValue([])
    const where = vi.fn().mockReturnValue({ limit })
    const from = vi.fn().mockReturnValue({ where })
    vi.mocked(db.select).mockReturnValue({ from } as never)

    const returning = vi.fn().mockResolvedValue([{ id: "new-pref-id" }])
    const values = vi.fn().mockReturnValue({ returning })
    vi.mocked(db.insert).mockReturnValue({ values } as never)

    // Strict schema must reject extra keys → validation failure.
    const result = await setUserCapabilityPreferenceAction({
      capabilityId: "right.help",
      state: "hidden",
      organizationId: "org-evil",
      userId: "user-evil",
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe("validation")
    }
  })

  it("rejects unknown capability ids without touching the DB", async () => {
    vi.mocked(requireOrgSession).mockResolvedValue({
      userId: "user-1",
      sessionId: "sess-1",
      organizationId: "org-1",
      user: { email: "a@b.com", name: null, role: "member" },
    })

    const result = await setUserCapabilityPreferenceAction({
      capabilityId: "right.does.not.exist",
      state: "hidden",
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe("unknown_capability")
    }
    expect(db.select).not.toHaveBeenCalled()
    expect(db.insert).not.toHaveBeenCalled()
  })

  it("returns validation error for an empty capabilityId", async () => {
    vi.mocked(requireOrgSession).mockResolvedValue({
      userId: "user-1",
      sessionId: "sess-1",
      organizationId: "org-1",
      user: { email: "a@b.com", name: null, role: "member" },
    })

    const result = await setUserCapabilityPreferenceAction({
      capabilityId: "",
      state: "hidden",
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe("validation")
    }
  })

  it("returns validation error for an unknown state", async () => {
    vi.mocked(requireOrgSession).mockResolvedValue({
      userId: "user-1",
      sessionId: "sess-1",
      organizationId: "org-1",
      user: { email: "a@b.com", name: null, role: "member" },
    })

    const result = await setUserCapabilityPreferenceAction({
      capabilityId: "right.help",
      state: "evil",
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe("validation")
    }
  })

  it("idempotent re-set returns ok without writing", async () => {
    vi.mocked(requireOrgSession).mockResolvedValue({
      userId: "user-1",
      sessionId: "sess-1",
      organizationId: "org-1",
      user: { email: "a@b.com", name: null, role: "member" },
    })

    const limit = vi
      .fn()
      .mockResolvedValue([{ id: "existing-pref-id", state: "hidden" }])
    const where = vi.fn().mockReturnValue({ limit })
    const from = vi.fn().mockReturnValue({ where })
    vi.mocked(db.select).mockReturnValue({ from } as never)

    const result = await setUserCapabilityPreferenceAction({
      capabilityId: "right.help",
      state: "hidden",
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.preferenceId).toBe("existing-pref-id")
    }
    expect(db.insert).not.toHaveBeenCalled()
    expect(db.update).not.toHaveBeenCalled()
  })
})
