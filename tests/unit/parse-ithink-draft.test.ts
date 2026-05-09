import { describe, expect, it } from "vitest"

import { parseIThinkDraft } from "#features/ithink/client"

const nowUtc = new Date("2026-05-10T00:00:00.000Z")

const lists = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Inbox",
    slug: "inbox",
    archivedAt: null,
  },
] as const

describe("parseIThinkDraft", () => {
  it("maps p1 to critical and strips token from title", () => {
    const r = parseIThinkDraft("Call vendor p1", [...lists], nowUtc)
    expect(r.severity).toBe("critical")
    expect(r.cleanTitle).toBe("Call vendor")
  })

  it("maps today to end of same UTC day", () => {
    const r = parseIThinkDraft("Ship today", [...lists], nowUtc)
    expect(r.dueAt?.toISOString()).toBe("2026-05-10T23:59:59.000Z")
    expect(r.cleanTitle).toBe("Ship")
  })

  it("resolves #inbox to list id", () => {
    const r = parseIThinkDraft("Triage #inbox", [...lists], nowUtc)
    expect(r.listId).toBe("11111111-1111-1111-1111-111111111111")
    expect(r.unknownProjectToken).toBeNull()
    expect(r.cleanTitle).toBe("Triage")
  })

  it("sets unknownProjectToken for unknown slug", () => {
    const r = parseIThinkDraft("Fix #unknown", [...lists], nowUtc)
    expect(r.listId).toBeNull()
    expect(r.unknownProjectToken).toBe("#unknown")
  })

  it("parses mixed tokens together", () => {
    const r = parseIThinkDraft(
      "Fix invoice p1 today #inbox",
      [...lists],
      nowUtc
    )
    expect(r.cleanTitle).toBe("Fix invoice")
    expect(r.severity).toBe("critical")
    expect(r.dueAt?.toISOString()).toBe("2026-05-10T23:59:59.000Z")
    expect(r.listId).toBe("11111111-1111-1111-1111-111111111111")
  })

  it("is case-insensitive for tokens", () => {
    const a = parseIThinkDraft("P1 Today", [...lists], nowUtc)
    const b = parseIThinkDraft("p1 today", [...lists], nowUtc)
    expect(a).toEqual(b)
  })
})
