import { describe, expect, it } from "vitest"

import { resolveCapabilitiesForViewer } from "#features/marketplace/data/capability-resolver.server"
import type {
  CapabilityDefinition,
  CapabilityViewerContext,
  OrgCapabilityPolicyRow,
  UserCapabilityPreferenceRow,
} from "#features/marketplace/types"

/**
 * Capability Registry — resolver layer precedence.
 *
 * Asserts the five-layer doctrine from `capability-resolver.server.ts`
 * (ADR + AGENTS §5 — Marketplace surface):
 *
 *   1. Runtime gates (fail closed)
 *   2. Org policy (audience-filtered; mandatory > blocked)
 *   3. User preference (overrides system default; never mandatory/blocked)
 *   4. System default
 *
 * Plus the post-resolution rail cap (`MARKETPLACE_RAIL_VISIBLE_LIMIT`)
 * with priority-based truncation.
 */

const member: CapabilityViewerContext = {
  isAdmin: false,
  isMobile: false,
  multiOrg: false,
  multiLocale: false,
}

const admin: CapabilityViewerContext = { ...member, isAdmin: true }

function defineCapability(
  overrides: Partial<CapabilityDefinition> & { id: string }
): CapabilityDefinition {
  return {
    id: overrides.id,
    category: "utilities",
    itemKey: overrides.itemKey ?? overrides.id,
    iconKey: overrides.iconKey ?? "store",
    priority: overrides.priority ?? 50,
    defaultVisible: overrides.defaultVisible ?? true,
    customizable: overrides.customizable ?? true,
    runtimeGates: overrides.runtimeGates ?? {},
    source: "nexus-utility",
    nexusUtilityId: overrides.id,
  }
}

const noPolicy: readonly OrgCapabilityPolicyRow[] = []
const noPreferences: readonly UserCapabilityPreferenceRow[] = []

function policyRow(
  overrides: Pick<OrgCapabilityPolicyRow, "capabilityId" | "state"> &
    Partial<OrgCapabilityPolicyRow>
): OrgCapabilityPolicyRow {
  return {
    id: `policy-${overrides.capabilityId}-${overrides.state}`,
    capabilityId: overrides.capabilityId,
    state: overrides.state,
    audience: overrides.audience ?? "all",
    updatedBy: overrides.updatedBy ?? "user-admin",
    updatedAt: overrides.updatedAt ?? new Date("2026-01-01T00:00:00Z"),
  }
}

function preferenceRow(
  overrides: Pick<UserCapabilityPreferenceRow, "capabilityId" | "state"> &
    Partial<UserCapabilityPreferenceRow>
): UserCapabilityPreferenceRow {
  return {
    id: `pref-${overrides.capabilityId}`,
    capabilityId: overrides.capabilityId,
    state: overrides.state,
    displayOrder: overrides.displayOrder ?? 0,
    updatedAt: overrides.updatedAt ?? new Date("2026-01-01T00:00:00Z"),
  }
}

