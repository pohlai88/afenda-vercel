import { describe, expect, it } from "vitest"

import { describePlannerActivityDisplay } from "#features/orbit/audit/planner-activity-display.shared"

describe("planner activity display", () => {
  it("classifies notice events distinctly", () => {
    expect(describePlannerActivityDisplay("notice_acknowledged")).toEqual({
      label: "Notice",
      tone: "warning",
    })
  })

  it("classifies evidence and schedule events separately", () => {
    expect(describePlannerActivityDisplay("attachment_added")).toEqual({
      label: "Evidence",
      tone: "outline",
    })
    expect(describePlannerActivityDisplay("recurrence_processed")).toEqual({
      label: "Schedule",
      tone: "info",
    })
  })

  it("classifies automation failure evidence distinctly", () => {
    expect(
      describePlannerActivityDisplay("automation_failure_observed")
    ).toEqual({
      label: "Automation",
      tone: "warning",
    })
  })
})
