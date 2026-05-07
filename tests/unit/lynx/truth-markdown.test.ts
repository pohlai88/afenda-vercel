import { describe, expect, it } from "vitest"

import { parseLynxTruthMarkdown } from "#features/lynx"

describe("parseLynxTruthMarkdown", () => {
  it("parses the three required sections", () => {
    const md = `### Answer
Here is the answer [1].

### Limitations
We only had one passage.

### Next safe action
Review with finance.`

    const out = parseLynxTruthMarkdown(md)
    expect(out.answer).toContain("Here is the answer")
    expect(out.limitations).toContain("only had one passage")
    expect(out.nextSafeAction).toContain("Review with finance")
  })

  it("treats unsectioned content as answer", () => {
    const out = parseLynxTruthMarkdown("Plain reply without headers.")
    expect(out.answer).toBe("Plain reply without headers.")
    expect(out.limitations).toBe("")
    expect(out.nextSafeAction).toBe("")
  })
})
