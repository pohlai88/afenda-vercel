/**
 * Phase 4 — HR Nexus pressure mapper.
 *
 * The aggregator (`listHrmHighPressureForNexus`) requires a database;
 * this suite locks the PURE pieces:
 *   1. Severity ranking via `mergeAndTrimPressureRows` is stable and
 *      respects the documented order (`critical > high > medium`).
 *   2. The Nexus-side mapper projects each HRM kind into the right
 *      `OperationalPressureItem` shape — no leakage of HRM internal
 *      fields (`tier`, `daysToExpiry`, etc.) onto the Nexus surface.
 *   3. Every HRM pressure id is namespaced (`hrm-claim-*`,
 *      `hrm-leave-*`, `hrm-doc-*`, `hrm-compliance-*`) so it cannot
 *      collide with Orbit row ids on the merged Nexus pressure list.
 *   4. Stage badges follow the documented severity tone.
 */
import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  claimPriorityForAge,
  documentPriorityForTier,
  leavePriorityForAge,
  mergeAndTrimPressureRows,
  type HrmPressureRowForNexus,
} from "../../lib/features/hrm/hrm-nexus-pressure.shared.ts"
import { mapHrmPressureRowsToOperationalPressureItems } from "../../lib/features/nexus/data/nexus-operational-pressure-map.shared"

const TEST_SLUG = "acme-co"

function fixtureClaim(
  overrides: Partial<
    Extract<HrmPressureRowForNexus, { kind: "claim_pending" }>
  > = {}
): HrmPressureRowForNexus {
  return {
    kind: "claim_pending",
    id: "claim-1",
    title: "Claim awaiting approval — Jane Doe",
    description: "MYR 1200.00",
    displayPriority: "medium",
    submittedAt: new Date("2026-05-10T09:00:00.000Z"),
    evidenceCount: 0,
    ...overrides,
  }
}

function fixtureLeave(
  overrides: Partial<
    Extract<HrmPressureRowForNexus, { kind: "leave_pending_approval" }>
  > = {}
): HrmPressureRowForNexus {
  return {
    kind: "leave_pending_approval",
    id: "approval-1",
    title: "Leave request awaiting approval",
    description: null,
    displayPriority: "medium",
    requestedAt: new Date("2026-05-09T08:00:00.000Z"),
    ...overrides,
  }
}

function fixtureDoc(
  overrides: Partial<
    Extract<HrmPressureRowForNexus, { kind: "document_expiring" }>
  > = {}
): HrmPressureRowForNexus {
  return {
    kind: "document_expiring",
    id: "doc-1",
    title: "Document expiring — Jane Doe",
    description: "MY Work Permit 2026",
    displayPriority: "high",
    daysToExpiry: 10,
    tier: "warning_14d",
    documentType: "work_permit",
    employeeId: "emp-1",
    employeeName: "Jane Doe",
    ...overrides,
  }
}

function fixtureCompliance(
  overrides: Partial<
    Extract<HrmPressureRowForNexus, { kind: "compliance_failed" }>
  > = {}
): HrmPressureRowForNexus {
  return {
    kind: "compliance_failed",
    id: "evidence-1",
    title: "Statutory submission failed — EPF_MONTHLY",
    description: "Bureau (MY) rejected the latest delivery",
    displayPriority: "critical",
    packType: "epf_monthly",
    countryCode: "MY",
    ...overrides,
  }
}

describe("HRM Nexus pressure — priority helpers", () => {
  it("leavePriorityForAge buckets by stuck-day thresholds", () => {
    expect(leavePriorityForAge(null)).toBe("medium")
    expect(leavePriorityForAge(0)).toBe("medium")
    expect(leavePriorityForAge(2 * 24 * 3600 * 1000)).toBe("medium")
    expect(leavePriorityForAge(3 * 24 * 3600 * 1000)).toBe("high")
    expect(leavePriorityForAge(7 * 24 * 3600 * 1000)).toBe("critical")
  })

  it("claimPriorityForAge buckets by stuck-day thresholds", () => {
    expect(claimPriorityForAge(null)).toBe("medium")
    expect(claimPriorityForAge(0)).toBe("medium")
    expect(claimPriorityForAge(4 * 24 * 3600 * 1000)).toBe("medium")
    expect(claimPriorityForAge(5 * 24 * 3600 * 1000)).toBe("high")
    expect(claimPriorityForAge(14 * 24 * 3600 * 1000)).toBe("critical")
  })

  it("documentPriorityForTier maps each tier to the right severity", () => {
    expect(documentPriorityForTier("warning_30d")).toBe("medium")
    expect(documentPriorityForTier("warning_14d")).toBe("high")
    expect(documentPriorityForTier("critical_7d")).toBe("critical")
  })
})

