import { describe, expect, it } from "vitest"
import {
  parseUiLynxState,
  parseUiMaterialPhase,
  uiLynxStateKeys,
  uiMaterialPhaseKeys,
} from "../../lib/design-system"

/**
 * Guards drift between Zod schemas (TS) and CSS attribute selectors (`app/globals.css`).
 * If these diverge, shell wiring will silently fail to apply material phases.
 */
describe("material semantics schemas", () => {
  it("parses every canonical material phase", () => {
    for (const phase of uiMaterialPhaseKeys) {
      expect(parseUiMaterialPhase(phase)).toBe(phase)
    }
    expect(() => parseUiMaterialPhase("active")).toThrow()
  })

  it("parses every canonical Lynx material state", () => {
    for (const state of uiLynxStateKeys) {
      expect(parseUiLynxState(state)).toBe(state)
    }
    expect(() => parseUiLynxState("thinking")).toThrow()
  })
})
