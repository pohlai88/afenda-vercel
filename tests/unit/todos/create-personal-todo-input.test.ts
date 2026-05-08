import { describe, expect, it } from "vitest"

import { createOrgTodoSchema } from "#features/todos/schemas/todo.schema"

const personalCreateSchema = createOrgTodoSchema.omit({
  assigneeUserId: true,
})

describe("createPersonalTodo input (createOrgTodoSchema without assignee)", () => {
  it("accepts minimal fields for personal tasks", () => {
    const listId = "00000000-0000-4000-8000-0000000000aa"
    const out = personalCreateSchema.parse({
      title: "  Buy milk  ",
      description: "",
      priority: "normal",
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
      description: "",
      priority: "normal",
      dueAt: "",
      listId,
    })
    expect(empty.success).toBe(false)
  })
})
