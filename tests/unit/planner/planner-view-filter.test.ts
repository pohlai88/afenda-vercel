import { describe, expect, it } from "vitest"

import {
  mergePlannerViewFilterStates,
  normalizePlannerViewFilterState,
  parsePlannerViewFilterSearchParams,
  serializePlannerViewFilterState,
} from "#features/planner/filters/planner-view-filter.shared"

describe("planner saved view filters", () => {
  it("parses URL search params into canonical filter state", () => {
    const filter = parsePlannerViewFilterSearchParams({
      q: " payroll escalation ",
      lifecycle: "active,blocked",
      ownerUserIds: "4c98f55a-fdbc-4bb6-8717-c0cb6760dc73",
      assignmentRole: "reviewer,escalation_owner",
      automationState: "attention",
      signalClass: ["deadline", "review"],
      displayPriority: "critical,high",
      linkedModule: "hrm,payroll",
    })

    expect(filter).toEqual({
      query: "payroll escalation",
      lifecycle: ["active", "blocked"],
      ownerUserIds: ["4c98f55a-fdbc-4bb6-8717-c0cb6760dc73"],
      assignmentRole: ["reviewer", "escalation_owner"],
      automationState: ["attention"],
      signalClass: ["deadline", "review"],
      displayPriority: ["critical", "high"],
      linkedModule: ["hrm", "payroll"],
    })
  })

  it("drops invalid filter payloads during normalization", () => {
    expect(
      normalizePlannerViewFilterState({
        query: "queue",
        ownerUserIds: ["not-a-uuid"],
      })
    ).toEqual({})
  })

  it("merges saved-view filters with URL overrides and serializes cleanly", () => {
    const merged = mergePlannerViewFilterStates(
      {
        lifecycle: ["triaged"],
        displayPriority: ["medium"],
        assignmentRole: ["assignee"],
        automationState: ["attention"],
      },
      {
        query: "vendor",
        displayPriority: ["critical"],
        assignmentRole: ["reviewer"],
      }
    )

    expect(merged).toEqual({
      query: "vendor",
      lifecycle: ["triaged"],
      displayPriority: ["critical"],
      assignmentRole: ["reviewer"],
      automationState: ["attention"],
    })
    expect(JSON.parse(serializePlannerViewFilterState(merged))).toEqual(merged)
  })
})
