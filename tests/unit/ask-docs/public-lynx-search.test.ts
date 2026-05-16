import { describe, expect, it } from "vitest"

import {
  publicLynxSearchHits,
  publicLynxSearchResultCount,
} from "#lib/ask-docs/public-lynx-search.shared"

describe("publicLynxSearchHits", () => {
  it("extracts enriched flexsearch rows", () => {
    const hits = publicLynxSearchHits([
      { doc: { url: "/en/ask-docs/leave", title: "Leave" } },
    ])
    expect(hits).toEqual([{ url: "/en/ask-docs/leave", title: "Leave" }])
  })

  it("accepts plain doc rows", () => {
    const hits = publicLynxSearchHits([
      { url: "/en/ask-docs/payslips", title: "Payslips" },
    ])
    expect(hits).toHaveLength(1)
  })

  it("returns an empty array for non-array output", () => {
    expect(publicLynxSearchHits(null)).toEqual([])
    expect(publicLynxSearchResultCount(undefined)).toBe(0)
  })
})
