import { describe, expect, it } from "vitest"

import { ActionFormErrors } from "#features/governed-surface/components/action-form-errors"
import { parseActionDescriptorData } from "#features/governed-surface/schemas/action.schema"
import {
  isActionFailure,
  type ActionResult,
} from "#features/governed-surface/schemas/action-result.shared"
import { parseEmptyStateData } from "#features/governed-surface/schemas/list-surface.schema"
import { pageHeaderSchema } from "#features/governed-surface/schemas/page-header.schema"

describe("governed-surface schemas", () => {
  it("accepts the minimum page header shape", () => {
    expect(
      pageHeaderSchema.parse({
        eyebrow: "Platform administration",
        title: "Platform audit",
        description: "Read-only global audit surface.",
      })
    ).toEqual({
      eyebrow: "Platform administration",
      title: "Platform audit",
      description: "Read-only global audit surface.",
      backHref: undefined,
      backLabel: undefined,
    })
  })

  it("rejects undeclared page header fields", () => {
    expect(() =>
      pageHeaderSchema.parse({
        title: "Platform audit",
        widget: "not allowed",
      })
    ).toThrow()
  })

  it("accepts optional header back navigation fields", () => {
    const r = pageHeaderSchema.parse({
      title: "Audit",
      backHref: "/en/platform",
      backLabel: "← Back",
    })
    expect(r.backHref).toBe("/en/platform")
    expect(r.backLabel).toBe("← Back")
  })
})

describe("governed-surface additional parsers", () => {
  it("parses empty state with CTA", () => {
    const r = parseEmptyStateData({
      variant: "cta",
      title: "Nothing here",
      cta: { label: "Go back", href: "/en/o/acme/nexus" },
    })
    expect(r.success).toBe(true)
  })

  it("parses action descriptor with default intent", () => {
    const r = parseActionDescriptorData({ id: "save", label: "Save" })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.intent).toBe("default")
  })
})

describe("ActionResult helpers", () => {
  it("exports the canonical form error renderer", () => {
    expect(typeof ActionFormErrors).toBe("function")
  })

  it("narrows expected action failures", () => {
    const result: ActionResult = {
      ok: false,
      error: "Check the form and try again.",
      fieldErrors: { email: "Email is required." },
    }

    expect(isActionFailure(result)).toBe(true)
  })

  it("does not treat success results as failures", () => {
    expect(isActionFailure({ ok: true })).toBe(false)
    expect(isActionFailure(null)).toBe(false)
  })
})
