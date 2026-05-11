import { describe, expect, it } from "vitest"

import {
  auditEvent7W1HSchema,
  describeAuditEvent7W1H,
  extractTrailingAuditVerb,
} from "#lib/erp/audit-7w1h.shared"
import {
  HISTORICAL_ERP_LEGACY_AUDIT_ACTIONS,
  isHistoricalErpLegacyAuditAction,
} from "#lib/erp/historical-erp-execution-audit-actions.shared"

/**
 * Read-only compatibility: every retired `erp.onething.*`, `erp.ithink.*`, and
 * `erp.execution.onething_*` action still renders through the shared
 * 7W1H grammar. No active code path emits these — this is purely a regression
 * gate against historical IAM audit rows becoming unreadable.
 */
describe("historical legacy audit actions render through describeAuditEvent7W1H", () => {
  const baseEvent = {
    who: "Jordan Liu",
    what: "Recorded action",
    when: "2026-05-09T06:00:00.000Z",
    where: "Operations · legacy surface",
    which: "row-12345",
    whom: "Reviewer route",
    how: "system",
  } as const

  it("registers every retired action in the historical set", () => {
    for (const action of HISTORICAL_ERP_LEGACY_AUDIT_ACTIONS) {
      expect(isHistoricalErpLegacyAuditAction(action)).toBe(true)
    }
  })

  it("renders a calm sentence for every retired action", () => {
    for (const action of HISTORICAL_ERP_LEGACY_AUDIT_ACTIONS) {
      const verb = extractTrailingAuditVerb(action)
      const requiresWhy =
        verb === "resolve" || verb === "update" || verb === "deprecate"
      const parsed = auditEvent7W1HSchema.parse({
        ...baseEvent,
        why: requiresWhy ? "Closing the loop on a historical event." : "",
        action,
      })
      const rendered = describeAuditEvent7W1H(parsed, {
        nowMs: Date.parse("2026-05-09T07:05:00.000Z"),
      })
      expect(rendered.length).toBeGreaterThan(20)
      expect(rendered).not.toMatch(/\bWHO:/i)
      expect(rendered).not.toMatch(/\bWHEN:/i)
      expect(rendered).toContain("Jordan Liu")
    }
  })
})
