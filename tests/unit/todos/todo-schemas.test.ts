import { describe, expect, it } from "vitest"

import { createTodoListSchema } from "#features/todos/schemas/todo-list.schema"
import {
  createOrgTodoSchema,
  parseOptionalDueAt,
  todoAttachmentSchema,
  todoCommentSchema,
  todoIdSchema,
  todoTitleSchema,
} from "#features/todos/schemas/todo.schema"

describe("todoTitleSchema", () => {
  it("accepts non-empty trimmed titles", () => {
    expect(todoTitleSchema.parse("  Hello  ")).toBe("Hello")
  })

  it("rejects empty titles", () => {
    expect(todoTitleSchema.safeParse("").success).toBe(false)
    expect(todoTitleSchema.safeParse("   ").success).toBe(false)
  })
})

describe("createOrgTodoSchema", () => {
  it("defaults description and priority", () => {
    const out = createOrgTodoSchema.parse({ title: "x" })
    expect(out.description).toBe("")
    expect(out.priority).toBe("normal")
  })

  it("accepts optional assignee and list", () => {
    const id = "00000000-0000-4000-8000-0000000000aa"
    const out = createOrgTodoSchema.parse({
      title: "t",
      assigneeUserId: id,
      listId: id,
    })
    expect(out.assigneeUserId).toBe(id)
    expect(out.listId).toBe(id)
  })
})

describe("todoIdSchema / comment / attachment", () => {
  it("parses todo id", () => {
    const id = "00000000-0000-4000-8000-0000000000bb"
    expect(todoIdSchema.parse({ todoId: id }).todoId).toBe(id)
  })

  it("parses comment body", () => {
    const id = "00000000-0000-4000-8000-0000000000cc"
    expect(todoCommentSchema.parse({ todoId: id, body: " hi " }).body).toBe(
      "hi"
    )
  })

  it("parses attachment with sha256", () => {
    const id = "00000000-0000-4000-8000-0000000000dd"
    const hash = "a".repeat(64)
    const out = todoAttachmentSchema.parse({
      todoId: id,
      url: "https://example.com/f",
      contentSha256: hash,
      mimeType: "image/png",
      sizeBytes: "1024",
    })
    expect(out.sizeBytes).toBe(1024)
  })
})

describe("createTodoListSchema", () => {
  it("accepts sluggy names", () => {
    expect(
      createTodoListSchema.parse({ name: "Inbox", slug: "inbox" })
    ).toEqual({
      name: "Inbox",
      slug: "inbox",
    })
  })

  it("rejects invalid slugs", () => {
    expect(
      createTodoListSchema.safeParse({ name: "x", slug: "Bad_Slug" }).success
    ).toBe(false)
  })
})

describe("parseOptionalDueAt", () => {
  it("returns null for blank", () => {
    expect(parseOptionalDueAt("")).toBeNull()
    expect(parseOptionalDueAt(undefined)).toBeNull()
  })

  it("parses ISO-ish input", () => {
    const d = parseOptionalDueAt("2026-01-15T12:00:00.000Z")
    expect(d).toBeInstanceOf(Date)
    expect(d!.getUTCFullYear()).toBe(2026)
  })
})