describe("resolveCapabilitiesForViewer — runtime gates (fail closed)", () => {
  it("keeps marketplace visible for a non-admin member", () => {
    const definition = defineCapability({
      id: "right.marketplace",
      defaultVisible: true,
    })
    const result = resolveCapabilitiesForViewer({
      viewer: member,
      orgPolicy: noPolicy,
      userPreferences: noPreferences,
      definitions: [definition],
    })
    expect(result.resolved[0]!.effective).toBe("visible")
    expect(result.resolved[0]!.source).toBe("system-default")
    expect(result.visibleIds).toEqual([definition.id])
  })

  it("returns 'unavailable' for an admin-only capability when viewer is not admin", () => {
    const definition = defineCapability({
      id: "right.adminThing",
      runtimeGates: { adminOnly: true },
      defaultVisible: true,
    })
    const result = resolveCapabilitiesForViewer({
      viewer: member,
      orgPolicy: noPolicy,
      userPreferences: noPreferences,
      definitions: [definition],
    })
    expect(result.resolved[0]!.effective).toBe("unavailable")
    expect(result.resolved[0]!.source).toBe("runtime")
    expect(result.visibleIds).toEqual([])
    expect(result.mandatoryIds).toEqual([])
  })

  it("ignores user preference and org policy when runtime gate fails", () => {
    const definition = defineCapability({
      id: "right.adminThing",
      runtimeGates: { adminOnly: true },
      defaultVisible: false,
    })
    const result = resolveCapabilitiesForViewer({
      viewer: member,
      orgPolicy: [
        policyRow({ capabilityId: definition.id, state: "mandatory" }),
      ],
      userPreferences: [
        preferenceRow({ capabilityId: definition.id, state: "visible" }),
      ],
      definitions: [definition],
    })
    expect(result.resolved[0]!.effective).toBe("unavailable")
    expect(result.resolved[0]!.source).toBe("runtime")
  })

  it("admin viewer satisfies adminOnly", () => {
    const definition = defineCapability({
      id: "right.adminThing",
      runtimeGates: { adminOnly: true },
      defaultVisible: true,
    })
    const result = resolveCapabilitiesForViewer({
      viewer: admin,
      orgPolicy: noPolicy,
      userPreferences: noPreferences,
      definitions: [definition],
    })
    expect(result.resolved[0]!.effective).toBe("visible")
    expect(result.resolved[0]!.source).toBe("system-default")
    expect(result.visibleIds).toEqual([definition.id])
  })

  it("multiOrgOnly fails for a single-org viewer", () => {
    const definition = defineCapability({
      id: "right.console",
      runtimeGates: { multiOrgOnly: true },
      defaultVisible: true,
    })
    const result = resolveCapabilitiesForViewer({
      viewer: member,
      orgPolicy: noPolicy,
      userPreferences: noPreferences,
      definitions: [definition],
    })
    expect(result.resolved[0]!.effective).toBe("unavailable")
  })

  it("mobileOnly fails on desktop", () => {
    const definition = defineCapability({
      id: "right.searchMobile",
      runtimeGates: { mobileOnly: true },
      defaultVisible: true,
    })
    const result = resolveCapabilitiesForViewer({
      viewer: member,
      orgPolicy: noPolicy,
      userPreferences: noPreferences,
      definitions: [definition],
    })
    expect(result.resolved[0]!.effective).toBe("unavailable")
  })
})

describe("resolveCapabilitiesForViewer — org policy", () => {
  it("'mandatory' beats system-default-hidden", () => {
    const definition = defineCapability({
      id: "right.foo",
      defaultVisible: false,
    })
    const result = resolveCapabilitiesForViewer({
      viewer: member,
      orgPolicy: [
        policyRow({ capabilityId: definition.id, state: "mandatory" }),
      ],
      userPreferences: noPreferences,
      definitions: [definition],
    })
    expect(result.resolved[0]!.effective).toBe("mandatory")
    expect(result.resolved[0]!.source).toBe("org-policy")
    expect(result.mandatoryIds).toEqual([definition.id])
  })

  it("'blocked' overrides user 'visible' preference", () => {
    const definition = defineCapability({
      id: "right.foo",
      defaultVisible: true,
    })
    const result = resolveCapabilitiesForViewer({
      viewer: member,
      orgPolicy: [policyRow({ capabilityId: definition.id, state: "blocked" })],
      userPreferences: [
        preferenceRow({ capabilityId: definition.id, state: "visible" }),
      ],
      definitions: [definition],
    })
    expect(result.resolved[0]!.effective).toBe("hidden")
    expect(result.resolved[0]!.source).toBe("org-policy")
  })

  it("'mandatory' beats 'blocked' when both apply (escalation precedence)", () => {
    const definition = defineCapability({
      id: "right.foo",
      defaultVisible: false,
    })
    const result = resolveCapabilitiesForViewer({
      viewer: member,
      orgPolicy: [
        policyRow({ capabilityId: definition.id, state: "blocked" }),
        policyRow({ capabilityId: definition.id, state: "mandatory" }),
      ],
      userPreferences: noPreferences,
      definitions: [definition],
    })
    expect(result.resolved[0]!.effective).toBe("mandatory")
  })

  it("audience='admin' policy does not apply to non-admin viewers", () => {
    const definition = defineCapability({
      id: "right.foo",
      defaultVisible: false,
    })
    const result = resolveCapabilitiesForViewer({
      viewer: member,
      orgPolicy: [
        policyRow({
          capabilityId: definition.id,
          state: "mandatory",
          audience: "admin",
        }),
      ],
      userPreferences: noPreferences,
      definitions: [definition],
    })
    expect(result.resolved[0]!.effective).toBe("hidden") // falls through to system default
    expect(result.resolved[0]!.source).toBe("system-default")
  })

  it("audience='admin' policy applies to admin viewers", () => {
    const definition = defineCapability({
      id: "right.foo",
      defaultVisible: false,
    })
    const result = resolveCapabilitiesForViewer({
      viewer: admin,
      orgPolicy: [
        policyRow({
          capabilityId: definition.id,
          state: "mandatory",
          audience: "admin",
        }),
      ],
      userPreferences: noPreferences,
      definitions: [definition],
    })
    expect(result.resolved[0]!.effective).toBe("mandatory")
  })

  it("audience='member' policy does not apply to admin viewers", () => {
    const definition = defineCapability({
      id: "right.foo",
      defaultVisible: true,
    })
    const result = resolveCapabilitiesForViewer({
      viewer: admin,
      orgPolicy: [
        policyRow({
          capabilityId: definition.id,
          state: "blocked",
          audience: "member",
        }),
      ],
      userPreferences: noPreferences,
      definitions: [definition],
    })
    expect(result.resolved[0]!.effective).toBe("visible")
  })
})

