import { describe, expect, it } from "vitest"

import {
  FORM_EVENTS,
  governedComponentRegistrySchema,
  parseGovernedComponentData,
  parseEventHandlerMetadata,
} from "#features/governed-surface"

describe("governed-surface kernel extensions", () => {
  it("parses governed component metadata", () => {
    const parsed = parseGovernedComponentData({
      type: "governed:empty",
      serverType: "governed:empty",
      configuration: {
        variant: "muted",
        title: "No data",
      },
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
