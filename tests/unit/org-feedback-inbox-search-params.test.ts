import { describe, expect, it } from "vitest"

import {
  loadOrgFeedbackInboxSearchParams,
  serializeOrgFeedbackInboxSearchParams,
} from "#features/org-feedback/schemas/org-feedback-inbox.search-params"

describe("org-feedback inbox nuqs search params", () => {
  it("loads defaults", async () => {
    const loaded = await loadOrgFeedbackInboxSearchParams({})
    expect(loaded.page).toBe(1)
    expect(loaded.state).toBe("all")
  })

  it("serializes page and state", () => {
    const href = serializeOrgFeedbackInboxSearchParams(
      "/en/o/acme/admin/feedback",
      { page: 2, state: "new" }
    )
    expect(href).toContain("page=2")
    expect(href).toContain("state=new")
  })
})
