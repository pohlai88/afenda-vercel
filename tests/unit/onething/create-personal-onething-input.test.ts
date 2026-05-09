import { describe, expect, it } from "vitest"

import { createOrgOneThingSchema } from "#features/onething/schemas/onething.schema"

const personalCreateSchema = createOrgOneThingSchema.omit({
  assigneeUserId: true,
})

describe("createPersonalOneThing input (createOrgOneThingSchema without assignee)", () => {
  it("accepts minimal fields for personal tasks", () => {
    const listId = "00000000-0000-4000-8000-0000000000aa"
    const out = personalCreateSchema.parse({
      title: "  Buy milk  ",
      consequence: "",
      severity: "medium",
      dueAt: "",
      listId,
    })
    expect(out.title).toBe("Buy milk")
    expect(out.listId).toBe(listId)
  })

  it("rejects empty titles", () => {
    const listId = "00000000-0000-4000-8000-0000000000aa"
    const empty = personalCreateSchema.safeParse({
      title: "   ",
      consequence: "",
      severity: "medium",
      dueAt: "",
      listId,
    })
    expect(empty.success).toBe(false)
  })
})