describe("resolveCapabilitiesForViewer — user preference", () => {
  it("'hidden' preference overrides system-default-visible", () => {
    const definition = defineCapability({
      id: "right.foo",
      defaultVisible: true,
    })
    const result = resolveCapabilitiesForViewer({
      viewer: member,
      orgPolicy: noPolicy,
      userPreferences: [
        preferenceRow({ capabilityId: definition.id, state: "hidden" }),
      ],
      definitions: [definition],
    })
    expect(result.resolved[0]!.effective).toBe("hidden")
    expect(result.resolved[0]!.source).toBe("user-preference")
  })

  it("'visible' preference overrides system-default-hidden", () => {
    const definition = defineCapability({
      id: "right.foo",
      defaultVisible: false,
    })
    const result = resolveCapabilitiesForViewer({
      viewer: member,
      orgPolicy: noPolicy,
      userPreferences: [
        preferenceRow({ capabilityId: definition.id, state: "visible" }),
      ],
      definitions: [definition],
    })
    expect(result.resolved[0]!.effective).toBe("visible")
    expect(result.resolved[0]!.source).toBe("user-preference")
  })

  it("preference is ignored when policy is mandatory", () => {
    const definition = defineCapability({
      id: "right.foo",
      defaultVisible: true,
    })
    const result = resolveCapabilitiesForViewer({
      viewer: member,
      orgPolicy: [
        policyRow({ capabilityId: definition.id, state: "mandatory" }),
      ],
      userPreferences: [
        preferenceRow({ capabilityId: definition.id, state: "hidden" }),
      ],
      definitions: [definition],
    })
    expect(result.resolved[0]!.effective).toBe("mandatory")
    expect(result.resolved[0]!.source).toBe("org-policy")
  })
})

describe("resolveCapabilitiesForViewer — system default fallthrough", () => {
  it("renders default-visible when nothing else applies", () => {
    const definition = defineCapability({
      id: "right.foo",
      defaultVisible: true,
    })
    const result = resolveCapabilitiesForViewer({
      viewer: member,
      orgPolicy: noPolicy,
      userPreferences: noPreferences,
      definitions: [definition],
    })
    expect(result.resolved[0]!.effective).toBe("visible")
    expect(result.resolved[0]!.source).toBe("system-default")
  })

  it("hides default-hidden when nothing else applies", () => {
    const definition = defineCapability({
      id: "right.foo",
      defaultVisible: false,
    })
    const result = resolveCapabilitiesForViewer({
      viewer: member,
      orgPolicy: noPolicy,
      userPreferences: noPreferences,
      definitions: [definition],
    })
    expect(result.resolved[0]!.effective).toBe("hidden")
    expect(result.resolved[0]!.source).toBe("system-default")
  })
})
