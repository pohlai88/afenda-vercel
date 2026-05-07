import { describe, expect, it } from "vitest"

import { lynxTruthSearchBodySchema } from "#features/lynx"

describe("lynxTruthSearchBodySchema", () => {
  it("accepts a non-empty trimmed question", () => {
    const out = lynxTruthSearchBodySchema.parse({
      question: "  What is the policy?  ",
    })
    expect(out.question).toBe("What is the policy?")
  })

  it("rejects empty question", () => {
    expect(() => lynxTruthSearchBodySchema.parse({ question: "" })).toThrow()
    expect(() => lynxTruthSearchBodySchema.parse({ question: "   " })).toThrow()
  })

  it("rejects overlong question", () => {
    const q = "x".repeat(2001)
    expect(() => lynxTruthSearchBodySchema.parse({ question: q })).toThrow()
  })
})
