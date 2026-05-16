import { describe, expect, it } from "vitest"

import { getNexusUtilityCatalogEntry } from "#features/nexus"

describe("nexus utility rail — messenger vs coordination", () => {
  it("registers distinct catalog entries for Ably messenger and operational coordination", () => {
    const messenger = getNexusUtilityCatalogEntry("right.messenger")
    const coordination = getNexusUtilityCatalogEntry("right.coordination")

    expect(messenger?.itemKey).toBe("messenger")
    expect(messenger?.iconKey).toBe("messageCircle")

    expect(coordination?.itemKey).toBe("coordination")
    expect(coordination?.iconKey).toBe("scanSearch")
  })
})
