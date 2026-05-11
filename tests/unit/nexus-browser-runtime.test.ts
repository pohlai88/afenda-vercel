import { describe, expect, it } from "vitest"

import {
  isBrowserConnectionSlow,
  type BrowserConnectionSnapshot,
} from "../../components/workbench/utility-bar/workbench-browser-runtime"

function snap(
  partial: Partial<BrowserConnectionSnapshot>
): BrowserConnectionSnapshot {
  return {
    effectiveType: null,
    downlinkMbps: null,
    rttMs: null,
    saveData: false,
    ...partial,
  }
}

describe("isBrowserConnectionSlow", () => {
  it("returns false when snapshot is null", () => {
    expect(isBrowserConnectionSlow(null)).toBe(false)
  })

  it("detects 2g and slow-2g (case-insensitive)", () => {
    expect(isBrowserConnectionSlow(snap({ effectiveType: "2g" }))).toBe(true)
    expect(isBrowserConnectionSlow(snap({ effectiveType: "slow-2g" }))).toBe(
      true
    )
    expect(isBrowserConnectionSlow(snap({ effectiveType: "Slow-2g" }))).toBe(
      true
    )
    expect(isBrowserConnectionSlow(snap({ effectiveType: "3g" }))).toBe(false)
  })

  it("detects downlink below 0.5 Mbps", () => {
    expect(isBrowserConnectionSlow(snap({ downlinkMbps: 0.49 }))).toBe(true)
    expect(isBrowserConnectionSlow(snap({ downlinkMbps: 0 }))).toBe(true)
    expect(isBrowserConnectionSlow(snap({ downlinkMbps: 0.5 }))).toBe(false)
    expect(isBrowserConnectionSlow(snap({ downlinkMbps: null }))).toBe(false)
  })
})
