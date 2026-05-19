import { describe, expect, it } from "vitest"

import {
  toUtilityBarRailSnapshot,
  utilityBarItemIdFromCapabilityId,
} from "#features/nexus/data/utility-bar-capability-bridge.shared"
import type { ResolvedCapabilitySet } from "#features/marketplace/types"

function resolvedSet(
  visibleIds: string[],
  mandatoryIds: string[] = []
): ResolvedCapabilitySet {
  return {
    visibleIds,
    mandatoryIds,
    resolved: [],
  }
}

describe("utility-bar-capability-bridge", () => {
  it("maps capability ids to utility bar catalog ids", () => {
    expect(utilityBarItemIdFromCapabilityId("right.quickCreate")).toBe(
      "quick-create"
    )
    expect(utilityBarItemIdFromCapabilityId("right.notifications")).toBe(
      "notifications"
    )
    expect(utilityBarItemIdFromCapabilityId("right.unknown")).toBeNull()
  })

  it("builds rail snapshot from resolver output", () => {
    const snapshot = toUtilityBarRailSnapshot(
      resolvedSet(
        ["right.quickCreate", "right.notifications", "right.theme"],
        ["right.searchMobile"]
      )
    )

    expect(snapshot.visibleIds).toEqual([
      "quick-create",
      "notifications",
      "theme",
    ])
    expect(snapshot.mandatoryIds).toEqual(["search-mobile"])
  })
})
