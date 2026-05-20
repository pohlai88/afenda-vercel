import { describe, expect, it } from "vitest"

import { lynxOperatorBodySchema } from "#features/lynx/schemas/operator.schema"

describe("lynxOperatorBodySchema", () => {
  it("accepts a non-empty trimmed message", () => {
    const r = lynxOperatorBodySchema.safeParse({
      message: "  How many contacts?  ",
    })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.message).toBe("How many contacts?")
  })

  it("rejects empty message", () => {
    const r = lynxOperatorBodySchema.safeParse({ message: "   " })
    expect(r.success).toBe(false)
  })
})
