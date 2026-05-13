import { describe, expect, it } from "vitest"

import {
  loadPlatformOperatorUsersSearchParams,
  sanitizePlatformOperatorUsersSearchParams,
  serializePlatformOperatorUsersSearchParams,
} from "#features/platform-admin/schemas/platform-operator-users.search-params"

describe("platform operator users nuqs search params", () => {
  it("loads defaults", async () => {
    const loaded = await loadPlatformOperatorUsersSearchParams({})
    expect(loaded.page).toBe(1)
    expect(loaded.q).toBe("")
  })

  it("sanitizes q length and coerces page", async () => {
    const loaded = await loadPlatformOperatorUsersSearchParams({
      q: "  x  ",
      page: "0",
    })
    const s = sanitizePlatformOperatorUsersSearchParams(loaded)
    expect(s.q).toBe("x")
    expect(s.page).toBe(1)
  })

  it("serializes q + page", () => {
    const href = serializePlatformOperatorUsersSearchParams(
      "/en/o/acme/operator/users",
      { q: "admin", page: 2 }
    )
    expect(href).toContain("q=admin")
    expect(href).toContain("page=2")
  })
})
