import { describe, expect, it } from "vitest"

// Import the kernel parser from `#app-shell` (server barrel — no client
// shell graph; avoids Vitest 4 + pnpm hoisting issues with Next 16).
import { parseAppShellPrimaryLeftRailInbox } from "#app-shell"

import { deriveOrgAdminInbox } from "#features/org-admin/data/org-admin-rail-inbox.shared"
import type {
  OrgAdminInboxHrefMap,
  OrgAdminInboxLabelResolver,
} from "#features/org-admin/data/org-admin-rail-inbox.shared"
import type { OrgAdminRailPressureMap } from "#features/org-admin/types"

/**
 * Phase 3d of the Working Memory Rail (`docs/_draft/working-memory-rail-plan.md`)
 * locks the inbox slot to a single doctrine:
 *
 *   *"What needs me right now?"* — one linkable pressure summary.
 *
 * The deriver picks the highest-priority pressure entry and returns
 * `null` when no concern qualifies. Tests below pin every behavioral
 * boundary so a future tone / count tweak requires updating a named
 * test (and re-reading the policy intent).
 *
 * The deriver is pure — no DB, no `server-only`, no clock reads — so
 * this entire file runs in the default Node Vitest pool without
 * mocks.
 */

const HREFS: OrgAdminInboxHrefMap = {
  members: "/o/acme/admin/members",
  integrations: "/o/acme/admin/integrations",
  audit: "/o/acme/admin/audit",
  feedback: "/o/acme/admin/feedback",
  settings: "/o/acme/admin/settings",
}

const RESOLVE_LABEL: OrgAdminInboxLabelResolver = (key, count) =>
  `${count} ${key}`

function pressure(
  overrides: OrgAdminRailPressureMap = {}
): OrgAdminRailPressureMap {
  return overrides
}

