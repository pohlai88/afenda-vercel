import { describe, expect, it } from "vitest"

import { NEXUS_UTILITY_CATALOG } from "#features/nexus"

describe("utilities marketplace catalog", () => {
  it("exposes the planned tenant-visible installed utilities", () => {
    const installed = NEXUS_UTILITY_CATALOG.filter(
      (entry) =>
        entry.marketplaceListed && entry.marketplaceStatus === "installed"
    )

    expect(installed.map((entry) => entry.id)).toEqual([
      "right.marketplace",
      "right.quickCreate",
      "right.notifications",
      "right.insight",
      "right.connectivity",
      "right.feedback",
      "right.shortcuts",
      "right.help",
      "right.theme",
      "right.density",
      "right.locale",
      "right.storage",
      "right.messenger",
      "right.screenshot",
      "right.upload",
    ])

    const upload = installed.find((entry) => entry.id === "right.upload")
    expect(upload?.widget?.defaultVisible).toBe(false)
    const screenshot = installed.find(
      (entry) => entry.id === "right.screenshot"
    )
    expect(screenshot?.widget?.defaultVisible).toBe(false)
    const messenger = installed.find((entry) => entry.id === "right.messenger")
    expect(messenger?.widget?.defaultVisible).toBe(false)
  })

  it("keeps coming-soon utilities out of the installed catalog", () => {
    expect(
      NEXUS_UTILITY_CATALOG.filter(
        (entry) =>
          entry.marketplaceListed &&
          (entry.marketplaceStatus as string) === "comingSoon"
      ).map((entry) => entry.id)
    ).toEqual([])
  })
})
