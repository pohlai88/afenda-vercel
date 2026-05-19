import { describe, expect, it } from "vitest"

import {
  HRM_AAT_SPEC_MAP,
  listHrmAatSpecCodes,
} from "../../lib/features/hrm/time-attendance/absence-analytics-trends/aat-spec-map.shared.ts"

describe("HRM AAT spec map", () => {
  it("lists 29 requirement codes with stable areas", () => {
    const codes = listHrmAatSpecCodes()
    expect(codes).toHaveLength(29)
    expect(codes[0]).toBe("HRM-AAT-001")
    expect(codes[28]).toBe("HRM-AAT-029")
    expect(HRM_AAT_SPEC_MAP["HRM-AAT-016"]).toBe("absence-heatmap")
    expect(HRM_AAT_SPEC_MAP["HRM-AAT-029"]).toBe("audit-trail")
  })
})
