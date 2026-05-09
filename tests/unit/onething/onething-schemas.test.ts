import { describe, expect, it } from "vitest"

import { createOneThingListSchema } from "#features/onething/schemas/onething-list.schema"
import {
  createOrgOneThingSchema,
  parseOptionalDueAt,
  oneThingAttachmentSchema,
  oneThingCommentSchema,
  oneThingIdSchema,
  onethingTitleSchema,
} from "#features/onething/schemas/onething.schema"

describe("onethingTitleSchema", () => {
  it("accepts non-empty trimmed titles", () => {
    expect(onethingTitleSchema.parse("  Hello  ")).toBe("Hello")
  })

  it("rejects empty titles", () => {
    expect(onethingTitleSchema.safeParse("").success).toBe(false)
    expect(onethingTitleSchema.safeParse("   ").success).toBe(false)
  })
})

describe("createOrgOneThingSchema", () => {
  it("defaults consequence and severity", () => {
    const out = createOrgOneThingSchema.parse({ title: "x" })
    expect(out.consequence).toBe("")
    expect(out.severity).toBe("medium")
  })

  it("accepts optional assignee and list", () => {
    const id = "00000000-0000-4000-8000-0000000000aa"
    const out = createOrgOneThingSchema.parse({
      title: "t",
      assigneeUserId: id,
      listId: id,
    })
    expect(out.assigneeUserId).toBe(id)
    expect(out.listId).toBe(id)
  })
})

describe("oneThingIdSchema / comment / attachment", () => {
  it("parses onething id", () => {
    const id = "00000000-0000-4000-8000-0000000000bb"
    expect(oneThingIdSchema.parse({ oneThingId: id }).oneThingId).toBe(id)
  })

  it("parses comment body", () => {
    const id = "00000000-0000-4000-8000-0000000000cc"
    expect(
      oneThingCommentSchema.parse({ oneThingId: id, body: " hi " }).body
    ).toBe("hi")
  })

  it("parses attachment with sha256", () => {
    const id = "00000000-0000-4000-8000-0000000000dd"
    const hash = "a".repeat(64)
    const out = oneThingAttachmentSchema.parse({
      oneThingId: id,
      url: "https://example.com/f",
      contentSha256: hash,
      mimeType: "image/png",
      sizeBytes: "1024",
    })
    expect(out.sizeBytes).toBe(1024)
  })
})

describe("createOneThingListSchema", () => {
  it("accepts sluggy names", () => {
    expect(
      createOneThingListSchema.parse({ name: "Inbox", slug: "inbox" })
    ).toEqual({
      name: "Inbox",
      slug: "inbox",
    })
  })

  it("rejects invalid slugs", () => {
    expect(
      createOneThingListSchema.safeParse({ name: "x", slug: "Bad_Slug" })
        .success
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
