import { describe, expect, it } from "vitest"

import { parseOrgFeedbackEventMetadata } from "#features/org-feedback/data/feedback-metadata.shared"

describe("parseOrgFeedbackEventMetadata", () => {
  it("parses utility marketplace request metadata", () => {
    expect(
      parseOrgFeedbackEventMetadata(
        JSON.stringify({
          messageLength: 42,
          source: "utility-marketplace",
          requestKind: "rail-icon",
          utilityId: "marketplace.customIcon",
        })
      )
    ).toEqual({
      messageLength: 42,
      source: "utility-marketplace",
      requestKind: "rail-icon",
      utilityId: "marketplace.customIcon",
    })
  })

  it("returns null for invalid metadata", () => {
    expect(parseOrgFeedbackEventMetadata("not-json")).toBeNull()
  })
})
