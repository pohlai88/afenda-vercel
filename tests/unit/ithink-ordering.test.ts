import { describe, expect, it } from "vitest"

import {
  computeInsertPosition,
  normalizePositions,
} from "../../lib/features/ithink/data/ithink-ordering.shared"

describe("ithink-ordering", () => {
  it("inserts at head before next key", () => {
    expect(computeInsertPosition(null, 1000)).toBe(0)
  })

  it("inserts at tail after prev key", () => {
    expect(computeInsertPosition(2000, null)).toBe(3000)
  })

  it("inserts between two keys at midpoint", () => {
    expect(computeInsertPosition(1000, 2000)).toBe(1500)
  })

  it("returns null on collision so caller can normalize", () => {
    expect(computeInsertPosition(1000, 1001)).toBeNull()
  })

  it("normalizePositions spaces ids by 1000", () => {
    expect(normalizePositions(["a", "b", "c"])).toEqual([
      { id: "a", position: 1000 },
      { id: "b", position: 2000 },
      { id: "c", position: 3000 },
    ])
  })
})
