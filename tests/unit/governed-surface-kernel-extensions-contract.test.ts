import { describe, expect, it } from "vitest"

import {
  FORM_EVENTS,
  governedComponentRegistrySchema,
  governedComponentSchema,
  parseEventHandlerMetadata,
} from "#features/governed-surface"

describe("governed-surface kernel extensions", () => {
  it("parses governed component metadata", () => {
    const parsed = governedComponentSchema.safeParse({
      type: "button-primary",
      serverType: "create",
      configuration: { variant: "default" },
    })
    expect(parsed.success).toBe(true)
  })

  it("parses event handler metadata with canonical form event ids", () => {
    const parsed = parseEventHandlerMetadata({
      id: "toast.success",
      runAt: FORM_EVENTS.responseReceived,
    })
    expect(parsed.success).toBe(true)
  })

  it("accepts an empty component registry map", () => {
    const parsed = governedComponentRegistrySchema.safeParse({})
    expect(parsed.success).toBe(true)
  })
})
