import { describe, expect, it } from "vitest"

import { onethingImportRowSchema } from "#features/onething"

describe("onethingImportRowSchema", () => {
  it("parses minimal row", () => {
    const out = onethingImportRowSchema.parse({ title: "Ship v1" })
    expect(out.title).toBe("Ship v1")
    expect(out.severity).toBe("medium")
    expect(out.consequence).toBe("")
  })

  it("accepts valid assignee email", () => {
    const out = onethingImportRowSchema.parse({
      title: "t",
      assignee_email: "a@b.co",
    })
    expect(out.assignee_email).toBe("a@b.co")
  })

  it("rejects invalid assignee email when non-empty", () => {
    const r = onethingImportRowSchema.safeParse({
      title: "t",
      assignee_email: "not-an-email",
    })
    expect(r.success).toBe(false)
  })
})
