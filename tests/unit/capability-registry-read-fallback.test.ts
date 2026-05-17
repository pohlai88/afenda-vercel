import { describe, expect, it } from "vitest"

import { isCapabilityRegistryRelationMissing } from "#features/marketplace/data/capability-registry-read-fallback.shared"

describe("isCapabilityRegistryRelationMissing", () => {
  it("matches NeonDbError on the error cause (Drizzle query wrapper)", () => {
    const err = new Error(
      'Failed query: select "id" from "org_capability_policy" where "organizationId" = $1'
    )
    err.cause = Object.assign(new Error('relation "org_capability_policy" does not exist'), {
      code: "42P01",
      name: "NeonDbError",
    })

    expect(isCapabilityRegistryRelationMissing(err)).toBe(true)
  })

  it("matches a direct Postgres undefined_table message", () => {
    const err = Object.assign(
      new Error('relation "user_capability_preference" does not exist'),
      { code: "42P01" }
    )

    expect(isCapabilityRegistryRelationMissing(err)).toBe(true)
  })

  it("rejects unrelated query failures", () => {
    const err = new Error('Failed query: select "id" from "contact" where "id" = $1')
    err.cause = Object.assign(new Error('relation "contact" does not exist'), {
      code: "42P01",
    })

    expect(isCapabilityRegistryRelationMissing(err)).toBe(false)
  })
})
