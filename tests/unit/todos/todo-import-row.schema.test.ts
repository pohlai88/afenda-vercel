import { describe, expect, it } from "vitest"

import { todoImportRowSchema } from "#features/todos"

describe("todoImportRowSchema", () => {
  it("parses minimal row", () => {
    const out = todoImportRowSchema.parse({ title: "Ship v1" })
    expect(out.title).toBe("Ship v1")
    expect(out.priority).toBe("normal")
    expect(out.description).toBe("")
  })

  it("accepts valid assignee email", () => {
    const out = todoImportRowSchema.parse({
      title: "t",
      assignee_email: "a@b.co",
    })
    expect(out.assignee_email).toBe("a@b.co")
  })

  it("rejects invalid assignee email when non-empty", () => {
    const r = todoImportRowSchema.safeParse({
      title: "t",
      assignee_email: "not-an-email",
    })
    expect(r.success).toBe(false)
  })
})
