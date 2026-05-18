import { describe, expect, it } from "vitest"

import { buildGroundedTruthQuestion } from "../../components2/nexus/nexus-lynx-grounded-truth-question.shared"

describe("buildGroundedTruthQuestion", () => {
  it("returns null when grounding is null", () => {
    expect(buildGroundedTruthQuestion(null)).toBeNull()
  })

  it("includes title and trailing guidance", () => {
    const q = buildGroundedTruthQuestion({
      source: "planner_item",
      id: "x",
      title: "Approve vendor bill",
      summary: null,
      chips: [],
    })
    expect(q).toContain("Approve vendor bill")
    expect(q).toContain("organization's knowledge base")
  })

  it("clips long summaries", () => {
    const long = "x".repeat(500)
    const q = buildGroundedTruthQuestion({
      source: "planner_item",
      id: "y",
      title: "Task",
      summary: long,
      chips: [],
    })
    expect(q).toContain("…")
    expect(q!.length).toBeLessThan(long.length + 200)
  })
})
