import { describe, expect, it } from "vitest"

import {
  LYNX_AUDIT_ACTIONS,
  LYNX_LAYERS,
  LYNX_MODULE_ID,
} from "#features/lynx/lynx.contract"

describe("lynx.contract", () => {
  it("keeps stable module id and layer slugs", () => {
    expect(LYNX_MODULE_ID).toBe("lynx")
    expect(LYNX_LAYERS).toEqual(["truth", "briefs", "structured", "operator"])
  })

  it("uses erp.lynx audit prefix", () => {
    expect(LYNX_AUDIT_ACTIONS.truthQuery.startsWith("erp.lynx.")).toBe(true)
    expect(LYNX_AUDIT_ACTIONS.nlDemoQuery.startsWith("erp.lynx.")).toBe(true)
    expect(LYNX_AUDIT_ACTIONS.briefGenerate.startsWith("erp.lynx.")).toBe(true)
  })
})
