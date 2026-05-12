import { describe, expect, it } from "vitest"

// Bypass the `#components/workbench` barrel — see neighboring
// `org-admin-rail-inbox.test.ts` for the rationale.
import { parseWorkbenchRailSlotsData } from "#components/workbench/rail/workbench-rail.schema"
import type {
  WorkbenchRailInbox,
  WorkbenchRailPin,
  WorkbenchRailRecent,
  WorkbenchRailView,
} from "#components/workbench/rail/workbench-rail.types"

import { buildOrgAdminRailSlots } from "#features/org-admin/data/org-admin-rail-slots"

/**
 * Phase 3d of the Working Memory Rail extends `buildOrgAdminRailSlots`
 * with optional memory slots (`inbox`, `pinned`, `views`, `recents`).
 * The doctrine to lock here:
 *
 *   1. The builder remains a **pure mapper** — it never invents memory
 *      data, never calls DB, and never duplicates work the kernel parser
 *      already does.
 *
 *   2. **Conditional density** is enforced at the builder boundary:
 *      empty arrays collapse to `undefined` so the kernel
 *      `workbenchRailSlotsDataSchema` never sees a `pinned: []`. The
 *      kernel rejects empty arrays at parse time, but the builder
 *      proactively avoids triggering the rejection so callers can pass
 *      `[]` without crashing.
 *
 *   3. The mapped output must round-trip through `parseWorkbenchRailSlotsData`.
 *      This is the contract every workbench layout depends on; if the
 *      builder ever drifts from the kernel schema, this test fails first.
 */

const PIN: WorkbenchRailPin = {
  id: "pin-1",
  label: "Aisha Khan",
  href: "/o/acme/admin/members/aisha",
  resourceType: "org_member",
  resourceId: "user-1",
}

const VIEW: WorkbenchRailView = {
  id: "view-1",
  label: "Pending only",
  href: "/o/acme/admin/audit?status=pending",
}

const RECENT: WorkbenchRailRecent = {
  id: "recent-1",
  label: "Members & invitations",
  href: "/o/acme/admin/members",
  resourceType: "org_admin_members",
  occurredAt: "2026-05-12T11:55:00.000Z",
}

const INBOX: WorkbenchRailInbox = {
  label: "3 pending invitations",
  count: 3,
  href: "/o/acme/admin/members",
  tone: "attention",
}

describe("buildOrgAdminRailSlots — Phase 3d memory slots", () => {
  it("emits identity + nav even when no memory data is provided", () => {
    const slots = buildOrgAdminRailSlots({ orgSlug: "acme", orgName: "Acme" })
    expect(slots.identity.primary).toBe("Acme")
    expect(slots.identity.secondary).toBe("acme")
    expect(slots.nav).toHaveLength(1)
    expect(slots.nav[0]?.items.some((i) => i.id === "overview")).toBe(true)
    expect(slots.inbox).toBeUndefined()
    expect(slots.pinned).toBeUndefined()
    expect(slots.views).toBeUndefined()
    expect(slots.recents).toBeUndefined()
  })

  it("passes through inbox / pinned / views / recents when present", () => {
    const slots = buildOrgAdminRailSlots({
      orgSlug: "acme",
      orgName: "Acme",
      inbox: INBOX,
      pinned: [PIN],
      views: [VIEW],
      recents: [RECENT],
    })
    expect(slots.inbox).toEqual(INBOX)
    expect(slots.pinned).toEqual([PIN])
    expect(slots.views).toEqual([VIEW])
    expect(slots.recents).toEqual([RECENT])
  })

  it("collapses empty memory arrays to `undefined` (conditional density)", () => {
    // Doctrine: empty memory MUST hide the section. The kernel parser
    // rejects empty arrays, so the builder pre-emptively normalizes so
    // a caller passing `[]` does not crash the layout.
    const slots = buildOrgAdminRailSlots({
      orgSlug: "acme",
      orgName: "Acme",
      pinned: [],
      views: [],
      recents: [],
    })
    expect(slots.pinned).toBeUndefined()
    expect(slots.views).toBeUndefined()
    expect(slots.recents).toBeUndefined()
  })

  it("treats `inbox: null` the same as omitted", () => {
    const slots = buildOrgAdminRailSlots({
      orgSlug: "acme",
      orgName: "Acme",
      inbox: null,
    })
    expect(slots.inbox).toBeUndefined()
  })

  it("round-trips through the kernel `workbenchRailSlotsDataSchema`", () => {
    // Strict-mode parser rejects unknown keys + empty memory arrays.
    // If the builder ever leaks a stray field, this test catches it
    // before any RSC layout crashes at render time.
    const slots = buildOrgAdminRailSlots({
      orgSlug: "acme",
      orgName: "Acme",
      pressure: {
        members: { count: 3, tone: "attention" },
      },
      inbox: INBOX,
      pinned: [PIN],
      views: [VIEW],
      recents: [RECENT],
    })
    // `footer` is on the composed type, not the data schema; the
    // builder never emits it, so the data schema parse must succeed.
    expect(() => parseWorkbenchRailSlotsData(slots)).not.toThrow()
  })

  it("preserves the order of memory arrays (insertion stability)", () => {
    const ordered = [
      { ...PIN, id: "pin-a", label: "Alpha" },
      { ...PIN, id: "pin-b", label: "Bravo" },
      { ...PIN, id: "pin-c", label: "Charlie" },
    ]
    const slots = buildOrgAdminRailSlots({
      orgSlug: "acme",
      orgName: "Acme",
      pinned: ordered,
    })
    expect(slots.pinned?.map((p) => p.id)).toEqual([
      "pin-a",
      "pin-b",
      "pin-c",
    ])
  })

  it("preserves nav badges from the existing `pressure` map", () => {
    // Phase 2 contract: the builder is the only place pressure becomes
    // a kernel `badge`. Phase 3d additions must not alter this mapping.
    const slots = buildOrgAdminRailSlots({
      orgSlug: "acme",
      orgName: "Acme",
      pressure: {
        members: { count: 5, tone: "critical" },
      },
    })
    const memberItem = slots.nav[0]?.items.find((i) => i.id === "identity")
    // identity capability primary segment is "members"
    expect(memberItem?.badge).toEqual({ count: 5, tone: "critical" })
  })
})
