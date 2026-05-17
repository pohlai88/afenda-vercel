import { describe, expect, it } from "vitest"

import { buildEmployeeTimelineMetadataView } from "../../lib/features/hrm/employee-management/employee-records-management/data/employee-timeline-metadata.shared.ts"

describe("buildEmployeeTimelineMetadataView", () => {
  it("returns empty view for invalid JSON", () => {
    expect(buildEmployeeTimelineMetadataView("{")).toEqual({
      narrative: null,
      facets: [],
    })
  })

  it("emits ordered facets and skips empty values", () => {
    const view = buildEmployeeTimelineMetadataView(
      JSON.stringify({
        employeeId: "ignored",
        employeeNumber: "E-100",
        versionNumber: 2,
        hasEmail: true,
        hasBankToken: false,
        emptyArray: [],
      })
    )
    expect(view.narrative).toBeNull()
    expect(view.facets.map((f) => f.labelKey)).toEqual([
      "timelineFacetEmployeeNumber",
      "timelineFacetVersionNumber",
      "timelineFacetHasEmail",
      "timelineFacetHasBankToken",
    ])
    expect(view.facets.map((f) => f.value)).toEqual([
      "E-100",
      "2",
      "true",
      "false",
    ])
  })
})