describe("HRM Nexus pressure — merge & trim", () => {
  it("orders critical → high → medium and respects insertion order within priority", () => {
    const rows: HrmPressureRowForNexus[] = [
      fixtureClaim({ id: "claim-A", displayPriority: "medium" }),
      fixtureLeave({ id: "approval-A", displayPriority: "critical" }),
      fixtureDoc({ id: "doc-A", displayPriority: "high" }),
      fixtureCompliance({ id: "evidence-A" }),
      fixtureClaim({ id: "claim-B", displayPriority: "high" }),
    ]
    const merged = mergeAndTrimPressureRows(rows, 5)
    expect(merged.map((r) => r.id)).toEqual([
      "approval-A",
      "evidence-A",
      "doc-A",
      "claim-B",
      "claim-A",
    ])
  })

  it("trims to limit, preferring the highest priorities", () => {
    const rows: HrmPressureRowForNexus[] = [
      fixtureClaim({ id: "claim-1", displayPriority: "medium" }),
      fixtureClaim({ id: "claim-2", displayPriority: "medium" }),
      fixtureCompliance({ id: "compliance-1" }),
    ]
    const merged = mergeAndTrimPressureRows(rows, 2)
    expect(merged).toHaveLength(2)
    expect(merged[0]?.id).toBe("compliance-1")
    expect(merged[1]?.id).toBe("claim-1")
  })
})

describe("HRM Nexus pressure — mapper", () => {
  it("projects every HRM kind onto the Workforce surface with namespaced ids", () => {
    const rows: HrmPressureRowForNexus[] = [
      fixtureClaim({ id: "claim-1", displayPriority: "high" }),
      fixtureLeave({ id: "approval-1", displayPriority: "critical" }),
      fixtureDoc({ id: "doc-1", displayPriority: "high" }),
      fixtureCompliance({ id: "evidence-1" }),
    ]
    const items = mapHrmPressureRowsToOperationalPressureItems(TEST_SLUG, rows)
    expect(items.map((i) => i.id)).toEqual([
      "hrm-claim-claim-1",
      "hrm-leave-approval-1",
      "hrm-doc-doc-1",
      "hrm-compliance-evidence-1",
    ])
    for (const item of items) {
      expect(item.surface).toBe("Workforce")
    }
  })

  it("translates display priority to OperationalPressureItem severity", () => {
    const rows: HrmPressureRowForNexus[] = [
      fixtureClaim({ displayPriority: "critical" }),
      fixtureClaim({ displayPriority: "high" }),
      fixtureClaim({ displayPriority: "medium" }),
    ]
    const items = mapHrmPressureRowsToOperationalPressureItems(TEST_SLUG, rows)
    expect(items.map((i) => i.severity)).toEqual([
      "emergency",
      "critical",
      "attention",
    ])
  })

  it("includes a tone-correct stage badge for expiring documents", () => {
    const rows: HrmPressureRowForNexus[] = [
      fixtureDoc({
        id: "d1",
        tier: "critical_7d",
        displayPriority: "critical",
      }),
      fixtureDoc({ id: "d2", tier: "warning_14d", displayPriority: "high" }),
      fixtureDoc({ id: "d3", tier: "warning_30d", displayPriority: "medium" }),
    ]
    const items = mapHrmPressureRowsToOperationalPressureItems(TEST_SLUG, rows)
    expect(items[0]?.stageBadge).toEqual({ label: "Urgent", tone: "critical" })
    expect(items[1]?.stageBadge).toEqual({
      label: "Action soon",
      tone: "warning",
    })
    expect(items[2]?.stageBadge).toEqual({ label: "Upcoming", tone: "info" })
  })

  it("compliance failures always render emergency severity with a Failed badge", () => {
    const rows: HrmPressureRowForNexus[] = [fixtureCompliance({})]
    const [item] = mapHrmPressureRowsToOperationalPressureItems(TEST_SLUG, rows)
    expect(item?.severity).toBe("emergency")
    expect(item?.stageBadge).toEqual({ label: "Failed", tone: "critical" })
  })

  it("primary action commands route into the right HRM capability page", () => {
    const rows: HrmPressureRowForNexus[] = [
      fixtureClaim({}),
      fixtureLeave({}),
      fixtureDoc({}),
      fixtureCompliance({}),
    ]
    const items = mapHrmPressureRowsToOperationalPressureItems(TEST_SLUG, rows)
    expect(items.map((i) => i.primaryAction.command)).toEqual([
      `/o/${TEST_SLUG}/dashboard/hrm/claims`,
      `/o/${TEST_SLUG}/dashboard/hrm/leave`,
      `/o/${TEST_SLUG}/dashboard/hrm/documents`,
      `/o/${TEST_SLUG}/dashboard/hrm`,
    ])
  })

  it("projects expiring documents with a humanized days-remaining summary", () => {
    const rows: HrmPressureRowForNexus[] = [
      fixtureDoc({ id: "d-now", daysToExpiry: 0, tier: "critical_7d" }),
      fixtureDoc({ id: "d-tom", daysToExpiry: 1, tier: "critical_7d" }),
      fixtureDoc({ id: "d-late", daysToExpiry: -3, tier: "critical_7d" }),
    ]
    const [now, tomorrow, late] = mapHrmPressureRowsToOperationalPressureItems(
      TEST_SLUG,
      rows
    )
    expect(now?.reason).toContain("Expires today")
    expect(tomorrow?.reason).toContain("Expires in 1 day")
    expect(late?.reason).toContain("Expired")
  })
})
