import { describe, expect, it } from "vitest"

import {
  HRM_FWA_SPEC_MAP,
  listHrmFwaSpecCodes,
} from "../../lib/features/hrm/time-attendance/flexible-work-arrangement-tracking/fwa-spec-map.shared.ts"

describe("HRM FWA spec map", () => {
  it("lists 32 requirement codes with stable areas", () => {
    const codes = listHrmFwaSpecCodes()
    expect(codes).toHaveLength(32)
    expect(codes[0]).toBe("HRM-FWA-001")
    expect(codes[31]).toBe("HRM-FWA-032")
    expect(HRM_FWA_SPEC_MAP["HRM-FWA-025"]).toBe("active-schedule-read")
    expect(HRM_FWA_SPEC_MAP["HRM-FWA-031"]).toBe("action-authorization")
  })
})
