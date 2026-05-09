import { describe, expect, it } from "vitest"

import {
  parseUiDensity,
  parseUiPrimitive,
  parseUiPriority,
  parseUiStatusTone,
  ui,
  uiDensity,
  uiDensityKeys,
  uiDensitySchema,
  uiPrimitiveKeys,
  uiPrimitiveSchema,
  uiPrioritySchema,
  uiRadius,
  uiStatusToneClasses,
  uiSurfaceElevation,
  uiSurfaceInset,
} from "#lib/design-system"

describe("design-system contract", () => {
  it("keeps one density contract for keys, schema, parser, and gap aliases", () => {
    expect(uiDensityKeys).toEqual(["compact", "comfortable"])
    expect(uiDensitySchema.parse("compact")).toBe("compact")
    expect(parseUiDensity("comfortable")).toBe("comfortable")
    expect(() => parseUiDensity("roomy")).toThrow()
    expect(ui.gap).toEqual({
      compact: uiDensity.compact,
      comfortable: uiDensity.comfortable,
    })
  })

  it("governs familiar primitive names with a schema", () => {
    expect(uiPrimitiveKeys).toEqual([
      "button",
      "input",
      "badge",
      "card",
      "panel",
      "dialog",
      "popover",
      "sheet",
      "toolbar",
      "table",
    ])
    expect(uiPrimitiveSchema.parse("popover")).toBe("popover")
    expect(parseUiPrimitive("toolbar")).toBe("toolbar")
    expect(() => parseUiPrimitive("truth-surface")).toThrow()
  })

  it("maps ui aliases to existing token-backed class exports", () => {
    expect(ui.radius).toMatchObject({
      control: uiRadius.control,
      chip: uiRadius.chip,
      card: uiRadius.card,
      panel: uiRadius.panel,
      dialog: uiRadius.dialog,
      popover: uiRadius.popover,
      sheet: uiRadius.sheet,
      table: uiRadius.table,
      surface: uiRadius.surface,
      section: uiRadius.section,
    })
    expect(ui.padding).toEqual({
      dense: uiSurfaceInset.sm,
      normal: uiSurfaceInset.md,
      card: uiSurfaceInset.lg,
      roomy: uiSurfaceInset.xl,
      spacious: uiSurfaceInset["2xl"],
    })
    expect(ui.elevation).toEqual({
      flat: "shadow-none",
      card: uiSurfaceElevation.default,
      raised: uiSurfaceElevation.raised,
      floating: uiSurfaceElevation.floating,
    })
    expect(ui.tone).toBe(uiStatusToneClasses)
  })

  it("keeps existing status tone parsing and governs priority aliases", () => {
    expect(parseUiStatusTone("warning")).toBe("warning")
    expect(() => parseUiStatusTone("danger")).toThrow()
    expect(uiPrioritySchema.parse("critical")).toBe("critical")
    expect(parseUiPriority("high")).toBe("high")
    expect(() => parseUiPriority("urgent")).toThrow()
    expect(ui.priority).toEqual({
      low: "opacity-70",
      normal: "",
      high: "ring-1 ring-border",
      critical: "ring-1 ring-critical/35",
    })
  })
})
