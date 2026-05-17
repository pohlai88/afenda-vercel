import { describe, expect, it } from "vitest"

import {
  searchParamFirst,
  searchParamPositiveInt,
} from "#lib/i18n/app-search-params.shared"

describe("app-search-params.shared", () => {
  it("searchParamFirst prefers string over array", () => {
    expect(searchParamFirst({ q: "a" }, "q")).toBe("a")
    expect(searchParamFirst({ q: ["b", "c"] }, "q")).toBe("b")
    expect(searchParamFirst({}, "q")).toBeUndefined()
  })

  it("searchParamPositiveInt validates 1-based pages", () => {
    expect(searchParamPositiveInt({ page: "2" }, "page", 1)).toBe(2)
    expect(searchParamPositiveInt({}, "page", 1)).toBe(1)
    expect(searchParamPositiveInt({ page: "0" }, "page", 1)).toBe(1)
    expect(searchParamPositiveInt({ page: "nope" }, "page", 3)).toBe(3)
  })
})
