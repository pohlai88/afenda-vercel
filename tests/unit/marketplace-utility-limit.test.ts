import { describe, expect, it } from "vitest"

import { MARKETPLACE_RAIL_VISIBLE_LIMIT } from "#features/marketplace"
import { resolveCapabilitiesForViewer } from "#features/marketplace/data/capability-resolver.server"
import type {
  CapabilityDefinition,
  CapabilityViewerContext,
  OrgCapabilityPolicyRow,
  UserCapabilityPreferenceRow,
} from "#features/marketplace/types"

/**
 * Capability Registry — rail visibility cap doctrine.
 *
 * `MARKETPLACE_RAIL_VISIBLE_LIMIT = 9` mirrors the L1 right-rail's
 * 9-icon ceiling. Mandatory rows count toward the cap (an admin who
 * mandates more than 9 capabilities cannot break the rail's geometry).
 * Truncation is "highest-priority wins" (lower `priority` value wins).
 */

const member: CapabilityViewerContext = {
  isAdmin: false,
  isMobile: false,
  multiOrg: false,
  multiLocale: false,
}

function defineCapability(id: string, priority: number): CapabilityDefinition {
  return {
    id,
    category: "utilities",
    itemKey: id,
    iconKey: "store",
    priority,
    defaultVisible: true,
    customizable: true,
    runtimeGates: {},
    source: "nexus-utility",
    nexusUtilityId: id,
  }
}

const noPolicy: readonly OrgCapabilityPolicyRow[] = []
const noPreferences: readonly UserCapabilityPreferenceRow[] = []

describe("MARKETPLACE_RAIL_VISIBLE_LIMIT", () => {
  it("equals 9 (matches NEXUS_RIGHT_RAIL_VISIBLE_LIMIT)", () => {
    expect(MARKETPLACE_RAIL_VISIBLE_LIMIT).toBe(9)
  })

  it("caps visibleIds at the rail limit when more capabilities are visible", () => {
    const definitions: CapabilityDefinition[] = []
    for (let i = 0; i < MARKETPLACE_RAIL_VISIBLE_LIMIT + 5; i += 1) {
      definitions.push(defineCapability(`right.cap${i}`, i))
    }

    const result = resolveCapabilitiesForViewer({
      viewer: member,
      orgPolicy: noPolicy,
      userPreferences: noPreferences,
      definitions,
    })

    expect(result.resolved.length).toBe(definitions.length)
    expect(result.visibleIds.length).toBe(MARKETPLACE_RAIL_VISIBLE_LIMIT)
  })

  it("truncation respects priority order (lower priority wins)", () => {
    const definitions: CapabilityDefinition[] = []
    // Ten capabilities, priorities 0..9. The cap is 9, so priority 9 should fall off.
    for (let i = 0; i < MARKETPLACE_RAIL_VISIBLE_LIMIT + 1; i += 1) {
      definitions.push(defineCapability(`right.cap${i}`, i))
    }

    const result = resolveCapabilitiesForViewer({
      viewer: member,
      orgPolicy: noPolicy,
      userPreferences: noPreferences,
      definitions,
    })

    expect(result.visibleIds).not.toContain(
      `right.cap${MARKETPLACE_RAIL_VISIBLE_LIMIT}`
    )
    for (let i = 0; i < MARKETPLACE_RAIL_VISIBLE_LIMIT; i += 1) {
      expect(result.visibleIds).toContain(`right.cap${i}`)
    }

    // Sorted ascending by priority.
    for (let i = 1; i < result.visibleIds.length; i += 1) {
      const prev = parseInt(
        result.visibleIds[i - 1]!.replace("right.cap", ""),
        10
      )
      const curr = parseInt(result.visibleIds[i]!.replace("right.cap", ""), 10)
      expect(prev).toBeLessThan(curr)
    }
  })

  it("mandatory items count toward the cap", () => {
    const definitions: CapabilityDefinition[] = []
    for (let i = 0; i < 12; i += 1) {
      definitions.push(defineCapability(`right.cap${i}`, i))
    }
    // Mandate every capability — visible count must still cap at the limit.
    const orgPolicy: OrgCapabilityPolicyRow[] = definitions.map((d) => ({
      id: `policy-${d.id}`,
      capabilityId: d.id,
      state: "mandatory",
      audience: "all",
      updatedBy: "user-admin",
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    }))

    const result = resolveCapabilitiesForViewer({
      viewer: member,
      orgPolicy,
      userPreferences: noPreferences,
      definitions,
    })

    expect(result.visibleIds.length).toBe(MARKETPLACE_RAIL_VISIBLE_LIMIT)
    expect(result.mandatoryIds.length).toBe(MARKETPLACE_RAIL_VISIBLE_LIMIT)
    // mandatoryIds is a subset of visibleIds.
    for (const mandatoryId of result.mandatoryIds) {
      expect(result.visibleIds).toContain(mandatoryId)
    }
  })

  it("hidden capabilities never count toward the cap", () => {
    const definitions: CapabilityDefinition[] = []
    for (let i = 0; i < 5; i += 1) {
      // Default-hidden — should not appear in visibleIds.
      definitions.push({
        ...defineCapability(`right.cap${i}`, i),
        defaultVisible: false,
      })
    }
    for (let i = 5; i < 8; i += 1) {
      // Default-visible — should appear.
      definitions.push(defineCapability(`right.cap${i}`, i))
    }

    const result = resolveCapabilitiesForViewer({
      viewer: member,
      orgPolicy: noPolicy,
      userPreferences: noPreferences,
      definitions,
    })

    expect(result.visibleIds.length).toBe(3)
    expect(result.visibleIds).toEqual([
      "right.cap5",
      "right.cap6",
      "right.cap7",
    ])
  })
})
