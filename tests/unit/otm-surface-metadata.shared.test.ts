import { describe, expect, it } from "vitest"

import { OTM_LIST_SURFACE_IDS } from "../../lib/features/hrm/time-attendance/overtime-management/data/otm-surface-metadata.shared"

describe("OTM_LIST_SURFACE_IDS", () => {
  it("uses unique hrm:overtime:* keys for governed list surfaces", () => {
    const values = Object.values(OTM_LIST_SURFACE_IDS)
    expect(new Set(values).size).toBe(values.length)
    for (const key of values) {
      expect(key).toMatch(/^hrm:overtime:[a-z0-9-]+$/)
    }
  })

  it("includes pending-inbox key used by Pattern C builders", () => {
    expect(OTM_LIST_SURFACE_IDS.pendingInbox).toBe("hrm:overtime:pending-inbox")
  })
})
