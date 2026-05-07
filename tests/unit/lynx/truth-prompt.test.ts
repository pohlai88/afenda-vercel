import { describe, expect, it } from "vitest"

import { buildLynxTruthSystemPrompt } from "#features/lynx"

describe("buildLynxTruthSystemPrompt", () => {
  it("includes passage blocks and citation instructions", () => {
    const prompt = buildLynxTruthSystemPrompt([
      {
        id: "a",
        title: "Policy",
        body: "Returns within 30 days.",
        distance: 0.12,
      },
    ])
    expect(prompt).toContain("[1] id=a")
    expect(prompt).toContain("Returns within 30 days")
    expect(prompt).toContain("### Answer")
    expect(prompt).toContain("### Limitations")
    expect(prompt).toContain("### Next safe action")
  })

  it("handles empty retrieval", () => {
    const prompt = buildLynxTruthSystemPrompt([])
    expect(prompt).toContain("(no passages retrieved)")
  })
})
