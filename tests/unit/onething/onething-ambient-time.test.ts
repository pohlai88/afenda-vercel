import { describe, expect, it } from "vitest"

import {
  formatAmbientTime,
  HOUR_MS,
  DAY_MS,
  type AmbientTimeT,
} from "#features/onething/client"

/**
 * Guards the `formatAmbientTime` kernel extracted from the three OneThing
 * components (list pane, detail pane, audit footer).
 *
 * The narrow `AmbientTimeT` type exists for compile-time performance:
 * `ReturnType<typeof useTranslations>` costs ~13 s per file on a cold
 * `tsc --noEmit`; this structural type avoids that instantiation.
 */

const t: AmbientTimeT = (key, values) => {
  if (key === "shell.ambientTimeJustNow") return "just now"
  if (key === "shell.ambientTimeMinutes") return `${values?.m}m`
  if (key === "shell.ambientTimeHours") return `${values?.h}h`
  if (key === "shell.ambientTimeDays") return `${values?.d}d`
  return key
}

describe("formatAmbientTime", () => {
  it("returns just-now for < 60 seconds", () => {
    expect(formatAmbientTime(0, t)).toBe("just now")
    expect(formatAmbientTime(59_999, t)).toBe("just now")
  })

  it("returns minutes for 60 s – 59 min 59 s", () => {
    expect(formatAmbientTime(60_000, t)).toBe("1m")
    expect(formatAmbientTime(90_000, t)).toBe("2m")
    expect(formatAmbientTime(HOUR_MS - 1, t)).toBe("60m")
  })

  it("returns hours for 1 h – 23 h 59 m", () => {
    expect(formatAmbientTime(HOUR_MS, t)).toBe("1h")
    expect(formatAmbientTime(HOUR_MS * 5, t)).toBe("5h")
    expect(formatAmbientTime(DAY_MS - 1, t)).toBe("23h")
  })

  it("returns days for ≥ 24 h", () => {
    expect(formatAmbientTime(DAY_MS, t)).toBe("1d")
    expect(formatAmbientTime(DAY_MS * 3, t)).toBe("3d")
  })

  it("clamps sub-minute input to at-least-1m when non-zero", () => {
    // edge: exactly at the 60 s boundary
    expect(formatAmbientTime(60_000, t)).toBe("1m")
  })
})