describe("deriveOrgAdminInbox", () => {
  it("returns null when the pressure map is empty (calm rail)", () => {
    expect(
      deriveOrgAdminInbox({
        pressure: pressure({}),
        hrefByKey: HREFS,
        resolveLabel: RESOLVE_LABEL,
      })
    ).toBeNull()
  })

  it("returns null when every entry is positive (no surfaceable pressure)", () => {
    expect(
      deriveOrgAdminInbox({
        pressure: pressure({
          members: { count: 5, tone: "positive" },
          integrations: { count: 12, tone: "positive" },
        }),
        hrefByKey: HREFS,
        resolveLabel: RESOLVE_LABEL,
      })
    ).toBeNull()
  })

  it("surfaces a single attention-tier members concern", () => {
    const inbox = deriveOrgAdminInbox({
      pressure: pressure({
        members: { count: 2, tone: "attention" },
      }),
      hrefByKey: HREFS,
      resolveLabel: RESOLVE_LABEL,
    })
    expect(inbox).toEqual({
      label: "2 members",
      count: 2,
      href: "/o/acme/admin/members",
      tone: "attention",
    })
  })

  it("prefers critical over attention even when count is lower", () => {
    const inbox = deriveOrgAdminInbox({
      pressure: pressure({
        members: { count: 50, tone: "attention" },
        integrations: { count: 1, tone: "critical" },
      }),
      hrefByKey: HREFS,
      resolveLabel: RESOLVE_LABEL,
    })
    expect(inbox?.tone).toBe("critical")
    expect(inbox?.count).toBe(1)
    expect(inbox?.href).toBe("/o/acme/admin/integrations")
  })

  it("prefers attention over default when both are present", () => {
    const inbox = deriveOrgAdminInbox({
      pressure: pressure({
        members: { count: 7, tone: "attention" },
        integrations: { count: 99, tone: "default" },
      }),
      hrefByKey: HREFS,
      resolveLabel: RESOLVE_LABEL,
    })
    expect(inbox?.tone).toBe("attention")
    expect(inbox?.count).toBe(7)
  })

  it("falls back to default tone when no critical/attention exists", () => {
    const inbox = deriveOrgAdminInbox({
      pressure: pressure({
        integrations: { count: 3, tone: "default" },
      }),
      hrefByKey: HREFS,
      resolveLabel: RESOLVE_LABEL,
    })
    expect(inbox).toEqual({
      label: "3 integrations",
      count: 3,
      href: "/o/acme/admin/integrations",
      tone: "default",
    })
  })

  it("on tone tie prefers the higher count", () => {
    const inbox = deriveOrgAdminInbox({
      pressure: pressure({
        members: { count: 3, tone: "critical" },
        integrations: { count: 8, tone: "critical" },
      }),
      hrefByKey: HREFS,
      resolveLabel: RESOLVE_LABEL,
    })
    expect(inbox?.count).toBe(8)
    expect(inbox?.href).toBe("/o/acme/admin/integrations")
  })

  it("on tone+count tie keeps insertion-order winner (stable)", () => {
    const inbox = deriveOrgAdminInbox({
      pressure: pressure({
        members: { count: 4, tone: "critical" },
        integrations: { count: 4, tone: "critical" },
      }),
      hrefByKey: HREFS,
      resolveLabel: RESOLVE_LABEL,
    })
    // Object insertion order — `members` declared first wins on a tie.
    expect(inbox?.href).toBe("/o/acme/admin/members")
  })

  it("drops a candidate that has no href in hrefByKey", () => {
    // Only `integrations` has an href; the members entry is skipped
    // even though it has higher tone — operators can't be sent
    // somewhere with no destination.
    const inbox = deriveOrgAdminInbox({
      pressure: pressure({
        members: { count: 9, tone: "critical" },
        integrations: { count: 1, tone: "attention" },
      }),
      hrefByKey: { integrations: "/o/acme/admin/integrations" },
      resolveLabel: RESOLVE_LABEL,
    })
    expect(inbox?.href).toBe("/o/acme/admin/integrations")
    expect(inbox?.tone).toBe("attention")
  })

  it("drops a candidate whose href is the empty string", () => {
    const inbox = deriveOrgAdminInbox({
      pressure: pressure({
        members: { count: 9, tone: "critical" },
      }),
      hrefByKey: { members: "" },
      resolveLabel: RESOLVE_LABEL,
    })
    expect(inbox).toBeNull()
  })

  it("returns null when the resolved label is empty (localizer bug)", () => {
    const inbox = deriveOrgAdminInbox({
      pressure: pressure({
        members: { count: 3, tone: "critical" },
      }),
      hrefByKey: HREFS,
      resolveLabel: () => "   ",
    })
    expect(inbox).toBeNull()
  })

  it("trims whitespace from the resolved label", () => {
    const inbox = deriveOrgAdminInbox({
      pressure: pressure({
        members: { count: 1, tone: "attention" },
      }),
      hrefByKey: HREFS,
      resolveLabel: () => "  Two pending invitations  ",
    })
    expect(inbox?.label).toBe("Two pending invitations")
  })

  it("defensively skips entries with count < 1", () => {
    // The pressure helpers refuse to emit count: 0, but the deriver
    // re-asserts the contract because the kernel inbox schema
    // demands `count >= 1`.
    const inbox = deriveOrgAdminInbox({
      pressure: pressure({
        members: { count: 0, tone: "critical" },
        integrations: { count: 4, tone: "attention" },
      }),
      hrefByKey: HREFS,
      resolveLabel: RESOLVE_LABEL,
    })
    expect(inbox?.href).toBe("/o/acme/admin/integrations")
  })

  it("produces output that round-trips through the kernel parser", () => {
    // Smoke test: any non-null deriver result must satisfy the strict
    // `workbenchRailInboxSchema`. If a future change adds a field the
    // deriver doesn't know about, this test catches it before the
    // layout crashes at parse time.
    const inbox = deriveOrgAdminInbox({
      pressure: pressure({
        members: { count: 12, tone: "critical" },
      }),
      hrefByKey: HREFS,
      resolveLabel: RESOLVE_LABEL,
    })
    expect(inbox).not.toBeNull()
    expect(() => parseAppShellPrimaryLeftRailInbox(inbox!)).not.toThrow()
  })
})
